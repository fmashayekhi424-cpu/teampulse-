"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

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
 * straight away, via Supabase's own signInWithOtp (reliable for accounts
 * that have received at least one email before).
 *
 * A brand-new email additionally needs the lab's shared invite passcode
 * (checked server-side, never shipped to the client) plus a name.
 *
 * New accounts are created via the Admin API (pre-confirmed, no email sent),
 * and their login code is generated via generateLink + emailed through
 * Resend directly — NOT via signInWithOtp. Confirmed via direct API testing
 * that Supabase's own send-on-create path 500s ("Error sending magic link
 * email") for any account that has never received an email before, whenever
 * custom SMTP is enabled; disabling custom SMTP makes it work, so this is a
 * platform-level bug in Supabase's SMTP integration, not something fixable
 * from our side. Sending the first email ourselves sidesteps it entirely.
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

    const admin = createAdminClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    // "already been registered" can happen on a double-submit or a retry
    // after a partial earlier failure — treat it as success and just send
    // the code, same as any other existing user.
    const alreadyExists =
      createError &&
      /already.*regista?ered|already exists/i.test(createError.message ?? "");

    if (createError && !alreadyExists) {
      const detail = describeError(createError);
      console.error("requestLoginCode: admin createUser failed —", detail);
      return { status: "error", message: `Create failed: ${detail}` };
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData) {
      const detail = describeError(linkError);
      console.error("requestLoginCode: generateLink failed —", detail);
      return { status: "error", message: `Code generation failed: ${detail}` };
    }

    await sendEmail({
      to: email,
      subject: "Your TeamPulse sign-in code",
      html: `<p>Enter this code to finish joining Visual Optics:</p><p style="font-size:24px;font-weight:bold;letter-spacing:2px;">${linkData.properties.email_otp}</p>`,
    });

    return { status: "sent" };
  } catch (err) {
    const detail = describeError(err);
    console.error("requestLoginCode: unexpected error —", detail);
    return { status: "error", message: `Unexpected: ${detail}` };
  }
}
