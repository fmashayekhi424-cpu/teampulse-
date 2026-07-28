"use client";

import { useState } from "react";
import type { StatusType } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function StatusPickerBar({
  selectedCount,
  statusTypes,
  pending,
  onPick,
  onClear,
}: {
  selectedCount: number;
  statusTypes: StatusType[];
  pending: boolean;
  onPick: (status: StatusType, comment: string | null) => void;
  onClear: () => void;
}) {
  const [pendingStatus, setPendingStatus] = useState<StatusType | null>(null);
  const [comment, setComment] = useState("");

  if (selectedCount === 0) return null;

  if (pendingStatus?.allows_comment) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm">
        <p className="text-sm text-muted-foreground">
          {pendingStatus.icon} {pendingStatus.label} — add an optional note
        </p>
        <Textarea
          autoFocus
          placeholder="e.g. Vision Science course"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPendingStatus(null)}>
            Back
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => onPick(pendingStatus, comment.trim() || null)}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 shadow-sm">
      <span className="mr-1 text-sm text-muted-foreground">
        {selectedCount} day{selectedCount > 1 ? "s" : ""} selected —
      </span>
      {statusTypes.map((status, i) => (
        <Button
          key={status.id}
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            status.allows_comment ? setPendingStatus(status) : onPick(status, null)
          }
          title={`Press ${i + 1}`}
        >
          <span>{status.icon}</span> {status.label}
        </Button>
      ))}
      <Button variant="ghost" size="sm" onClick={onClear} disabled={pending}>
        Clear
      </Button>
    </div>
  );
}
