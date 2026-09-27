/**
 * Gera src/data/bin-v2/instrument.json a partir do pacote BIN v2 (Drive).
 * Fonte: enunciados no compilado + metadados na tabela de valor.
 */
import fs from "node:fs";
import path from "node:path";

const SOURCE_DIR =
  process.argv[2] ??
  String.raw`C:\Users\nayar\iCloudDrive\iCloud~md~obsidian\DEV-DOCS\CLAUDE DOCS LAND\BIN\PERGUNTAS\drive-download-20260920T171731Z-1-001`;

const OUT_PATH = path.resolve("src/data/bin-v2/instrument.json");

const SECTION_META = {
  "Diagnóstico geral": {
    id: "geral",
    prefix: "G",
    title: "Diagnóstico geral",
    color: "border-slate-500",
  },
  Operacional: {
    id: "operacional",
    prefix: "O",
    title: "Operacional",
    color: "border-blue-500",
  },
  Financeiro: {
    id: "financeiro",
    prefix: "F",
    title: "Financeiro",
    color: "border-lime-500",
  },
  Marketing: {
    id: "marketing",
    prefix: "M",
    title: "Marketing",
    color: "border-fuchsia-500",
  },
  Vendas: {
    id: "vendas",
    prefix: "V",
    title: "Vendas",
    color: "border-orange-500",
  },
  Administrativo: {
    id: "administrativo",
    prefix: "A",
    title: "Administrativo",
    color: "border-cyan-500",
  },
  "Recursos humanos": {
    id: "rh",
    prefix: "R",
    title: "Pessoas",
    color: "border-violet-500",
  },
  Liderança: {
    id: "lideranca",
    prefix: "L",
    title: "Liderança",
    color: "border-amber-500",
  },
  Inovação: {
    id: "inovacao",
    prefix: "I",
    title: "Novos serviços e mudanças",
    color: "border-teal-500",
  },
  Jurídico: {
    id: "juridico",
    prefix: "J",
    title: "Jurídico",
    color: "border-rose-500",
  },
  Estratégico: {
    id: "estrategico",
    prefix: "E",
    title: "Estratégico",
    color: "border-indigo-500",
  },
};

const OPENING_OPTIONS = [
  "Sou eu quem decide e cuida dessa área",
  "Não temos divisão por setor, eu cuido de tudo",
  "Trabalho nessa área, mas quem decide é outra pessoa",
  "Quem cuida dessa área é outra pessoa da empresa, eu respondo pelo que acompanho",
  "Essa área é feita por gente de fora, e eu respondo pela empresa",
];

function parseCsv(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  const nextRow = () => {
    const cells = [];
    let cell = "";
    let quoted = false;
    while (i < len) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i += 2;
            continue;
          }
          quoted = false;
          i += 1;
          continue;
        }
        cell += ch;
        i += 1;
        continue;
      }
      if (ch === '"') {
        quoted = true;
        i += 1;
        continue;
      }
      if (ch === ",") {
        cells.push(cell);
        cell = "";
        i += 1;
        continue;
      }
      if (ch === "\r") {
        i += 1;
        continue;
      }
      if (ch === "\n") {
        cells.push(cell);
        i += 1;
        return cells;
      }
      cell += ch;
      i += 1;
    }
    if (cell.length > 0 || cells.length > 0) cells.push(cell);
    return cells.length ? cells : null;
  };

  while (i < len) {
    const row = nextRow();
    if (row) rows.push(row);
  }
  return rows;
}

function parseTags(raw) {
  const tags = [...raw.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim());
  const blob = tags.join(" | ").toLowerCase();

  let scale = "nominal";
  if (blob.includes("aberta")) scale = "aberta";
  else if (blob.includes("ordinal em curva")) scale = "ordinal_curva";
  else if (blob.includes("ordinal invertido")) scale = "ordinal_invertido";
  else if (blob.includes("ordinal")) scale = "ordinal";
  else if (blob.includes("múltipla de perfil") || blob.includes("multipla de perfil"))
    scale = "nominal_perfil";
  else if (blob.includes("múltipla") || blob.includes("multipla"))
    scale = "nominal_multipla";

  let layer = null;
  if (blob.includes("fundamento")) layer = "fundamento";
  else if (blob.includes("refinamento")) layer = "refinamento";
  else if (blob.includes("prática") || blob.includes("pratica")) layer = "pratica";

  const destinations = [];
  if (blob.includes("pontua")) destinations.push("pontua");
  if (blob.includes("contexto")) destinations.push("contexto");
  if (blob.includes("roteador")) destinations.push("roteador");
  if (blob.includes("portão 1") || blob.includes("portao 1"))
    destinations.push("portao_1");
  if (blob.includes("portão 2") || blob.includes("portao 2"))
    destinations.push("portao_2");

  const composedWith = tags
    .map((t) => t.match(/composta com ([A-Z]\d{2})/i)?.[1])
    .find(Boolean);

  return { tags, scale, layer, destinations, composedWith: composedWith ?? null };
}

