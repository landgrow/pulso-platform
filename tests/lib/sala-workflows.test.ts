import { describe, expect, it } from "vitest";
import { clientNav, HQ_NAV } from "@/lib/nav/destinations";
import { SALA_KITS } from "@/lib/sala/templates";
import {
  describeAction,
  describeTrigger,
  isWorkflowDue,
  parseWorkflowPrompt,
  triggerFromOptionId,
  triggerOptionId,
  WORKFLOW_CHIPS,
} from "@/lib/sala/workflows";
import { isPulsoPrompt } from "@/lib/sala/dm";
import { DEFAULT_CONSULTANT_CAPABILITIES } from "@/lib/auth/staff-access";

describe("Sala workflows and calendar nav", () => {
  it("parses a weekly reminder in Portuguese", () => {
    const parsed = parseWorkflowPrompt(
      "Lembre minha equipe todas as segundas-feiras às 9h de postar o andamento em #geral",
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.trigger).toEqual({ type: "weekly", weekday: 1, hour: 9 });
    expect(parsed?.action.channelSlug).toBe("geral");
    expect(describeTrigger(parsed!.trigger)).toContain("segunda");
  });

  it("fires weekly workflows on that weekday at the HQ morning job", () => {
    expect(
      isWorkflowDue({ type: "weekly", weekday: 1, hour: 9 }, { weekday: 1, hour: 8 }),
    ).toBe(true);
    expect(
      isWorkflowDue({ type: "weekly", weekday: 1, hour: 9 }, { weekday: 2, hour: 8 }),
    ).toBe(false);
  });

  it("detects @pulso prompts for the operations agent", () => {
    expect(isPulsoPrompt("@pulso o que vence hoje?")).toBe(true);
    expect(isPulsoPrompt("/pulso pipeline")).toBe(true);
    expect(isPulsoPrompt("oi equipe")).toBe(false);
  });

  it("turns prazo and agenda prompts into live PULSO triggers", () => {
    expect(parseWorkflowPrompt("Avise quando um prazo vencer")?.trigger).toEqual({
      type: "card_due",
    });
    expect(
      parseWorkflowPrompt("Lembre a reunião de amanhã na agenda")?.trigger,
    ).toEqual({ type: "meeting_soon" });
  });

  it("adds an AI step when the prompt asks for CRM insight", () => {
    const parsed = parseWorkflowPrompt(
      "Toda segunda às 9h gere com IA um resumo do CRM e publique em #geral",
    );
    expect(parsed?.action.useAi).toBe(true);
    expect(describeAction(parsed!.action)).toContain("PULSO");
  });

  it("keeps the typed recado as the message body so the editor can change it", () => {
    const parsed = parseWorkflowPrompt("lembrar do resultado do semente");
    expect(parsed?.action.body).toBe("lembrar do resultado do semente");
    expect(triggerOptionId(parsed!.trigger)).toBe("weekly-1");
    expect(triggerFromOptionId("card_due")).toEqual({ type: "card_due" });
    expect(describeTrigger(triggerFromOptionId("weekly-5"))).toContain("sexta");
  });

  it("keeps workflow chips pointed at a Sala channel so the UI can remap them", () => {
    expect(WORKFLOW_CHIPS.every((chip) => chip.prompt.includes("#geral"))).toBe(
      true,
    );
  });

  it("ships project and campaign kits for channel canvases", () => {
    expect(SALA_KITS.map((kit) => kit.id)).toEqual(
      expect.arrayContaining(["projeto", "campanha", "feedback", "marca"]),
    );
  });

  it("adds Calendário to HQ and the client portal", () => {
    expect(HQ_NAV.find((item) => item.href === "/admin/calendario")?.visibility).toBe(
      "calendario",
    );
    expect(clientNav("ontec").some((item) => item.href.includes("calendario"))).toBe(
      true,
    );
    expect(clientNav("ontec").some((item) => item.href.includes("reunioes"))).toBe(
      true,
    );
    expect(DEFAULT_CONSULTANT_CAPABILITIES).toContain("calendario");
  });
});
