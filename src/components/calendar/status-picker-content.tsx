"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { StatusType } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** The status list shown in every picker popover (whole-day and per-half) —
 * a status with a comment field shows a one-step follow-up before saving. */
export function StatusPickerContent({
  statusTypes,
  currentStatusKey,
  onPick,
}: {
  statusTypes: StatusType[];
  /** Highlights the status matching this key as "current". */
  currentStatusKey?: string;
  onPick: (status: StatusType, comment: string | null) => void;
}) {
  const [pendingStatus, setPendingStatus] = useState<StatusType | null>(null);
  const [comment, setComment] = useState("");

  if (pendingStatus) {
    return (
      <div className="flex flex-col gap-2 p-1">
        <p className="px-1 text-xs text-muted-foreground">
          {pendingStatus.icon} {pendingStatus.label} — optional note
        </p>
        <Textarea
          autoFocus
          rows={2}
          placeholder="e.g. Vision Science course"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPendingStatus(null)}>
            Back
          </Button>
          <Button size="sm" onClick={() => onPick(pendingStatus, comment.trim() || null)}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {statusTypes.map((status) => (
        <button
          key={status.id}
          onClick={() => (status.allows_comment ? setPendingStatus(status) : onPick(status, null))}
          className={cn(
            "flex items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-muted",
            status.key === currentStatusKey && "bg-muted font-medium"
          )}
        >
          <span>{status.icon}</span> {status.label}
          {status.key === currentStatusKey && (
            <span className="ml-auto text-xs text-muted-foreground">current</span>
          )}
        </button>
      ))}
    </div>
  );
}
