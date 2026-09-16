"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CreateClientAccountForm } from "@/app/(dashboard)/admin/acessos/create-client-account-form";

/** Abre o convite de cliente dentro de Organizações — Acessos sai do menu. */
export function NovoClienteSheet(): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Novo cliente
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader className="p-0">
            <SheetTitle>Novo cliente</SheetTitle>
          </SheetHeader>
          <CreateClientAccountForm />
        </SheetContent>
      </Sheet>
    </>
  );
}
