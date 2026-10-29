import { describe, expect, it } from "vitest";
import { shouldOpenMeetingRecord } from "@/lib/calendario/sync-meeting";

describe("agenda → reuniões", () => {
  it("opens a meeting when the event is tagged to a client", () => {
    expect(
      shouldOpenMeetingRecord({
        kind: "interno",
        orgId: "org-1",
        calendarSlug: "equipe",
      }),
    ).toBe(true);
  });

  it("opens a meeting for reunião or call even without a client", () => {
    expect(
      shouldOpenMeetingRecord({
        kind: "reuniao",
        orgId: null,
        calendarSlug: "equipe",
      }),
    ).toBe(true);
    expect(
      shouldOpenMeetingRecord({
        kind: "call",
        orgId: null,
        calendarSlug: "equipe",
      }),
    ).toBe(true);
  });

  it("opens a meeting when the event sits on the Reuniões calendar", () => {
    expect(
      shouldOpenMeetingRecord({
        kind: "interno",
        orgId: null,
        calendarSlug: "reunioes",
      }),
    ).toBe(true);
  });

  it("keeps reminders off the Reuniões tab", () => {
    expect(
      shouldOpenMeetingRecord({
        kind: "lembrete",
        orgId: null,
        calendarSlug: "equipe",
      }),
    ).toBe(false);
  });
});
