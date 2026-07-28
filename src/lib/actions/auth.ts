"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type RequestLoginCodeResult =
  | { status: "sent" }
  | { status: "new_member_required" }
  | { status: "invalid_passcode" }
  | { status: "error"; message: string };

/**
 * Existing teammates just need their email — this sends the sign-in code
 * straight away. A brand-new email additionally needs the lab's shared
 * invite passcode (checked server-side, never shipped to the client) plus a
 * name, so account creation is gated to people who were actually invited.
 */
export async function requestLoginCode(input: {
  email: string;
  fullName?: string;
  passcode?: string;
}): Promise<RequestLoginCodeResult> {
  const supabase = await createClient();
  const email = input.email.trim();

  const { error: existingUserError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (!existingUserError) return { status: "sent" };

  const fullName = input.fullName?.trim();
  if (!fullName || !input.passcode) {
    return { status: "new_member_required" };
  }

  if (input.passcode !== process.env.TEAM_INVITE_PASSCODE) {
    return { status: "invalid_passcode" };
  }

  const { error: createError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, data: { full_name: fullName } },
  });

  if (createError) return { status: "error", message: createError.message };
  return { status: "sent" };
}
