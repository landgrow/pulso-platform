import { describe, it, expect } from "vitest";
import { isLandGrowDeliverable } from "@/lib/meetings/land-grow-filter";
import {
  boardHasColumnLabel,
  findDoneColumnId,
  isClosedColumnLabel,
  PLANO_DE_ACAO_COLUMNS,
} from "@/lib/boards/plano-de-acao-template";
import { addDaysIso, dateInSaoPaulo } from "@/lib/notify/calendar";
import { buildOutboundEmails, type NotifyUser } from "@/lib/notify/select-due";
import { buildEventEmails } from "@/lib/notify/card-events";
import { parseDriveFileId } from "@/lib/google/drive-url";
import { isAuthorizedCronRequest } from "@/lib/notify/cron-auth";
import { boardToRows, rowsToCsv } from "@/lib/reports/serialize";
import type { Board } from "@/types/boards";
import { normalizeViewConfig } from "@/types/board-view";

const staff: NotifyUser = {
  id: "u1",
  email: "nayara@landgrow.com.br",
  fullName: "Nayara",
  isStaff: true,
  orgIds: ["org1"],
  prefs: {
    prazo: true,
    reuniao: true,
    conviteEquipe: true,
    resumoDiario: true,
    comentario: true,
    arquivo: true,
    cardCliente: true,
    clienteAtraso: true,
  },
};

describe("isLandGrowDeliverable", () => {
  it("keeps Land Grow deliverables", () => {
    expect(isLandGrowDeliverable("Escrever RADAR da JS Construtora")).toBe(
      true,
    );
  });

  it("drops client operational tasks", () => {
    expect(isLandGrowDeliverable("agendar apresentação com cliente X")).toBe(
      false,
    );
    expect(isLandGrowDeliverable("[cliente] ligar para o financeiro")).toBe(
      false,
    );
  });
});

describe("plano de ação template", () => {
  it("has seven operational columns", () => {
    expect(PLANO_DE_ACAO_COLUMNS).toHaveLength(7);
    expect(isClosedColumnLabel("Concluído")).toBe(true);
    expect(isClosedColumnLabel("CANCELADO")).toBe(true);
    expect(isClosedColumnLabel("A FAZER")).toBe(false);
  });

  it("matches equivalent column labels", () => {
    expect(boardHasColumnLabel(["A Fazer"], "A FAZER")).toBe(true);
    expect(findDoneColumnId([{ id: "d", label: "Concluído" }])).toBe("d");
  });
});

describe("notification job selection", () => {
  it("emails overdue assigned cards and skips closed columns", () => {
    const emails = buildOutboundEmails({
      users: [staff],
      cards: [
        {
          id: "c1",
          titulo: "Entregar HORIZON",
          prazo: "2026-09-14",
          responsavelId: "u1",
          orgId: "org1",
          boardName: "Plano de Ação",
          columnLabel: "A FAZER",
        },
        {
          id: "c2",
          titulo: "Já feito",
          prazo: "2026-09-14",
          responsavelId: "u1",
          orgId: "org1",
          boardName: "Plano de Ação",
          columnLabel: "Concluído",
        },
      ],
      meetings: [
        {
          id: "m1",
          titulo: "Alinhamento",
          data: "2026-09-15",
          orgId: "org1",
        },
      ],
      today: "2026-09-15",
      tomorrow: "2026-09-16",
      horizon: "2026-09-17",
      digestHour: true,
      clientUserIds: new Set(),
    });

    expect(emails.some((e) => e.kind === "prazo" && e.entityKey === "c1")).toBe(
      true,
    );
    expect(emails.some((e) => e.entityKey === "c2")).toBe(false);
    expect(emails.some((e) => e.kind === "reuniao")).toBe(true);
    expect(emails.some((e) => e.kind === "resumo")).toBe(true);
  });

  it("does not send digest outside 8h", () => {
    const emails = buildOutboundEmails({
      users: [staff],
      cards: [],
      meetings: [],
      today: "2026-09-15",
      tomorrow: "2026-09-16",
      horizon: "2026-09-17",
      digestHour: false,
      clientUserIds: new Set(),
    });
    expect(emails.filter((e) => e.kind === "resumo")).toHaveLength(0);
  });

  it("emails upcoming cards and client overdue to staff", () => {
    const emails = buildOutboundEmails({
      users: [staff],
      cards: [
        {
          id: "soon",
          titulo: "Enviar proposta",
          prazo: "2026-09-17",
          responsavelId: "u1",
          orgId: "org1",
          boardName: "Plano de Ação",
          columnLabel: "A FAZER",
        },
        {
          id: "late-client",
          titulo: "Enviar extrato",
          prazo: "2026-09-10",
          responsavelId: "client1",
          orgId: "org1",
          boardName: "Plano de Ação",
          columnLabel: "A FAZER",
        },
      ],
      meetings: [],
      today: "2026-09-15",
      tomorrow: "2026-09-16",
      horizon: "2026-09-17",
      digestHour: false,
      clientUserIds: new Set(["client1"]),
    });
    expect(
      emails.some((e) => e.kind === "prazo" && e.entityKey === "soon:soon"),
    ).toBe(true);
    expect(
      emails.some(
        (e) => e.kind === "cliente_atraso" && e.entityKey === "late-client",
      ),
    ).toBe(true);
  });
});

