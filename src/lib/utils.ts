import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes CSS condicionalmente
 * Usar em vez de template literals para evitar erros
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formata um valor monetário (BRL por padrão)
 */
export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

/**
 * Formata uma data para o padrão brasileiro
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    ...options,
  }).format(d);
}

/**
 * Gera um UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Extrai iniciais de um nome
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Capitaliza a primeira letra de cada palavra
 */
export function capitalize(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Formata um número com separadores de milhar
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

/**
 * Formata uma porcentagem
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Converte uma cor hex (#RRGGBB) pra rgba() com a opacidade dada — usado pra
 * tingir fundo de card na cor de um item (setor, nó de mapa mental, etc.)
 * sem precisar de uma paleta de "cor + versão clara" pra cada cor.
 */
export function chartHexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Verifica se uma data (string YYYY-MM-DD ou Date) já passou — usado pra
 * destacar prazos atrasados em tabelas/cards de tarefas.
 */
export function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(`${date}T23:59:59`) : date;
  return d.getTime() < Date.now();
}

/**
 * verifica se estamos no browser
 */
export const isBrowser = typeof window !== "undefined";

/**
 * sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
