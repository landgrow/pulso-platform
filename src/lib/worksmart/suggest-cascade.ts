import type { FiveH2W } from "@/lib/worksmart/cascade";

export interface SuggestedKeyResult {
  title: string;
  targetValue: number | null;
  unit: string | null;
}

export type SuggestedAction = FiveH2W;

export interface CascadeSource {
  title: string;
  smartEspecifica: string | null;
  smartMensuravel: string | null;
  smartAtingivel: string | null;
  smartRelevante: string | null;
  smartTemporal: string | null;
}

function trimText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueTexts(values: (string | null)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = trimText(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

/** Lê o primeiro número útil de um texto SMART (70%, 5 clientes, 100k, 3,5k). */
export function parseMetricFromText(
  text: string | null | undefined,
): { value: number; unit: string | null } | null {
  const raw = trimText(text);
  if (!raw) return null;

  const hits: Array<{
    index: number;
    value: number;
    unit: string | null;
    priority: number;
  }> = [];

  const percent = raw.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (percent?.[1] && percent.index != null) {
    hits.push({
      index: percent.index,
      value: Number(percent[1].replace(",", ".")),
      unit: "%",
      priority: 0,
    });
  }

  const compact = raw.match(/(\d+(?:[.,]\d+)?)\s*(k|mil)\b/i);
  if (compact?.[1] && compact.index != null) {
    hits.push({
      index: compact.index,
      value: Number(compact[1].replace(",", ".")) * 1000,
      unit: "R$",
      priority: 1,
    });
  }

  const counted = raw.match(
    /(\d+(?:[.,]\d+)?)\s*(clientes?|visitas?|reuniões?|leads?|contratos?)/i,
  );
  if (counted?.[1] && counted[2] && counted.index != null) {
    hits.push({
      index: counted.index,
      value: Number(counted[1].replace(",", ".")),
      unit: counted[2].toLowerCase(),
      priority: 2,
    });
  }

  const money = raw.match(
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,](\d{2}))?/i,
  );
  if (money && /r\$|fatur/i.test(raw) && money[1] && money.index != null) {
    const whole = money[1].replace(/\./g, "");
    const cents = money[2] ? `.${money[2]}` : "";
    hits.push({
      index: money.index,
      value: Number(`${whole}${cents}`),
      unit: "R$",
      priority: 3,
    });
  }

  if (hits.length === 0) return null;
  hits.sort((a, b) => a.index - b.index || a.priority - b.priority);
  const best = hits[0];
  if (!best) return null;
  return { value: best.value, unit: best.unit };
}

export function suggestKeyResults(source: CascadeSource): SuggestedKeyResult[] {
  const mensuravel = trimText(source.smartMensuravel);
  const especifica = trimText(source.smartEspecifica);
  const titleMetric = parseMetricFromText(source.title);
  const metric =
    titleMetric ??
    parseMetricFromText(mensuravel) ??
    parseMetricFromText(especifica);

  const title = titleMetric
    ? source.title.trim()
    : (mensuravel ?? especifica ?? source.title.trim());
  return [
    {
      title,
      targetValue: metric?.value ?? null,
      unit: metric?.unit ?? null,
    },
  ];
}

export function suggestActions(source: CascadeSource): SuggestedAction[] {
  const quando = trimText(source.smartTemporal);
  const porQue = trimText(source.smartRelevante);
  const como = trimText(source.smartAtingivel);
  const quanto = trimText(source.smartMensuravel);
  const seeds = uniqueTexts([
    source.smartEspecifica,
    source.smartMensuravel,
    source.smartAtingivel,
  ]).filter((text) => text.length >= 8);

  const titles =
    seeds.length > 0 ? seeds.slice(0, 3) : [`Avançar: ${source.title.trim()}`];

  return titles.map((oQue) => ({
    oQue,
    quem: null,
    quando,
    onde: null,
    porQue,
    como,
    quanto,
  }));
}
