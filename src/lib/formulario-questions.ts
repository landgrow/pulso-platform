/**
 * As 12 perguntas do formulário de coleta do PULSO.
 * Distribuídas em 6 áreas de análise (2 perguntas por área).
 * Fonte: PRD v1.0 seção 5.1.
 */

export type FormularioFieldTipo =
  "number" | "text" | "radio" | "select" | "textarea";

export interface FormularioOpcao {
  value: string;
  label: string;
}

export interface FormularioCampo {
  id: string; // ex: "fin_faturamento"
  tipo: FormularioFieldTipo;
  label: string;
  placeholder?: string;
  required: boolean;
  opcoes?: FormularioOpcao[]; // para radio/select
  sufixo?: string; // ex: "R$", "%"
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export interface FormularioBloco {
  area: string;
  cor: string; // classe Tailwind para borda lateral do bloco
  perguntas: FormularioCampo[];
}

export const FORMULARIO_BLOCOS: FormularioBloco[] = [
  {
    area: "Financeiro",
    cor: "border-lime-500",
    perguntas: [
      {
        id: "fin_faturamento",
        tipo: "number",
        label: "Faturamento mensal (R$)",
        placeholder: "Ex: 250000",
        required: true,
        sufixo: "R$",
        min: 0,
        max: 999_999_999,
      },
      {
        id: "fin_margem",
        tipo: "number",
        label: "Margem líquida (%)",
        placeholder: "Ex: 18",
        required: true,
        sufixo: "%",
        min: -100,
        max: 100,
      },
    ],
  },
  {
    area: "Operacional",
    cor: "border-blue-500",
    perguntas: [
      {
        id: "op_equipe_tamanho",
        tipo: "number",
        label: "Quantas pessoas no time?",
        placeholder: "Ex: 12",
        required: true,
        min: 0,
        max: 9999,
      },
      {
        id: "op_processos_doc",
        tipo: "radio",
        label: "Processos estão documentados?",
        required: true,
        opcoes: [
          { value: "sim", label: "Sim, todos ou quase todos" },
          { value: "parcial", label: "Parcialmente" },
          { value: "nao", label: "Não" },
        ],
      },
    ],
  },
  {
    area: "Comercial",
    cor: "border-violet-500",
    perguntas: [
      {
        id: "com_clientes_ativos",
        tipo: "number",
        label: "Quantos clientes ativos você tem?",
        placeholder: "Ex: 45",
        required: true,
        min: 0,
        max: 999999,
      },
      {
        id: "com_ticket_medio",
        tipo: "number",
        label: "Ticket médio (R$)",
        placeholder: "Ex: 1200",
        required: true,
        sufixo: "R$",
        min: 0,
        max: 999_999_999,
      },
    ],
  },
  {
    area: "Pessoas",
    cor: "border-amber-500",
    perguntas: [
      {
        id: "pes_turnover",
        tipo: "number",
        label: "Taxa de turnover (últimos 12 meses, %)",
        placeholder: "Ex: 15",
        required: true,
        sufixo: "%",
        min: 0,
        max: 100,
      },
      {
        id: "pes_avaliacao",
        tipo: "select",
        label: "Frequência de avaliação de desempenho",
        required: true,
        opcoes: [
          { value: "mensal", label: "Mensal" },
          { value: "trimestral", label: "Trimestral" },
          { value: "semestral", label: "Semestral" },
          { value: "anual", label: "Anual" },
          { value: "nao_faz", label: "Não faz avaliação" },
        ],
      },
    ],
  },
  {
    area: "Estratégico",
    cor: "border-rose-500",
    perguntas: [
      {
        id: "est_okr_ativo",
        tipo: "radio",
        label: "Vocês têm OKRs ativos no momento?",
        required: true,
        opcoes: [
          { value: "sim", label: "Sim" },
          { value: "nao", label: "Não" },
        ],
      },
      {
        id: "est_revisao_estrategica",
        tipo: "radio",
        label: "Fazem revisão estratégica periódica?",
        required: true,
        opcoes: [
          { value: "sim", label: "Sim" },
          { value: "nao", label: "Não" },
        ],
      },
    ],
  },
  {
    area: "Marketing",
    cor: "border-cyan-500",
    perguntas: [
      {
        id: "mkt_instagram_seguidores",
        tipo: "number",
        label: "Quantos seguidores no Instagram?",
        placeholder: "Ex: 3200",
        required: false,
        min: 0,
        max: 999_999_999,
      },
      {
        id: "mkt_descricao",
        tipo: "textarea",
        label: "Como você descreveria seus esforços de marketing?",
        placeholder: "Ex: Focamos em Instagram e indication...",
        required: false,
        minLength: 0,
        maxLength: 1000,
      },
    ],
  },
];

/** Flat list de todos os campos, úteis para validação e iteração */
export const ALL_FORMULARIO_CAMPOS = FORMULARIO_BLOCOS.flatMap((b) =>
  b.perguntas.map((p) => ({ ...p, area: b.area })),
);
