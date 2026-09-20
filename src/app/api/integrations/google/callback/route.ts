import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeCode,
  googleAccountEmail,
  readOAuthState,
} from "@/lib/google/oauth";
import { ensurePulsoRoot } from "@/lib/google/drive";

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const integracoes = `${appUrl()}/configuracoes/integracoes`;

  if (error || !code || !state) {
    return NextResponse.redirect(`${integracoes}?drive=cancelado`);
  }

  const userId = readOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(`${integracoes}?drive=estado`);
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${integracoes}?drive=sem-refresh`);
    }
    const email = await googleAccountEmail(tokens.access_token);
    const rootFolderId = await ensurePulsoRoot(tokens.access_token);

    const admin = await createAdminClient();
    await admin
      .from("google_drive_accounts")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("google_drive_accounts").insert({
      connected_by: userId,
      account_email: email,
      refresh_token: tokens.refresh_token,
      root_folder_id: rootFolderId,
    });

    return NextResponse.redirect(`${integracoes}?drive=ok`);
  } catch (err) {
    console.error("[google-drive] callback", err);
    return NextResponse.redirect(`${integracoes}?drive=erro`);
  }
}
