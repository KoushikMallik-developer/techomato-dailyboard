// Pure helpers ported from the HTML preview. They take the State (or its parts) and never touch storage.
import { CalEvent, Note, Project, State, Task, TaskListKey, Learn, Bill, YDate, Watch } from "../store/types";
import { addRep, ago, dateKey, dayLabel, fromKey, todayKey } from "./date";

const pad = (n: number) => String(n).padStart(2, "0");
export const key = dateKey;
export const dk = (n: number) => dateKey(ago(-n)); // n days from today
export const monthKey = () => todayKey().slice(0, 7);
export const dl = dayLabel;
export const hm = (d: Date) => pad(d.getHours()) + ":" + pad(d.getMinutes());
export const num = (n: number) => (Math.round(n * 10) / 10).toLocaleString();
export const money = (s: State, n: number) => (n < 0 ? "-" : "") + s.cur + Math.round(Math.abs(n)).toLocaleString(s.cur === "₹" ? "en-IN" : "en-US");
export const agoTxt = (k: string) => { const n = Math.round((+fromKey(todayKey()) - +fromKey(k)) / 864e5); return n === 0 ? "today" : n === 1 ? "yesterday" : n + " days ago"; };
export const dnum = (k: string) => Math.round((+fromKey(k) - +fromKey(todayKey())) / 864e5);
export const dleft = (k: string) => { const n = dnum(k); return n < 0 ? Math.abs(n) + " days overdue" : n === 0 ? "due today" : n + " days left"; };
export const byId = <T extends { id: number }>(l: T[], id: number | string) => l.find((x) => x.id === Number(id));
export const MOODS = ["", "Rough", "Low", "Okay", "Good", "Great"];
export const CATS = ["Food", "Transport", "Bills", "Shopping", "Health", "Other"];
export const PRIO_NAME = { h: "High", m: "Medium", l: "Low" } as const;

/* ---------- habits ---------- */
export function streaks(done: Record<string, 1>) {
  const today = todayKey();
  let s = done[today] ? 0 : 1, cur = 0;
  while (done[key(ago(s + cur))]) cur++;
  let best = 0, run = 0;
  for (let i = 400; i >= 0; i--) { if (done[key(ago(i))]) { run++; if (run > best) best = run; } else run = 0; }
  let n30 = 0; for (let i = 0; i < 30; i++) if (done[key(ago(i))]) n30++;
  return { cur, best, rate: Math.round((n30 / 30) * 100) };
}

/* ---------- tasks and the calendar link ---------- */
export const allTasks = (s: State) => s.personal.concat(s.office);
const PR = { h: 0, m: 1, l: 2 };
export function sortOpen(a: Task, b: Task) { const x = a.due || "9999", y = b.due || "9999"; return x < y ? -1 : x > y ? 1 : PR[a.p] - PR[b.p]; }
export function dueTxt(t: Task): { text: string; late: boolean } {
  if (!t.due || t.x) return { text: "", late: false };
  const today = todayKey(), tm = t.cal && t.time ? " · " + t.time : "";
  if (t.due < today) return { text: "Overdue · " + dl(t.due) + (t.rep ? " · Repeats" : ""), late: true };
  return { text: (t.due === today ? "Due today" : "Due " + dl(t.due)) + tm + (t.rep ? " · Repeats" : ""), late: false };
}
/** A task shown on the calendar has a linked event (event.tid) that mirrors its title, date and time. */
export function syncTaskEvent(s: State, t: Task, k: TaskListKey) {
  let ev = s.events.find((e) => e.tid === t.id);
  if (t.cal === "1" && t.due) {
    if (!ev) { ev = { id: s.nid++, tid: t.id } as CalEvent; s.events.push(ev); }
    Object.assign(ev, { tk: k, t: t.t, d: t.due, time: t.time || "", cat: k === "office" ? "Office" : "Personal" });
  } else if (ev) s.events = s.events.filter((e) => e !== ev);
}
export const taskOf = (s: State, e: CalEvent): Task | undefined => (e.tk && e.tid ? s[e.tk].find((t) => t.id === e.tid) : undefined);
/** Repeating events move to their next date once the day has passed. Events linked to a task follow the task instead. */
export function rollEvents(s: State) {
  const today = todayKey();
  s.events.forEach((e) => { if (e.rep && !e.tid) for (let i = 0; e.d < today && i < 800; i++) e.d = addRep(e.d, e.rep); });
}
export const setTaskDone = (s: State, t: Task, x: 0 | 1) => {
  t.x = x; t.f = x ? todayKey() : null;
  const k: TaskListKey = s.personal.includes(t) ? "personal" : "office", list = s[k];
  if (x && t.rep && t.due && !t.nx) { // repeating: finishing one queues the next, due after today
    const today = todayKey();
    let due = addRep(t.due, t.rep);
    for (let i = 0; due <= today && i < 800; i++) due = addRep(due, t.rep);
    const next: Task = { ...t, id: s.nid++, due, c: today, x: 0, f: null, nx: undefined };
    list.unshift(next); t.nx = next.id;
    syncTaskEvent(s, next, k);
  } else if (!x && t.nx) { // reopened: drop the queued copy if it is still untouched
    const nx = list.find((y) => y.id === t.nx);
    if (nx && !nx.x) { s[k] = list.filter((y) => y !== nx); s.events = s.events.filter((e) => e.tid !== nx.id); }
    delete t.nx;
  }
  s.proj.forEach((p) => p.tasks.forEach((pt) => { if (pt.ptid === t.id) { pt.x = x; pt.f = t.f; } })); // project task stays in sync
};

