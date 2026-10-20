// Logs are exact minutes: round to the nearest whole minute, never below 1.
export function secondsToMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
