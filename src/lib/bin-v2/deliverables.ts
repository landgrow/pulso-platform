import { selectedLabels } from "./answers";
import type { BinGateResult } from "./gates";
import { getBinQuestion, questionsInSection } from "./instrument";
import type { BinPack } from "./pack";
import type { BinReading, BinSectionReading } from "./reading";
import { formatBinNota } from "./score";
import type { BinAnswers, BinQuestion, BinSection } from "./types";
import type { BinVerifyFlag } from "./verify";

export type BinDeliverableKind =
  "radar" | "compass" | "horizon" | "route_planner";

export interface BinDeliverable {
  kind: BinDeliverableKind;
  nome: string;
  desc: string;
  scope: "setor" | "conjunto";
  sectionId: string | null;
  sectionTitle: string | null;
  status: "pronto" | "parcial";
  headline: string;
  bullets: string[];
}

export interface BinDeliverableSet {
  sectionId: string | null;
  sectionTitle: string | null;
  items: BinDeliverable[];
}

const KIND_META: Record<BinDeliverableKind, { nome: string; desc: string }> = {
  radar: {
    nome: "RADAR",
    desc: "Saúde do setor: nota, faixa, teto e o que ficou de fora.",
  },
  compass: {
    nome: "COMPASS",
    desc: "Síntese estratégica dos achados, já subordinada aos portões.",
  },
  horizon: {
    nome: "HORIZON",
    desc: "O que falta existir contra o que a empresa declara conseguir.",
  },
  route_planner: {
    nome: "ROUTE PLANNER",
    desc: "Ordem de ação: continuidade, fôlego, depois estrutura.",
  },
};

function readySections(reading: BinReading): BinSectionReading[] {
  return reading.sections.filter(
    (row) => row.section.id !== "geral" && row.submitted,
  );
}

function flagsInSection(
  flags: BinVerifyFlag[],
  section: BinSection,
): BinVerifyFlag[] {
  const ids = new Set(section.questionIds);
  return flags.filter(
    (flag) => ids.has(flag.questaoA) || ids.has(flag.questaoB),
  );
}

function fundamentoZeros(
  section: BinSection,
  answers: BinAnswers,
  pack: BinPack,
): { question: BinQuestion; label: string }[] {
  const gaps: { question: BinQuestion; label: string }[] = [];
  for (const question of questionsInSection(section, pack.instrument)) {
    if (question.layer !== "fundamento") continue;
    if (!question.destinations.includes("pontua")) continue;
    const labels = selectedLabels(question, answers);
    const option = question.options.find((item) => labels.includes(item.label));
    if (option?.valorRelativo !== 0) continue;
    gaps.push({ question, label: option.label });
  }
  return gaps;
}

function gateBullets(gates: BinGateResult[]): string[] {
  return gates.map((gate) => {
    const tag =
      gate.status === "disparado" ||
      gate.status === "nao_gera" ||
      gate.status === "folego_curto"
        ? "disparado"
        : gate.status === "aguardando"
          ? "aguardando"
          : gate.status === "subordinado"
            ? "subordinado"
            : "ok";
    return `Portão ${gate.id === "portao_1" ? "1" : gate.id === "portao_2" ? "2" : "3"} · ${gate.nome}: ${tag}. ${gate.resumo}`;
  });
}

function makeDeliverable(
  kind: BinDeliverableKind,
  args: {
    scope: "setor" | "conjunto";
    sectionId: string | null;
    sectionTitle: string | null;
    status: "pronto" | "parcial";
    headline: string;
    bullets: string[];
  },
): BinDeliverable {
  return {
    kind,
    nome: KIND_META[kind].nome,
    desc: KIND_META[kind].desc,
    ...args,
  };
}

