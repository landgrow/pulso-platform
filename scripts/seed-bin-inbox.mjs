import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(resolve(".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(
      /^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=(.*)$/,
    );
    if (!match) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadEnv();
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: org, error: orgErr } = await admin
  .from("organizations")
  .select("id, slug, name")
  .eq("slug", "techflow")
  .maybeSingle();
if (orgErr || !org) {
  console.log(JSON.stringify({ ok: false, step: "org", error: orgErr?.message }));
  process.exit(1);
}

const { data: cliente, error: cliErr } = await admin
  .from("clientes")
  .select("id")
  .eq("org_id", org.id)
  .maybeSingle();
if (cliErr || !cliente) {
  console.log(JSON.stringify({ ok: false, step: "cliente", error: cliErr?.message }));
  process.exit(1);
}

const now = new Date();
const mes = now.getMonth() + 1;
const ano = now.getFullYear();
const { data: existingPeriod } = await admin
  .from("periodos_dados")
  .select("id")
  .eq("cliente_id", cliente.id)
  .eq("mes", mes)
  .eq("ano", ano)
  .maybeSingle();

let periodId = existingPeriod?.id;
if (!periodId) {
  const created = await admin
    .from("periodos_dados")
    .insert({ cliente_id: cliente.id, mes, ano, status: "em_coleta" })
    .select("id")
    .single();
  if (created.error) {
    console.log(JSON.stringify({ ok: false, step: "period", error: created.error.message }));
    process.exit(1);
  }
  periodId = created.data.id;
}

const geralAt = new Date(now.getTime() - 3600_000).toISOString();
const opAt = new Date(now.getTime() - 1800_000).toISOString();
const mktAt = now.toISOString();

const metadata = {
  area: "formulario",
  instrument: "bin_servicos_v2",
  route: "servicos",
  geralEnviadoEm: geralAt,
  setoresEnviados: { operacional: opAt, marketing: mktAt },
  events: [
    { at: geralAt, kind: "geral", sectionId: "geral", route: "servicos" },
    { at: opAt, kind: "setor", sectionId: "operacional", route: "servicos" },
    { at: mktAt, kind: "setor", sectionId: "marketing", route: "servicos" },
  ],
};

const { data: colecao } = await admin
  .from("colecoes")
  .select("id")
  .eq("periodo_id", periodId)
  .eq("tipo", "formulario")
  .maybeSingle();

const payload = { G06: "G06:3", __source: "hq-seed-after-preview-sim" };

let write;
if (colecao) {
  write = await admin
    .from("colecoes")
    .update({ payload, metadata, updated_at: now.toISOString() })
    .eq("id", colecao.id)
    .select("id");
} else {
  write = await admin
    .from("colecoes")
    .insert({
      periodo_id: periodId,
      tipo: "formulario",
      payload,
      metadata,
      status: "rascunho",
    })
    .select("id");
}

console.log(
  JSON.stringify(
    {
      ok: !write.error,
      org: org.slug,
      periodId,
      colecaoId: write.data?.[0]?.id ?? colecao?.id ?? null,
      error: write.error?.message ?? null,
    },
    null,
    2,
  ),
);
