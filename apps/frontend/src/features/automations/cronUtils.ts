function matchCronField(value: number, expr: string): boolean {
  if (expr === "*") return true;
  if (expr.startsWith("*/")) {
    const step = Number(expr.slice(2));
    return step > 0 && value % step === 0;
  }
  if (expr.includes(",")) {
    return expr.split(",").some((part) => matchCronField(value, part.trim()));
  }
  if (expr.includes("-")) {
    const [start, end] = expr.split("-").map(Number);
    return value >= start && value <= end;
  }
  return Number(expr) === value;
}

export function cronMatches(date: Date, cronExpression: string): boolean {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const [min, hour, dom, month, dow] = parts;
  const checks = [
    [date.getMinutes(), min],
    [date.getHours(), hour],
    [date.getDate(), dom],
    [date.getMonth() + 1, month],
    [date.getDay(), dow],
  ] as const;

  return checks.every(([value, expr]) => matchCronField(value, expr));
}

export function getNextCronRun(cronExpression: string, from = new Date()): Date | null {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const limit = new Date(cursor);
  limit.setFullYear(limit.getFullYear() + 2);

  while (cursor <= limit) {
    if (cronMatches(cursor, cronExpression)) return new Date(cursor);
    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return null;
}

export function formatCronRule(cronExpression: string | null | undefined): string {
  if (!cronExpression?.trim()) return "Scheduled";
  return cronExpression.trim();
}

export function formatRunDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