function radarForSection(
  row: BinSectionReading,
  flags: BinVerifyFlag[],
  parcial: boolean,
): BinDeliverable {
  const { section, score } = row;
  const bullets: string[] = [];
  if (score.status === "nota" && score.nota !== null) {
    bullets.push(
      `Nota ${formatBinNota(score.nota)}${score.faixa ? ` · ${score.faixa}` : ""}. Bruta ${score.notaBruta ?? "—"}, teto ${score.tetoSetor ?? 100}.`,
    );
    if (score.peso8Zeros.length > 0) {
      bullets.push(
        `Teto disparado pelas questões de peso 8 no zero: ${score.peso8Zeros.join(", ")}.`,
      );
    }
    if (score.bloqueios.length > 0) {
      bullets.push(
        `Refinamento bloqueado pelo fundamento: ${score.bloqueios
          .map(
            (b) =>
              `${b.questionId} ${b.declarado}→${b.final} (via ${b.fundamentoId})`,
          )
          .join("; ")}.`,
      );
    }
  } else if (score.status === "nao_avaliavel") {
    bullets.push(
      `Setor não avaliável: peso aplicável ${score.pesosAplicaveis} de ${score.pesosTotais} (abaixo de 60%).`,
    );
  } else {
    bullets.push("Setor ainda sem nota fechada.");
  }
  if (score.foraDoCalculo.length > 0) {
    bullets.push(
      `Fora do cálculo: ${score.foraDoCalculo
        .map((item) => `${item.questionId} (${item.motivo})`)
        .join("; ")}.`,
    );
  }
  const localFlags = flagsInSection(flags, section);
  if (localFlags.length > 0) {
    bullets.push(
      `Inconsistências neste setor: ${localFlags.map((flag) => flag.regra).join(", ")}.`,
    );
  }
  const headline =
    score.status === "nota" && score.nota !== null
      ? `${section.title}: ${formatBinNota(score.nota)}${score.faixa ? ` · ${score.faixa}` : ""}`
      : `${section.title}: sem nota ainda`;
  return makeDeliverable("radar", {
    scope: "setor",
    sectionId: section.id,
    sectionTitle: section.title,
    status: parcial ? "parcial" : "pronto",
    headline,
    bullets,
  });
}

function compassForSection(
  row: BinSectionReading,
  reading: BinReading,
  parcial: boolean,
): BinDeliverable {
  const bullets = [
    ...gateBullets([
      reading.gates.portao1,
      reading.gates.portao2,
      reading.gates.portao3,
    ]),
  ];
  const localFlags = flagsInSection(reading.flags, row.section);
  if (reading.gates.bloqueiaEstrutura) {
    bullets.push(
      `A nota de ${row.section.title} não abre a conversa. Primeiro o que os portões superiores pedem.`,
    );
  } else if (row.score.status === "nota" && row.score.faixa) {
    bullets.push(
      `${row.section.title} está ${row.score.faixa}. Essa é a leitura estrutural deste setor com o que já foi respondido.`,
    );
  }
  if (localFlags.length > 0) {
    bullets.push(
      `Há dado sob suspeita neste setor (${localFlags
        .map((flag) => `${flag.regra}/${flag.classe}`)
        .join(", ")}). A bandeira não muda a nota; muda a confiança.`,
    );
  }
  const lastro = reading.lastro.filter(
    (flag) => flag.setorId === row.section.id,
  );
  for (const flag of lastro) bullets.push(flag.resumo);
  return makeDeliverable("compass", {
    scope: "setor",
    sectionId: row.section.id,
    sectionTitle: row.section.title,
    status: parcial ? "parcial" : "pronto",
    headline: reading.gates.bloqueiaEstrutura
      ? `${row.section.title} lido, mas subordinado aos portões`
      : `Leitura estratégica de ${row.section.title}`,
    bullets,
  });
}

function horizonForSection(
  row: BinSectionReading,
  answers: BinAnswers,
  pack: BinPack,
  parcial: boolean,
): BinDeliverable {
  const gaps = fundamentoZeros(row.section, answers, pack);
  const bullets: string[] = [];
  if (gaps.length === 0) {
    bullets.push(
      `Nenhum fundamento deste setor está no zero. O gap, se existir, está na prática ou no refinamento.`,
    );
  } else {
    bullets.push(
      `Elementos que ainda não existem neste setor: ${gaps
        .map((gap) => `${gap.question.id} (${gap.label})`)
        .join("; ")}.`,
    );
  }
  if (row.score.cobertura) {
    bullets.push(
      `Leitura por cobertura: ${row.score.cobertura.existem} de ${row.score.cobertura.total} elementos pontuáveis já existem.`,
    );
  }
  const open = questionsInSection(row.section, pack.instrument).filter(
    (q) => q.ui === "textarea",
  );
  for (const question of open) {
    const value = answers[question.id];
    if (typeof value === "string" && value.trim()) {
      bullets.push(`${question.id} (visão declarada): ${value.trim()}`);
    }
  }
  return makeDeliverable("horizon", {
    scope: "setor",
    sectionId: row.section.id,
    sectionTitle: row.section.title,
    status: parcial ? "parcial" : "pronto",
    headline:
      gaps.length > 0
        ? `${row.section.title}: ${gaps.length} fundamento(s) ainda no zero`
        : `${row.section.title}: base declarada presente`,
    bullets,
  });
}

