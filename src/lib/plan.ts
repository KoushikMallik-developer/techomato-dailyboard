// What should be scheduled for a state. Pure (no React Native imports) so scripts/check-plan.ts can run it in Node.
import { State } from "../store/types";
import { dateKey } from "./date";
import { allTasks, daysTo, money, nextOcc, ntitle, repeatsOn, repOf, taskOf } from "./logic";

type Planned = { at: Date; title: string; body: string; ring?: boolean; exact?: boolean; loud?: boolean }; // loud: the alarm tone on the alarm channel; the rest chime // ring: the app rings this one itself while it is open
type Weekly = { weekday: number; hour: number; minute: number; title: string; body: string; ring?: boolean };
type Daily = { hour: number; minute: number; title: string; body: string; ring?: boolean };
const at9 = (k: string, back = 0) => { const d = new Date(k + "T09:00:00"); d.setDate(d.getDate() - back); return d; }; // morning reminders go out at 09:00

/** What should be scheduled for this state. */
export function plan(s: State, now = new Date()): { once: Planned[]; weekly: Weekly[]; daily: Daily[] } {
  const once: Planned[] = [], weekly: Weekly[] = [], daily: Daily[] = [], horizon = +now + 60 * 864e5, on = (k: keyof NonNullable<State["notif"]>) => s.notif?.[k] !== false;
  const soon = (t: Date) => t > now && +t < horizon;
  s.alarms.filter((a) => a.on).forEach((a) => {
    const [h, m] = a.t.split(":").map(Number), title = a.label || "Alarm";
    if (a.days.length) a.days.forEach((d) => weekly.push({ weekday: ((d + 1) % 7) + 1, hour: h, minute: m, title, body: "Alarm " + a.t, ring: true })); // expo weekday: 1 = Sunday
    else for (let i = 0; i < 2; i++) { const t = new Date(now); t.setDate(t.getDate() + i); t.setHours(h, m, 0, 0); if (t > now) { once.push({ at: t, title, body: "Alarm " + a.t, ring: true, loud: true }); break; } }
  });
  s.snz.filter((z) => z.at > +now).forEach((z) => once.push({ at: new Date(z.at), title: z.item.title, body: "Snoozed", ring: true, loud: z.item.kind === "alarm" })); // a snooze has to ring with the app closed too
  if (s.alerts.on) {
    const alert = (e: { t: string; d: string; time: string }) => {
      if (!e.time) return;
      const start = new Date(e.d + "T" + e.time + ":00"), lead = new Date(+start - s.alerts.lead * 60000);
      if (lead > now && +lead < horizon) once.push({ at: lead, title: e.t, body: `Starts in ${s.alerts.lead} min`, ring: true });
      if (start > now && +start < horizon) once.push({ at: start, title: e.t, body: "Starting now", ring: true });
    };
    // An every-day event that has started gets one repeating daily alert, so it never runs out and takes only two slots.
    const today = dateKey(now), tom = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)), nowMin = now.getHours() * 60 + now.getMinutes(), everyDay = new Set<number>();
    s.events.forEach((e) => {
      const tk = e.tid ? taskOf(s, e) : undefined;
      if (repOf(s, e) !== "d" || !e.time || (tk && tk.x)) return;
      // started, or starting tomorrow with today's time already gone (so the first daily firing is tomorrow)
      if (e.d > today && !(e.d === tom && +e.time.slice(0, 2) * 60 + +e.time.slice(3) <= nowMin)) return;
      everyDay.add(e.id);
      const at = +e.time.slice(0, 2) * 60 + +e.time.slice(3), before = (at - s.alerts.lead + 1440) % 1440;
      daily.push({ hour: Math.floor(before / 60), minute: before % 60, title: e.t, body: `Starts in ${s.alerts.lead} min`, ring: true }, { hour: Math.floor(at / 60), minute: at % 60, title: e.t, body: "Starting now", ring: true });
    });
    s.events.forEach((e) => { const tk = e.tid ? taskOf(s, e) : undefined; if (!(tk && tk.x) && !everyDay.has(e.id)) alert(e); });
    // Other repeats: two weeks ahead. Every-day ones not covered above (starting later than tomorrow): two days.
    for (let i = 0; i < 14; i++) repeatsOn(s, dateKey(new Date(+now + i * 864e5))).forEach((e) => { if (!everyDay.has(e.id) && (i < 2 || repOf(s, e) !== "d")) alert(e); });
  }
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
  if (on("docs")) s.docs.forEach((d) => {
    const early = at9(d.exp, d.lead), end = at9(d.exp), late = d.seen && early <= at9(d.seen) ? at9(d.seen, -1) : null; // late: added inside the lead window, remind once the next morning
    if (soon(early)) once.push({ at: early, title: d.n, body: `Expires in ${d.lead} days` });
    else if (late && late < end && soon(late)) once.push({ at: late, title: d.n, body: `Expires in ${Math.round((+end - +late) / 864e5)} days` });
    if (soon(end)) once.push({ at: end, title: d.n, body: "Expires today" });
  });
  if (on("meds")) { // one-time items so a ticked dose does not ring; fewer days when there are many doses, so they do not crowd out other reminders
    const L = s.meds.filter((m) => m.act).map((m) => ({ m, ts: [...new Set([m.t1, m.t2, m.t3].filter((t) => /^\d{2}:\d{2}$/.test(t)))] })), per = L.reduce((n, x) => n + x.ts.length, 0), days = Math.max(1, Math.min(7, Math.floor(28 / Math.max(1, per))));
    L.forEach(({ m, ts }) => ts.forEach((t) => {
      for (let i = 0; i < days; i++) { const d = new Date(now); d.setDate(d.getDate() + i); const k = dateKey(d), at = new Date(`${k}T${t}:00`); if (at > now && !m.taken[k]?.includes(t)) once.push({ at, title: m.n, body: m.dose ? `Take ${m.dose}` : "Time for your medicine", exact: true, loud: true }); }
    }));
  }
  if (on("notes")) s.notes.filter((n) => n.st === "on" && n.rem).forEach((n) => { if (soon(at9(n.rem))) once.push({ at: at9(n.rem), title: ntitle(n), body: "Note reminder" }); });
  once.sort((a, b) => +a.at - +b.at);
  return { once: once.slice(0, Math.max(0, 60 - weekly.length - daily.length)), weekly, daily }; // iOS keeps at most 64 pending notifications
}
