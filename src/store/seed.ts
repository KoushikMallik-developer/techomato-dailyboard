import { ago, dateKey as key, todayKey } from "../lib/date";
import { billDue, dk, monthKey, syncTaskEvent } from "../lib/logic";
import { Prio, State, TaskListKey, WidgetKey } from "./types";

export const ALL_WIDGETS: WidgetKey[] = [
  "habits", "personal", "office", "calendar", "alarms", "dates", "spend", "goals", "learn", "proj",
  "health", "journal", "notes", "watch", "bills", "shop", "subs", "docs", "trips", "meds",
];

/** Sample items get ids from this number up. The app hands out ids from 100, so the two ranges never meet and sample items can be told apart. */
const SAMPLE = 1_000_000;

/** Sample data. Mirrors seed() in reference/life-dashboard-preview.html. */
function sample(): State {
  const TODAY = todayKey(), MONTH = monthKey();
  const S: State = {
    nid: SAMPLE, name: "", cur: "₹", theme: "dark", palette: "orange", order: ALL_WIDGETS.slice(), on: {}, budget: 30000, waterTarget: 8,
    habits: [], personal: [], office: [], spend: [], goals: [], journal: [], events: [], watch: [], notes: [], learn: [], proj: [],
    nfold: ["Notes", "Work", "Personal", "Ideas", "Travel", "Learning"], alarms: [], fired: {}, snz: [], alerts: { on: 1, lead: 15 },
    dates: [], bills: [], shop: [], subs: [], docs: [], trips: [], meds: [], catBudgets: { Food: 8000, Transport: 3000, Shopping: 5000 }, weight: [], health: { water: {}, sleep: {} },
  };
  ALL_WIDGETS.forEach((k) => { S.on[k] = true; });
  const id = () => S.nid++;

  ([["Walk 20 minutes", "07:00"], ["Read 10 pages", "21:30"], ["Drink 2L water", ""], ["Stretch", "08:00"]] as const).forEach((r, h) => {
    const done: Record<string, 1> = {};
    for (let i = 0; i < 84; i++) if ((i * 7 + h * 3) % 5 !== 0 && (i + h * 2) % 9 !== 0 && !(i < 2 && h === 2)) done[key(ago(i))] = 1;
    S.habits.push({ id: id(), n: r[0], rt: r[1], done });
  });

  type TRow = [string, Prio, string | null, number, number | null, number?, string?];
  const T = (list: TaskListKey, rows: TRow[]) => rows.forEach((r) => {
    const t = { id: id(), t: r[0], p: r[1], due: r[2] === null ? "" : r[2], c: key(ago(r[3])), x: (r[4] === null ? 0 : 1) as 0 | 1, f: r[4] === null ? null : key(ago(r[4])), cal: (r[5] ? "1" : "") as "" | "1", time: r[6] || "" };
    S[list].push(t); if (t.cal) syncTaskEvent(S, t, list);
  });
  T("personal", [["Renew car insurance", "h", key(ago(1)), 6, null], ["Pay electricity bill", "h", dk(1), 3, null, 1, ""], ["Book dentist", "m", dk(3), 5, null], ["Plan weekend trip", "l", "", 2, null], ["Call mom", "m", TODAY, 4, 0], ["Buy birthday gift", "m", "", 8, 2], ["Fix bike tyre", "l", "", 12, 10]]);
  T("office", [["Send invoice to client", "h", TODAY, 2, null, 1, "16:00"], ["Prepare Monday standup notes", "m", dk(2), 1, null], ["Draft Q4 roadmap", "m", dk(6), 4, null], ["Review pull request", "m", "", 3, 0], ["Update project roadmap", "l", "", 7, 4], ["Submit expense report", "m", "", 11, 8]]);

  ([[120, "Lunch", "Food", 0], [45, "Auto fare", "Transport", 0], [180, "Dinner", "Food", 1], [350, "Coffee with friends", "Food", 2], [2300, "Groceries", "Food", 3], [90, "Auto fare", "Transport", 4], [1200, "T-shirt", "Shopping", 5], [60, "Metro card top-up", "Transport", 6], [210, "Lunch", "Food", 7], [640, "Pharmacy", "Health", 8], [899, "Internet", "Bills", 9], [75, "Auto fare", "Transport", 10], [420, "Movie", "Other", 11], [1499, "Phone recharge", "Bills", 12], [2100, "Shoes", "Shopping", 14], [1650, "Groceries", "Food", 16], [300, "Haircut", "Other", 18], [999, "Electricity", "Bills", 20]] as [number, string, string, number][])
    .forEach((r) => S.spend.push({ id: id(), k: "x", a: r[0], l: r[1], c: r[2], d: key(ago(r[3])) }));
  S.spend.push({ id: id(), k: "i", a: 8000, l: "Freelance payment", c: "Other", d: key(ago(4)) }, { id: id(), k: "i", a: 45000, l: "Salary", c: "Other", d: key(ago(8)) });

  S.goals.push(
    { id: id(), t: "Save for a laptop", target: 60000, cur: 24500, unit: S.cur, due: dk(70), log: [{ d: key(ago(20)), v: 10000 }, { d: key(ago(8)), v: 9500 }, { d: key(ago(2)), v: 5000 }] },
    { id: id(), t: "Read 12 books", target: 12, cur: 5, unit: "books", due: dk(50), log: [{ d: key(ago(30)), v: 3 }, { d: key(ago(10)), v: 2 }] },
    { id: id(), t: "Run 100 km", target: 100, cur: 38, unit: "km", due: dk(25), log: [{ d: key(ago(9)), v: 22 }, { d: key(ago(3)), v: 16 }] },
  );

  ([[0, 4, "Good focus day. Finished the roadmap draft before lunch and walked in the evening."], [1, 3, "Busy meetings, skipped stretching."], [2, 5, "Long call with mom. Cooked dinner."], [4, 2, "Slept badly, felt slow all day."], [5, 4, "Weekend trip planning. Read for an hour."], [7, 3, ""], [9, 4, "Started the new reading habit."]] as [number, number, string][])
    .forEach((r) => S.journal.push({ id: id(), d: key(ago(r[0])), mood: r[1], txt: r[2] }));

  ([[0, "10:30", "Team standup", "Office"], [1, "17:00", "Dentist appointment", "Personal"], [3, "19:30", "Mom's birthday dinner", "Personal"], [5, "11:00", "Quarterly review", "Office"], [9, "06:15", "Flight to Kolkata", "Personal"], [-2, "15:00", "Design sync", "Office"]] as [number, string, string, string][])
    .forEach((r) => S.events.push({ id: id(), d: dk(r[0]), time: r[1], t: r[2], cat: r[3] }));

  ([
    { t: "Dune: Part Two", type: "Movie", plat: "Prime Video", st: "todo", plan: dk(2), note: "Movie night with friends" },
    { t: "Oppenheimer", type: "Movie", plat: "Netflix", st: "todo" },
    { t: "Panchayat", type: "Series", plat: "Prime Video", st: "doing", se: 3, ep: 4 },
    { t: "Breaking Bad", type: "Series", plat: "Netflix", st: "todo", note: "Everyone recommends it" },
    { t: "Interstellar", type: "Movie", plat: "Prime Video", st: "done", rate: 5, f: key(ago(2)) },
    { t: "Inception", type: "Movie", plat: "Netflix", st: "done", rate: 5, f: key(ago(6)) },
    { t: "Money Heist", type: "Series", plat: "Netflix", st: "done", rate: 4, f: key(ago(20)) },
  ] as Partial<State["watch"][number]>[]).forEach((w) => S.watch.push({ id: id(), plat: "", se: "", ep: "", rate: 0, plan: "", note: "", c: key(ago(5)), f: null, ...w } as State["watch"][number]));

  ([
    { h: 3, t: "Weekend trip ideas", lab: "Travel", pin: 1, body: "Goa in December, Pondicherry for a long weekend, or a Coorg road trip.\nCheck train tickets 60 days ahead." },
    { h: 5, t: "Team meeting talking points", lab: "Work", pin: 1, body: "Release status, QA blockers, hiring update, next sprint scope.", rem: dk(2) },
    { h: 20, t: "Groceries for Sunday", lab: "Personal", items: [["Paneer", 0], ["Spinach", 0], ["Curd", 1], ["Rice 5 kg", 0]] },
    { h: 24 * 5, t: "Book to read next", lab: "Learning", body: "Atomic Habits, Deep Work, The Psychology of Money." },
    { h: 0.2, t: "Call plumber", lab: "Personal", body: "Kitchen tap is leaking. Ask for a visit this week." },
    { h: 24 * 40, t: "Gift ideas for mom", lab: "Personal", body: "Saree, a book, a spa voucher." },
    { h: 24 * 18, t: "App idea: widget home", lab: "Ideas", body: "One home screen that mixes habits, tasks, money and notes. Everything on device." },
    { h: 24 * 2, t: "Old shopping list", lab: "Notes", st: "trash", body: "Phone cover, charger, notebook." },
  ] as { h: number; t: string; lab: string; pin?: 0 | 1; body?: string; rem?: string; st?: "trash"; items?: [string, 0 | 1][] }[]).forEach((n) => S.notes.push({
    id: id(), t: n.t, body: n.body || "", items: (n.items || []).map((r) => ({ t: r[0], x: r[1] })), lab: n.lab, pin: n.pin || 0, st: n.st || "on", rem: n.rem || "",
    m: Date.now() - n.h * 36e5, tr: n.st ? Date.now() - n.h * 36e5 : 0,
  }));

  ([
    { t: "Complete Python course", kind: "Course", src: "Udemy", total: 60, done: 24, unit: "lessons", due: dk(30), days: [0, 1, 2, 4, 6], v: [3, 2, 4, 3, 2], m: [45, 30, 60, 40, 35] },
    { t: "Atomic Habits", kind: "Book", src: "James Clear", total: 320, done: 140, unit: "pages", due: dk(14), days: [1, 3, 5], v: [25, 30, 20], m: [30, 40, 25] },
    { t: "Guitar basics", kind: "Skill", src: "YouTube", total: 30, done: 9, unit: "practice sessions", due: "", days: [2, 5], v: [1, 1], m: [20, 25], note: "Practise chords C, G, Am and F" },
    { t: "Intro to Economics", kind: "Course", src: "Coursera", total: 20, done: 20, unit: "lessons", due: "", st: "done", f: key(ago(10)), days: [10, 12], v: [3, 3], m: [50, 45] },
  ] as { t: string; kind: string; src: string; total: number; done: number; unit: string; due: string; st?: "done"; f?: string; note?: string; days: number[]; v: number[]; m: number[] }[]).forEach((l) => S.learn.push({
    id: id(), t: l.t, kind: l.kind, src: l.src, total: l.total, done: l.done, unit: l.unit, due: l.due, st: l.st || "active", f: l.f || null, note: l.note || "",
    log: l.days.map((n, i) => ({ d: key(ago(n)), v: l.v[i], m: l.m[i] })),
  }));

  type P = { t: string; st: "idea" | "active" | "hold" | "done"; pr: Prio; cat: string; start: string; due: string; desc: string; tasks: [string, 0 | 1, Prio, string][]; ms: [string, 0 | 1, string][]; ups: [number, string][]; time: [number, number, string][]; links: [string, string][] };
  ([
    { t: "Portfolio website", st: "active", pr: "h", cat: "Creative", start: key(ago(14)), due: dk(21), desc: "A personal site with my projects, a short blog and a contact form.",
      tasks: [["Design the layout", 1, "h", ""], ["Build the home page", 1, "h", ""], ["Write the about page", 0, "m", key(ago(1))], ["Add project pages", 0, "m", dk(7)], ["Deploy and connect domain", 0, "h", dk(18)]],
      ms: [["Design approved", 1, key(ago(8))], ["Site live on a test link", 0, dk(10)], ["Public launch", 0, dk(21)]],
      ups: [[3, "Picked the colours and fonts"], [1, "Home page done, working on mobile layout"]], time: [[0, 1.5, "About page draft"], [1, 2, "Mobile layout"], [3, 2.5, "Design"], [5, 1, "Fonts and colours"]],
      links: [["Design file", "https://example.com/design"], ["GitHub repo", "https://github.com/"]] },
    { t: "Life Dashboard app", st: "active", pr: "m", cat: "Tech", start: key(ago(5)), due: dk(45), desc: "Mobile app with widgets for habits, tasks, money and notes.",
      tasks: [["Finish the design preview", 1, "h", ""], ["Write the spec", 0, "m", dk(3)], ["Set up Expo project", 0, "m", dk(10)], ["Build the first widgets", 0, "m", dk(30)]],
      ms: [["Design preview signed off", 1, key(ago(1))], ["First build on phone", 0, dk(25)]], ups: [[2, "Preview has most widgets now"]], time: [[2, 3, "Preview widgets"], [4, 2, "Research"]], links: [] },
    { t: "Home workout plan", st: "idea", pr: "l", cat: "Health", start: "", due: "", desc: "A simple 4 day plan using only dumbbells.", tasks: [], ms: [], ups: [], time: [], links: [] },
    { t: "Learn to cook 10 recipes", st: "hold", pr: "l", cat: "Home", start: "", due: "", desc: "", tasks: [["Pick 10 recipes", 1, "m", ""], ["Buy basic spices", 0, "l", ""], ["Cook the first one", 0, "m", ""]], ms: [], ups: [], time: [], links: [] },
    { t: "Organise photos", st: "done", pr: "m", cat: "Home", start: key(ago(40)), due: key(ago(10)), desc: "Sort the last 3 years into albums.", tasks: [["Back up to the cloud", 1, "m", ""], ["Delete duplicates", 1, "m", ""], ["Make yearly albums", 1, "m", ""]], ms: [["All backed up", 1, key(ago(20))]], ups: [[12, "All sorted"]], time: [[15, 2, "Backup"], [14, 3, "Albums"]], links: [] },
  ] as P[]).forEach((p) => S.proj.push({
    id: id(), t: p.t, desc: p.desc, st: p.st, pr: p.pr, cat: p.cat, start: p.start, due: p.due, c: key(ago(10)),
    tasks: p.tasks.map((r) => ({ id: id(), t: r[0], x: r[1], p: r[2], due: r[3], f: r[1] ? key(ago(2)) : null })),
    ms: p.ms.map((r) => ({ id: id(), t: r[0], x: r[1], due: r[2] })), ups: p.ups.map((r) => ({ d: key(ago(r[0])), t: r[1] })),
    time: p.time.map((r) => ({ id: id(), d: key(ago(r[0])), h: r[1], t: r[2] })), links: p.links.map((r) => ({ id: id(), t: r[0], u: r[1] })),
  }));

  ([["06:30", "Wake up", [0, 1, 2, 3, 4], 5, 0], ["21:00", "Take medicine", [], 10, 0], ["08:30", "Weekend lie-in", [5, 6], 10, 0]] as [string, string, number[], number, 0 | 1][])
    .forEach((r) => S.alarms.push({ id: id(), t: r[0], label: r[1], days: r[2], snooze: r[3], on: r[4] }));

  ([["Aanya's birthday", "Birthday", 0, 1999, 7], ["Rahul's birthday", "Birthday", 1, 1996, 1], ["Mom's birthday", "Birthday", 4, 1968, 7], ["Wedding anniversary", "Anniversary", 21, 2019, 14], ["Dad's birthday", "Birthday", 90, 1965, 7], ["First day at work", "Other", 150, 2022, 3]] as [string, string, number, number, number][])
    .forEach((r) => S.dates.push({ id: id(), n: r[0], kind: r[1], d: r[3] + dk(r[2]).slice(4), hy: "1", rem: r[4] }));

  ([["Rent", 12000, 1, MONTH], ["Gym", 1500, 5, MONTH], ["Internet", 899, 9, MONTH], ["Netflix", 199, 15, ""], ["Electricity", 999, 20, ""], ["Phone plan", 499, 24, ""]] as [string, number, number, string][])
    .forEach((r) => {
      const b = { id: id(), n: r[0], a: r[1], day: r[2], paid: r[3] }; S.bills.push(b);
      if (r[3]) { S.spend = S.spend.filter((e) => !(e.l === b.n && e.c === "Bills")); S.spend.push({ id: id(), k: "x", a: b.a, l: b.n, c: "Bills", d: billDue(b) < TODAY ? billDue(b) : TODAY, bid: b.id }); }
    });

  ([["Milk", "2 L"], ["Eggs", "12"], ["Bread", ""], ["Tomatoes", "1 kg"], ["Coffee beans", "250 g"]] as [string, string][]).forEach((r) => S.shop.push({ id: id(), t: r[0], q: r[1], x: 0 }));
  for (let i = 0; i < 7; i++) { S.health.water[key(ago(i))] = [5, 8, 7, 6, 8, 4, 7][i]; S.health.sleep[key(ago(i + 1))] = [7.2, 6.5, 7.8, 5.9, 7.0, 8.1, 6.8][i]; }
  ([[28, 71.8], [21, 71.5], [14, 71.2], [7, 71.4], [1, 70.9]] as [number, number][]).forEach((r) => S.weight.push({ id: id(), d: key(ago(r[0])), v: r[1] }));
  ([["Spotify", 119, "m", 6], ["iCloud storage", 75, "m", 12], ["YouTube Premium", 1290, "y", 80]] as [string, number, "m" | "y", number][]).forEach((r) => S.subs.push({ id: id(), n: r[0], a: r[1], cycle: r[2], next: dk(r[3]), act: 1 }));
  return S;
}

