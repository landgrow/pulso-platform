// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/collections/periodo/status-badge";

afterEach(() => cleanup());

describe("StatusBadge", () => {
  it("mostra o label de em_coleta", () => {
    render(<StatusBadge status="em_coleta" />);
    expect(screen.getByText("Em coleta")).toBeInTheDocument();
  });

  it("mostra o label de pronto_para_analise", () => {
    render(<StatusBadge status="pronto_para_analise" />);
    expect(screen.getByText("Pronto p/ análise")).toBeInTheDocument();
  });

  it("mostra o label de analisado", () => {
    render(<StatusBadge status="analisado" />);
    expect(screen.getByText("Analisado")).toBeInTheDocument();
  });

  it("mostra o label de fechado", () => {
    render(<StatusBadge status="fechado" />);
    expect(screen.getByText("Fechado")).toBeInTheDocument();
  });

  it("mostra a data de fechamento quando status é fechado e closedAt existe", () => {
    render(
      <StatusBadge status="fechado" closedAt="2026-09-05T12:00:00.000Z" />,
    );
    expect(screen.getByText(/em \d{2}\/\d{2}\/\d{4}/)).toBeInTheDocument();
  });

  it("não mostra data de fechamento para outros status mesmo se closedAt vier preenchido", () => {
    render(
      <StatusBadge status="em_coleta" closedAt="2026-09-05T12:00:00.000Z" />,
    );
    expect(
      screen.queryByText(/em \d{2}\/\d{2}\/\d{4}/),
    ).not.toBeInTheDocument();
  });

  it("não quebra quando closedAt é null em período fechado", () => {
    render(<StatusBadge status="fechado" closedAt={null} />);
    expect(screen.getByText("Fechado")).toBeInTheDocument();
  });
});
