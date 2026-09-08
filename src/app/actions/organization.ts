"use server";

import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const setActiveOrganizationSchema = z.object({
  orgId: z.string().uuid("ID de organização inválido"),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
          // ignora
        }
      },
    },
  });
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type SetActiveOrganizationResult =
  { success: true } | { success: false; error: string };

export async function setActiveOrganization(
  raw: unknown,
): Promise<SetActiveOrganizationResult> {
  const parsed = setActiveOrganizationSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "ID de organização inválido" };
  }

  const { orgId } = parsed.data;
  const supabase = await getClient();

  // Verificar que o usuário é membro desta org
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .eq("org_id", orgId)
    .single();

  if (error || !membership) {
    return { success: false, error: "Você não é membro desta organização" };
  }

  // Atualizar cookie
  const cookieStore = await cookies();
  cookieStore.set("pulso-active-org", orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return { success: true };
}