/** What a new install starts with: no data. */
export function seed(): State {
  const S = sample();
  const blank: State = { ...S, nid: 100, budget: 0, catBudgets: {}, nfold: S.nfold, weight: [], health: { water: {}, sleep: {} } };
  LISTS.forEach((k) => { (blank as unknown as Record<string, unknown>)[k] = []; });
  return blank;
}

const LISTS = ["habits", "personal", "office", "spend", "goals", "journal", "events", "watch", "notes", "learn", "proj", "alarms", "dates", "bills", "shop", "subs", "docs", "trips", "meds", "weight"] as const;
type Listed = Record<(typeof LISTS)[number], { id: number }[]>;

export const hasSample = (s: State) => LISTS.some((k) => (s as unknown as Listed)[k].some((x) => x.id >= SAMPLE));

/** Drops every sample item and the water and sleep days the sample added. The user's own entries stay. */
export function removeSample(s: State) {
  const L = s as unknown as Listed, bills = new Set(s.bills.filter((b) => b.id >= SAMPLE).map((b) => b.id));
  LISTS.forEach((k) => { L[k] = L[k].filter((x) => x.id < SAMPLE); });
  (["water", "sleep"] as const).forEach((h) => (s.sampleHealth?.[h] ?? []).forEach((d) => { delete s.health[h][d]; }));
  delete s.sampleHealth;
  s.spend = s.spend.filter((x) => !(x.bid && bills.has(x.bid))); // a payment made on a sample bill goes with the bill; payments on bills the user deleted stay
}

/** Adds the sample data next to what is there. Days the user already logged water or sleep for are left alone. */
export function addSample(s: State) {
  removeSample(s);
  const S = sample(), L = s as unknown as Listed, from = S as unknown as Listed, added = { water: [] as string[], sleep: [] as string[] };
  LISTS.forEach((k) => L[k].push(...from[k]));
  (["water", "sleep"] as const).forEach((h) => Object.entries(S.health[h]).forEach(([d, v]) => { if (s.health[h][d] === undefined) { s.health[h][d] = v; added[h].push(d); } }));
  s.sampleHealth = added;
}
