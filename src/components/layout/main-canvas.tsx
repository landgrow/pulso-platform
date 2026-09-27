"use client";

import type { ReactNode } from "react";

export function MainCanvas({ children }: { children: ReactNode }): JSX.Element {
  return (
    <main className="relative min-w-0 flex-1 overflow-y-auto w-full px-5 py-5 md:px-8">
      {children}
    </main>
  );
}
