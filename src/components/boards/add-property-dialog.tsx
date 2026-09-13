"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Type,
  Hash,
  Calendar,
  CircleDot,
  ListChecks,
  CheckSquare,
  Link as LinkIcon,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { createProperty } from "@/app/actions/boards";
import { PROPERTY_TYPE_LABELS, type PropertyType } from "@/types/boards";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<
  PropertyType,
  React.ComponentType<{ className?: string }>
> = {
  text: Type,
  number: Hash,
  date: Calendar,
  select: CircleDot,
  multiselect: ListChecks,
  checkbox: CheckSquare,
  url: LinkIcon,
  email: Mail,
  phone: Phone,
};

const TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];

export function AddPropertyDialog({
  boardId,
  onCreated,
  fullWidth = false,
  triggerLabel = "Propriedade",
}: {
  boardId: string;
  onCreated: () => void;
  fullWidth?: boolean;
  triggerLabel?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<PropertyType>("text");
  const [optionsText, setOptionsText] = useState("");
  const [saving, setSaving] = useState(false);

  function reset(): void {
    setLabel("");
    setType("text");
    setOptionsText("");
  }

  async function handleCreate(): Promise<void> {
    const name = label.trim();
    if (!name) return;
    setSaving(true);
    const options = optionsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const result = await createProperty({
      boardId,
      label: name,
      type,
      options,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Propriedade criada");
    reset();
    setOpen(false);
    onCreated();
  }

  return (
    <>
      <Button
        size="sm"
        variant={fullWidth ? "ghost" : "outline"}
        onClick={() => setOpen(true)}
        className={fullWidth ? "w-full justify-center" : undefined}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        {triggerLabel}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="p-0">
            <SheetTitle>Nova propriedade</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="propLabel">Nome</Label>
              <Input
                id="propLabel"
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Orçamento, Fase..."
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => {
                  const Icon = TYPE_ICONS[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs",
                        type === t
                          ? "border-primary text-primary bg-primary/5"
                          : "border-border text-text-2 hover:text-text-1",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {PROPERTY_TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            {(type === "select" || type === "multiselect") && (
              <div className="space-y-1.5">
                <Label htmlFor="propOptions">Opções (uma por linha)</Label>
                <Textarea
                  id="propOptions"
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  rows={4}
                  placeholder={"Opção 1\nOpção 2\nOpção 3"}
                  disabled={saving}
                />
              </div>
            )}
          </div>

          <SheetFooter className="p-0 mt-auto">
            <Button
              onClick={() => void handleCreate()}
              disabled={saving || !label.trim()}
            >
              Adicionar propriedade
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