/* ---------- yearly dates ---------- */
export function occ(x: YDate, year: number) { let md = x.d.slice(5); if (md === "02-29" && new Date(year, 1, 29).getMonth() !== 1) md = "02-28"; return year + "-" + md; }
export function nextOcc(x: YDate) { const today = todayKey(), y = Number(today.slice(0, 4)), k = occ(x, y); return k < today ? occ(x, y + 1) : k; }
export const daysTo = (x: YDate) => dnum(nextOcc(x));
export function dateLabel(x: YDate, year: number) {
  const yrs = x.hy === "1" ? year - Number(x.d.slice(0, 4)) : 0;
  if (x.kind === "Birthday") return yrs > 0 ? "Turns " + yrs : "Birthday";
  return yrs > 0 ? yrs + (yrs === 1 ? " year" : " years") : x.kind === "Anniversary" ? "Anniversary" : "Yearly";
}
export const inTxt = (n: number) => (n === 0 ? "Today" : n === 1 ? "Tomorrow" : "In " + n + " days");
export const datesOn = (s: State, k: string) => s.dates.filter((x) => occ(x, Number(k.slice(0, 4))) === k);

/* ---------- alarms ---------- */
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function dayTxt(d: number[]) { if (!d.length) return "Once"; if (d.length === 7) return "Every day"; if (d.join() === "0,1,2,3,4") return "Weekdays"; if (d.join() === "5,6") return "Weekends"; return d.map((i) => DAYS[i]).join(", "); }
export function untilTxt(ms: number) { const m = Math.max(1, Math.round(ms / 60000)); if (m < 60) return m + " min"; const h = Math.floor(m / 60); return h < 24 ? h + " h" + (m % 60 ? " " + (m % 60) + " min" : "") : Math.round(h / 24) + " days"; }
export function nextAlarm(s: State) {
  const now = new Date(); let best: { t: Date; a: State["alarms"][number] } | null = null;
  s.alarms.forEach((a) => {
    if (!a.on) return;
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getTime() + i * 864e5);
      if (a.days.length && !a.days.includes((d.getDay() + 6) % 7)) continue;
      const t = new Date(key(d) + "T" + a.t + ":00");
      if (t > now) { if (!best || t < best.t) best = { t, a }; break; }
    }
  });
  return best as { t: Date; a: State["alarms"][number] } | null; // TS cannot see the assignment inside forEach
}

