import { format, parseISO } from "date-fns";
import type { Profile, StatusType } from "@/lib/types/database";
import type { DaySchedule, Period, UserSchedule } from "@/lib/data/schedule";
import { findDefaultStatus } from "@/lib/schedule-defaults";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TeamGrid({
  members,
  weekDates,
  todayISO,
  schedule,
  statusTypes,
}: {
  members: Profile[];
  weekDates: string[];
  todayISO: string;
  schedule: Record<string, UserSchedule>;
  statusTypes: StatusType[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-40 border-b bg-muted/40 p-2 text-left font-medium text-muted-foreground">
              Team
            </th>
            {weekDates.map((date) => (
              <th
                key={date}
                className={cn(
                  "border-b bg-muted/40 p-2 text-center font-medium text-muted-foreground",
                  date === todayISO && "text-foreground"
                )}
              >
                <div>{format(parseISO(date), "EEE")}</div>
                <div className="text-xs">{format(parseISO(date), "d MMM")}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-b last:border-b-0">
              <td className="sticky left-0 z-10 flex items-center gap-2 bg-background p-2">
                <Avatar className="size-6">
                  <AvatarFallback className="text-xs">
                    {(member.full_name ?? "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.full_name ?? "Unnamed"}</span>
              </td>
              {weekDates.map((date) => (
                <td key={date} className="p-1 text-center">
                  <GridCell
                    day={schedule[member.id]?.[date]}
                    defaultStatus={findDefaultStatus(statusTypes, date)}
                    isToday={date === todayISO}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GridCell({
  day,
  defaultStatus,
  isToday,
}: {
  day: DaySchedule | undefined;
  defaultStatus: StatusType | undefined;
  isToday: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex size-8 flex-col overflow-hidden rounded-md ring-inset",
        isToday ? "ring-2 ring-primary" : "ring-1 ring-border"
      )}
    >
      <HalfSwatch half={day?.morning} defaultStatus={defaultStatus} period="morning" />
      <HalfSwatch half={day?.afternoon} defaultStatus={defaultStatus} period="afternoon" />
    </div>
  );
}

function HalfSwatch({
  half,
  defaultStatus,
  period,
}: {
  half: DaySchedule[Period] | undefined;
  defaultStatus: StatusType | undefined;
  period: Period;
}) {
  const status = half?.statusType ?? defaultStatus;

  const swatch = (
    <div
      className="flex flex-1 items-center justify-center text-xs leading-none"
      style={{ backgroundColor: status ? `${status.color}26` : undefined }}
    >
      {status?.icon}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={swatch} />
      <TooltipContent className="capitalize">
        {period} — {status?.label ?? ""}
        {half?.comment ? ` — ${half.comment}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}