function optionValue(questionId, ordem) {
  return `${questionId}:${ordem}`;
}

function parseMarkdown(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const questions = [];
  let section = null;
  let current = null;

  const flush = () => {
    if (current) {
      questions.push(current);
      current = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const heading = line.match(/^#\s+(.+)$/);
    if (heading && !heading[1].startsWith("#") && SECTION_META[heading[1].trim()]) {
      flush();
      section = heading[1].trim();
      continue;
    }

    const q = line.match(/^\*\*([A-Z]\d{2})\.\*\*\s+(.*)$/);
    if (q && section) {
      flush();
      const id = q[1];
      const rest = q[2];
      const prompt = rest
        .replace(/`\s*\[[^\]]+\]\s*`/g, " ")
        .replace(/\[[^\]]+\]/g, " ")
        .replace(/`/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      current = {
        id,
        section,
        prompt,
        help: "",
        ...parseTags(rest),
        options: [],
      };
      continue;
    }

    if (!current) continue;

    const bullet = line.match(/^\s*-\s+(.+)$/);
    if (bullet) {
      current.options.push({
        label: bullet[1].trim(),
        needsSpecify: /\(qual\??\)/i.test(bullet[1]),
      });
      continue;
    }

    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("**") &&
      current.options.length === 0
    ) {
      current.help = current.help ? `${current.help} ${trimmed}` : trimmed;
    }
  }
  flush();
  return questions;
}

function mergeCsv(questions, csvText) {
  const rows = parseCsv(csvText);
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const byId = new Map();

  for (const row of rows.slice(1)) {
    const id = row[idx.questao];
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push({
      ordem: Number(row[idx.ordem]),
      alternativa: row[idx.alternativa],
      valorRelativo:
        row[idx.valor_relativo] === "" ? null : Number(row[idx.valor_relativo]),
      tipo: row[idx.tipo],
      camada: row[idx.camada] || null,
      destino: row[idx.destino] || null,
      peso: row[idx.peso] === "" ? null : Number(row[idx.peso]),
      fundamentoVinculado: row[idx.fundamento_vinculado] || null,
      observacao: row[idx.observacao] || null,
    });
  }

  const scaleFromCsv = (tipo) => {
    const t = (tipo ?? "").toLowerCase();
    if (t.includes("aberta")) return "aberta";
    if (t.includes("curva")) return "ordinal_curva";
    if (t.includes("invertido")) return "ordinal_invertido";
    if (t.includes("ordinal")) return "ordinal";
    if (t.includes("múltipla de perfil") || t.includes("multipla de perfil"))
      return "nominal_perfil";
    if (t.includes("múltipla") || t.includes("multipla")) return "nominal_multipla";
    if (t.includes("nominal")) return "nominal";
    return null;
  };

  for (const q of questions) {
    const csvOpts = byId.get(q.id);
    if (!csvOpts) continue;
    csvOpts.sort((a, b) => a.ordem - b.ordem);
    const first = csvOpts[0];
    const csvScale = scaleFromCsv(first.tipo);
    if (csvScale) q.scale = csvScale;
    if (first.camada) {
      const c = first.camada.toLowerCase();
      if (c.includes("fundamento")) q.layer = "fundamento";
      else if (c.includes("refinamento")) q.layer = "refinamento";
      else if (c.includes("prática") || c.includes("pratica")) q.layer = "pratica";
    }
    if (first.destino) {
      const d = first.destino.toLowerCase();
      const dest = [];
      if (d.includes("pontua")) dest.push("pontua");
      if (d.includes("contexto")) dest.push("contexto");
      if (d.includes("roteador")) dest.push("roteador");
      if (d.includes("portão 1") || d.includes("portao 1")) dest.push("portao_1");
      if (d.includes("portão 2") || d.includes("portao 2")) dest.push("portao_2");
      if (dest.length) q.destinations = dest;
    }
    q.peso = first.peso;
    q.fundamentoVinculado = first.fundamentoVinculado;

    if (q.scale !== "aberta" && csvOpts.length > 0) {
      const mdLabels = new Map(
        q.options.map((o) => [normalize(o.label), o]),
      );
      q.options = csvOpts.map((opt) => {
        const md = mdLabels.get(normalize(opt.alternativa));
        return {
          value: optionValue(q.id, opt.ordem),
          label: md?.label ?? opt.alternativa,
          needsSpecify:
            md?.needsSpecify ||
            /\(qual/i.test(opt.alternativa) ||
            /^outra$/i.test(opt.alternativa),
          valorRelativo: opt.valorRelativo,
          observacao: opt.observacao,
        };
      });
    }
  }

  for (const q of questions) {
    if (q.scale === "aberta") {
      q.options = [];
      continue;
    }
    q.options = q.options.map((o, i) => ({
      value: o.value ?? optionValue(q.id, i + 1),
      label: o.label,
      needsSpecify:
        Boolean(o.needsSpecify) ||
        /^outra$/i.test(o.label) ||
        /\(qual/i.test(o.label),
      valorRelativo: o.valorRelativo ?? null,
      observacao: o.observacao ?? null,
    }));
  }

  return { questions, csvQuestionIds: [...byId.keys()] };
}

function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function injectO00(questions) {
  if (questions.some((q) => q.id === "O00")) return questions;
  const o01Index = questions.findIndex((q) => q.id === "O01");
  const o00 = {
    id: "O00",
    section: "Operacional",
    prompt: "Qual é a sua relação com essa área da empresa?",
    help: "",
    tags: ["contexto", "nominal"],
    scale: "nominal",
    layer: null,
    destinations: ["contexto"],
    composedWith: null,
    peso: null,
    fundamentoVinculado: null,
    options: OPENING_OPTIONS.map((label, i) => ({
      value: optionValue("O00", i + 1),
      label,
      needsSpecify: false,
      valorRelativo: null,
      observacao: i >= 3 ? "banda reduzida" : "confiança alta",
    })),
  };
  if (o01Index === -1) return [o00, ...questions];
  return [...questions.slice(0, o01Index), o00, ...questions.slice(o01Index)];
}

function uiType(scale) {
  if (scale === "aberta") return "textarea";
  if (scale === "nominal_multipla" || scale === "nominal_perfil")
    return "checkbox";
  return "radio";
}

function toInstrument(questions) {
  const sections = Object.values(SECTION_META).map((meta) => ({
    ...meta,
    questionIds: questions.filter((q) => q.section === invertTitle(meta)).map((q) => q.id),
  }));

  // Map by original markdown heading, not display title
  const byHeading = new Map();
  for (const [heading, meta] of Object.entries(SECTION_META)) {
    byHeading.set(meta.id, questions.filter((q) => q.section === heading).map((q) => q.id));
  }

  return {
    instrument: "bin_servicos_v2",
    title: "BIN Serviços v2",
    generatedAt: new Date().toISOString(),
    notes: [
      "Formulário coleta. Pontuação (teto, bloqueio, denominador) não roda aqui.",
      "Escape nunca esconde questão seguinte.",
      "G07 só aparece se G06 = faz mais de uma coisa.",
      "Título de inovação no cliente: Novos serviços e mudanças.",
    ],
    visibility: [
      {
        questionId: "G07",
        showWhen: { questionId: "G06", equals: "G06:4" },
      },
    ],
    sections: Object.values(SECTION_META).map((meta) => ({
      id: meta.id,
      prefix: meta.prefix,
      title: meta.title,
      color: meta.color,
      questionIds: byHeading.get(meta.id) ?? [],
    })),
    questions: questions.map((q) => ({
      id: q.id,
      sectionId: SECTION_META[q.section].id,
      prompt: q.prompt,
      help: q.help || null,
      scale: q.scale,
      ui: uiType(q.scale),
      layer: q.layer,
      destinations: q.destinations,
      composedWith: q.composedWith,
      peso: q.peso ?? null,
      fundamentoVinculado: q.fundamentoVinculado,
      required: true,
      options: q.scale === "aberta" ? [] : q.options,
    })),
  };
}

function invertTitle(meta) {
  return meta.title;
}

const mdPath = path.join(SOURCE_DIR, "BIN_v2_formulario_compilado.md");
const csvPath = path.join(SOURCE_DIR, "BIN_v2_tabela_de_valor_consolidada.csv");

const md = fs.readFileSync(mdPath, "utf8");
const csv = fs.readFileSync(csvPath, "utf8");

let questions = parseMarkdown(md);
questions = injectO00(questions);
const merged = mergeCsv(questions, csv);

const missingCsv = merged.questions.filter((q) => q.scale !== "aberta" && !q.options?.[0]?.value);
const instrument = toInstrument(merged.questions);

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, `${JSON.stringify(instrument, null, 2)}\n`, "utf8");

const counts = Object.fromEntries(
  instrument.sections.map((s) => [s.id, s.questionIds.length]),
);
console.log(JSON.stringify({
  out: OUT_PATH,
  questions: instrument.questions.length,
  options: instrument.questions.reduce((n, q) => n + q.options.length, 0),
  counts,
  missingCsv: missingCsv.map((q) => q.id),
  csvIds: merged.csvQuestionIds.length,
}, null, 2));
