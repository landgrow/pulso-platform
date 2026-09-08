-- =============================================================================
-- Migration 0007 — Versionamento de coleções (colecao_revisions)
-- =============================================================================
-- Story 1.6 — Motor de Coleções: cada UPDATE em `colecoes` arquiva a versão
-- anterior em `colecao_revisions` antes de sobrescrever, permitindo timeline
-- e rollback não-destrutivo.
--
-- Desvio em relação ao desenho original da story (1.6.story.md): a story
-- assumia que `created_by` na revision seria "quem escreveu aquela versão",
-- mas o trigger de exemplo gravava `auth.uid()` do usuário que está fazendo o
-- UPDATE atual — ou seja, quem *substituiu* a versão, não quem a escreveu.
-- Corrigido aqui adicionando `colecoes.updated_by` (não existia na 0005) para
-- rastrear o autor de cada versão de fato; o trigger arquiva `OLD.updated_by`
-- (com fallback pra `OLD.created_by` na primeira edição) e atualiza
-- `NEW.updated_by` a cada UPDATE.
-- =============================================================================

-- ─── Coluna: colecoes.updated_by ────────────────────────────────────────────

ALTER TABLE public.colecoes
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.colecoes.updated_by IS
  'Autor da última alteração de payload/metadata. Preenchido automaticamente pelo trigger trg_colecoes_archive.';

-- ─── Tabela: colecao_revisions ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.colecao_revisions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colecao_id     uuid NOT NULL REFERENCES public.colecoes(id) ON DELETE CASCADE,
  rev_number     int NOT NULL CHECK (rev_number > 0),
  payload        jsonb NOT NULL,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (colecao_id, rev_number)
);

COMMENT ON TABLE public.colecao_revisions IS
  'Snapshot imutável de uma versão anterior de uma colecao. Populada automaticamente pelo trigger trg_colecoes_archive antes de cada UPDATE.';

CREATE INDEX IF NOT EXISTS idx_revisions_colecao
  ON public.colecao_revisions (colecao_id, rev_number DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.colecao_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colecao_revisions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS revisions_select ON public.colecao_revisions;
DROP POLICY IF EXISTS revisions_insert ON public.colecao_revisions;

-- SELECT: mesma regra de acesso de `colecoes` (propaga via periodo -> cliente -> org)
CREATE POLICY revisions_select ON public.colecao_revisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.colecoes c
      JOIN public.periodos_dados p ON p.id = c.periodo_id
      JOIN public.clientes cl ON cl.id = p.cliente_id
      WHERE c.id = colecao_revisions.colecao_id
        AND public.can_access_org(cl.org_id)
    )
  );

-- INSERT: só o trigger (SECURITY DEFINER) ou service_role — mesmo padrão de audit_log
CREATE POLICY revisions_insert ON public.colecao_revisions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- UPDATE/DELETE: ninguém. Revisions são imutáveis (limpeza só via
-- cleanup_old_revisions(), que roda como SECURITY DEFINER — ver migration 0008).

-- ─── Trigger: arquiva a versão anterior antes de cada UPDATE ────────────────

CREATE OR REPLACE FUNCTION public.archive_colecao_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rev     int;
  v_changes jsonb;
BEGIN
  -- Só arquiva se payload ou metadata de fato mudaram — evita revision vazia
  -- em updates que só tocam status/updated_at (ex: discardColecao).
  IF NEW.payload IS NOT DISTINCT FROM OLD.payload
     AND NEW.metadata IS NOT DISTINCT FROM OLD.metadata THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(rev_number), 0) + 1
  INTO v_rev
  FROM public.colecao_revisions
  WHERE colecao_id = OLD.id;

  -- Chaves alteradas: união das chaves de OLD e NEW cujo valor difere
  -- (o desenho original da story só olhava as chaves de OLD, perdendo
  -- chaves novas presentes apenas em NEW.payload).
  SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]'::jsonb)
  INTO v_changes
  FROM (
    SELECT DISTINCT key
    FROM (
      SELECT jsonb_object_keys(OLD.payload) AS key
      UNION
      SELECT jsonb_object_keys(NEW.payload) AS key
    ) AS all_keys
    WHERE OLD.payload -> key IS DISTINCT FROM NEW.payload -> key
  ) AS changed_keys;

  INSERT INTO public.colecao_revisions (
    colecao_id, rev_number, payload, metadata, change_summary, created_by
  ) VALUES (
    OLD.id,
    v_rev,
    OLD.payload,
    OLD.metadata,
    v_changes,
    COALESCE(OLD.updated_by, OLD.created_by)
  );

  NEW.updated_by := auth.uid();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_colecoes_archive ON public.colecoes;

CREATE TRIGGER trg_colecoes_archive
  BEFORE UPDATE ON public.colecoes
  FOR EACH ROW EXECUTE FUNCTION public.archive_colecao_revision();
