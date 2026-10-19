"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ClienteCadastroForm } from "./cliente-cadastro-form";

export function EditarClienteButton({
  orgId,
  organizationName,
  ownerName,
  ownerEmail,
}: {
  orgId: string;
  organizationName: string;
  ownerName: string;
  ownerEmail: string;
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
          <SheetHeader className="p-0">
            <SheetTitle>Editar {organizationName}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ClienteCadastroForm
              orgId={orgId}
              organizationName={organizationName}
              ownerName={ownerName}
              ownerEmail={ownerEmail}
              hasOwnerAccess={ownerEmail.length > 0}
              onSaved={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
