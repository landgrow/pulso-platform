import "server-only";
import { groq } from "@ai-sdk/groq";
import { xai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";

export type LlmProviderId = "groq" | "xai";

export interface LlmSetup {
  provider: LlmProviderId;
  modelId: string;
  label: string;
  model: LanguageModel;
}

/**
 * Teste local: Groq é a API gratuita. Grok (xAI) entra só se houver
 * XAI_API_KEY — a API da xAI é paga, não tem faixa free.
 */
export function resolveLlm(): LlmSetup | { error: string } {
  const forced = process.env.PULSO_LLM_PROVIDER?.trim().toLowerCase();
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasXai = Boolean(process.env.XAI_API_KEY);

  if (forced === "xai") {
    if (!hasXai) {
      return {
        error:
          "PULSO_LLM_PROVIDER=xai, mas XAI_API_KEY não está no .env.local. A API do Grok é paga (console.x.ai).",
      };
    }
    return {
      provider: "xai",
      modelId: "grok-4.3",
      label: "Grok 4.3 (xAI, pago)",
      model: xai("grok-4.3"),
    };
  }

  if (forced === "groq" || hasGroq) {
    if (!hasGroq) {
      return {
        error:
          "Falta GROQ_API_KEY no .env.local. Crie de graça em https://console.groq.com/keys",
      };
    }
    return {
      provider: "groq",
      modelId: "llama-3.3-70b-versatile",
      label: "Llama 3.3 70B (Groq, gratuito)",
      model: groq("llama-3.3-70b-versatile"),
    };
  }

  if (hasXai) {
    return {
      provider: "xai",
      modelId: "grok-4.3",
      label: "Grok 4.3 (xAI, pago)",
      model: xai("grok-4.3"),
    };
  }

  return {
    error:
      "Nenhuma chave de IA para o chat. Para testar sem custo: GROQ_API_KEY em https://console.groq.com/keys (Groq, não é o Grok da xAI). Grok exige XAI_API_KEY paga.",
  };
}

export { pulsoChatDossier, pulsoChatSystem } from "./prompts";
