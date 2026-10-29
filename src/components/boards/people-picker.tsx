"use client";

import { ChevronDown, Plus, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  personGivenName,
  personOriginLabel,
  type CardPerson,
} from "@/lib/boards/card-people";
import { cn, getInitials } from "@/lib/utils";

export function PeoplePicker({
  people,
  selectedIds,
  onChange,
  disabled,
  placeholder = "Adicionar",
}: {
  people: CardPerson[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}): JSX.Element {
  const selected = selectedIds.flatMap((id) => {
    const person = people.find((p) => p.userId === id);
    return person ? [person] : [];
  });
  const available = people.filter(
    (person) => !selectedIds.includes(person.userId),
  );
  const staff = available.filter((person) => person.kind === "staff");
  const members = available.filter((person) => person.kind !== "staff");

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1">
      {selected.map((person) => (
        <span
          key={person.userId}
          title={personLabelTitle(person)}
          className="inline-flex h-7 max-w-full items-center gap-1 rounded-md bg-surface-2 py-0 pl-0.5 pr-0.5 text-sm"
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
              person.kind === "member" ? "bg-text-2" : "bg-primary",
            )}
          >
            {getInitials(person.name)}
          </span>
          <span className="max-w-[7.5rem] truncate text-text-1">
            {personGivenName(person)}
          </span>
          <button
            type="button"
            aria-label={`Remover ${person.name}`}
            disabled={disabled}
            onClick={() =>
              onChange(selectedIds.filter((id) => id !== person.userId))
            }
            className="flex h-6 w-6 items-center justify-center rounded text-text-2 hover:text-error disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}

      {available.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            aria-label="Adicionar responsável"
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-md px-1 text-sm outline-none",
              "hover:bg-surface-2 focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              selected.length === 0 ? "text-text-2" : "text-text-2",
            )}
          >
            {selected.length === 0 ? (
              <>
                <span>{placeholder}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              </>
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="z-[120] min-w-[16rem] border-border bg-surface-1 text-text-1"
          >
            <PersonGroup
              label="Land Grow"
              people={staff}
              onPick={(userId) => onChange([...selectedIds, userId])}
            />
            {staff.length > 0 && members.length > 0 ? (
              <DropdownMenuSeparator />
            ) : null}
            <PersonGroup
              label="Cliente"
              people={members}
              onPick={(userId) => onChange([...selectedIds, userId])}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ) : selected.length === 0 ? (
        <span className="px-1 text-sm text-text-2">Ninguém ainda</span>
      ) : null}
    </div>
  );
}

function personLabelTitle(person: CardPerson): string {
  const origin = personOriginLabel(person);
  return origin ? `${person.name} · ${origin}` : person.name;
}

function PersonGroup({
  label,
  people,
  onPick,
}: {
  label: string;
  people: CardPerson[];
  onPick: (userId: string) => void;
}): JSX.Element | null {
  if (people.length === 0) return null;
  return (
    <>
      <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-text-2">
        {label}
      </DropdownMenuLabel>
      {people.map((person) => (
        <DropdownMenuItem
          key={person.userId}
          className="gap-2 text-text-1 focus:bg-surface-2 focus:text-text-1"
          onSelect={() => onPick(person.userId)}
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
              person.kind === "member" ? "bg-text-2" : "bg-primary",
            )}
          >
            {getInitials(person.name)}
          </span>
          <span className="min-w-0 flex-1 truncate">{person.name}</span>
        </DropdownMenuItem>
      ))}
    </>
  );
}
