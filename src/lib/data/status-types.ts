import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { StatusType } from "@/lib/types/database";

/** Global statuses plus any the team has defined itself, in display order. */
export async function getStatusTypes(teamId: string): Promise<StatusType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("status_types")
    .select("*")
    .or(`team_id.is.null,team_id.eq.${teamId}`)
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

export function findOfficeStatus(statusTypes: StatusType[]): StatusType | undefined {
  return statusTypes.find((s) => s.key === "office");
}