describe("card event emails", () => {
  it("skips the author and emails staff on client card change", () => {
    const emails = buildEventEmails(
      [
        staff,
        {
          ...staff,
          id: "client1",
          email: "cliente@js.com",
          isStaff: false,
          prefs: { ...staff.prefs, cardCliente: true },
        },
      ],
      {
        cardId: "c1",
        cardTitle: "Enviar extrato",
        boardName: "Plano de Ação",
        orgId: "org1",
        assigneeId: "u1",
        actorId: "client1",
        actorName: "Jefferson",
        kind: "card_cliente",
        detail: "atualizou o card",
        entityKey: "evt-1",
      },
    );
    expect(emails).toHaveLength(1);
    expect(emails[0]?.userId).toBe("u1");
    expect(emails[0]?.subject).toContain("Cliente no card");
  });
});

describe("drive url", () => {
  it("reads file id from docs and drive links", () => {
    expect(
      parseDriveFileId("https://docs.google.com/document/d/abc123/edit"),
    ).toBe("abc123");
    expect(parseDriveFileId("https://drive.google.com/file/d/xyz99/view")).toBe(
      "xyz99",
    );
  });
});

describe("calendar helpers", () => {
  it("adds days on ISO dates without timezone drift", () => {
    expect(addDaysIso("2026-09-15", 1)).toBe("2026-09-16");
    expect(dateInSaoPaulo(new Date("2026-09-15T15:00:00Z"))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });
});

describe("cron auth", () => {
  it("rejects request without matching bearer", () => {
    const secret = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    expect(
      isAuthorizedCronRequest(new Request("http://x", { headers: {} })),
    ).toBe(false);
    process.env.CRON_SECRET = "abc";
    expect(
      isAuthorizedCronRequest(new Request("http://x", { headers: {} })),
    ).toBe(false);
    expect(
      isAuthorizedCronRequest(
        new Request("http://x", { headers: { authorization: "Bearer abc" } }),
      ),
    ).toBe(true);
    process.env.CRON_SECRET = secret;
  });
});

describe("board export", () => {
  it("serializes cards to csv with header", () => {
    const board: Board = {
      id: "b1",
      org_id: "o1",
      name: "Plano de Ação",
      module: "atividades",
      kind: "standard",
      icon: "📋",
      color: "#6366f1",
      field_config: {},
      view_config: normalizeViewConfig(null),
      properties: [],
      columns: [{ id: "col1", label: "A FAZER", color: "#ccc", position: 0 }],
      cards: [
        {
          id: "c1",
          column_id: "col1",
          titulo: "Escrever RADAR",
          prioridade: "alta",
          responsavel_id: null,
          responsavel_nome: null,
          setor: "Estratégico",
          prazo: "2026-09-20",
          related_org_id: null,
          related_org_name: null,
          observacoes: null,
          subtarefas: [],
          comentarios: [],
          arquivos: [],
          bloqueada_por: null,
          position: 0,
          custom_values: {},
        },
      ],
    };
    const csv = rowsToCsv(boardToRows(board));
    expect(csv).toContain("Titulo");
    expect(csv).toContain("Escrever RADAR");
    expect(csv).toContain("Alta");
  });
});
