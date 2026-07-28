import Link from "next/link";
import { format, parseISO } from "date-fns";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { getStatusTypes } from "@/lib/data/status-types";
import { getTeamMembers } from "@/lib/data/team";
import { getTeamSchedule } from "@/lib/data/schedule";
import { getWeekDates, shiftWeek, toISODate } from "@/lib/date";
import { TeamGrid } from "@/components/team/team-grid";
import { RealtimeRefresher } from "@/components/team/realtime-refresher";
import { Button } from "@/components/ui/button";

export default async function TeamOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { week } = await searchParams;
  const weekDate = week ? parseISO(week) : new Date();

  // Weekdays only — most labs don't track weekends, and there's no admin
  // settings UI (single-team app) to make this configurable.
  const weekDates = getWeekDates(weekDate).slice(0, 5);

  const [statusTypes, members, schedule] = await Promise.all([
    getStatusTypes(profile.team_id),
    getTeamMembers(),
    getTeamSchedule(weekDates[0], weekDates[weekDates.length - 1]),
  ]);

  const prevWeek = toISODate(shiftWeek(weekDate, -1));
  const nextWeek = toISODate(shiftWeek(weekDate, 1));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <RealtimeRefresher />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          Week of {format(parseISO(weekDates[0]), "d MMMM yyyy")}
        </h1>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/visual-optics?week=${prevWeek}`}>Prev</Link>}
          />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/visual-optics">This week</Link>}
          />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/visual-optics?week=${nextWeek}`}>Next</Link>}
          />
        </div>
      </div>

      <TeamGrid
        members={members}
        weekDates={weekDates}
        todayISO={toISODate(new Date())}
        schedule={schedule}
        statusTypes={statusTypes}
      />
    </div>
  );
}
