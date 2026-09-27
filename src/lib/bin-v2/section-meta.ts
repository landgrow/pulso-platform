import { SETOR_COLORS } from "@/lib/constants";
import type { BinSection } from "./types";

export const BIN_SECTION_DESCRIPTIONS: Record<string, string> = {
  geral:
    "Quem responde, o que a empresa faz, tamanho e o maior problema agora.",
  operacional: "Processos, rotinas e eficiência das entregas.",
  financeiro: "Fluxo de caixa, margem e saúde financeira.",
  marketing: "Posicionamento, canais e geração de demanda.",
  vendas: "Funil comercial, conversão e relacionamento com cliente.",
  administrativo: "Rotinas, documentação e organização interna.",
  rh: "Contratação, cultura e gestão de pessoas.",
  lideranca: "Tomada de decisão, delegação e visão de longo prazo.",
  inovacao: "Novos serviços, mudanças e o que a empresa tenta diferente.",
  juridico: "Contratos, licenças, passivo e riscos legais.",
  estrategico: "Metas, posicionamento e desdobramento de planos.",
};

export function binSectionColor(section: BinSection): string {
  const byTitle: Record<string, string | undefined> = {
    Operacional: SETOR_COLORS.Operacional,
    Pessoas: SETOR_COLORS.RH,
    Financeiro: SETOR_COLORS.Financeiro,
    Marketing: SETOR_COLORS.Marketing,
    Administrativo: SETOR_COLORS.Administrativo,
    Estratégico: SETOR_COLORS.Estratégico,
    Vendas: SETOR_COLORS.Vendas,
    "Novos serviços e mudanças": SETOR_COLORS.Inovação,
    Jurídico: SETOR_COLORS.Jurídico,
    Liderança: SETOR_COLORS.Liderança,
  };
  return byTitle[section.title] ?? "#94A3B8";
}
