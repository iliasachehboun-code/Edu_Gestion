export function normalizeEvalDay(dateInput: Date | string): Date {
  const d = new Date(dateInput);
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getEvaluationQueryFloor(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
}

export function filterUpcomingEvaluations<
  T extends { date: Date; startTime: string | null; durationMin: number }
>(evaluations: T[], now: Date = new Date()): T[] {
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  return evaluations.filter((ev) => {
    const evDay = normalizeEvalDay(ev.date);

    if (evDay < todayMidnight) return false;

    if (evDay.getTime() === todayMidnight.getTime() && ev.startTime) {
      const match = ev.startTime.trim().match(/^(\d{1,2})\s*[:hH]?\s*(\d{0,2})$/);
      if (match) {
        const hours = Number(match[1]);
        const minutes = match[2] ? Number(match[2]) : 0;
        if (!Number.isNaN(hours) && hours >= 0 && hours <= 23) {
          const endDateTime = new Date(todayMidnight);
          endDateTime.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
          endDateTime.setMinutes(
            endDateTime.getMinutes() + (ev.durationMin > 0 ? ev.durationMin : 55)
          );
          if (now > endDateTime) {
            return false;
          }
        }
      }
    }

    return true;
  });
}

export function getDaysUntil(dateInput: Date | string, now: Date = new Date()): number {
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const targetDay = normalizeEvalDay(dateInput);
  return Math.round(
    (targetDay.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );
}