/* ---------- notes ---------- */
export const nday = (n: Note) => Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(n.m).setHours(0, 0, 0, 0)) / 864e5);
export const nstamp = (n: Note) => { const k = nday(n), d = new Date(n.m); return k <= 0 ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : k < 7 ? d.toLocaleDateString([], { weekday: "long" }) : d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }); };
export const ngroup = (n: Note) => n.pin ? "Pinned" : nday(n) <= 0 ? "Today" : nday(n) === 1 ? "Yesterday" : nday(n) <= 7 ? "Previous 7 Days" : nday(n) <= 30 ? "Previous 30 Days" : new Date(n.m).toLocaleDateString([], { month: "long", year: "numeric" });
export const ntitle = (n: Note) => n.t.trim() || "New Note";
export const nsnip = (n: Note) => (n.body.split("\n").map((x) => x.trim()).find(Boolean)) || (n.items[0] ? "☐ " + n.items[0].t : "") || "No additional text";
export const nwords = (n: Note) => (n.t + " " + n.body).split(/\s+/).filter(Boolean).length;
export const newNote = (s: State, folder: string): Note => {
  const n: Note = { id: s.nid++, t: "", body: "", items: [], lab: s.nfold.includes(folder) ? folder : "Notes", pin: 0, st: "on", rem: "", m: Date.now(), tr: 0 };
  s.notes.unshift(n);
  return n;
};

/* ---------- projects ---------- */
export const PST: [Project["st"], string][] = [["idea", "Idea"], ["active", "In progress"], ["hold", "On hold"], ["done", "Done"]];
export const PCAT = ["Tech", "Creative", "Home", "Learning", "Health", "Money", "Other"];
export const pPct = (p: Project) => p.tasks.length ? Math.round((p.tasks.filter((t) => t.x).length / p.tasks.length) * 100) : (p.st === "done" ? 100 : 0);
export const pOver = (p: Project) => p.st === "done" ? [] : p.tasks.filter((t) => !t.x && t.due && t.due < todayKey());
export const pHours = (p: Project, from?: string) => p.time.filter((x) => !from || x.d >= from).reduce((a, x) => a + x.h, 0);
export type Tone = "" | "ok" | "m" | "h" | "b";
export function phealth(p: Project): [string, Tone] | null {
  const today = todayKey();
  if (p.st === "done") return ["Done", "ok"];
  if (p.st !== "active") return null;
  if (p.due && p.due < today) return ["Overdue", "h"];
  if (pOver(p).length) return ["Late tasks", "m"];
  if (!p.due) return null;
  const pc = pPct(p), left = dnum(p.due), span = p.start && p.start < p.due ? Math.max(1, Math.round((+fromKey(p.due) - +fromKey(p.start)) / 864e5)) : 0;
  const exp = span ? Math.min(100, Math.max(0, ((span - left) / span) * 100)) : null;
  return (exp !== null ? pc + 15 < exp : left <= 7 && pc < 60) ? ["At risk", "m"] : ["On track", "ok"];
}

/* ---------- learning ---------- */
export function lstreak(s: State) { const set = new Set<string>(); s.learn.forEach((l) => l.log.forEach((x) => set.add(x.d))); let i = set.has(todayKey()) ? 0 : 1, c = 0; while (set.has(key(ago(i)))) { c++; i++; } return c; }
export const lmin = (s: State) => (k: string) => s.learn.reduce((a, l) => a + l.log.filter((x) => x.d === k).reduce((b, x) => b + (x.m || 0), 0), 0);
export const learnNeed = (l: Learn) => l.due && l.st === "active" && dnum(l.due) > 0 && l.done < l.total ? num((l.total - l.done) / dnum(l.due)) + " " + l.unit + " per day to finish on time" : "";

