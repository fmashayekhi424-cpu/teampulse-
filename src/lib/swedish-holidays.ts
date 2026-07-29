import { addDays, getDay } from "date-fns";
import { toISODate } from "@/lib/date";

/** Easter Sunday (Gregorian) via the standard Meeus/Jones/Butcher algorithm. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** The first date on/after `from` that falls on `targetDay` (0=Sun..6=Sat). */
function firstWeekdayOnOrAfter(from: Date, targetDay: number): Date {
  const diff = (targetDay - getDay(from) + 7) % 7;
  return addDays(from, diff);
}

const holidayCache = new Map<number, Set<string>>();

/** Sweden's official public holidays ("röda dagar") for a given year. */
function getSwedishHolidaysForYear(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);
  const dates = [
    new Date(year, 0, 1), // Nyårsdagen
    new Date(year, 0, 6), // Trettondedag jul
    addDays(easter, -2), // Långfredagen
    easter, // Påskdagen
    addDays(easter, 1), // Annandag påsk
    new Date(year, 4, 1), // Första maj
    addDays(easter, 39), // Kristi himmelsfärdsdag
    addDays(easter, 49), // Pingstdagen
    new Date(year, 5, 6), // Nationaldagen
    firstWeekdayOnOrAfter(new Date(year, 5, 20), 6), // Midsommardagen (Sat on/after Jun 20)
    firstWeekdayOnOrAfter(new Date(year, 9, 31), 6), // Alla helgons dag (Sat on/after Oct 31)
    new Date(year, 11, 25), // Juldagen
    new Date(year, 11, 26), // Annandag jul
  ];

  const set = new Set(dates.map(toISODate));
  holidayCache.set(year, set);
  return set;
}

export function isSwedishHoliday(dateISO: string): boolean {
  const year = Number(dateISO.slice(0, 4));
  return getSwedishHolidaysForYear(year).has(dateISO);
}

export function isWeekend(dateISO: string): boolean {
  const day = getDay(new Date(`${dateISO}T00:00:00`));
  return day === 0 || day === 6;
}

/** True for Saturdays, Sundays, and official Swedish public holidays. */
export function isDefaultDayOff(dateISO: string): boolean {
  return isWeekend(dateISO) || isSwedishHoliday(dateISO);
}
