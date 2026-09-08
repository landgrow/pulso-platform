"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps): JSX.Element {
  // Criar QueryClient apenas uma vez (no cliente)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tempo máximo que dados ficam em cache antes de refetch
            staleTime: 60 * 1000, // 1 minuto
            // Tempo que dados em cache ficam disponíveis mesmo offline
            gcTime: 5 * 60 * 1000, // 5 minutos (antigo cacheTime)
            // Não refetch automático quando janela ganha foco
            refetchOnWindowFocus: false,
            // Número de retries em caso de erro
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
