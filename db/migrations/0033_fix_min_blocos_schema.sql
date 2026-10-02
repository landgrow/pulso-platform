-- ⚠️  JÁ APLICADA EM PRODUÇÃO (27/09/2026). NÃO RODE DE NOVO: o DROP TABLE
--     abaixo apaga todas as respostas do MIN que existirem.
-- =============================================================================
-- Migration 0033 — Corrige o schema real de min_blocos em produção
-- =============================================================================
-- A tabela `min_blocos` existe em produção mas sem a coluna `bloco` (nunca foi
-- criada por nenhuma migration em db/migrations/ — só existe um desenho
-- correto em supabase/migrations/0002_min_and_journey.sql, uma linhagem
-- paralela que nunca rodou de verdade contra o banco real, ver 0009).
--
-- Isso quebra tanto a leitura (Painel/HQ: "column min_blocos.bloco does not
-- exist") quanto a GRAVAÇÃO de verdade — /api/min/submit → submitMinFromClient
-- (src/app/actions/min.ts) faz upsert com onConflict "cliente_id,bloco" nessa
-- mesma tabela, então todo cliente que tentar enviar um bloco do MIN real
-- (v2) está falhando silenciosamente em produção.
--
-- A tabela está vazia (0 linhas) em produção — confirmado antes de escrever
-- esta migration — então é seguro recriar do zero com o desenho correto,
-- idêntico ao de supabase/migrations/0002 (os mesmos 13 blocos que
-- src/lib/min/blocks.ts espera bater com o enum do banco).
-- =============================================================================

DROP TABLE IF EXISTS public.min_blocos;
DROP TYPE IF EXISTS public.min_bloco_nome;
DROP TYPE IF EXISTS public.min_fase;
DROP TYPE IF EXISTS public.min_maturidade;

CREATE TYPE public.min_fase AS ENUM ('fundacao', 'operacao', 'consolidacao');

CREATE TYPE public.min_bloco_nome AS ENUM (
  'proposta_de_valor', 'segmentos_de_clientes', 'atividades_chave',
  'modelo_de_receita', 'comportamento_do_consumidor', 'jornada_do_cliente',
  'canais_de_engajamento', 'recursos_estrategicos', 'estrutura_de_custos',
  'ecossistema_de_parceiros', 'metricas_de_impacto', 'cultura_e_valores', 'gestao_de_riscos'
);

CREATE TYPE public.min_maturidade AS ENUM ('inexistente', 'rascunho', 'funcional', 'otimizado');

CREATE TABLE public.min_blocos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  fase          public.min_fase NOT NULL,
  bloco         public.min_bloco_nome NOT NULL,
  conteudo      jsonb NOT NULL DEFAULT '{}'::jsonb,
  maturidade    public.min_maturidade NOT NULL DEFAULT 'inexistente',
  sessao_data   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, bloco)
);

COMMENT ON TABLE public.min_blocos IS
  'Os 13 blocos do MIN (Modelo Integrado de Negócio), em 3 fases. Um registro por bloco por cliente, atualizado a cada sessão.';

CREATE INDEX idx_min_blocos_cliente ON public.min_blocos(cliente_id);

CREATE TRIGGER trg_min_blocos_updated_at
  BEFORE UPDATE ON public.min_blocos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.min_blocos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.min_blocos FORCE ROW LEVEL SECURITY;

-- Leitura: quem já acessa a org do cliente (member/consultant/admin).
-- Escrita: o próprio cliente (via submitMinFromClient, autenticado) ou admin —
-- a action já valida sessão/slug antes de chamar o upsert, RLS é a segunda camada.
CREATE POLICY min_blocos_select ON public.min_blocos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clientes cl
      WHERE cl.id = min_blocos.cliente_id
        AND public.can_access_org(cl.org_id)
    )
  );

CREATE POLICY min_blocos_insert ON public.min_blocos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clientes cl
      WHERE cl.id = min_blocos.cliente_id
        AND public.can_access_org(cl.org_id)
    )
  );

CREATE POLICY min_blocos_update ON public.min_blocos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clientes cl
      WHERE cl.id = min_blocos.cliente_id
        AND public.can_access_org(cl.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clientes cl
      WHERE cl.id = min_blocos.cliente_id
        AND public.can_access_org(cl.org_id)
    )
  );
