"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const nameSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nome precisa ter pelo menos 2 caracteres")
    .max(80, "Nome longo demais"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    password: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .regex(/[A-Z]/, "Deve conter pelo menos 1 letra maiúscula")
      .regex(/[0-9]/, "Deve conter pelo menos 1 número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

const prefsSchema = z.object({
  prazo: z.boolean(),
  reuniao: z.boolean(),
  conviteEquipe: z.boolean(),
  resumoDiario: z.boolean(),
});

export type SettingsActionResult =
  { success: true } | { success: false; error: string };

export async function updateDisplayName(
  raw: unknown,
): Promise<SettingsActionResult> {
  const parsed = nameSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Nome inválido",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sessão expirada." };

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: parsed.data.fullName },
  });
  if (authError) return { success: false, error: authError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);
  if (profileError) return { success: false, error: profileError.message };

  return { success: true };
}

export async function changeAccountPassword(
  raw: unknown,
): Promise<SettingsActionResult> {
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { success: false, error: "Sessão expirada." };

  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (checkError) {
    return { success: false, error: "Senha atual incorreta." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function saveNotificationPrefs(
  raw: unknown,
): Promise<SettingsActionResult> {
  const parsed = prefsSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Preferências inválidas." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sessão expirada." };

  const { error } = await supabase.auth.updateUser({
    data: { notification_prefs: parsed.data },
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