function routeForSection(
  row: BinSectionReading,
  answers: BinAnswers,
  reading: BinReading,
  pack: BinPack,
  parcial: boolean,
): BinDeliverable {
  const bullets: string[] = [];
  const { portao1, portao2 } = reading.gates;
  if (portao1.status === "disparado") {
    const local = portao1.hits.filter((hit) =>
      row.section.questionIds.includes(hit.questionId),
    );
    bullets.push(
      local.length > 0
        ? `Prioridade 1, continuidade neste setor: ${local.map((hit) => `${hit.questionId} · ${hit.label}`).join("; ")}.`
        : "Prioridade 1 está em outro setor. Este setor não abre o plano enquanto a continuidade não for tratada.",
    );
  }
  if (portao2.status === "nao_gera" || portao2.status === "folego_curto") {
    const local = portao2.hits.filter((hit) =>
      row.section.questionIds.includes(hit.questionId),
    );
    bullets.push(
      local.length > 0
        ? `Prioridade 2, fôlego: ${local.map((hit) => `${hit.questionId} · ${hit.label}`).join("; ")}. Nada que custe entra na frente disso.`
        : "Prioridade 2 (caixa) está no financeiro. Ação estrutural deste setor só depois de haver fôlego.",
    );
  }
  const gaps = fundamentoZeros(row.section, answers, pack);
  const structural = gaps.slice(0, 4).map((gap) => {
    const question = getBinQuestion(gap.question.id, pack.instrument);
    return `${gap.question.id}: instalar o fundamento "${question?.prompt ?? gap.question.id}" — hoje: ${gap.label}`;
  });
  if (structural.length > 0) {
    const prefix = reading.gates.bloqueiaEstrutura
      ? "Prioridade 3, estrutura (só depois dos portões)"
      : "Prioridade 1 deste setor, estrutura";
    bullets.push(`${prefix}: ${structural.join("; ")}.`);
  } else if (
    row.score.status === "nota" &&
    row.score.faixa &&
    row.score.faixa !== "excelente"
  ) {
    bullets.push(
      `Sem fundamento no zero. A ação estrutural é subir a prática das questões de peso 8 que não estão no topo.`,
    );
  }
  if (bullets.length === 0) {
    bullets.push(
      "Nenhuma ação estrutural urgente neste setor com o que já foi respondido.",
    );
  }
  if (parcial) {
    bullets.push(
      "Esta ordem pode mudar quando os outros setores forem respondidos — sobretudo Pessoas, Jurídico, Vendas e Financeiro, que alimentam os portões.",
    );
  }
  return makeDeliverable("route_planner", {
    scope: "setor",
    sectionId: row.section.id,
    sectionTitle: row.section.title,
    status: parcial ? "parcial" : "pronto",
    headline: `Plano de ${row.section.title}`,
    bullets,
  });
}

function conjuntoRadar(
  rows: BinSectionReading[],
  parcial: boolean,
): BinDeliverable {
  const ordered = [...rows].sort((a, b) => {
    const na = a.score.nota ?? 101;
    const nb = b.score.nota ?? 101;
    return na - nb;
  });
  return makeDeliverable("radar", {
    scope: "conjunto",
    sectionId: null,
    sectionTitle: null,
    status: parcial ? "parcial" : "pronto",
    headline: `Radar dos ${rows.length} setor(es) já respondido(s)`,
    bullets: ordered.map((row) => {
      if (row.score.status === "nota" && row.score.nota !== null) {
        return `${row.section.title}: ${formatBinNota(row.score.nota)}${row.score.faixa ? ` · ${row.score.faixa}` : ""}`;
      }
      if (row.score.status === "nao_avaliavel") {
        return `${row.section.title}: não avaliável`;
      }
      return `${row.section.title}: incompleto`;
    }),
  });
}

function conjuntoCompass(
  reading: BinReading,
  rows: BinSectionReading[],
  parcial: boolean,
): BinDeliverable {
  const bullets = gateBullets([
    reading.gates.portao1,
    reading.gates.portao2,
    reading.gates.portao3,
  ]);
  const worst = [...rows]
    .filter((row) => row.score.nota !== null)
    .sort((a, b) => (a.score.nota ?? 0) - (b.score.nota ?? 0))
    .slice(0, 3);
  if (worst.length > 0) {
    bullets.push(
      `Setores mais fracos entre os já respondidos: ${worst
        .map(
          (row) =>
            `${row.section.title} (${formatBinNota(row.score.nota ?? 0)})`,
        )
        .join(", ")}.`,
    );
  }
  if (reading.flags.length > 0) {
    bullets.push(
      `${reading.flags.length} inconsistência(s) aberta(s): ${reading.flags
        .map((flag) => flag.regra)
        .join(", ")}.`,
    );
  }
  for (const flag of reading.lastro) bullets.push(flag.resumo);
  if (parcial) {
    bullets.push(
      `Leitura parcial. Faltam ${reading.sections.filter((row) => row.section.id !== "geral" && !row.submitted).length} setor(es). Os entregáveis se atualizam a cada envio.`,
    );
  }
  return makeDeliverable("compass", {
    scope: "conjunto",
    sectionId: null,
    sectionTitle: null,
    status: parcial ? "parcial" : "pronto",
    headline: reading.gates.bloqueiaEstrutura
      ? "Síntese: portão superior abre o relatório"
      : "Síntese estratégica dos setores já lidos",
    bullets,
  });
}

