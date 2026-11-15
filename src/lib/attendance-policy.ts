/** Compare the lesson's local wall clock with authoritative Casablanca time. */
export function attendanceGate(day: string, start: string, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map(part => [part.type, part.value]));
  const localNow = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
  const opens = Date.parse(`${day}T${start}:00Z`) + 15 * 60_000;
  return { remainingMs: Math.max(0, opens - localNow), opensAt: new Date(opens).toISOString().slice(11, 16) };
}
