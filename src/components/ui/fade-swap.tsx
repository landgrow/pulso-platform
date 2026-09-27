"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Troca de painel: enter 180ms (opacity + 8px Y + blur).
 * Primeiro mount não anima (conteúdo estático).
 * Wrapper extra para o `key` remountar o painel (key no root do componente é ignorado).
 */
export function FadeSwap({
  swapKey,
  children,
}: {
  swapKey: string;
  children: ReactNode;
}): JSX.Element {
  const skipEnter = useRef(true);

  useEffect(() => {
    skipEnter.current = false;
  }, []);

  return (
    <div className="w-full min-w-0">
      <div
        key={swapKey}
        className={
          // eslint-disable-next-line react-hooks/refs -- read on the render triggered by a later swapKey change, after the mount effect already flipped it; skips the enter animation only on first paint
          skipEnter.current ? "w-full min-w-0" : "w-full min-w-0 ws-panel-in"
        }
      >
        {children}
      </div>
    </div>
  );
}
