/**
 * Timezone helpers built on Intl (no dependencies). All storage is UTC;
 * user-facing schedules (gym time, quiet hours) are interpreted in the user's IANA zone.
 */

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

export function isValidTimeZone(tz: string) {
  try {
    fmt(tz);
    return true;
  } catch {
    return false;
  }
}

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export interface LocalParts { year: number; month: number; day: number; hour: number; minute: number; weekday: number; minuteOfDay: number; date: string }

export function localParts(at: Date, tz: string): LocalParts {
  const p = Object.fromEntries(fmt(tz).formatToParts(at).map((x) => [x.type, x.value]));
  const year = +p.year, month = +p.month, day = +p.day, hour = +p.hour, minute = +p.minute;
  return {
    year, month, day, hour, minute, weekday: WD[p.weekday], minuteOfDay: hour * 60 + minute,
    date: `${p.year}-${p.month}-${p.day}`,
  };
}

/** Offset of `tz` from UTC at instant `at`, in ms (e.g. Africa/Lagos → +3_600_000). */
export function tzOffsetMs(at: Date, tz: string) {
  const p = localParts(at, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, at.getUTCSeconds());
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The UTC instant for a local wall-clock time. Non-existent DST-gap times roll forward. */
export function zonedToUtc(date: string, minuteOfDay: number, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minuteOfDay / 60), minuteOfDay % 60);
  let t = guess - tzOffsetMs(new Date(guess), tz);
  const off2 = tzOffsetMs(new Date(t), tz);
  t = guess - off2;
  return new Date(t);
}

/** Add whole days to a YYYY-MM-DD string. */
export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** True if local time-of-day falls in [start, end), handling windows that wrap midnight. */
export function inWindow(minuteOfDay: number, start: number, end: number) {
  if (start === end) return false;
  return start < end ? minuteOfDay >= start && minuteOfDay < end : minuteOfDay >= start || minuteOfDay < end;
}

/** If `at` is inside quiet hours, returns the instant quiet hours end; otherwise returns `at`. */
export function deferPastQuietHours(at: Date, tz: string, quietStart: number, quietEnd: number): Date {
  const p = localParts(at, tz);
  if (!inWindow(p.minuteOfDay, quietStart, quietEnd)) return at;
  const endDate = p.minuteOfDay >= quietEnd && quietStart > quietEnd ? addDays(p.date, 1) : p.date;
  return zonedToUtc(endDate, quietEnd, tz);
}

export const minToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const hhmmToMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};

/** Defaults to a full label with the zone (for emails); pass opts for compact on-screen labels. */
export function formatInZone(at: Date, tz: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts }).format(at);
}