/* ---------- money, bills, health ---------- */
export const spentOn = (s: State) => (k: string) => s.spend.filter((e) => e.k !== "i" && e.d === k).reduce((a, e) => a + e.a, 0);
export const inMonth = (e: State["spend"][number], kind: "x" | "i") => e.d.slice(0, 7) === monthKey() && (e.k === "i") === (kind === "i");
export const monthSum = (s: State, kind: "x" | "i") => s.spend.filter((e) => inMonth(e, kind)).reduce((a, e) => a + e.a, 0);
/** Spending per category this month against the limit set for it. pct is 0 when no limit is set. */
export const catSpent = (s: State, c: string) => s.spend.filter((e) => inMonth(e, "x") && e.c === c).reduce((a, e) => a + e.a, 0);
export function budgetRows(s: State) {
  return CATS.map((c) => { const limit = s.catBudgets[c] || 0, spent = catSpent(s, c); return { c, limit, spent, pct: limit ? (spent / limit) * 100 : 0 }; });
}
export const water = (s: State) => (k: string) => s.health.water[k] || 0;
export function billDue(b: Bill) { const m = monthKey(), last = new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate(); return m + "-" + pad(Math.min(b.day, last)); }
export function billState(b: Bill): { t: string; c: Tone; s: number } {
  const d = billDue(b), today = todayKey();
  if (b.paid === monthKey()) return { t: "Paid", c: "ok", s: 9 };
  if (d < today) return { t: "Overdue", c: "h", s: 0 };
  if (d === today) return { t: "Due today", c: "m", s: 1 };
  return { t: "In " + dnum(d) + "d", c: "", s: 2 };
}
/** Paying a bill records the expense in Money; un-paying removes it again. */
export function toggleBill(s: State, b: Bill) {
  const m = monthKey();
  if (b.paid === m) { b.paid = ""; s.spend = s.spend.filter((x) => !(x.bid === b.id && x.d.slice(0, 7) === m)); }
  else { b.paid = m; s.spend.unshift({ id: s.nid++, k: "x", a: b.a, l: b.n, c: "Bills", d: todayKey(), bid: b.id }); }
}
/** A habit with "water" in its name is ticked automatically once today's water reaches the target. */
export function syncWaterHabit(s: State) {
  const h = s.habits.find((x) => /water/i.test(x.n)); if (!h) return;
  const t = todayKey();
  if ((s.health.water[t] || 0) >= s.waterTarget) h.done[t] = 1; else delete h.done[t];
}

/* ---------- life score and charts ---------- */
export function score(s: State) {
  const t = todayKey(), p: number[] = [];
  const due = allTasks(s).filter((x) => !x.x && x.due && x.due <= t).length, td = allTasks(s).filter((x) => x.x && x.f === t).length;
  if (s.habits.length) p.push(s.habits.filter((h) => h.done[t]).length / s.habits.length);
  p.push(Math.min(1, (s.health.water[t] || 0) / s.waterTarget));
  if (due + td) p.push(td / (due + td));
  return Math.round((p.reduce((a, b) => a + b, 0) / p.length) * 100);
}
export type Pt = { k: string; l: string; v: number; hi: boolean };
export function lastDays(n: number, f: (k: string) => number): Pt[] {
  const o: Pt[] = [];
  for (let i = n - 1; i >= 0; i--) { const k = key(ago(i)); o.push({ k, l: n > 8 ? String(fromKey(k).getDate()) : fromKey(k).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), v: f(k), hi: i === 0 }); }
  return o;
}

/* ---------- calendar and agenda ---------- */
export function marks(s: State, k: string) {
  return s.events.some((e) => e.d === k) || datesOn(s, k).length > 0 || s.watch.some((w) => w.plan === k && w.st !== "done") ||
    s.notes.some((n) => n.rem === k && n.st === "on") || s.learn.some((l) => l.due === k && l.st === "active") ||
    s.proj.some((x) => x.st !== "done" && (x.due === k || x.tasks.some((t) => !t.x && t.due === k) || x.ms.some((m) => !m.x && m.due === k))) ||
    allTasks(s).some((t) => !t.x && t.due === k);
}
export const evSort = (a: CalEvent, b: CalEvent) => (a.d + a.time < b.d + b.time ? -1 : 1);
export const watchSub = (w: Watch, mini?: boolean) => [w.plat, w.type === "Series" && (w.se || w.ep) ? "S" + (w.se || 1) + " E" + (w.ep || 0) : "", w.st === "done" && w.rate ? "Rated " + w.rate + "/5" : "", w.plan && w.st !== "done" ? "Planned " + dl(w.plan) : ""].filter(Boolean).join(" · ") || (mini ? "" : "No details");

/** The 30-day trash purge the preview did on load. */
export const purgeTrash = (s: State) => { s.notes = s.notes.filter((n) => n.st !== "trash" || Date.now() - n.tr < 30 * 864e5); };

