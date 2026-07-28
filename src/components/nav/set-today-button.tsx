"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setSchedule } from "@/lib/actions/schedule";
import type { StatusType } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SetTodayButton({ statusTypes }: { statusTypes: StatusType[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleSelect(status: StatusType) {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    startTransition(async () => {
      await setSchedule({
        dates: [iso],
        period: "both",
        statusTypeId: status.key === "office" ? null : status.id,
      });
      toast.success(`Today set to ${status.label}`);
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
      <DropdownMenuContent align="end">
        {statusTypes.map((status) => (
          <DropdownMenuItem key={status.id} onClick={() => handleSelect(status)}>
            <span>{status.icon}</span> {status.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
