/**
 * Gera instrumentos e catálogos de gatilho dos três packs BIN v2.
 * Uso: node scripts/parse-bin-packs.mjs [pasta-drive]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SOURCE = String.raw`C:\Users\nayar\iCloudDrive\iCloud~md~obsidian\DEV-DOCS\CLAUDE DOCS LAND\BIN\PERGUNTAS\drive-download-20261026T120942Z-1-001`;
const SOURCE_ROOT = process.argv[2] ?? DEFAULT_SOURCE;
const OUT_DIR = path.join(ROOT, "src", "data", "bin-v2");

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
    title: "Inovação",
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

const OPENING_PREFIXES = ["O", "F", "M", "V", "A", "R", "L", "I", "J", "E"];

const PACKS = [
  {
    id: "servicos",
    folder: "Serviços",
    instrument: "bin_servicos_v2",
    title: "BIN Serviços v2",
    md: "BIN_v2_formulario_compilado.md",
    csv: "BIN_v2_tabela_de_valor_consolidada.csv",
    gatilhos: "BIN_v2_tabela_de_gatilhos.csv",
    outInstrument: "instrument.json",
    outGatilhos: "gatilhos-servicos.json",
  },
  {
    id: "varejo",
    folder: "Varejo",
    instrument: "bin_varejo_v2",
    title: "BIN Varejo v2",
    md: "BIN_varejo_formulario_compilado.md",
    csv: "BIN_varejo_tabela_de_valor_consolidada.csv",
    gatilhos: "BIN_varejo_tabela_de_gatilhos.csv",
    outInstrument: "varejo.json",
    outGatilhos: "gatilhos-varejo.json",
  },
  {
    id: "industria",
    folder: "Indústria",
    instrument: "bin_industria_v2",
    title: "BIN Indústria v2",
    md: "BIN_industria_formulario_compilado.md",
    csv: "BIN_industria_tabela_de_valor_consolidada.csv",
    gatilhos: "BIN_industria_tabela_de_gatilhos.csv",
    outInstrument: "industria.json",
    outGatilhos: "gatilhos-industria.json",
  },
];

function parseCsv(text) {
  const rows = [];
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
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
  else if (
    blob.includes("múltipla de perfil") ||
    blob.includes("multipla de perfil")
  )
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

  return {
    tags,
    scale,
    layer,
    destinations,
    composedWith: composedWith ?? null,
  };
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
    if (
      heading &&
      !heading[1].startsWith("#") &&
      SECTION_META[heading[1].trim()]
    ) {
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

function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function destinationsFromText(text) {
  const d = (text ?? "").toLowerCase();
  const dest = [];
  if (d.includes("pontua")) dest.push("pontua");
  if (d.includes("contexto")) dest.push("contexto");
  if (d.includes("roteador")) dest.push("roteador");
  if (d.includes("portão 1") || d.includes("portao 1")) dest.push("portao_1");
  if (d.includes("portão 2") || d.includes("portao 2")) dest.push("portao_2");
  return dest;
}

function mergeCsv(questions, csvText) {
  const rows = parseCsv(csvText);
  const header = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());
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
    const dest = new Set(q.destinations ?? []);
    for (const item of destinationsFromText(first.destino)) dest.add(item);
    for (const opt of csvOpts) {
      for (const item of destinationsFromText(opt.observacao)) dest.add(item);
    }
    if (dest.size) q.destinations = [...dest];
    q.peso = first.peso;
    q.fundamentoVinculado = first.fundamentoVinculado;

    if (q.scale !== "aberta" && csvOpts.length > 0) {
      const mdLabels = new Map(q.options.map((o) => [normalize(o.label), o]));
      q.options = csvOpts.map((opt) => {
        const md = mdLabels.get(normalize(opt.alternativa));
        return {
          value: optionValue(q.id, opt.ordem),
          label: md?.label ?? opt.alternativa,
          needsSpecify:
            md?.needsSpecify ||
            /\(qual/i.test(opt.alternativa) ||
            /^outra$/i.test(opt.alternativa),
          valorRelativo: Number.isNaN(opt.valorRelativo)
            ? null
            : opt.valorRelativo,
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
      valorRelativo: Number.isNaN(o.valorRelativo) ? null : (o.valorRelativo ?? null),
      observacao: o.observacao ?? null,
    }));
  }

  return { questions, csvQuestionIds: [...byId.keys()] };
}

function headingOfPrefix(prefix) {
  return Object.keys(SECTION_META).find(
    (heading) => SECTION_META[heading].prefix === prefix,
  );
}

function injectOpenings(questions) {
  let next = questions;
  for (const prefix of OPENING_PREFIXES) {
    const id = `${prefix}00`;
    if (next.some((q) => q.id === id)) continue;
    const heading = headingOfPrefix(prefix);
    const firstId = next.findIndex(
      (q) => q.id.startsWith(prefix) && q.section === heading,
    );
    const opening = {
      id,
      section: heading,
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
        value: optionValue(id, i + 1),
        label,
        needsSpecify: false,
        valorRelativo: null,
        observacao: i >= 3 ? "banda reduzida" : "confiança alta",
      })),
    };
    if (firstId === -1) next = [opening, ...next];
    else next = [...next.slice(0, firstId), opening, ...next.slice(firstId)];
  }
  return next;
}

function uiType(scale) {
  if (scale === "aberta") return "textarea";
  if (scale === "nominal_multipla" || scale === "nominal_perfil")
    return "checkbox";
  return "radio";
}

function toInstrument(pack, questions) {
  const byHeading = new Map();
  for (const [heading, meta] of Object.entries(SECTION_META)) {
    byHeading.set(
      meta.id,
      questions.filter((q) => q.section === heading).map((q) => q.id),
    );
  }

  return {
    instrument: pack.instrument,
    title: pack.title,
    generatedAt: new Date().toISOString(),
    notes: [
      "Formulário coleta. Pontuação, portões e verificação rodam depois, na leitura.",
      "Escape nunca esconde questão seguinte.",
      "G07 só aparece se G06 = faz mais de uma coisa.",
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

function splitTriggers(raw) {
  const text = (raw ?? "").trim();
  if (!text || text === "(ver ação)" || text === "(texto livre)") return [];
  return text
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseGatilhos(csvText) {
  const rows = parseCsv(csvText);
  const header = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  return rows.slice(1).flatMap((row) => {
    const regra = row[idx.regra]?.trim();
    if (!regra) return [];
    return [
      {
        regra,
        classe: row[idx.classe]?.trim() ?? "F",
        questaoA: row[idx.questao_A]?.trim() ?? "",
        disparaA: splitTriggers(row[idx.dispara_A]),
        disparaARaw: (row[idx.dispara_A] ?? "").trim(),
        questaoB: row[idx.questao_B]?.trim() ?? "",
        disparaB: splitTriggers(row[idx.dispara_B]),
        disparaBRaw: (row[idx.dispara_B] ?? "").trim(),
        precedencia: (row[idx.precedencia] ?? "").trim() || null,
        acao: (row[idx.acao] ?? "").trim(),
      },
    ];
  });
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

const summary = [];
for (const pack of PACKS) {
  const folder = path.join(SOURCE_ROOT, pack.folder);
  const md = fs.readFileSync(path.join(folder, pack.md), "utf8");
  const csv = fs.readFileSync(path.join(folder, pack.csv), "utf8");
  const gatilhosCsv = fs.readFileSync(path.join(folder, pack.gatilhos), "utf8");

  let questions = parseMarkdown(md);
  questions = injectOpenings(questions);
  const merged = mergeCsv(questions, csv);
  const instrument = toInstrument(pack, merged.questions);
  const gatilhos = parseGatilhos(gatilhosCsv);

  writeJson(path.join(OUT_DIR, pack.outInstrument), instrument);
  writeJson(path.join(OUT_DIR, pack.outGatilhos), gatilhos);

  const portao1 = instrument.questions.filter((q) =>
    q.destinations.includes("portao_1"),
  ).length;
  const portao2 = instrument.questions.filter((q) =>
    q.destinations.includes("portao_2"),
  ).length;
  summary.push({
    pack: pack.id,
    questions: instrument.questions.length,
    options: instrument.questions.reduce((n, q) => n + q.options.length, 0),
    gatilhos: gatilhos.length,
    portao_1: portao1,
    portao_2: portao2,
    counts: Object.fromEntries(
      instrument.sections.map((s) => [s.id, s.questionIds.length]),
    ),
  });
}

console.log(JSON.stringify(summary, null, 2));
