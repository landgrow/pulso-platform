"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeAccountPassword,
  updateDisplayName,
} from "@/app/actions/settings";

export function DisplayNameForm({
  initialName,
}: {
  initialName: string;
}): JSX.Element {
  const [fullName, setFullName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    const result = await updateDisplayName({ fullName });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Nome atualizado.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          disabled={saving}
        />
      </div>
      <Button type="submit" disabled={saving}>
        Salvar nome
      </Button>
    </form>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  hint?: string;
}): JSX.Element {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-text-2 hover:text-text-1 disabled:opacity-50"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {hint ? <p className="text-xs text-text-2">{hint}</p> : null}
    </div>
  );
}

export function ChangePasswordForm(): JSX.Element {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    const result = await changeAccountPassword({
      currentPassword,
      password,
      confirmPassword,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Senha alterada.");
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PasswordField
        id="currentPassword"
        label="Senha atual"
        autoComplete="current-password"
        value={currentPassword}
        onChange={setCurrentPassword}
        disabled={saving}
      />
      <PasswordField
        id="newPassword"
        label="Nova senha"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        disabled={saving}
        hint="Mínimo 8 caracteres, com 1 maiúscula e 1 número."
      />
      <PasswordField
        id="confirmPassword"
        label="Confirmar nova senha"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        disabled={saving}
      />
      <Button type="submit" disabled={saving}>
        Trocar senha
      </Button>
    </form>
  );
}
