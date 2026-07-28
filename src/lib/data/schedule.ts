import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { StatusType } from "@/lib/types/database";

export type Period = "morning" | "afternoon";

export type HalfDay = {
  comment: string | null;
  statusType: StatusType;
};

export type DaySchedule = Partial<Record<Period, HalfDay>>;

export type UserSchedule = Record<string, DaySchedule>; // keyed by date

const ENTRY_SELECT = "date, user_id, period, comment, status_type:status_types(*)";

/** One user's non-Office half-days in [startDate, endDate], keyed by date then period. */
export async function getUserSchedule(
  userId: string,
  startDate: string,
  endDate: string
): Promise<UserSchedule> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_entries")
    .select(ENTRY_SELECT)
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) throw error;

  const byDate: UserSchedule = {};
  for (const row of data) {
    byDate[row.date] ??= {};
    byDate[row.date][row.period as Period] = {
      comment: row.comment,
      statusType: row.status_type as unknown as StatusType,
    };
  }
  return byDate;
}

/** Every teammate's non-Office half-days in [startDate, endDate], keyed by user id then date. */
export async function getTeamSchedule(
  startDate: string,
  endDate: string
): Promise<Record<string, UserSchedule>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_entries")
    .select(ENTRY_SELECT)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) throw error;

  const byUser: Record<string, UserSchedule> = {};
  for (const row of data) {
    byUser[row.user_id] ??= {};
    byUser[row.user_id][row.date] ??= {};
    byUser[row.user_id][row.date][row.period as Period] = {
      comment: row.comment,
      statusType: row.status_type as unknown as StatusType,
    };
  }
  return byUser;
}
