import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const sendMock = vi.fn();
vi.mock("@/lib/notify/send-email", () => ({
  sendTransactionalEmail: (...args: unknown[]) => sendMock(...args),
}));

import { sendMeetingReminders } from "@/lib/meetings/send-invites";

type Row = {
  id: string;
  titulo: string;
  data: string;
  hora_inicio: string;
  duracao_min: number;
  link: string | null;
  convidados: { email: string; nome: string }[];
  lembrete_enviado_at: string | null;
};

/** Banco falso: só o suficiente para select/update de meetings. */
function fakeAdmin(rows: Row[]) {
  return {
    from() {
      let filters: ((r: Row) => boolean)[] = [];
      let patch: Partial<Row> | null = null;
      const q = {
        select: () => q,
        not: () => q,
        is: (col: keyof Row, val: null) => {
          filters.push((r) => r[col] === val);
          return q;
        },
        in: (col: keyof Row, vals: string[]) => {
          filters.push((r) => vals.includes(r[col] as string));
          return q;
        },
        eq: (col: keyof Row, val: string) => {
          filters.push((r) => r[col] === val);
          return q;
        },
        update: (p: Partial<Row>) => {
          patch = p;
          return q;
        },
        then: (resolve: (v: { data: unknown[]; error: null }) => unknown) => {
          const hit = rows.filter((r) => filters.every((f) => f(r)));
          if (patch) hit.forEach((r) => Object.assign(r, patch));
          filters = [];
          patch = null;
          return resolve({ data: hit, error: null });
        },
      };
      return q;
    },
  } as never;
}

const guests = [
  { email: "a@x.com", nome: "A" },
  { email: "b@x.com", nome: "B" },
];

function meeting(partial: Partial<Row> = {}): Row {
  return {
    id: "m1",
    titulo: "Alinhamento",
    data: "2026-10-06",
    hora_inicio: "14:30:00",
    duracao_min: 60,
    link: null,
    convidados: guests,
    lembrete_enviado_at: null,
    ...partial,
  };
}

// 14:30 em Brasília = 17:30 UTC
const at = (hhmmUtc: string) => new Date(`2026-10-06T${hhmmUtc}:00Z`);

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ ok: true, id: "1" });
});

describe("sendMeetingReminders", () => {
  it("manda para todos os convidados quando falta 1h ou menos", async () => {
    const rows = [meeting()];
    const r = await sendMeetingReminders(at("16:40"), fakeAdmin(rows));
    expect(r.sent).toBe(2);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0]?.[0]).toMatchObject({ to: "a@x.com" });
    expect(sendMock.mock.calls[0]?.[0].subject).toContain("Lembrete");
    expect(rows[0]?.lembrete_enviado_at).not.toBeNull();
  });

  it("não manda de novo na execução seguinte do cron", async () => {
    const rows = [meeting()];
    await sendMeetingReminders(at("16:40"), fakeAdmin(rows));
    sendMock.mockClear();
    const again = await sendMeetingReminders(at("16:55"), fakeAdmin(rows));
    expect(again.sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("não manda cedo demais nem depois de a reunião começar", async () => {
    const early = [meeting()];
    await sendMeetingReminders(at("16:00"), fakeAdmin(early)); // falta 1h30
    expect(sendMock).not.toHaveBeenCalled();
    const late = [meeting()];
    await sendMeetingReminders(at("17:45"), fakeAdmin(late)); // já começou
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("ignora reunião sem convidados", async () => {
    await sendMeetingReminders(
      at("16:40"),
      fakeAdmin([meeting({ convidados: [] })]),
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("se nada saiu (sem e-mail configurado), libera para tentar de novo", async () => {
    sendMock.mockResolvedValue({
      ok: false,
      skipped: true,
      error: "sem chave",
    });
    const rows = [meeting()];
    const r = await sendMeetingReminders(at("16:40"), fakeAdmin(rows));
    expect(r.sent).toBe(0);
    expect(r.failed).toBe(1);
    expect(rows[0]?.lembrete_enviado_at).toBeNull();
  });
});
