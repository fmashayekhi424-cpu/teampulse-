"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setSchedule } from "@/lib/actions/schedule";
import { isNaturalDefault, findDefaultStatus } from "@/lib/schedule-defaults";
import { getWeekNumber, parseISODate } from "@/lib/date";
import type { StatusType } from "@/lib/types/database";
import type { DaySchedule, Period, UserSchedule } from "@/lib/data/schedule";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { StatusPickerContent } from "@/components/calendar/status-picker-content";

type Snapshot = Record<string, DaySchedule>;
type LastAction = { dates: string[]; previous: Snapshot };

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
  const [, startTransition] = useTransition();
  const [localSchedule, setLocalSchedule] = useState(schedule);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);

  const flatDays = useMemo(() => weeks.flat(), [weeks]);

  function selectRange(from: string, to: string) {
    const i = flatDays.indexOf(from);
    const j = flatDays.indexOf(to);
    if (i === -1 || j === -1) return;
    const [lo, hi] = i < j ? [i, j] : [j, i];
    setSelection(new Set(flatDays.slice(lo, hi + 1)));
  }

  function handleStart(date: string) {
    setAnchor(date);
    setSelection(new Set([date]));
    setDragging(true);
  }

  function handleEnter(date: string) {
    if (dragging && anchor) selectRange(anchor, date);
  }

  // A plain single tap (no drag) is handled entirely by the per-half
  // popovers, so it shouldn't leave a lingering whole-day selection behind —
  // only an actual multi-day drag should surface the selection bar.
  function endDrag() {
    setDragging(false);
    setSelection((prev) => (prev.size <= 1 ? new Set() : prev));
  }

  // Mouse drag.
  useEffect(() => {
    window.addEventListener("mouseup", endDrag);
    return () => window.removeEventListener("mouseup", endDrag);
  }, []);

  // Touch drag — mouseenter never fires during a touch gesture, so instead
  // find whichever day cell is under the finger on every move.
  useEffect(() => {
    function handleTouchMove(e: TouchEvent) {
      if (!dragging || !anchor) return;
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const cell = el instanceof Element ? el.closest<HTMLElement>("[data-date]") : null;
      const date = cell?.dataset.date;
      if (date) {
        e.preventDefault(); // stop the page from scrolling while dragging a selection
        selectRange(anchor, date);
      }
    }
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", endDrag);
    window.addEventListener("touchcancel", endDrag);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", endDrag);
      window.removeEventListener("touchcancel", endDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, anchor]);

  function snapshotFor(dates: string[]): Snapshot {
    const snap: Snapshot = {};
    for (const d of dates) snap[d] = { ...(localSchedule[d] ?? {}) };
    return snap;
  }

  function restoreSnapshot(snap: Snapshot) {
    setLocalSchedule((prev) => {
      const next = { ...prev };
      for (const [d, entry] of Object.entries(snap)) {
        if (entry.morning || entry.afternoon) next[d] = entry;
        else delete next[d];
      }
      return next;
    });
  }

  function commit(dates: string[], mutate: () => Promise<void>) {
    const previous = snapshotFor(dates);
    setLastAction({ dates, previous });
    startTransition(async () => {
      try {
        await mutate();
      } catch {
        restoreSnapshot(previous);
      }
    });
  }

  // Whole-selection status pick (drag-select or a plain single tap) — always
  // sets both halves. Dates already matching their natural default (Office
  // on a weekday, Day Off on a weekend/holiday) get their row deleted rather
  // than stored, since one selection can span both at once.
  function applyToSelection(status: StatusType, comment: string | null) {
    const dates = Array.from(selection);
    const toDelete = dates.filter((d) => isNaturalDefault(status, d));
    const toSet = dates.filter((d) => !isNaturalDefault(status, d));

    setLocalSchedule((prev) => {
      const next = { ...prev };
      for (const d of toDelete) delete next[d];
      for (const d of toSet) {
        next[d] = {
          morning: { comment, statusType: status },
          afternoon: { comment, statusType: status },
        };
      }
      return next;
    });

    commit(dates, async () => {
      if (toDelete.length > 0) {
        await setSchedule({ dates: toDelete, period: "both", statusTypeId: null });
      }
      if (toSet.length > 0) {
        await setSchedule({ dates: toSet, period: "both", statusTypeId: status.id, comment });
      }
    });

    setSelection(new Set());
  }

  function applyToHalf(date: string, period: Period, status: StatusType, comment: string | null) {
    const statusTypeId = isNaturalDefault(status, date) ? null : status.id;

    setLocalSchedule((prev) => {
      const next = { ...prev };
      const entry = { ...(next[date] ?? {}) };
      if (statusTypeId === null) delete entry[period];
      else entry[period] = { comment, statusType: status };
      next[date] = entry;
      return next;
    });

    commit([date], async () => {
      await setSchedule({ dates: [date], period, statusTypeId, comment });
    });
  }

  function handleUndo() {
    if (!lastAction) return;
    const { dates, previous } = lastAction;
    restoreSnapshot(previous);
    setLastAction(null);
    startTransition(async () => {
      for (const date of dates) {
        const prevDay = previous[date];
        for (const period of ["morning", "afternoon"] as Period[]) {
          const half = prevDay?.[period];
          await setSchedule({
            dates: [date],
            period,
            statusTypeId: half ? half.statusType.id : null,
            comment: half?.comment ?? null,
          });
        }
      }
    });
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selection.size === 0) return;
      const n = Number(e.key);
      if (n >= 1 && n <= statusTypes.length) {
        const status = statusTypes[n - 1];
        if (!status.allows_comment) applyToSelection(status, null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, statusTypes]);

  return (
    <div className="flex flex-col gap-4">
      {!dragging && selection.size > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-2 shadow-sm">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-foreground">
              {selection.size} day{selection.size > 1 ? "s" : ""} selected
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSelection(new Set())}>
              Cancel
            </Button>
          </div>
          <StatusPickerContent statusTypes={statusTypes} onPick={applyToSelection} />
        </div>
      )}

      {lastAction && selection.size === 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleUndo}>
            Undo last change
          </Button>
        </div>
      )}

      <div className="grid grid-cols-[2rem_repeat(7,1fr)] gap-1 text-center text-xs font-medium text-muted-foreground">
        <div />
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="flex select-none flex-col gap-1">
        {weeks.map((week) => (
          <div key={week[0]} className="grid grid-cols-[2rem_repeat(7,1fr)] gap-1">
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              {getWeekNumber(parseISODate(week[0]))}
            </div>
            {week.map((date) => (
              <DayCell
                key={date}
                date={date}
                inCurrentMonth={date.slice(0, 7) === currentMonthLabel}
                isToday={date === todayISO}
                isSelected={selection.has(date)}
                day={localSchedule[date]}
                statusTypes={statusTypes}
                onStart={() => handleStart(date)}
                onEnter={() => handleEnter(date)}
                onApplyToHalf={applyToHalf}
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
  statusTypes,
  onStart,
  onEnter,
  onApplyToHalf,
}: {
  date: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  day: DaySchedule | undefined;
  statusTypes: StatusType[];
  onStart: () => void;
  onEnter: () => void;
  onApplyToHalf: (date: string, period: Period, status: StatusType, comment: string | null) => void;
}) {
  const dayNumber = Number(date.slice(8, 10));
  const defaultStatus = findDefaultStatus(statusTypes, date);

  // Taps inside a half-slot (data-no-drag) shouldn't also start a whole-day
  // drag-select — checked here on the parent rather than stopPropagation on
  // the half's own button, which was interfering with the popover library's
  // ability to register the tap at all on touch devices.
  function isInHalfSlot(e: { target: EventTarget | null }) {
    return e.target instanceof Element && e.target.closest("[data-no-drag]") !== null;
  }

  return (
    <div
      data-date={date}
      onMouseDown={(e) => {
        if (!isInHalfSlot(e)) onStart();
      }}
      onMouseEnter={onEnter}
      onTouchStart={(e) => {
        if (!isInHalfSlot(e)) onStart();
      }}
      className={cn(
        "flex min-h-[76px] touch-manipulation flex-col overflow-hidden rounded-md ring-inset transition-colors sm:min-h-[88px]",
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
      <div className="flex flex-1 flex-col divide-y divide-border/70">
        <HalfSlot
          date={date}
          period="morning"
          half={day?.morning}
          defaultStatus={defaultStatus}
          statusTypes={statusTypes}
          onApply={onApplyToHalf}
        />
        <HalfSlot
          date={date}
          period="afternoon"
          half={day?.afternoon}
          defaultStatus={defaultStatus}
          statusTypes={statusTypes}
          onApply={onApplyToHalf}
        />
      </div>
    </div>
  );
}

function HalfSlot({
  date,
  period,
  half,
  defaultStatus,
  statusTypes,
  onApply,
}: {
  date: string;
  period: Period;
  half: DaySchedule[Period] | undefined;
  defaultStatus: StatusType | undefined;
  statusTypes: StatusType[];
  onApply: (date: string, period: Period, status: StatusType, comment: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const status = half?.statusType ?? defaultStatus;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            data-no-drag
            className="flex min-h-[34px] flex-1 touch-manipulation items-center justify-center text-lg leading-none active:brightness-90 sm:min-h-[40px]"
            style={{ backgroundColor: status ? `${status.color}26` : undefined }}
            title={`${period === "morning" ? "Morning" : "Afternoon"}: ${status?.label ?? ""}${half?.comment ? ` — ${half.comment}` : ""}`}
          >
            {status?.icon}
          </button>
        }
      />
      <PopoverContent className="w-48 p-1">
        <p className="px-2 py-1 text-xs text-muted-foreground capitalize">
          {period} — {status?.label ?? ""}
          {half?.comment ? ` — ${half.comment}` : ""}
        </p>
        <StatusPickerContent
          statusTypes={statusTypes}
          currentStatusKey={status?.key}
          onPick={(picked, comment) => {
            onApply(date, period, picked, comment);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
