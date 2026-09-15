"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Senha atual</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={saving}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nova senha</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={saving}
        />
        <p className="text-xs text-text-2">
          Mínimo 8 caracteres, com 1 maiúscula e 1 número.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={saving}
        />
      </div>
      <Button type="submit" disabled={saving}>
        Trocar senha
      </Button>
    </form>
  );
}
