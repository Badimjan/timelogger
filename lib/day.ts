const p = (n: number) => String(n).padStart(2, "0");

// Local calendar day as YYYY-MM-DD (not UTC, so work after midnight lands on the right day).
export function localDay(date: Date = new Date()): string {
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

// Moves a YYYY-MM-DD day by whole days. Computed at noon so daylight-saving shifts can't change the date.
export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return localDay(d);
}

// Inclusive number of days from `from` to `to`.
export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000) + 1;
}

export const clockTime = (date: Date): string => `${p(date.getHours())}:${p(date.getMinutes())}`;

// The moment a timer should be considered started when the user types a clock time (HH:MM).
// It is that time today; if that is still ahead of now, they must mean the same time yesterday.
export function startFromClock(hhmm: string, now: Date = new Date()): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  const d = new Date(now);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 1);
  return d;
}
