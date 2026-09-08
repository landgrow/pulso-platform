-- =============================================================================
-- Migration 0005 — Motor de Coleções: Schema base
-- =============================================================================
-- Tabelas: clientes, periodos_dados, colecoes, evidencias
-- RLS default-deny em todas.
-- =============================================================================

-- ─── Tabela: clientes (1:1 com organizations) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.clientes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cnpj          text,
  setor         text,
  porte         text
                  CHECK (porte IN ('micro', 'pequena', 'media', 'grande')),
  faturamento_faixa  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clientes IS
  'Perfil de cliente (dados de negócio). 1:1 com organizations.';

-- ─── Tabela: periodos_dados ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.periodos_dados (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  mes           int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano           int NOT NULL CHECK (ano >= 2024),
  status        text NOT NULL DEFAULT 'em_coleta'
                  CHECK (status IN ('em_coleta', 'pronto_para_analise', 'analisado', 'fechado')),
  closed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, ano, mes)
);

COMMENT ON TABLE public.periodos_dados IS
  'Períodos mensais de coleta de dados. 1:N com clientes.';

-- ─── Tabela: colecoes ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.colecoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id    uuid NOT NULL REFERENCES public.periodos_dados(id) ON DELETE CASCADE,
  tipo          text NOT NULL
                  CHECK (tipo IN ('formulario', 'texto_livre', 'transcricao_audio')),
  status        text NOT NULL DEFAULT 'rascunho'
                  CHECK (status IN ('rascunho', 'validado', 'descartado')),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.colecoes IS
  'Coleções de dados por período: formulário estruturado, texto livre ou transcrição de áudio.';

-- ─── Tabela: evidencias ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.evidencias (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id          uuid NOT NULL REFERENCES public.periodos_dados(id) ON DELETE CASCADE,
  tipo                text NOT NULL
                        CHECK (tipo IN ('pdf', 'excel', 'csv', 'audio', 'outro')),
  storage_path        text NOT NULL,
  nome_original       text NOT NULL,
  mime_type           text NOT NULL,
  tamanho_bytes       bigint NOT NULL,
  hash                text NOT NULL,
  transcricao         text,
  transcricao_status  text
                        CHECK (transcricao_status IN ('pending', 'processing', 'completed', 'failed')),
  uploaded_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.evidencias IS
  'Arquivos de evidência (PDF, Excel, CSV, áudio) armazenados no Supabase Storage.';

-- ─── Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_clientes_org_id
  ON public.clientes (org_id);

CREATE INDEX IF NOT EXISTS idx_periodos_cliente_id
  ON public.periodos_dados (cliente_id);

CREATE INDEX IF NOT EXISTS idx_periodos_ano_mes
  ON public.periodos_dados (ano DESC, mes DESC);

CREATE INDEX IF NOT EXISTS idx_colecoes_periodo_id
  ON public.colecoes (periodo_id);

CREATE INDEX IF NOT EXISTS idx_colecoes_tipo
  ON public.colecoes (periodo_id, tipo);

CREATE INDEX IF NOT EXISTS idx_evidencias_periodo_id
  ON public.evidencias (periodo_id);

CREATE INDEX IF NOT EXISTS idx_evidencias_hash
  ON public.evidencias (hash);

-- ─── Triggers updated_at ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_clientes_updated_at      ON public.clientes;
DROP TRIGGER IF EXISTS trg_periodos_updated_at     ON public.periodos_dados;
DROP TRIGGER IF EXISTS trg_colecoes_updated_at      ON public.colecoes;

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_periodos_updated_at
  BEFORE UPDATE ON public.periodos_dados
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_colecoes_updated_at
  BEFORE UPDATE ON public.colecoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS: Habilitar em todas ───────────────────────────────────────────────

ALTER TABLE public.clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_dados    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_dados    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.colecoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colecoes          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias        FORCE ROW LEVEL SECURITY;

-- ─── RLS: políticas clientes ────────────────────────────────────────────────

DROP POLICY IF EXISTS clientes_select ON public.clientes;
DROP POLICY IF EXISTS clientes_insert ON public.clientes;
DROP POLICY IF EXISTS clientes_update ON public.clientes;
DROP POLICY IF EXISTS clientes_delete ON public.clientes;

-- SELECT: quem pode acessar a org, pode ver o cliente
CREATE POLICY clientes_select ON public.clientes
  FOR SELECT
  USING (public.can_access_org(org_id));

-- INSERT: client_owner ou platform_admin
CREATE POLICY clientes_insert ON public.clientes
  FOR INSERT
  WITH CHECK (public.has_org_role(org_id, 'client_owner') OR public.is_platform_admin());

-- UPDATE: platform_admin ou member da org (dados de negócio)
CREATE POLICY clientes_update ON public.clientes
  FOR UPDATE
  USING (public.can_access_org(org_id))
  WITH CHECK (public.can_access_org(org_id));

-- DELETE: apenas platform_admin
CREATE POLICY clientes_delete ON public.clientes
  FOR DELETE
  USING (public.is_platform_admin());

-- ─── RLS: políticas periodos_dados ─────────────────────────────────────────

DROP POLICY IF EXISTS periodos_select ON public.periodos_dados;
DROP POLICY IF EXISTS periodos_insert ON public.periodos_dados;
DROP POLICY IF EXISTS periodos_update ON public.periodos_dados;
DROP POLICY IF EXISTS periodos_delete ON public.periodos_dados;

-- SELECT: membros da org
CREATE POLICY periodos_select ON public.periodos_dados
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = periodos_dados.cliente_id
        AND public.can_access_org(c.org_id)
    )
  );

