import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Usuário logado, validado no Supabase Auth UMA vez por requisição. Cada
 * getUser() é uma ida ao servidor de Auth; antes, uma página chegava a fazer
 * 5–8 dessas (layout, sidebar, helpers de papel e de org).
 */
export const getRequestUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});
