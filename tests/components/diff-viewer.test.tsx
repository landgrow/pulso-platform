// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DiffViewer } from "@/components/collections/historico/diff-viewer";

afterEach(() => cleanup());

describe("DiffViewer", () => {
  it("mostra mensagem de primeira versão quando não há `before`", () => {
    render(
      <DiffViewer
        tipo="formulario"
        before={undefined}
        after={{ fin_faturamento: 100 }}
      />,
    );
    expect(screen.getByText(/primeira versão registrada/i)).toBeInTheDocument();
  });

  it("mostra tabela de campo-a-campo para formulario", () => {
    render(
      <DiffViewer
        tipo="formulario"
        before={{ fin_faturamento: 100 }}
        after={{ fin_faturamento: 200 }}
      />,
    );
    expect(screen.getByText("fin_faturamento")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("mostra mensagem de nada mudou quando os campos são idênticos", () => {
    render(<DiffViewer tipo="formulario" before={{ a: 1 }} after={{ a: 1 }} />);
    expect(screen.getByText(/nenhum campo mudou/i)).toBeInTheDocument();
  });

  it("mostra diff de linha pra texto_livre", () => {
    render(
      <DiffViewer
        tipo="texto_livre"
        before={{ conteudo: "linha 1" }}
        after={{ conteudo: "linha 1\nlinha 2" }}
      />,
    );
    expect(screen.getByText(/linha 2/)).toBeInTheDocument();
  });
});
