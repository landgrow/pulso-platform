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
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log(
    JSON.stringify({
      ok: false,
      reason: "missing_admin_env",
      hasUrl: Boolean(url),
      hasService: Boolean(key),
    }),
  );
  process.exit(0);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const [orgs, clientes, colecoes, periodos] = await Promise.all([
  admin
    .from("organizations")
    .select("id, slug, name, is_internal, deleted_at")
    .is("deleted_at", null),
  admin.from("clientes").select("id, org_id"),
  admin
    .from("colecoes")
    .select("id, tipo, periodo_id, updated_at, metadata, payload")
    .eq("tipo", "formulario")
    .order("updated_at", { ascending: false })
    .limit(20),
  admin.from("periodos_dados").select("id, cliente_id, mes, ano, status"),
]);

const orgById = Object.fromEntries((orgs.data ?? []).map((o) => [o.id, o]));
const clienteById = Object.fromEntries(
  (clientes.data ?? []).map((c) => [c.id, c]),
);
const periodoById = Object.fromEntries(
  (periodos.data ?? []).map((p) => [p.id, p]),
);

const rows = (colecoes.data ?? []).map((c) => {
  const periodo = periodoById[c.periodo_id];
  const cliente = periodo ? clienteById[periodo.cliente_id] : null;
  const org = cliente ? orgById[cliente.org_id] : null;
  const meta = c.metadata ?? {};
  const payload =
    c.payload && typeof c.payload === "object" ? c.payload : {};
  return {
    updated_at: c.updated_at,
    org: org
      ? { slug: org.slug, name: org.name, is_internal: org.is_internal }
      : null,
    periodo: periodo ? `${periodo.mes}/${periodo.ano}` : null,
    keys: Object.keys(payload).length,
    instrument: meta.instrument ?? null,
    route: meta.route ?? null,
    geralEnviadoEm: meta.geralEnviadoEm ?? null,
    diagnosticoEnviadoEm: meta.diagnosticoEnviadoEm ?? null,
    setores: meta.setoresEnviados ? Object.keys(meta.setoresEnviados) : [],
    events: Array.isArray(meta.events)
      ? meta.events.map((e) => `${e.kind}:${e.sectionId ?? ""}`)
      : [],
  };
});

const techflow = (orgs.data ?? []).find((o) => o.slug === "techflow");
const techflowCliente = techflow
  ? (clientes.data ?? []).find((c) => c.org_id === techflow.id)
  : null;

let probe = { ran: false };
if (techflowCliente) {
  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();
  let periodo = (periodos.data ?? []).find(
    (p) => p.cliente_id === techflowCliente.id && p.mes === mes && p.ano === ano,
  );
  if (!periodo) {
    const created = await admin
      .from("periodos_dados")
      .insert({
        cliente_id: techflowCliente.id,
        mes,
        ano,
        status: "em_coleta",
      })
      .select("id, cliente_id, mes, ano, status")
      .single();
    periodo = created.data;
  }
  if (periodo) {
    const probeKey = `probe-${Date.now()}`;
    const inserted = await admin
      .from("colecoes")
      .insert({
        periodo_id: periodo.id,
        tipo: "formulario",
        payload: { G06: "G06:3", __probe: probeKey },
        metadata: {
          instrument: "bin_servicos_v2",
          route: "servicos",
          geralEnviadoEm: now.toISOString(),
          events: [
            {
              at: now.toISOString(),
              kind: "geral",
              sectionId: "geral",
              route: "servicos",
            },
          ],
        },
        status: "rascunho",
      })
      .select("id")
      .single();

    const listed = await admin
      .from("colecoes")
      .select(
        "id, metadata, payload, updated_at, periodos_dados!inner(cliente_id, clientes!inner(org_id))",
      )
      .eq("tipo", "formulario");

    const found = (listed.data ?? []).some((row) => {
      const payload = row.payload ?? {};
      return payload.__probe === probeKey;
    });

    if (inserted.data?.id) {
      await admin.from("colecoes").delete().eq("id", inserted.data.id);
    }

    probe = {
      ran: true,
      insertOk: Boolean(inserted.data?.id),
      insertError: inserted.error?.message ?? null,
      listJoinOk: !listed.error,
      listJoinError: listed.error?.message ?? null,
      probeRowVisibleInJoin: found,
    };
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      orgs: (orgs.data ?? []).map((o) => ({
        slug: o.slug,
        name: o.name,
        is_internal: o.is_internal,
      })),
      formularioCount: (colecoes.data ?? []).length,
      colecoesError: colecoes.error?.message ?? null,
      techflowHasCliente: Boolean(techflowCliente),
      probe,
      rows,
    },
    null,
    2,
  ),
);