/* ---------- search ---------- */
export type Hit = { k: string; title: string; sub: string };
export function searchResults(s: State, q0: string): Hit[] | null {
  const q = q0.trim().toLowerCase(); if (q.length < 2) return null;
  const R: Hit[] = [], add = (k: string, t: string, sub: string) => { if ((t || "").toLowerCase().includes(q)) R.push({ k, title: t, sub }); };
  s.personal.forEach((t) => add("personal", t.t, "Personal task")); s.office.forEach((t) => add("office", t.t, "Office task"));
  s.habits.forEach((h) => add("habits", h.n, "Habit")); s.dates.forEach((x) => add("dates", x.n, "Yearly date · " + x.kind));
  s.alarms.forEach((a) => add("alarms", a.label, "Alarm · " + a.t)); s.learn.forEach((l) => add("learn", l.t, "Learning · " + l.kind));
  s.proj.forEach((x) => add("proj", x.t + " " + x.desc, "Project · " + x.st)); s.notes.forEach((n) => { if (n.st === "on") add("notes", n.t + " " + n.body, "Note · " + n.lab); });
  s.watch.forEach((w) => add("watch", w.t, "Watchlist · " + (w.type === "Series" ? "series" : "movie"))); s.goals.forEach((g) => add("goals", g.t, "Goal"));
  s.events.forEach((e) => add("calendar", e.t, "Event · " + dl(e.d)));
  s.spend.forEach((e) => add("spend", e.l, "Money · " + money(s, e.a))); s.journal.forEach((e) => add("journal", e.txt, "Journal · " + dl(e.d)));
  s.subs.forEach((x) => add("subs", x.n, "Subscription")); s.bills.forEach((b) => add("bills", b.n, "Bill")); s.shop.forEach((t) => add("shop", t.t, "Shopping"));
  return R.slice(0, 30);
}

/** One-line status per widget, shown on the Widgets tab. */
export function liveStat(s: State, k: string): string {
  const t = todayKey(), m = monthKey(), openN = (l: { x: 0 | 1 }[]) => l.filter((x) => !x.x).length;
  const r: Record<string, string> = {
    habits: s.habits.filter((h) => h.done[t]).length + "/" + s.habits.length + " today", personal: openN(s.personal) + " open", office: openN(s.office) + " open",
    calendar: s.events.filter((e) => e.d === t).length + " today", dates: s.dates.filter((x) => daysTo(x) <= 30).length + " in 30 days", alarms: s.alarms.filter((a) => a.on).length + " on",
    watch: s.watch.filter((w) => w.st === "todo").length + " to watch", notes: s.notes.filter((n) => n.st === "on").length + " notes", learn: s.learn.filter((l) => l.st === "active").length + " active",
    proj: s.proj.filter((x) => x.st === "active").length + " in progress", spend: money(s, spentOn(s)(t)) + " today", goals: s.goals.length + " goals",
    health: (s.health.water[t] || 0) + "/" + s.waterTarget + " glasses", journal: s.journal.some((e) => e.d === t) ? "Logged today" : "Not logged",
    subs: s.subs.filter((x) => x.act).length + " active",
    bills: s.bills.filter((b) => b.paid !== m).length + " unpaid", shop: openN(s.shop) + " to get",
  };
  return r[k] ?? "";
}

/** Items for the "Things to look at" list on Insights. */
export function attention(s: State): string[] {
  const t = todayKey(), notes: string[] = [], ov = allTasks(s).filter((x) => !x.x && x.due && x.due < t).length;
  if (ov) notes.push(ov + " overdue task" + (ov > 1 ? "s" : "") + " need attention.");
  s.dates.filter((x) => daysTo(x) <= 7).sort((a, b) => daysTo(a) - daysTo(b)).forEach((x) => notes.push(`${x.n}: ${inTxt(daysTo(x)).toLowerCase()}.`));
  budgetRows(s).filter((r) => r.limit && r.spent > r.limit).forEach((r) => notes.push(`${r.c} is over its budget by ${money(s, r.spent - r.limit)}.`));
  const bu = s.bills.filter((b) => billState(b).s === 0).length; if (bu) notes.push(bu + " bill" + (bu > 1 ? "s are" : " is") + " overdue.");
  const hb = s.habits.map((x) => ({ x, st: streaks(x.done) })).sort((a, b) => b.st.cur - a.st.cur);
  if (hb.length) notes.push(`Best streak right now: ${hb[0].x.n} (${hb[0].st.cur} days).`);
  s.goals.filter((g) => g.cur < g.target).forEach((g) => { if (g.due && +fromKey(g.due) - +fromKey(t) < 30 * 864e5 && g.cur / g.target < 0.6) notes.push(`"${g.t}" is ${Math.round((g.cur / g.target) * 100)}% done with under 30 days left.`); });
  return notes;
}
