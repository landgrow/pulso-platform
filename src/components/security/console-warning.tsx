"use client";

import { useEffect } from "react";

let shown = false;

/**
 * Aviso no console do navegador (F12), como fazem Google e Facebook: golpistas
 * pedem para a pessoa "colar um código" ali e roubam a sessão. Só em produção.
 */
export function ConsoleWarning(): null {
  useEffect(() => {
    if (shown || process.env.NODE_ENV !== "production") return;
    shown = true;
    console.log("%cPare!", "color:#B42318;font-size:42px;font-weight:700;");
    console.log(
      "%cEsta área é para desenvolvedores. Se alguém pediu para você copiar e colar algo aqui, é um golpe para entrar na sua conta do PULSO. Feche esta janela e avise a Land Grow (contato@landgrow.com.br).",
      "font-size:16px;line-height:1.5;",
    );
  }, []);
  return null;
}
