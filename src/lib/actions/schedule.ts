"use server";

import { createClient } from "@/lib/supabase/server";
import type { Period } from "@/lib/data/schedule";

export type SetScheduleInput = {
  dates: string[]; // 'YYYY-MM-DD'
  /** "both" writes the same status to morning and afternoon for each date. */
  period: Period | "both";
  /** null resets the half(s) back to the implicit Office default (deletes any rows). */
  statusTypeId: string | null;
  comment?: string | null;
};

export async function setSchedule(input: SetScheduleInput) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");

  const periods: Period[] = input.period === "both" ? ["morning", "afternoon"] : [input.period];

  if (input.statusTypeId === null) {
    const { error } = await supabase
      .from("schedule_entries")
      .delete()
      .eq("user_id", auth.user.id)
      .in("date", input.dates)
      .in("period", periods);
    if (error) throw error;
  } else {
    const rows = input.dates.flatMap((date) =>
      periods.map((period) => ({
        user_id: auth.user.id,
        date,
        period,
        status_type_id: input.statusTypeId as string,
        comment: input.comment ?? null,
      }))
    );
    const { error } = await supabase
      .from("schedule_entries")
      .upsert(rows, { onConflict: "user_id,date,period" });
    if (error) throw error;
  }

  // No revalidatePath here on purpose: My Schedule already updates itself
  // optimistically (see MonthCalendar), and Team Overview refreshes itself
  // independently via its own Realtime subscription. Triggering a Next.js
  // page refresh on top of either was causing a double-render that
  // disrupted the calendar's touch handling on the very next tap.
}