-- INSERT: client_member+ (qualquer membro pode criar período)
CREATE POLICY periodos_insert ON public.periodos_dados
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = periodos_dados.cliente_id
        AND public.can_access_org(c.org_id)
    )
  );

-- UPDATE: membros da org (não permite UPDATE se status = 'fechado')
CREATE POLICY periodos_update ON public.periodos_dados
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = periodos_dados.cliente_id
        AND public.can_access_org(c.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = periodos_dados.cliente_id
        AND public.can_access_org(c.org_id)
    )
  );

-- DELETE: apenas platform_admin
CREATE POLICY periodos_delete ON public.periodos_dados
  FOR DELETE
  USING (public.is_platform_admin());

-- ─── RLS: políticas colecoes ────────────────────────────────────────────────

DROP POLICY IF EXISTS colecoes_select ON public.colecoes;
DROP POLICY IF EXISTS colecoes_insert ON public.colecoes;
DROP POLICY IF EXISTS colecoes_update ON public.colecoes;
DROP POLICY IF EXISTS colecoes_delete ON public.colecoes;

-- SELECT: membros da org
CREATE POLICY colecoes_select ON public.colecoes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = colecoes.periodo_id
        AND public.can_access_org(c.org_id)
    )
  );

-- INSERT: client_member+ (qualquer membro pode criar coleção)
CREATE POLICY colecoes_insert ON public.colecoes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = colecoes.periodo_id
        AND public.can_access_org(c.org_id)
    )
  );

-- UPDATE: membros da org
CREATE POLICY colecoes_update ON public.colecoes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = colecoes.periodo_id
        AND public.can_access_org(c.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = colecoes.periodo_id
        AND public.can_access_org(c.org_id)
    )
  );

-- DELETE: platform_admin ou client_owner
CREATE POLICY colecoes_delete ON public.colecoes
  FOR DELETE
  USING (public.is_platform_admin());

-- ─── RLS: políticas evidencias ────────────────────────────────────────────────

DROP POLICY IF EXISTS evidencias_select ON public.evidencias;
DROP POLICY IF EXISTS evidencias_insert ON public.evidencias;
DROP POLICY IF EXISTS evidencias_update ON public.evidencias;
DROP POLICY IF EXISTS evidencias_delete ON public.evidencias;

-- SELECT: membros da org
CREATE POLICY evidencias_select ON public.evidencias
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = evidencias.periodo_id
        AND public.can_access_org(c.org_id)
    )
  );

-- INSERT: client_member+
CREATE POLICY evidencias_insert ON public.evidencias
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = evidencias.periodo_id
        AND public.can_access_org(c.org_id)
    )
  );

-- UPDATE: membros da org (transcricao_status, transcricao)
CREATE POLICY evidencias_update ON public.evidencias
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = evidencias.periodo_id
        AND public.can_access_org(c.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.periodos_dados p
      JOIN public.clientes c ON c.id = p.cliente_id
      WHERE p.id = evidencias.periodo_id
        AND public.can_access_org(c.org_id)
    )
  );

-- DELETE: uploader ou platform_admin
CREATE POLICY evidencias_delete ON public.evidencias
  FOR DELETE
  USING (
    public.is_platform_admin()
    OR uploaded_by = auth.uid()
  );

-- ─── Funções helper para o app ──────────────────────────────────────────────

-- Lista períodos de uma organização
CREATE OR REPLACE FUNCTION public.list_periods_for_org(p_org_id uuid)
RETURNS TABLE (
  id uuid,
  mes int,
  ano int,
  status text,
  closed_at timestamptz,
  created_at timestamptz,
  colecoes_count bigint,
  evidencias_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pd.id,
    pd.mes,
    pd.ano,
    pd.status,
    pd.closed_at,
    pd.created_at,
    (
      SELECT count(*)::bigint
      FROM public.colecoes c
      WHERE c.periodo_id = pd.id
    ) AS colecoes_count,
    (
      SELECT count(*)::bigint
      FROM public.evidencias e
      WHERE e.periodo_id = pd.id
    ) AS evidencias_count
  FROM public.periodos_dados pd
  JOIN public.clientes c ON c.id = pd.cliente_id
  WHERE c.org_id = p_org_id
  ORDER BY pd.ano DESC, pd.mes DESC;
END;
$$;

COMMENT ON FUNCTION public.list_periods_for_org IS
  'Lista todos os períodos de uma organização ordenados por ano/mes decrescente.';
