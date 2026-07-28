import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  addWeeks,
  format,
  parseISO,
} from "date-fns";

const WEEK_STARTS_ON = 1; // Monday — matches the Swedish/European work week.

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseISODate(iso: string): Date {
  return parseISO(iso);
}

/** A full 7-day-wide grid for the month containing `monthDate`, including the
 * leading/trailing days needed to fill whole weeks. */
export function getMonthGridWeeks(monthDate: Date): string[][] {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: WEEK_STARTS_ON });
  const days = eachDayOfInterval({ start, end }).map(toISODate);

  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/** The Monday-Sunday dates of the week containing `weekDate`. */
export function getWeekDates(weekDate: Date): string[] {
  const start = startOfWeek(weekDate, { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(weekDate, { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({ start, end }).map(toISODate);
}

export function shiftMonth(monthDate: Date, delta: number): Date {
  return addMonths(monthDate, delta);
}

export function shiftWeek(weekDate: Date, delta: number): Date {
  return addWeeks(weekDate, delta);
}
