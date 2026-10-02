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

export const MIN_FASE_LABEL: Record<MinFase, string> = {
  fundacao: "Fundação & Validação",
  operacao: "Operação & Eficiência",
  consolidacao: "Consolidação & Governança",
};

/** Visual de cada bloco no portal — mesmas cores/tags do protótipo. */
export const MIN_BLOCK_META: Record<
  MinBlocoNome,
  { color: string; tags: string[] }
> = {
  proposta_de_valor: { color: "#3b82f6", tags: ["Canvas", "Cliente"] },
  segmentos_de_clientes: { color: "#ec4899", tags: ["ICP", "Persona"] },
  atividades_chave: { color: "#10b981", tags: ["Operação"] },
  modelo_de_receita: { color: "#f59e0b", tags: ["Financeiro"] },
  comportamento_do_consumidor: { color: "#8b5cf6", tags: ["Pesquisa"] },
  jornada_do_cliente: { color: "#06b6d4", tags: ["Experiência"] },
  canais_de_engajamento: { color: "#14b8a6", tags: ["Marketing"] },
  recursos_estrategicos: { color: "#38bdf8", tags: ["Time", "Infra"] },
  estrutura_de_custos: { color: "#ef4444", tags: ["Financeiro"] },
  ecossistema_de_parceiros: { color: "#6366f1", tags: ["Parcerias"] },
  metricas_de_impacto: { color: "#3b82f6", tags: ["KPI"] },
  cultura_e_valores: { color: "#ec4899", tags: ["Pessoas"] },
  gestao_de_riscos: { color: "#f59e0b", tags: ["Compliance"] },
};

/** Perguntas-guia de cada bloco (uma por vez no fluxo guiado). */
export const MIN_GUIDES: Record<MinBlocoNome, string[]> = {
  proposta_de_valor: [
    "O que o cliente compra de vocês, na prática — não o que está no site?",
    "O que deixa de ser verdade se vocês saírem do mercado?",
    "Por que o cliente escolhe vocês e não o segundo colocado?",
  ],
  segmentos_de_clientes: [
    "Quem paga de verdade, com nome e contexto — não 'o mercado'?",
    "Qual cliente vocês deveriam recusar e ainda aceitam?",
    "O que esses clientes têm em comum quando fecham?",
  ],
  atividades_chave: [
    "Sem quais 3 atividades a empresa para na semana?",
    "O que só o fundador ainda faz e não deveria?",
    "O que está documentado versus o que vive na cabeça de alguém?",
    "Qual atividade consome tempo e não muda o resultado?",
  ],
  modelo_de_receita: [
    "De onde entra o dinheiro este mês, linha a linha?",
    "O que é recorrente e o que é sorte de projeto?",
    "O que acontece no caixa se um cliente grande atrasar 30 dias?",
  ],
  comportamento_do_consumidor: [
    "O que o cliente faz antes de procurar vocês?",
    "Em que momento ele desiste ou some?",
    "O que ele diz que quer e o que ele de fato compra?",
    "Quem influencia a decisão além de quem assina?",
  ],
  jornada_do_cliente: [
    "Qual o primeiro contato real até o dinheiro cair?",
    "Onde a informação some entre uma etapa e outra?",
    "O que o cliente sente no pós-venda — e quem responde isso?",
  ],
  canais_de_engajamento: [
    "Por qual canal chega o cliente que paga bem?",
    "Qual canal vocês alimentam por hábito e não por resultado?",
  ],
  recursos_estrategicos: [
    "Sem o que a operação não entrega: pessoa, sistema ou relacionamento?",
    "O que é insubstituível hoje e não tem plano B?",
    "O que está alugado na prática (dependência) e vocês tratam como próprio?",
  ],
  estrutura_de_custos: [
    "Quais custos sobem juntos com a receita — e quais sobem sozinhos?",
    "O que é custo fixo disfarçado de variável?",
    "O que vocês pagam todo mês sem saber se ainda faz sentido?",
  ],
  ecossistema_de_parceiros: [
    "Quem, fora da empresa, segura uma ponta crítica da entrega?",
    "O que quebra se esse parceiro some na sexta?",
  ],
  metricas_de_impacto: [
    "Qual número, sozinho, diz se o mês foi bom?",
    "Que indicador o time olha — e que indicador o caixa sente?",
    "O que vocês medem porque é fácil, não porque decide?",
  ],
  cultura_e_valores: [
    "O que acontece aqui quando alguém erra de verdade?",
    "Qual comportamento é premiado mesmo quando o discurso diz o contrário?",
  ],
  gestao_de_riscos: [
    "Qual risco, se explodir amanhã, para a empresa?",
    "O que já aconteceu e ainda não virou regra?",
    "Quem decide sozinho sob pressão — e sem checklist?",
  ],
};

export const MIN_TOTAL_PERGUNTAS = Object.values(MIN_GUIDES).reduce(
  (n, qs) => n + qs.length,
  0,
);

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
