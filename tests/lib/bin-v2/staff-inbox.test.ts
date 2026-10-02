import { describe, expect, it } from "vitest";
import {
  appendBinEvent,
  binEventHeadline,
  binInboxItemsFromRows,
  formatBinAnswer,
  getBinQuestion,
  readBinFlow,
  requireBinQuestion,
} from "@/lib/bin-v2";
import { buildBinEmails } from "@/lib/notify/bin-events";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/settings/notifications";
import type { NotifyUser } from "@/lib/notify/select-due";

function staff(overrides: Partial<NotifyUser> = {}): NotifyUser {
  return {
    id: "staff-1",
    email: "nayara@landgrow.com",
    fullName: "Nayara",
    isStaff: true,
    orgIds: [],
    prefs: { ...DEFAULT_NOTIFICATION_PREFS },
    ...overrides,
  };
}

describe("BIN flow metadata", () => {
  it("guarda geral, setor e diagnóstico na ordem", () => {
    const first = appendBinEvent(readBinFlow(undefined), {
      at: "2026-09-20T12:00:00.000Z",
      kind: "geral",
      sectionId: "geral",
      route: "servicos",
    });
    const second = appendBinEvent(first, {
      at: "2026-09-20T13:00:00.000Z",
      kind: "setor",
      sectionId: "operacional",
      route: "servicos",
    });
    expect(second.geralEnviadoEm).toBe("2026-09-20T12:00:00.000Z");
    expect(second.setoresEnviados.operacional).toBe("2026-09-20T13:00:00.000Z");
    expect(second.events).toHaveLength(2);
    expect(
      binEventHeadline({
        kind: "geral",
        routeLabel: "Serviços",
      }),
    ).toMatch(/diagnóstico geral/);
  });

  it("reconstitui evento do geral se só existe o timestamp antigo", () => {
    const flow = readBinFlow({
      geralEnviadoEm: "2026-09-20T12:00:00.000Z",
      route: "servicos",
    });
    expect(flow.events[0]?.kind).toBe("geral");
  });
});

describe("formatBinAnswer", () => {
  it("mostra o rótulo da opção, não o código", () => {
    const question = requireBinQuestion("G06");
    const label = formatBinAnswer(question, { G06: "G06:3" });
    expect(label).toMatch(/servi/i);
    expect(label).not.toBe("G06:3");
  });

  it("devolve null se a pergunta está vazia", () => {
    const question = getBinQuestion("G01");
    expect(question).toBeTruthy();
    if (!question) return;
    expect(formatBinAnswer(question, {})).toBeNull();
  });
});

describe("inbox do HQ", () => {
  it("mostra envio de geral na ficha do cliente", () => {
    const items = binInboxItemsFromRows([
      {
        metadata: {
          route: "servicos",
          events: [
            {
              at: "2026-09-20T20:00:00.000Z",
              kind: "geral",
              sectionId: "geral",
              route: "servicos",
            },
          ],
        },
        payload: { G06: "G06:3" },
        updatedAt: "2026-09-20T20:00:00.000Z",
        orgName: "TechFlow",
        orgSlug: "techflow",
        isInternal: false,
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.href).toBe("/admin/clientes/techflow?tab=bin");
    expect(items[0]?.headline).toMatch(/geral/i);
  });

  it("mostra rascunho quando há respostas sem Enviar", () => {
    const items = binInboxItemsFromRows([
      {
        metadata: {},
        payload: { G01: "x" },
        updatedAt: "2026-09-20T20:00:00.000Z",
        orgName: "TechFlow",
        orgSlug: "techflow",
        isInternal: false,
      },
    ]);
    expect(items[0]?.kind).toBe("rascunho");
  });

  it("ignora org interna da Land Grow", () => {
    expect(
      binInboxItemsFromRows([
        {
          metadata: {
            events: [{ at: "2026-09-20T20:00:00.000Z", kind: "geral" }],
          },
          payload: { G06: "G06:3" },
          updatedAt: "2026-09-20T20:00:00.000Z",
          orgName: "Land Grow",
          orgSlug: "land-grow",
          isInternal: true,
        },
      ]),
    ).toHaveLength(0);
  });
});

describe("e-mail BIN para a equipe", () => {
  it("avisa a equipe no geral e não avisa o próprio autor", () => {
    const emails = buildBinEmails(
      [
        staff(),
        staff({
          id: "cliente",
          email: "cliente@empresa.com",
          isStaff: false,
          fullName: "Cliente",
        }),
        staff({ id: "staff-1", email: "nayara@landgrow.com" }),
      ],
      {
        orgId: "org-1",
        orgName: "Empresa Cliente",
        orgSlug: "empresa",
        actorId: "staff-1",
        actorName: "Nayara",
        kind: "geral",
        routeLabel: "Serviços",
        entityKey: "x",
        href: "https://pulso.local/admin/clientes/empresa#bin",
      },
    );
    expect(emails).toHaveLength(0);
  });

  it("manda e-mail no setor para outro staff", () => {
    const emails = buildBinEmails(
      [
        staff({ id: "nayara" }),
        staff({
          id: "candido",
          email: "candido@landgrow.com",
          fullName: "Candido",
        }),
      ],
      {
        orgId: "org-1",
        orgName: "Empresa Cliente",
        orgSlug: "empresa",
        actorId: "cliente-1",
        actorName: "Lavínia",
        kind: "setor",
        sectionTitle: "Operacional",
        routeLabel: "Serviços",
        entityKey: "y",
        href: "https://pulso.local/admin/clientes/empresa#bin",
      },
    );
    expect(emails).toHaveLength(2);
    expect(emails[0]?.subject).toMatch(/Operacional/);
    expect(emails[0]?.text).toMatch(/#bin/);
  });
});
