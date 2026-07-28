import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export type CurrentProfile = Profile & {
  email: string | null;
};

/** The signed-in user's profile, or null if not signed in. Does not throw. */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();

  if (!profile) return null;

  return { ...profile, email: auth.user.email ?? null };
}
