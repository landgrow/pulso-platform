"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ClienteCadastroForm } from "./cliente-cadastro-form";
import type { TeamMember } from "@/types/clientes";

export function EditarClienteButton({
  orgId,
  organizationName,
  ownerName,
  ownerEmail,
  members = [],
}: {
  orgId: string;
  organizationName: string;
  ownerName: string;
  ownerEmail: string;
  members?: TeamMember[];
}): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5 mr-1.5" />
        Editar
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader className="space-y-1 p-0 pr-8">
            <SheetTitle>Editar {organizationName}</SheetTitle>
            <SheetDescription>
              Nome do cliente, dono e outras pessoas da equipe.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ClienteCadastroForm
              orgId={orgId}
              organizationName={organizationName}
              ownerName={ownerName}
              ownerEmail={ownerEmail}
              hasOwnerAccess={ownerEmail.length > 0}
              members={members}
              onSaved={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
