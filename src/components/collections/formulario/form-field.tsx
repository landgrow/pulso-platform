"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { specifyKey } from "@/lib/bin-v2/answers";
import type { FormularioCampo } from "@/lib/formulario-questions";

interface FormFieldProps {
  campo: FormularioCampo;
  value: unknown;
  error?: string | undefined;
  specifyValue?: unknown;
  specifyError?: string | undefined;
  onChange: (value: unknown) => void;
  onSpecifyChange?: (value: unknown) => void;
  readOnly?: boolean;
}

function selectedList(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

export function FormField({
  campo,
  value,
  error,
  specifyValue,
  specifyError,
  onChange,
  onSpecifyChange,
  readOnly = false,
}: FormFieldProps) {
  const id = `campo-${campo.id}`;
  const hasError = Boolean(error);
  const picked = selectedList(value);
  const showSpecify = Boolean(
    campo.opcoes?.some((op) => op.needsSpecify && picked.includes(op.value)),
  );

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className={cn(
          "text-sm font-medium",
          hasError && "text-destructive",
          !campo.required && "text-muted-foreground",
        )}
      >
        {campo.label}
        {campo.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>

      {campo.help ? (
        <p className="text-xs text-muted-foreground">{campo.help}</p>
      ) : null}

      {campo.tipo === "number" && (
        <div className="relative">
          {campo.sufixo && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {campo.sufixo}
            </span>
          )}
          <Input
            id={id}
            type="number"
            step="any"
            min={campo.min}
            max={campo.max}
            placeholder={campo.placeholder}
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) =>
              onChange(
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
            disabled={readOnly}
            className={cn(
              campo.sufixo && "pl-7",
              hasError && "border-destructive focus-visible:ring-destructive",
            )}
            aria-describedby={hasError ? `${id}-error` : undefined}
          />
        </div>
      )}

      {campo.tipo === "text" && (
        <Input
          id={id}
          type="text"
          placeholder={campo.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          disabled={readOnly}
          className={cn(
            hasError && "border-destructive focus-visible:ring-destructive",
          )}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      )}

      {campo.tipo === "textarea" && (
        <Textarea
          id={id}
          placeholder={campo.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          disabled={readOnly}
          rows={4}
          maxLength={campo.maxLength}
          className={cn(
            hasError && "border-destructive focus-visible:ring-destructive",
          )}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      )}

      {campo.tipo === "select" && (
        <Select
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          disabled={readOnly}
          error={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        >
          <option value="">Selecione...</option>
          {campo.opcoes?.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </Select>
      )}

      {campo.tipo === "radio" && (
        <div
          className="flex flex-col gap-2 pt-1"
          role="radiogroup"
          aria-labelledby={id}
        >
          {campo.opcoes?.map((op) => (
            <div key={op.value} className="flex items-center gap-2">
              <input
                id={`${id}-${op.value}`}
                type="radio"
                name={id}
                value={op.value}
                checked={value === op.value}
                disabled={readOnly}
                onChange={() => onChange(op.value)}
                className="h-4 w-4 border-primary text-primary ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <Label
                htmlFor={`${id}-${op.value}`}
                className="font-normal text-sm cursor-pointer"
              >
                {op.label}
              </Label>
            </div>
          ))}
        </div>
      )}

      {campo.tipo === "checkbox" && (
        <div className="flex flex-col gap-2 pt-1">
          {campo.opcoes?.map((op) => {
            const checked = picked.includes(op.value);
            return (
              <div key={op.value} className="flex items-center gap-2">
                <Checkbox
                  id={`${id}-${op.value}`}
                  checked={checked}
                  disabled={readOnly}
                  onCheckedChange={(state) => {
                    const on = state === true;
                    const next = on
                      ? [...picked, op.value]
                      : picked.filter((v) => v !== op.value);
                    onChange(next);
                  }}
                />
                <Label
                  htmlFor={`${id}-${op.value}`}
                  className="font-normal text-sm cursor-pointer"
                >
                  {op.label}
                </Label>
              </div>
            );
          })}
        </div>
      )}

      {showSpecify && onSpecifyChange ? (
        <Input
          id={`campo-${specifyKey(campo.id)}`}
          type="text"
          placeholder="Qual?"
          value={typeof specifyValue === "string" ? specifyValue : ""}
          onChange={(e) => onSpecifyChange(e.target.value || undefined)}
          disabled={readOnly}
          className={cn(
            specifyError && "border-destructive focus-visible:ring-destructive",
          )}
        />
      ) : null}

      {hasError && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {specifyError ? (
        <p className="text-xs text-destructive" role="alert">
          {specifyError}
        </p>
      ) : null}
    </div>
  );
}
