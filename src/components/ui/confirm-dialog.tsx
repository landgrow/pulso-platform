"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

/**
 * Confirmação antes de ação destrutiva, no lugar do window.confirm nativo.
 * Uso: const [confirmNode, confirm] = useConfirm(); … if (!(await confirm({...}))) return;
 * e renderizar {confirmNode} no componente.
 */
export function useConfirm(): [
  JSX.Element,
  (opts: ConfirmOptions) => Promise<boolean>,
] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOpts(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (ok: boolean): void => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  const node = (
    <Dialog open={opts !== null} onOpenChange={(open) => !open && close(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{opts?.title}</DialogTitle>
          {opts?.description ? (
            <DialogDescription>{opts.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={opts?.destructive === false ? "default" : "destructive"}
            onClick={() => close(true)}
            autoFocus
          >
            {opts?.confirmLabel ?? "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return [node, confirm];
}
