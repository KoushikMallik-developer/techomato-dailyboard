const pad = (n: number) => String(n).padStart(2, "0");

/** Local date as YYYY-MM-DD. All dates in the store use this form. */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The date n days before today (use a negative n for the future). */
export function ago(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export const todayKey = () => dateKey(ago(0));
export const fromKey = (k: string) => new Date(k + "T12:00:00");

/** "Today", "Yesterday", "Tomorrow" or a short weekday and date. */
export function dayLabel(k: string): string {
  if (k === todayKey()) return "Today";
  if (k === dateKey(ago(1))) return "Yesterday";
  if (k === dateKey(ago(-1))) return "Tomorrow";
  return fromKey(k).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/** The next occurrence after date k for a repeat of "d", "w", "m" or "y". Month and year steps clamp to the month end (31 Jan -> 28 Feb). */
export function addRep(k: string, rep: string): string {
  const d = fromKey(k);
  if (rep === "d" || rep === "w") d.setDate(d.getDate() + (rep === "d" ? 1 : 7));
  else {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + (rep === "m" ? 1 : 12));
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  }
  return dateKey(d);
}
