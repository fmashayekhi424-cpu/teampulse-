"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Refreshes the Server Component data whenever a teammate's schedule
 * changes — Realtime respects RLS, so only rows this user could already
 * SELECT trigger an event. */
export function RealtimeRefresher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("schedule_entries_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedule_entries" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
