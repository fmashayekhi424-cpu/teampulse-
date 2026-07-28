import Link from "next/link";
import { format, parse } from "date-fns";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { getStatusTypes } from "@/lib/data/status-types";
import { getUserSchedule } from "@/lib/data/schedule";
import { getMonthGridWeeks, shiftMonth, toISODate } from "@/lib/date";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { Button } from "@/components/ui/button";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.team_id) redirect("/login");

  const { month } = await searchParams;
  const monthDate = month ? parse(month, "yyyy-MM", new Date()) : new Date();
  const weeks = getMonthGridWeeks(monthDate);
  const rangeStart = weeks[0][0];
  const rangeEnd = weeks[weeks.length - 1][6];

  const [statusTypes, schedule] = await Promise.all([
    getStatusTypes(profile.team_id),
    getUserSchedule(profile.id, rangeStart, rangeEnd),
  ]);

  const monthKey = format(monthDate, "yyyy-MM");
  const prevMonth = format(shiftMonth(monthDate, -1), "yyyy-MM");
  const nextMonth = format(shiftMonth(monthDate, 1), "yyyy-MM");

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{format(monthDate, "MMMM yyyy")}</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/visual-optics/schedule?month=${prevMonth}`}>Prev</Link>}
          />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/visual-optics/schedule">Today</Link>}
          />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/visual-optics/schedule?month=${nextMonth}`}>Next</Link>}
          />
        </div>
      </div>

      <MonthCalendar
        weeks={weeks}
        schedule={schedule}
        statusTypes={statusTypes}
        todayISO={toISODate(new Date())}
        currentMonthLabel={monthKey}
      />
    </div>
  );
}