function conjuntoHorizon(
  rows: BinSectionReading[],
  answers: BinAnswers,
  pack: BinPack,
  parcial: boolean,
): BinDeliverable {
  const bullets: string[] = [];
  for (const row of rows) {
    const gaps = fundamentoZeros(row.section, answers, pack);
    if (gaps.length === 0) continue;
    bullets.push(
      `${row.section.title}: ${gaps.map((gap) => gap.question.id).join(", ")} no zero.`,
    );
  }
  if (bullets.length === 0) {
    bullets.push("Nenhum fundamento no zero nos setores já respondidos.");
  }
  return makeDeliverable("horizon", {
    scope: "conjunto",
    sectionId: null,
    sectionTitle: null,
    status: parcial ? "parcial" : "pronto",
    headline: "Gap de cobertura nos setores já respondidos",
    bullets,
  });
}

function conjuntoRoute(
  rows: BinSectionReading[],
  answers: BinAnswers,
  reading: BinReading,
  pack: BinPack,
  parcial: boolean,
): BinDeliverable {
  const bullets: string[] = [];
  const { portao1, portao2 } = reading.gates;
  if (portao1.status === "disparado") {
    bullets.push(
      `1. Continuidade: ${portao1.hits.map((hit) => `${hit.questionId} · ${hit.label}`).join("; ")}.`,
    );
  }
  if (portao2.status === "nao_gera" || portao2.status === "folego_curto") {
    bullets.push(
      `2. Fôlego: ${portao2.hits.map((hit) => `${hit.questionId} · ${hit.label}`).join("; ")}.`,
    );
  }
  const structural: string[] = [];
  for (const row of rows) {
    for (const gap of fundamentoZeros(row.section, answers, pack).slice(0, 2)) {
      structural.push(
        `${row.section.title} · ${gap.question.id}: ${gap.label}`,
      );
    }
  }
  if (structural.length > 0) {
    bullets.push(
      `${reading.gates.bloqueiaEstrutura ? "3. Estrutura, depois dos portões" : "1. Estrutura"}: ${structural.join("; ")}.`,
    );
  }
  if (bullets.length === 0) {
    bullets.push("Sem ação bloqueante com o recorte já respondido.");
  }
  if (parcial) {
    bullets.push("A ordem se recalcula quando um setor novo é enviado.");
  }
  return makeDeliverable("route_planner", {
    scope: "conjunto",
    sectionId: null,
    sectionTitle: null,
    status: parcial ? "parcial" : "pronto",
    headline: "Prioridade de ação com o que já foi respondido",
    bullets,
  });
}

export function buildBinDeliverables(
  answers: BinAnswers,
  pack: BinPack,
  reading: BinReading,
): BinDeliverableSet[] {
  const rows = readySections(reading);
  const parcial =
    rows.length <
    pack.instrument.sections.filter((section) => section.id !== "geral").length;
  const sets: BinDeliverableSet[] = [
    {
      sectionId: null,
      sectionTitle: null,
      items: [
        conjuntoRadar(rows, parcial),
        conjuntoCompass(reading, rows, parcial),
        conjuntoHorizon(rows, answers, pack, parcial),
        conjuntoRoute(rows, answers, reading, pack, parcial),
      ],
    },
  ];
  for (const row of rows) {
    sets.push({
      sectionId: row.section.id,
      sectionTitle: row.section.title,
      items: [
        radarForSection(row, reading.flags, parcial),
        compassForSection(row, reading, parcial),
        horizonForSection(row, answers, pack, parcial),
        routeForSection(row, answers, reading, pack, parcial),
      ],
    });
  }
  return sets;
}

export function deliverablesForSection(
  sets: BinDeliverableSet[],
  sectionId: string | null,
): BinDeliverableSet | undefined {
  return sets.find((set) => set.sectionId === sectionId);
}
