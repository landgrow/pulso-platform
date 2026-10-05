import { describe, expect, it } from "vitest";
import {
  buildIcs,
  escapeIcsText,
  foldIcsLine,
  formatIcsDate,
  formatWhen,
  inviteEmailText,
  isInReminderWindow,
  meetingEndUtc,
  meetingStartUtc,
} from "@/lib/meetings/invite";

describe("horário de São Paulo → UTC", () => {
  it("14:30 em Brasília é 17:30 UTC", () => {
    const start = meetingStartUtc("2026-10-06", "14:30:00");
    expect(start.toISOString()).toBe("2026-10-06T17:30:00.000Z");
    expect(formatIcsDate(start)).toBe("20261006T173000Z");
  });
  it("23:30 vira o dia seguinte em UTC", () => {
    expect(meetingStartUtc("2026-10-06", "23:30").toISOString()).toBe(
      "2026-10-07T02:30:00.000Z",
    );
  });
  it("a duração soma em minutos", () => {
    const start = meetingStartUtc("2026-10-06", "14:00");
    expect(meetingEndUtc(start, 90).toISOString()).toBe(
      "2026-10-06T18:30:00.000Z",
    );
  });
});

describe("escape e dobra de linhas do .ics", () => {
  it("escapa vírgula, ponto e vírgula, barra e quebra de linha", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });
  it("não dobra linha curta", () => {
    expect(foldIcsLine("SUMMARY:Oi")).toBe("SUMMARY:Oi");
  });
  it("dobra linha longa em pedaços de até 75 bytes, sem quebrar acento", () => {
    const folded = foldIcsLine("DESCRIPTION:" + "ação ".repeat(40));
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) {
      expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    }
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(parts.join("").replace(/ (?= )/g, "")).toContain("ação");
  });
});

describe("buildIcs", () => {
  const base = {
    uid: "abc@pulso",
    sequence: 0,
    titulo: "Alinhamento, semanal",
    start: new Date("2026-10-06T17:30:00Z"),
    end: new Date("2026-10-06T18:30:00Z"),
    organizer: { email: "nayara@landgrow.com.br", nome: "Nayara" },
    attendees: [
      { email: "cliente@empresa.com", nome: "Cliente" },
      { email: "outro@empresa.com", nome: "" },
    ],
    now: new Date("2026-10-05T12:00:00Z"),
  };

  it("monta um convite válido com CRLF e todos os convidados", () => {
    const ics = buildIcs({
      ...base,
      method: "REQUEST",
      link: "https://meet/x",
    });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("UID:abc@pulso");
    expect(ics).toContain("DTSTART:20261006T173000Z");
    expect(ics).toContain("DTEND:20261006T183000Z");
    expect(ics).toContain("SUMMARY:Alinhamento\\, semanal");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("LOCATION:https://meet/x");
    expect(ics).toContain("mailto:cliente@empresa.com");
    expect(ics).toContain('CN="outro@empresa.com"');
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("cancelamento usa o mesmo UID, versão maior e STATUS:CANCELLED", () => {
    const ics = buildIcs({ ...base, method: "CANCEL", sequence: 2 });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("SEQUENCE:2");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("UID:abc@pulso");
  });

  it("nome com aspas ou dois-pontos não quebra o cabeçalho", () => {
    const ics = buildIcs({
      ...base,
      method: "REQUEST",
      organizer: { email: "a@b.com", nome: 'Fulano "O: Chefe"' },
    });
    expect(ics).toContain('ORGANIZER;CN="Fulano  O  Chefe":mailto:a@b.com');
  });
});

describe("textos do e-mail", () => {
  const start = new Date("2026-10-06T17:30:00Z");
  const end = new Date("2026-10-06T18:30:00Z");

  it("diz o horário de Brasília por extenso", () => {
    const when = formatWhen(start, end);
    expect(when).toContain("14:30");
    expect(when).toContain("15:30");
    expect(when).toContain("06/10/2026");
    expect(when).toContain("Brasília");
  });
  it("convite, atualização e cancelamento têm assunto próprio", () => {
    const o = { titulo: "Reunião X", start, end, organizerName: "Nayara" };
    expect(inviteEmailText({ ...o, method: "REQUEST" }).subject).toBe(
      "Convite: Reunião X",
    );
    expect(
      inviteEmailText({ ...o, method: "REQUEST", update: true }).subject,
    ).toBe("Convite atualizado: Reunião X");
    expect(inviteEmailText({ ...o, method: "CANCEL" }).subject).toBe(
      "Cancelada: Reunião X",
    );
  });
  it("só inclui o link quando existe", () => {
    const o = {
      titulo: "R",
      start,
      end,
      organizerName: "N",
      method: "REQUEST" as const,
    };
    expect(inviteEmailText(o).text).not.toContain("Link:");
    expect(inviteEmailText({ ...o, link: "https://x" }).text).toContain(
      "Link: https://x",
    );
  });
});

describe("janela do lembrete de 1 hora", () => {
  const now = new Date("2026-10-06T16:30:00Z");
  it("dispara de 0 a 60 min antes", () => {
    expect(isInReminderWindow(new Date("2026-10-06T17:30:00Z"), now)).toBe(
      true,
    );
    expect(isInReminderWindow(new Date("2026-10-06T17:00:00Z"), now)).toBe(
      true,
    );
    expect(isInReminderWindow(new Date("2026-10-06T16:31:00Z"), now)).toBe(
      true,
    );
  });
  it("não dispara cedo demais, nem depois de começar", () => {
    expect(isInReminderWindow(new Date("2026-10-06T17:31:00Z"), now)).toBe(
      false,
    );
    expect(isInReminderWindow(new Date("2026-10-06T16:30:00Z"), now)).toBe(
      false,
    );
    expect(isInReminderWindow(new Date("2026-10-06T16:00:00Z"), now)).toBe(
      false,
    );
  });
});
