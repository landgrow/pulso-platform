// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { CardColetaTipo } from "@/components/collections/periodo/card-coleta-tipo";

afterEach(() => cleanup());

describe("CardColetaTipo", () => {
  it("renderiza label e estatística principal", () => {
    render(
      <CardColetaTipo
        icon={FileText}
        label="Formulário"
        primaryStat="100%"
        href="/x"
      />,
    );
    expect(screen.getByText("Formulário")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renderiza como link clicável quando href é passado", () => {
    render(
      <CardColetaTipo
        icon={FileText}
        label="Uploads"
        primaryStat="3 arq."
        href="/clientes/x/coleta/upload"
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/clientes/x/coleta/upload");
  });

  it("não renderiza como link quando href não é passado (ex: Áudio adiado)", () => {
    render(
      <CardColetaTipo
        icon={FileText}
        label="Áudio"
        primaryStat="0"
        disabledNote="Em breve"
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Em breve")).toBeInTheDocument();
  });

  it("mostra secondaryStat quando não há disabledNote", () => {
    render(
      <CardColetaTipo
        icon={FileText}
        label="Texto Livre"
        primaryStat="2"
        secondaryStat="há 2h"
        href="/x"
      />,
    );
    expect(screen.getByText("há 2h")).toBeInTheDocument();
  });
});
