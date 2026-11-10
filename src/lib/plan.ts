// What should be scheduled for a state. Pure (no React Native imports) so scripts/check-plan.ts can run it in Node.
import { State } from "../store/types";
import { dateKey } from "./date";
import { allTasks, daysTo, money, nextOcc, ntitle, taskOf } from "./logic";

type Planned = { at: Date; title: string; body: string };
type Weekly = { weekday: number; hour: number; minute: number; title: string; body: string };
type Daily = { hour: number; minute: number; title: string; body: string };
const at9 = (k: string, back = 0) => { const d = new Date(k + "T09:00:00"); d.setDate(d.getDate() - back); return d; }; // morning reminders go out at 09:00

/** What should be scheduled for this state. */
export function plan(s: State, now = new Date()): { once: Planned[]; weekly: Weekly[]; daily: Daily[] } {
  const once: Planned[] = [], weekly: Weekly[] = [], daily: Daily[] = [], horizon = +now + 14 * 864e5, on = (k: keyof NonNullable<State["notif"]>) => s.notif?.[k] !== false;
  const soon = (t: Date) => t > now && +t < horizon;
  s.alarms.filter((a) => a.on).forEach((a) => {
    const [h, m] = a.t.split(":").map(Number), title = a.label || "Alarm";
    if (a.days.length) a.days.forEach((d) => weekly.push({ weekday: ((d + 1) % 7) + 1, hour: h, minute: m, title, body: "Alarm " + a.t })); // expo weekday: 1 = Sunday
    else for (let i = 0; i < 2; i++) { const t = new Date(now); t.setDate(t.getDate() + i); t.setHours(h, m, 0, 0); if (t > now) { once.push({ at: t, title, body: "Alarm " + a.t }); break; } }
  });
  if (s.alerts.on) s.events.forEach((e) => {
    if (!e.time) return;
    const tk = e.tid ? taskOf(s, e) : undefined; if (tk && tk.x) return;
    const start = new Date(e.d + "T" + e.time + ":00"), lead = new Date(+start - s.alerts.lead * 60000);
    if (lead > now && +lead < horizon) once.push({ at: lead, title: e.t, body: `Starts in ${s.alerts.lead} min` });
    if (start > now && +start < horizon) once.push({ at: start, title: e.t, body: "Starting now" });
  });
  s.dates.forEach((x) => {
    const n = daysTo(x), when = new Date(nextOcc(x) + "T09:00:00"); when.setDate(when.getDate() - x.rem);
    if (n <= 365 && when > now) once.push({ at: when, title: x.n, body: x.rem ? `In ${x.rem} day${x.rem > 1 ? "s" : ""} (${dateKey(new Date(nextOcc(x) + "T12:00:00"))})` : "Today" });
  });
  if (on("habits")) s.habits.filter((h) => /^\d{2}:\d{2}$/.test(h.rt)).forEach((h) => daily.push({ hour: +h.rt.slice(0, 2), minute: +h.rt.slice(3), title: h.n, body: "Habit reminder" })); // daily repeats cannot skip a day you already did it
  if (on("bills")) s.bills.forEach((b) => {
    for (const off of [0, 1]) { // this month and next
      const y = now.getFullYear(), mo = now.getMonth() + off, last = new Date(y, mo + 1, 0).getDate(), due = new Date(y, mo, Math.min(b.day, last), 9, 0);
      const key = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}`;
      if (b.paid === key) continue;
      const k = dateKey(due);
      if (soon(at9(k, 1))) once.push({ at: at9(k, 1), title: b.n, body: `${money(s, b.a)} due tomorrow` });
      if (soon(at9(k))) once.push({ at: at9(k), title: b.n, body: `${money(s, b.a)} due today` });
    }
  });
  if (on("tasks")) allTasks(s).filter((t) => !t.x && t.due && !(t.cal === "1" && t.time)).forEach((t) => { if (soon(at9(t.due))) once.push({ at: at9(t.due), title: t.t, body: "Task due today" }); });
  if (on("subs")) s.subs.filter((x) => x.act).forEach((x) => { if (soon(at9(x.next, 1))) once.push({ at: at9(x.next, 1), title: x.n, body: `Renews tomorrow, ${money(s, x.a)}` }); });
  if (on("notes")) s.notes.filter((n) => n.st === "on" && n.rem).forEach((n) => { if (soon(at9(n.rem))) once.push({ at: at9(n.rem), title: ntitle(n), body: "Note reminder" }); });
  once.sort((a, b) => +a.at - +b.at);
  return { once: once.slice(0, Math.max(0, 60 - weekly.length - daily.length)), weekly, daily }; // iOS keeps at most 64 pending notifications
}
