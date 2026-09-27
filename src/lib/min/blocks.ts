/** Catálogo dos 13 blocos do MIN — o nome é o que o cliente vê; bloco/fase batem com o enum do banco. */

export const MIN_BLOCK_CATALOG = [
  { nome: "Proposta de Valor", bloco: "proposta_de_valor", fase: "fundacao" },
  {
    nome: "Segmentos de Clientes",
    bloco: "segmentos_de_clientes",
    fase: "fundacao",
  },
  { nome: "Atividades-Chave", bloco: "atividades_chave", fase: "fundacao" },
  { nome: "Modelo de Receita", bloco: "modelo_de_receita", fase: "fundacao" },
  {
    nome: "Comportamento do Consumidor",
    bloco: "comportamento_do_consumidor",
    fase: "fundacao",
  },
  { nome: "Jornada do Cliente", bloco: "jornada_do_cliente", fase: "fundacao" },
  {
    nome: "Canais de Engajamento",
    bloco: "canais_de_engajamento",
    fase: "operacao",
  },
  {
    nome: "Recursos Estratégicos",
    bloco: "recursos_estrategicos",
    fase: "operacao",
  },
  {
    nome: "Estrutura de Custos",
    bloco: "estrutura_de_custos",
    fase: "operacao",
  },
  {
    nome: "Ecossistema de Parceiros",
    bloco: "ecossistema_de_parceiros",
    fase: "consolidacao",
  },
  {
    nome: "Métricas de Impacto",
    bloco: "metricas_de_impacto",
    fase: "consolidacao",
  },
  {
    nome: "Cultura e Valores",
    bloco: "cultura_e_valores",
    fase: "consolidacao",
  },
  { nome: "Gestão de Riscos", bloco: "gestao_de_riscos", fase: "consolidacao" },
] as const;

export type MinBlocoNome = (typeof MIN_BLOCK_CATALOG)[number]["bloco"];
export type MinFase = (typeof MIN_BLOCK_CATALOG)[number]["fase"];

export interface MinPergunta {
  prompt: string;
  answer: string;
}

export function minBlockByNome(
  nome: string,
): (typeof MIN_BLOCK_CATALOG)[number] | null {
  return MIN_BLOCK_CATALOG.find((block) => block.nome === nome) ?? null;
}

export function minBlockLabel(bloco: string): string {
  return (
    MIN_BLOCK_CATALOG.find((block) => block.bloco === bloco)?.nome ?? bloco
  );
}

export function readMinPerguntas(conteudo: unknown): MinPergunta[] {
  if (!conteudo || typeof conteudo !== "object") return [];
  const raw = (conteudo as { perguntas?: unknown }).perguntas;
  if (!Array.isArray(raw)) return [];
  const out: MinPergunta[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const prompt = (row as { prompt?: unknown }).prompt;
    const answer = (row as { answer?: unknown }).answer;
    if (typeof prompt !== "string" || typeof answer !== "string") continue;
    const text = answer.trim();
    if (!text) continue;
    out.push({ prompt, answer: text });
  }
  return out;
}
