import type { UIMessage } from "ai";

/**
 * O histórico do chat vem do navegador — ou seja, de quem estiver usando, que
 * pode editá-lo no F12. Antes de ir para o modelo:
 * - só ficam falas de "user" e "assistant" (nada de "system" injetado);
 * - só texto (sem arquivos/imagens/ferramentas forjados);
 * - tamanho limitado (cada fala e o total), porque o custo é por token;
 * - a última fala tem que ser do usuário.
 */
export const CHAT_LIMITS = {
  maxMessages: 16,
  maxCharsPerMessage: 4000,
  maxTotalChars: 24000,
} as const;

export type ChatGuardResult =
  { ok: true; messages: UIMessage[] } | { ok: false; error: string };

export function sanitizeChatMessages(raw: unknown): ChatGuardResult {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "Mensagens inválidas." };
  }
  if (raw.length > CHAT_LIMITS.maxMessages) {
    return {
      ok: false,
      error: "Conversa longa demais. Comece uma nova conversa.",
    };
  }

  const clean: UIMessage[] = [];
  let total = 0;
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "Mensagens inválidas." };
    }
    const msg = item as { id?: unknown; role?: unknown; parts?: unknown };
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    const text = parts
      .filter(
        (p): p is { type: "text"; text: string } =>
          !!p &&
          typeof p === "object" &&
          (p as { type?: unknown }).type === "text" &&
          typeof (p as { text?: unknown }).text === "string",
      )
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (!text) continue;
    if (text.length > CHAT_LIMITS.maxCharsPerMessage) {
      return {
        ok: false,
        error: `Mensagem longa demais (máximo ${CHAT_LIMITS.maxCharsPerMessage} caracteres).`,
      };
    }
    total += text.length;
    clean.push({
      id: typeof msg.id === "string" ? msg.id.slice(0, 100) : `m${index}`,
      role: msg.role,
      parts: [{ type: "text", text }],
    });
  }

  if (total > CHAT_LIMITS.maxTotalChars) {
    return {
      ok: false,
      error: "Conversa longa demais. Comece uma nova conversa.",
    };
  }
  if (clean.length === 0 || clean[clean.length - 1]?.role !== "user") {
    return { ok: false, error: "Mensagens inválidas." };
  }
  return { ok: true, messages: clean };
}
