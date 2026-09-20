import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformStaff } from "@/lib/supabase/platform-role-server";
import { driveOAuthConfigured, googleAuthUrl } from "@/lib/google/oauth";

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(
        "/login",
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      ),
    );
  }
  if (!(await isPlatformStaff(supabase))) {
    return NextResponse.json(
      { error: "Só a equipe Land Grow liga o Drive." },
      { status: 403 },
    );
  }
  if (!driveOAuthConfigured()) {
    return NextResponse.json(
      { error: "Falta GOOGLE_DRIVE_CLIENT_ID e GOOGLE_DRIVE_CLIENT_SECRET." },
      { status: 500 },
    );
  }
  return NextResponse.redirect(googleAuthUrl(user.id));
}
