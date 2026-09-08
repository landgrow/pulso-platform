"use server";

import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers"; // headers: para IP do cliente no rate limiter
import { redirect } from "next/navigation";
import { isRateLimited } from "@/lib/supabase/rate-limit";

// ─── Schemas de validação ────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

const resetPasswordSchema = z
  .object({
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

// ─── Helpers ────────────────────────────────────────────────────────────────

// cookies() e headers() são promises no Next.js 16 (App Router) — usar await.
async function getClient(): Promise<ReturnType<typeof createServerClient>> {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // ignora — pode falhar em Server Components fora de request
        }
      },
    },
  });
}

async function getClientIpAsync(): Promise<string> {
  try {
    const headersList = await headers();
    return (
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

// ─── Server Actions ─────────────────────────────────────────────────────────

export type SignInResult =
  | { success: true }
  | {
      success: false;
      error: string;
      code?: "rate_limited" | "unconfirmed" | "invalid";
    };

export async function signIn(raw: unknown): Promise<SignInResult> {
  const ip = await getClientIpAsync();

  if (isRateLimited(ip)) {
    return {
      success: false,
      error: "Muitas tentativas. Tente novamente em alguns minutos.",
      code: "rate_limited",
    };
  }

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Email ou senha incorretos",
      code: "invalid",
    };
  }

  const { email, password } = parsed.data;
  const supabase = await getClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid credentials")
    ) {
      return {
        success: false,
        error: "Email ou senha incorretos",
        code: "invalid",
      };
    }
    if (msg.includes("email not confirmed")) {
      return {
        success: false,
        error: "Confirme seu email antes de fazer login",
        code: "unconfirmed",
      };
    }
    return { success: false, error: error.message, code: "invalid" };
  }

  return { success: true };
}

export type SignOutResult = { success: boolean };

export async function signOut(): Promise<SignOutResult> {
  const supabase = await getClient();
  const { error } = await supabase.auth.signOut();
  return { success: !error };
}

export type ForgotPasswordResult =
  { success: true } | { success: false; error: string };

export async function forgotPassword(
  raw: unknown,
): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Email inválido" };
  }

  const { email } = parsed.data;
  const supabase = await getClient();

  // Sempre retorna sucesso — não revela se o email existe ou não.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) {
    console.error("[auth] forgotPassword:", error.message);
  }

  return { success: true };
}

export type ResetPasswordResult =
  { success: true } | { success: false; error: string };

export async function resetPassword(
  raw: unknown,
): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  const { password } = parsed.data;
  const supabase = await getClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Verifica se o token de recovery é válido. Redireciona se inválido.
 * Chamado em `/reset-password` (Server Component).
 */
export async function verifyRecoveryToken(): Promise<void> {
  const supabase = await getClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    redirect("/forgot-password?error=token_invalido");
  }
}
