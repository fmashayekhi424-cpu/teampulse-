"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { setSchedule } from "@/lib/actions/schedule";
import type { StatusType } from "@/lib/types/database";
import type { DaySchedule, Period, UserSchedule } from "@/lib/data/schedule";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusPickerBar } from "@/components/calendar/status-picker-bar";

export function MonthCalendar({
  weeks,
  schedule,
  statusTypes,
  todayISO,
  currentMonthLabel,
}: {
  weeks: string[][];
  schedule: UserSchedule;
  statusTypes: StatusType[];
  todayISO: string;
  currentMonthLabel: string; // used to dim days outside the displayed month
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const flatDays = useMemo(() => weeks.flat(), [weeks]);
  const officeStatus = useMemo(
    () => statusTypes.find((s) => s.key === "office"),
    [statusTypes]
  );

  useEffect(() => {
    function stopDrag() {
      setDragging(false);
    }
    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selection.size === 0) return;
      const n = Number(e.key);
      if (n >= 1 && n <= statusTypes.length) {
        const status = statusTypes[n - 1];
        if (!status.allows_comment) applyStatus(status, null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, statusTypes]);

  function selectRange(from: string, to: string) {
    const i = flatDays.indexOf(from);
    const j = flatDays.indexOf(to);
    const [lo, hi] = i < j ? [i, j] : [j, i];
    setSelection(new Set(flatDays.slice(lo, hi + 1)));
  }

  function handleMouseDown(date: string) {
    setAnchor(date);
    setSelection(new Set([date]));
    setDragging(true);
  }

  function handleMouseEnter(date: string) {
    if (dragging && anchor) selectRange(anchor, date);
  }

  // Whole-day selection (drag-select + the action bar) always sets both
  // halves at once — picking a different status for just one half is a
  // separate, single-day interaction via the half-slot popovers below.
  function applyStatus(status: StatusType, comment: string | null) {
    const dates = Array.from(selection);
    startTransition(async () => {
      await setSchedule({
        dates,
        period: "both",
        statusTypeId: status.key === "office" ? null : status.id,
        comment,
      });
      toast.success(`Set ${dates.length} day${dates.length > 1 ? "s" : ""} to ${status.label}`);
      setSelection(new Set());
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <StatusPickerBar
        selectedCount={selection.size}
        statusTypes={statusTypes}
        pending={pending}
        onPick={applyStatus}
        onClear={() => setSelection(new Set())}
      />

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="flex select-none flex-col gap-1">
        {weeks.map((week) => (
          <div key={week[0]} className="grid grid-cols-7 gap-1">
            {week.map((date) => (
              <DayCell
                key={date}
                date={date}
                inCurrentMonth={date.slice(0, 7) === currentMonthLabel}
                isToday={date === todayISO}
                isSelected={selection.has(date)}
                day={schedule[date]}
                officeStatus={officeStatus}
                statusTypes={statusTypes}
                onMouseDown={() => handleMouseDown(date)}
                onMouseEnter={() => handleMouseEnter(date)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCell({
  date,
  inCurrentMonth,
  isToday,
  isSelected,
  day,
  officeStatus,
  statusTypes,
  onMouseDown,
  onMouseEnter,
}: {
  date: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  day: DaySchedule | undefined;
  officeStatus: StatusType | undefined;
  statusTypes: StatusType[];
  onMouseDown: () => void;
  onMouseEnter: () => void;
}) {
  const dayNumber = Number(date.slice(8, 10));

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex aspect-square flex-col overflow-hidden rounded-md ring-inset transition-colors",
        !inCurrentMonth && "opacity-40",
        isSelected ? "ring-2 ring-primary" : "ring-1 ring-border"
      )}
    >
      <span
        className={cn(
          "px-1.5 pt-1 text-xs sm:px-2",
          isToday && "flex size-5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
        )}
      >
        {dayNumber}
      </span>
      <div className="flex flex-1 flex-col">
        <HalfSlot date={date} period="morning" half={day?.morning} officeStatus={officeStatus} statusTypes={statusTypes} />
        <HalfSlot date={date} period="afternoon" half={day?.afternoon} officeStatus={officeStatus} statusTypes={statusTypes} />
      </div>
    </div>
  );
}

function HalfSlot({
  date,
  period,
  half,
  officeStatus,
  statusTypes,
}: {
  date: string;
  period: Period;
  half: DaySchedule[Period] | undefined;
  officeStatus: StatusType | undefined;
  statusTypes: StatusType[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const status = half?.statusType ?? officeStatus;

  function handlePick(picked: StatusType) {
    startTransition(async () => {
      await setSchedule({
        dates: [date],
        period,
        statusTypeId: picked.key === "office" ? null : picked.id,
      });
      toast.success(`${period === "morning" ? "Morning" : "Afternoon"} set to ${picked.label}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            className="flex flex-1 items-center justify-center text-sm leading-none"
            style={{ backgroundColor: status ? `${status.color}26` : undefined }}
            title={`${period === "morning" ? "Morning" : "Afternoon"}: ${status?.label ?? "Office"}${half?.comment ? ` — ${half.comment}` : ""}`}
          >
            {status?.icon}
          </button>
        }
      />
      <PopoverContent className="w-44 p-1">
        <p className="px-2 py-1 text-xs text-muted-foreground capitalize">
          {period} — {status?.label ?? "Office"}
          {half?.comment ? ` — ${half.comment}` : ""}
        </p>
        <div className="flex flex-col">
          {statusTypes.map((s) => (
            <button
              key={s.id}
              disabled={pending}
              onClick={() => handlePick(s)}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
            >
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
