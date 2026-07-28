import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export async function getTeamMembers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  if (error) throw error;
  return data;
}
