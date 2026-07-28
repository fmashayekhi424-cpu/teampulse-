import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fallback for people who click the emailed magic link instead of typing the
// 6-digit code — arrives here as a PKCE `code` to exchange for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/visual-optics`);
    }
    console.error("auth callback exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  const errorDescription = searchParams.get("error_description");
  console.error("auth callback missing code:", errorDescription ?? "no code, no error_description");
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(errorDescription ?? "Sign-in link was invalid or expired.")}`
  );
}
