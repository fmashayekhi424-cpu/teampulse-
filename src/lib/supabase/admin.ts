import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Full-privilege client, bypasses RLS. Use only for operations that
 * genuinely need it (currently: pre-confirmed account creation and minting
 * sessions directly — see signInWithNameAndPasscode). Never import this
 * into client-facing code.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
