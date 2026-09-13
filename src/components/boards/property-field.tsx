"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { BoardProperty, CustomValue } from "@/types/boards";

export function PropertyField({
  property,
  value,
  onSave,
}: {
  property: BoardProperty;
  value: CustomValue;
  onSave: (value: CustomValue) => void;
}): JSX.Element {
  const [draft, setDraft] = useState<string>(
    typeof value === "string" ? value : "",
  );

  if (property.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => onSave(e.target.checked)}
        className="h-4 w-4"
      />
    );
  }

  if (property.type === "select") {
    return (
      <Select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onSave(e.target.value || null)}
      >
        <option value="">—</option>
        {property.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    );
  }

  if (property.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-2">
        {property.options.map((opt) => {
          const checked = selected.includes(opt);
          return (
            <label
              key={opt}
              className="inline-flex items-center gap-1.5 text-xs rounded-full border border-border px-2.5 py-1 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onSave(
                    checked
                      ? selected.filter((o) => o !== opt)
                      : [...selected, opt],
                  )
                }
                className="h-3 w-3"
              />
              {opt}
            </label>
          );
        })}
      </div>
    );
  }

  if (property.type === "number") {
    return (
      <Input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft === "" ? null : Number(draft))}
      />
    );
  }

  if (property.type === "date") {
    return (
      <Input
        type="date"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onSave(e.target.value || null)}
      />
    );
  }

  const inputType =
    property.type === "email"
      ? "email"
      : property.type === "phone"
        ? "tel"
        : property.type === "url"
          ? "url"
          : "text";

  return (
    <Input
      type={inputType}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onSave(draft || null)}
    />
  );
}
