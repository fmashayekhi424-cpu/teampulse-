"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type SignInResult =
  | { status: "ok" }
  | { status: "invalid_passcode" }
  | { status: "error"; message: string };

function describeError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Something went wrong. Please try again.";
}

/** Turns a display name into a stable, deterministic account key. */
function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Signs someone in using only their name and the lab's shared passcode — no
 * email verification at all. Supabase's account system still needs some
 * email value, so one is derived deterministically from the name and never
 * actually used to send mail; the account is created pre-confirmed via the
 * Admin API and a session is minted directly on the server (generateLink +
 * verifyOtp back to back), so the user is never shown a code to type.
 *
 * The name is the only per-person identifier — typing the same name again
 * returns to the same account. There's no secret beyond the shared passcode,
 * which is a deliberate simplicity trade-off for this single-team app.
 */
export async function signInWithNameAndPasscode(input: {
  fullName: string;
  passcode: string;
}): Promise<SignInResult> {
  try {
    const fullName = input.fullName.trim();
    if (!fullName) return { status: "error", message: "Please enter your name." };

    if (input.passcode !== process.env.TEAM_INVITE_PASSCODE) {
      return { status: "invalid_passcode" };
    }

    const slug = slugifyName(fullName);
    if (!slug) return { status: "error", message: "Please enter a valid name." };
    const email = `${slug}@visualoptics.local`;

    const admin = createAdminClient();

    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    const alreadyExists =
      createError &&
      /already.*regist(?:er)?ed|already exists/i.test(createError.message ?? "");

    if (createError && !alreadyExists) {
      return { status: "error", message: describeError(createError) };
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData) {
      return { status: "error", message: describeError(linkError) };
    }

    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: linkData.properties.email_otp,
      type: "email",
    });

    if (verifyError) {
      return { status: "error", message: describeError(verifyError) };
    }

    return { status: "ok" };
  } catch (err) {
    return { status: "error", message: describeError(err) };
  }
}
