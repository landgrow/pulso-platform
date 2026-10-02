-- =============================================================================
-- Migration 0034 — Endurecimento de segurança e correções de auditoria
-- =============================================================================
-- Idempotente: pode rodar mais de uma vez e não depende de qual linhagem de
-- migrations criou cada objeto em produção (cada bloco checa se o objeto
-- existe antes de mexer). Não apaga dado nenhum.
--
-- 1. Funções SECURITY DEFINER que qualquer um (até sem login, com a anon key)
--    conseguia chamar: cleanup_* apagava o histórico de revisões de TODOS os
--    clientes; find_user_id_by_email revelava contas; list_periods_for_org
--    listava períodos de qualquer org. O app só chama essas funções pelo
--    service role, então fecham para PUBLIC/anon/authenticated.
-- 2. log_audit(): ao apagar uma organização, o próprio trigger tentava gravar
--    audit_log apontando pro org_id que acabou de sumir (viola a FK). Agora
--    grava org_id NULL quando a org não existe mais.
-- 3. archive_colecao_revision(): (a) escritas pelo servidor (service role) não
--    têm auth.uid() e apagavam o autor; agora mantém o updated_by enviado.
--    (b) o autosave do BIN grava a cada 1,5s e criava uma revisão por
--    gravação; agora agrupa: só abre revisão nova se a última da mesma coleção
--    tiver mais de 10 min ou for de outro autor. (c) payload que não é objeto
--    não derruba mais o UPDATE.
-- =============================================================================

-- ─── 1. Fecha funções perigosas ──────────────────────────────────────────────

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'cleanup_old_revisions',
        'cleanup_all_old_revisions',
        'find_user_id_by_email',
        'list_periods_for_org'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;
END $$;

-- ─── 2. log_audit sem violar a FK ao apagar organização ─────────────────────

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id      uuid;
  v_action      text;
  v_resource_id text;
BEGIN
  IF TG_TABLE_NAME = 'organizations' THEN
    v_org_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME IN ('memberships', 'audit_log') THEN
    v_org_id := COALESCE(NEW.org_id, OLD.org_id);
  ELSIF TG_TABLE_NAME = 'contratos' THEN
    SELECT org_id INTO v_org_id FROM public.clientes
    WHERE id = COALESCE(NEW.cliente_id, OLD.cliente_id);
  ELSE
    v_org_id := NULL;
  END IF;

  -- Org já apagada (DELETE em organizations ou cascata): a FK de audit_log
  -- não aceita o id antigo — registra sem org.
  IF v_org_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = v_org_id) THEN
    v_org_id := NULL;
  END IF;

  v_action := lower(TG_OP);
  v_resource_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END;

  INSERT INTO public.audit_log (org_id, user_id, action, resource_type, resource_id, metadata)
  VALUES (v_org_id, auth.uid(), v_action, TG_TABLE_NAME, v_resource_id,
    jsonb_build_object('schema', TG_TABLE_SCHEMA, 'op', TG_OP, 'old', to_jsonb(OLD), 'new', to_jsonb(NEW)));

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- ─── 3. Revisões das coleções ────────────────────────────────────────────────

DO $$
BEGIN
  IF to_regclass('public.colecoes') IS NULL
     OR to_regclass('public.colecao_revisions') IS NULL THEN
    RAISE NOTICE 'colecoes/colecao_revisions não existem — trigger de revisão não alterado';
    RETURN;
  END IF;

  -- Só troca o trigger se as colunas que ele usa existem — senão todo UPDATE
  -- em colecoes passaria a falhar.
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'colecao_revisions'
        AND column_name IN ('colecao_id', 'rev_number', 'payload', 'metadata',
                            'change_summary', 'created_by', 'created_at')) < 7
     OR (SELECT count(*) FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'colecoes'
           AND column_name IN ('updated_by', 'created_by')) < 2 THEN
    RAISE NOTICE 'colunas esperadas ausentes — trigger de revisão não alterado';
    RETURN;
  END IF;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.archive_colecao_revision()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      v_rev       int;
      v_changes   jsonb;
      v_author    uuid;
      v_last_at   timestamptz;
      v_last_by   uuid;
    BEGIN
      v_author := COALESCE(auth.uid(), NEW.updated_by, OLD.updated_by, OLD.created_by);
      NEW.updated_by := v_author;

      IF NEW.payload IS NOT DISTINCT FROM OLD.payload
         AND NEW.metadata IS NOT DISTINCT FROM OLD.metadata THEN
        RETURN NEW;
      END IF;

      SELECT created_at, created_by INTO v_last_at, v_last_by
      FROM public.colecao_revisions
      WHERE colecao_id = OLD.id
      ORDER BY rev_number DESC
      LIMIT 1;

      -- Autosave: mesma pessoa editando em sequência vira uma revisão só.
      IF v_last_at IS NOT NULL
         AND v_last_at > now() - interval '10 minutes'
         AND v_last_by IS NOT DISTINCT FROM COALESCE(OLD.updated_by, OLD.created_by) THEN
        RETURN NEW;
      END IF;

      SELECT COALESCE(MAX(rev_number), 0) + 1 INTO v_rev
      FROM public.colecao_revisions
      WHERE colecao_id = OLD.id;

      IF jsonb_typeof(OLD.payload) = 'object' AND jsonb_typeof(NEW.payload) = 'object' THEN
        SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]'::jsonb) INTO v_changes
        FROM (
          SELECT DISTINCT key
          FROM (
            SELECT jsonb_object_keys(OLD.payload) AS key
            UNION
            SELECT jsonb_object_keys(NEW.payload) AS key
          ) AS all_keys
          WHERE OLD.payload -> key IS DISTINCT FROM NEW.payload -> key
        ) AS changed_keys;
      ELSE
        v_changes := '[]'::jsonb;
      END IF;

      INSERT INTO public.colecao_revisions (
        colecao_id, rev_number, payload, metadata, change_summary, created_by
      ) VALUES (
        OLD.id, v_rev, OLD.payload, OLD.metadata, v_changes,
        COALESCE(OLD.updated_by, OLD.created_by)
      );

      RETURN NEW;
    END;
    $body$;
  $fn$;

  EXECUTE 'DROP TRIGGER IF EXISTS trg_colecoes_archive ON public.colecoes';
  EXECUTE 'CREATE TRIGGER trg_colecoes_archive
             BEFORE UPDATE ON public.colecoes
             FOR EACH ROW EXECUTE FUNCTION public.archive_colecao_revision()';
END $$;
