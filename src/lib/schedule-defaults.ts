import { isDefaultDayOff } from "@/lib/swedish-holidays";
import type { StatusType } from "@/lib/types/database";

/**
 * True when `status` is exactly what this date would show anyway with no
 * row at all — Office on a normal weekday, Day Off on a weekend/holiday.
 * Picking the natural default should delete the row (nothing to store);
 * picking anything else (including Office on a weekend, or Day Off on a
 * weekday) needs an explicit row, since the implicit default now varies by
 * date instead of always being Office.
 */
export function isNaturalDefault(status: StatusType, dateISO: string): boolean {
  const defaultKey = isDefaultDayOff(dateISO) ? "off" : "office";
  return status.key === defaultKey;
}

export function findDefaultStatus(
  statusTypes: StatusType[],
  dateISO: string
): StatusType | undefined {
  const defaultKey = isDefaultDayOff(dateISO) ? "off" : "office";
  return statusTypes.find((s) => s.key === defaultKey);
}
