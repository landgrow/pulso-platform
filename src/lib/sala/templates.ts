export type SalaKitId = "projeto" | "campanha" | "feedback" | "marca";

export interface SalaKit {
  id: SalaKitId;
  title: string;
  blurb: string;
  canvasTitle: string;
  canvasBody: string;
  listTitle?: string;
  listItems?: string[];
}

export const SALA_KITS: SalaKit[] = [
  {
    id: "projeto",
    title: "Kit inicial de projeto",
    blurb: "Contexto, objetivos e checklist de tarefas.",
    canvasTitle: "Visão geral do projeto",
    canvasBody: [
      "Visão geral do projeto",
      "",
      "Boas-vindas ao canal. Este canvas reúne o que o time precisa saber: contexto, donos e links.",
      "",
      "Descrição do projeto",
      "Adicione um breve resumo do que estamos fazendo e por quê.",
      "",
      "Objetivos",
      "1. Primeiro objetivo",
      "2. Segundo objetivo",
      "3. Terceiro objetivo",
      "",
      "Pessoas",
      "Operações: ",
      "Design: ",
      "Comercial: ",
    ].join("\n"),
    listTitle: "Rastreador do projeto",
    listItems: [
      "Plano de trabalho",
      "Kickoff com a equipe",
      "Primeira entrega",
    ],
  },
  {
    id: "campanha",
    title: "Campanha de marketing",
    blurb: "Campanha, diretrizes e checklist de tarefas.",
    canvasTitle: "Visão geral da campanha",
    canvasBody: [
      "Visão geral da campanha",
      "",
      "O que o time precisa saber sobre esta campanha, além dos links e das pessoas envolvidas.",
      "",
      "Descrição da campanha",
      "Público, oferta, canal e prazo.",
      "",
      "Diretrizes",
      "- Tom de voz",
      "- O que não afirmar",
      "- Peças desta semana",
    ].join("\n"),
    listTitle: "Controle da campanha",
    listItems: ["Briefing aprovado", "Peças em produção", "Veiculação"],
  },
  {
    id: "feedback",
    title: "Coleta e triagem de feedback",
    blurb: "Um lugar só para incoming, prioridade e dono.",
    canvasTitle: "Coleta de feedback",
    canvasBody: [
      "Coleta e triagem de feedback",
      "",
      "O que entra neste canal, como classificar e quem responde.",
      "",
      "Critérios",
      "- Urgente: quebra operação ou cliente ativo",
      "- Melhoria: pedido recorrente",
      "- Ideia: explorar depois",
    ].join("\n"),
    listTitle: "Triagem",
    listItems: [
      "Capturar incoming da semana",
      "Classificar prioridade",
      "Responder os urgentes",
    ],
  },
  {
    id: "marca",
    title: "Centro de diretrizes da marca",
    blurb:
      "Fonte única de tom, o que a Land Grow pode afirmar e o que já reprovou.",
    canvasTitle: "Diretrizes da marca",
    canvasBody: [
      "Centro de diretrizes da marca",
      "",
      "Tom: direto, concreto, sem jargão interno para o cliente.",
      "",
      "Pode afirmar",
      "- O que está documentado e validado na fonte",
      "",
      "Não afirmar",
      "- Causalidade, garantia ou mérito que a evidência não sustenta",
    ].join("\n"),
  },
];

export function salaKitById(id: string): SalaKit | null {
  return SALA_KITS.find((kit) => kit.id === id) ?? null;
}
