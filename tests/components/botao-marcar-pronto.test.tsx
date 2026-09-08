// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/actions/periodo-status", () => ({
  markReadyForAnalysis: vi.fn(),
}));

const { BotaoMarcarPronto } =
  await import("@/components/collections/periodo/botao-marcar-pronto");

afterEach(() => cleanup());

function getTriggerButton() {
  return screen.getByRole("button", {
    name: /marcar como pronto para análise/i,
  });
}

describe("BotaoMarcarPronto — habilitação", () => {
  it("fica habilitado quando a régua padrão é atingida (formulário 100% + 1 fonte)", () => {
    render(
      <BotaoMarcarPronto
        periodId="00000000-0000-0000-0000-000000000001"
        formularioProgresso={100}
        outrasFontesCount={1}
        meetsDefaultRule={true}
        canOverride={false}
      />,
    );
    expect(getTriggerButton()).not.toBeDisabled();
  });

  it("fica desabilitado quando a régua padrão não é atingida e o usuário não pode fazer override", () => {
    render(
      <BotaoMarcarPronto
        periodId="00000000-0000-0000-0000-000000000001"
        formularioProgresso={40}
        outrasFontesCount={0}
        meetsDefaultRule={false}
        canOverride={false}
      />,
    );
    expect(getTriggerButton()).toBeDisabled();
  });

  it("fica habilitado mesmo sem atingir a régua padrão, se o usuário pode fazer override (client_owner/platform_admin)", () => {
    render(
      <BotaoMarcarPronto
        periodId="00000000-0000-0000-0000-000000000001"
        formularioProgresso={40}
        outrasFontesCount={0}
        meetsDefaultRule={false}
        canOverride={true}
      />,
    );
    expect(getTriggerButton()).not.toBeDisabled();
  });
});
