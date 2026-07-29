"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSchedule } from "@/lib/actions/schedule";
import { isNaturalDefault } from "@/lib/schedule-defaults";
import { toISODate } from "@/lib/date";
import type { StatusType } from "@/lib/types/database";
import type { Period } from "@/lib/data/schedule";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PERIOD_OPTIONS: { value: Period | "both"; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "both", label: "Both" },
];

export function SetTodayButton({ statusTypes }: { statusTypes: StatusType[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period | "both">("both");
  // "Day Off" is the automatic weekend/holiday default, not something to
  // pick manually here.
  const pickableStatusTypes = statusTypes.filter((s) => s.key !== "off");

  function handleSelect(status: StatusType) {
    const iso = toISODate(new Date());
    startTransition(async () => {
      await setSchedule({
        dates: [iso],
        period,
        statusTypeId: isNaturalDefault(status, iso) ? null : status.id,
      });
      router.refresh();
    });
    setOpen(false);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={pending}>
            Set today
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <div className="mb-1 flex gap-1 px-1 pt-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setPeriod(opt.value);
              }}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                period === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {pickableStatusTypes.map((status) => (
          <DropdownMenuItem key={status.id} onClick={() => handleSelect(status)}>
            <span>{status.icon}</span> {status.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
