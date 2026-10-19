-- A tabela min_blocos no banco live nasceu sem fase/bloco/maturidade.
-- O HQ lê e grava essas colunas; sem elas o Painel quebra com
-- "column min_blocos.bloco does not exist".

DO $$ BEGIN
  CREATE TYPE public.min_fase AS ENUM ('fundacao', 'operacao', 'consolidacao');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.min_bloco_nome AS ENUM (
    'proposta_de_valor', 'segmentos_de_clientes', 'atividades_chave',
    'modelo_de_receita', 'comportamento_do_consumidor', 'jornada_do_cliente',
    'canais_de_engajamento', 'recursos_estrategicos', 'estrutura_de_custos',
    'ecossistema_de_parceiros', 'metricas_de_impacto', 'cultura_e_valores', 'gestao_de_riscos'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.min_maturidade AS ENUM ('inexistente', 'rascunho', 'funcional', 'otimizado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.min_blocos
  ADD COLUMN IF NOT EXISTS fase public.min_fase,
  ADD COLUMN IF NOT EXISTS bloco public.min_bloco_nome,
  ADD COLUMN IF NOT EXISTS maturidade public.min_maturidade NOT NULL DEFAULT 'inexistente';

CREATE UNIQUE INDEX IF NOT EXISTS min_blocos_cliente_bloco_uidx
  ON public.min_blocos (cliente_id, bloco);
