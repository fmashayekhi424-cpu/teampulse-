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

// Temporary: describes *any* thrown/returned error in detail so we can see
// exactly what's failing directly in the UI, without needing paid log access.
function describeError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const parts = [
      e.name ? `name=${String(e.name)}` : null,
      e.status !== undefined ? `status=${String(e.status)}` : null,
      e.code ? `code=${String(e.code)}` : null,
      e.message ? `message=${String(e.message)}` : null,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
    try {
      return `no enumerable props; keys=${JSON.stringify(Object.getOwnPropertyNames(e))}`;
    } catch {
      return "non-serializable error object";
    }
  }
  return `non-object thrown: ${String(err)} (typeof ${typeof err})`;
}

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
  try {
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

    if (createError) {
      const detail = describeError(createError);
      console.error("requestLoginCode: create failed —", detail);
      return { status: "error", message: `Create failed: ${detail}` };
    }

    return { status: "sent" };
  } catch (err) {
    const detail = describeError(err);
    console.error("requestLoginCode: unexpected error —", detail);
    return { status: "error", message: `Unexpected: ${detail}` };
  }
}
