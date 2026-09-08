"use client";

import { useCallback, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Hook de auto-save com debounce.
 *
 * @param onSave — função chamada com o valor atual após o debounce
 * @param debounceMs — ms de espera após última alteração (default 1500)
 * @param initialStatus — status inicial (default idle)
 */
export function useAutoSave<T>({
  onSave,
  debounceMs = 1500,
  initialStatus = "idle",
}: {
  onSave: (value: T) => Promise<void>;
  debounceMs?: number;
  initialStatus?: AutoSaveStatus;
}) {
  const [status, setStatus] = useState<AutoSaveStatus>(initialStatus);
  const valueRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  const save = useCallback(
    async (value: T) => {
      valueRef.current = value;
      abortRef.current = false;
      setStatus("dirty");

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        if (valueRef.current === null || abortRef.current) return;
        setStatus("saving");
        try {
          await onSave(valueRef.current);
          if (!abortRef.current) setStatus("saved");
          // Volta para idle após 3s de "saved"
          setTimeout(() => {
            setStatus((s) => (s === "saved" ? "idle" : s));
          }, 3000);
        } catch {
          if (!abortRef.current) setStatus("error");
        }
      }, debounceMs);
    },
    [onSave, debounceMs],
  );

  const reset = useCallback(() => {
    abortRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    valueRef.current = null;
    setStatus("idle");
  }, []);

  return { save, status, reset };
}
