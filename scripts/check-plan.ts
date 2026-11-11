// Run: npx tsx scripts/check-plan.ts  (plain asserts: the review, the notification plan, budgets and subscriptions)
import assert from "node:assert/strict";
import { dateKey, todayKey } from "../src/lib/date";
import { budgetRows, rollAlarms } from "../src/lib/logic";
import { perMonth, perYear, rollSubs } from "../src/lib/subs";
import { plan } from "../src/lib/plan";
import { review } from "../src/lib/review";
import { load } from "../src/store/load";
import { addSample, hasSample, removeSample, seed as blank } from "../src/store/seed";

/** The checks below were written against sample data, so they start from it. */
const seed = () => { const x = blank(); addSample(x); return x; };

const today = todayKey();
const now = new Date(); now.setHours(6, 0, 0, 0); // plan() is checked as if it were 06:00 today
const tomorrow = dateKey(new Date(+now + 864e5));

// --- Review
s = seed();
const r7 = review(s, 7), r30 = review(s, 30);
assert.ok(r7.metrics.length >= 5 && r30.metrics.length >= 5);
assert.ok(r7.focus.length <= 4);
s.habits = [{ id: 1, n: "Run", rt: "", done: {} }];
assert.ok(review(s, 7).focus.some((f) => f.startsWith("Run: done 0 of 7")), "a never-done habit is called out");

// --- Notification plan
s = seed();
s.alarms = []; s.events = []; s.dates = []; s.personal = []; s.office = []; s.notes = []; s.habits = []; s.bills = [];
s.habits = [{ id: 1, n: "Stretch", rt: "08:15", done: {} }];
s.bills = [{ id: 2, n: "Rent", a: 100, day: Number(tomorrow.slice(8)), paid: "" }];
s.personal = [{ id: 3, t: "File taxes", p: "h", due: tomorrow, c: today, x: 0, f: null, cal: "", time: "" }];
s.notes = [{ id: 4, t: "Call mum", body: "", items: [], lab: "All", pin: 0, st: "on", rem: tomorrow, m: 0, tr: 0 }];
let p = plan(s, now);
assert.equal(p.daily.length, 1);
assert.equal(p.daily[0].hour, 8);
assert.ok(p.once.some((o) => o.title === "Rent" && o.body.includes("due today")), "bill on the day");
assert.ok(p.once.some((o) => o.title === "Rent" && o.body.includes("tomorrow")), "bill the day before");
assert.ok(p.once.some((o) => o.title === "File taxes"), "task due date");
assert.ok(p.once.some((o) => o.title === "Call mum"), "note reminder");
s.bills[0].paid = tomorrow.slice(0, 7);
assert.ok(!plan(s, now).once.some((o) => o.title === "Rent" && +o.at < +now + 3 * 864e5), "a paid bill this month is not reminded");
s.notif = { habits: false, bills: false, tasks: false, notes: false, subs: false };
p = plan(s, now);
assert.equal(p.daily.length + p.once.length, 0, "all categories off schedules nothing");

// --- Budget by category and subscriptions
s = seed();
s.spend = [{ id: 1, k: "x", a: 600, l: "Lunch", c: "Food", d: today, }, { id: 2, k: "i", a: 999, l: "Pay", c: "Food", d: today }];
s.catBudgets = { Food: 500 };
const food = budgetRows(s).find((r) => r.c === "Food")!;
assert.equal(food.spent, 600, "income is not counted as spending");
assert.ok(food.pct > 100, "over the limit");
assert.equal(budgetRows(s).find((r) => r.c === "Transport")!.pct, 0, "no limit means no percentage");
s.subs = [{ id: 1, n: "Y", a: 1200, cycle: "y", next: "2020-01-15", act: 1 }, { id: 2, n: "W", a: 10, cycle: "w", next: today, act: 1 }];
assert.equal(perMonth(s.subs[0]), 100);
assert.equal(perYear(s.subs[0]), 1200);
rollSubs(s);
assert.ok(s.subs[0].next >= today && s.subs[0].next.slice(5) === "01-15", "yearly renewal rolls to the next 15 Jan");
assert.equal(s.subs[1].next, today, "a renewal due today stays today");
s.subs[0].next = tomorrow; s.alarms = []; s.events = []; s.dates = []; s.personal = []; s.office = []; s.notes = []; s.habits = []; s.bills = [];
assert.ok(plan(s, now).once.some((o) => o.title === "Y" && o.body.startsWith("Renews tomorrow")), "renewal reminder the day before");
s.notif = { subs: false };
assert.ok(!plan(s, now).once.some((o) => o.title === "Y"), "subscription reminders can be switched off");
// the notification resync keys off this string, so it must be stable and ignore changes that schedule nothing
s = seed();
const sig = JSON.stringify(plan(s, now));
assert.equal(JSON.stringify(plan(structuredClone(s), now)), sig, "same state gives the same signature");
assert.ok(s.habits.length > 0, "seed has habits");
s.habits[0].done[todayKey()] = 1;
s.notes.forEach((n) => { n.body += " edited"; });
assert.equal(JSON.stringify(plan(s, now)), sig, "ticking a habit or editing a note does not change the schedule");
s.alarms.push({ id: 99, t: "23:59", label: "x", days: [], snooze: 5, on: 1 });
assert.notEqual(JSON.stringify(plan(s, now)), sig, "adding an alarm changes the schedule");
// documents and medicines
s = seed();
s.alarms = []; s.events = []; s.dates = []; s.personal = []; s.office = []; s.notes = []; s.habits = []; s.bills = []; s.subs = [];
s.docs = [{ id: 1, n: "Car insurance", kind: "Insurance", exp: dateKey(new Date(+now + 10 * 864e5)), lead: 7 }];
assert.ok(plan(s, now).once.some((o) => o.title === "Car insurance" && o.body === "Expires in 7 days"), "document reminder 7 days before expiry");
assert.ok(plan(s, now).once.some((o) => o.title === "Car insurance" && o.body === "Expires today"), "and on the day");
s.meds = [{ id: 2, n: "Vitamin D", dose: "1 tablet", t1: "08:00", t2: "", t3: "20:30", act: 1, taken: {} }];
const doses = () => plan(s, now).once.filter((o) => o.title === "Vitamin D");
const n0 = doses().length;
assert.ok(n0 >= 12 && n0 <= 14, "two dose times for about a week");
assert.ok(doses().every((o) => o.exact), "medicine doses ask for exact delivery");
s.meds[0].taken[dateKey(new Date(+now + 864e5))] = ["08:00"];
assert.equal(doses().length, n0 - 1, "a ticked dose does not ring");
s.meds[0].act = 0;
assert.equal(doses().length, 0, "a paused medicine schedules nothing");
s.notif = { docs: false };
assert.ok(!plan(s, now).once.some((o) => o.title === "Car insurance"), "document reminders can be switched off");
// a new install is empty, and sample data can be added and removed without touching the user's own entries
s = blank();
assert.equal(s.habits.length + s.spend.length + s.notes.length + s.proj.length + s.weight.length, 0, "no data by default");
assert.ok(!hasSample(s));
s.shop.push({ id: s.nid++, t: "Mine", q: "", x: 0 });
s.health.water["2020-01-01"] = 3;
addSample(s);
assert.ok(hasSample(s) && s.habits.length > 0 && s.proj.length > 0, "sample data fills the widgets");
const once = JSON.stringify(s.habits);
addSample(s);
assert.equal(JSON.stringify(s.habits.map((h) => h.n)), JSON.stringify(JSON.parse(once).map((h: { n: string }) => h.n)), "adding twice does not duplicate");
s.health.water[Object.keys(s.health.water).find((k) => s.sampleHealth!.water.includes(k))!] = 9; // sample day, changed by the user: still removed with the sample
const rent = s.bills.find((b) => b.n === "Rent")!;
s.spend.push({ id: s.nid++, k: "x", a: 1, l: "Rent", c: "Bills", d: "2020-01-01", bid: rent.id }); // a payment the user made on a sample bill
s.spend.push({ id: s.nid++, k: "x", a: 2, l: "Gym", c: "Bills", d: "2020-01-01", bid: 12345 }); // a payment on a bill the user has since deleted
removeSample(s);
assert.ok(!s.spend.some((x) => x.bid === rent.id), "a payment on a sample bill goes with the bill");
assert.ok(s.spend.some((x) => x.bid === 12345), "payment history of a deleted user bill stays");
assert.ok(!hasSample(s) && s.habits.length === 0 && s.spend.length === 1 && s.events.length === 0, "sample removed, including linked events; only the user payment is left");
assert.deepEqual(s.shop.map((x) => x.t), ["Mine"], "the user's own item stays");
assert.deepEqual(s.health.water, { "2020-01-01": 3 }, "only the user's water day stays");
// load(): what survives a start-up
s = blank();
s.shop.push({ id: 7, t: "Keep me", q: "", x: 0 });
const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
delete old.docs; delete old.trips; delete old.meds; delete old.subs; // a state saved before those lists existed
old.order = (old.order as string[]).filter((k) => k !== "docs").concat("gone"); // a widget the app no longer has
const back = load(JSON.stringify(old));
assert.deepEqual([back.docs, back.trips, back.meds, back.subs], [[], [], [], []], "missing lists start empty");
assert.deepEqual(back.shop.map((x) => x.t), ["Keep me"], "the user's data wins over the defaults");
assert.ok(!back.order.includes("gone" as never) && back.order.includes("docs") && back.on.docs, "old widgets dropped, new ones added and switched on");
assert.throws(() => load('{"habits":[]}'), "a wrong shape is rejected, not replaced");
assert.throws(() => load("{not json"), "unreadable text is rejected, not replaced");
assert.equal(load(null).habits.length, 0, "no saved data gives an empty app");
// reminders: one-time ones are scheduled well ahead, and alarms and event alerts are marked for the app to ring itself
s = blank();
s.docs = [{ id: 1, n: "Licence", kind: "Licence", exp: dateKey(new Date(+now + 10 * 864e5)), lead: 30, seen: dateKey(now) }];
assert.equal(plan(s, now).once.filter((o) => o.title === "Licence").length, 2, "added inside the lead window: one next-morning reminder plus expiry day");
const later = new Date(+now + 3 * 864e5);
assert.equal(plan(s, later).once.filter((o) => o.title === "Licence").length, 1, "the next-morning reminder is not repeated on later days");
s.docs = [{ id: 1, n: "Passport", kind: "Passport", exp: dateKey(new Date(+now + 80 * 864e5)), lead: 30 }];
assert.ok(plan(s, now).once.some((o) => o.title === "Passport"), "a reminder 50 days ahead is scheduled without opening the app first");
assert.ok(!plan(s, now).once.some((o) => o.title === "Passport" && (o.exact || o.ring)), "documents, bills and the like do not ask for exact delivery");
s.docs = [{ id: 1, n: "Passport", kind: "Passport", exp: dateKey(new Date(+now + 80 * 864e5)), lead: 30 }];
s.meds = ["A", "B", "C"].map((n, i) => ({ id: 10 + i, n, dose: "", t1: "08:00", t2: "14:00", t3: "20:00", act: 1 as const, taken: {} }));
s.bills = [{ id: 20, n: "Rent", a: 100, day: 1, paid: "" } as never];
s.docs = [{ id: 1, n: "Passport", kind: "Passport", exp: dateKey(new Date(+now + 25 * 864e5)), lead: 7 }];
assert.ok(plan(s, now).once.some((o) => o.title === "Passport"), "many medicines do not crowd out other reminders");
assert.ok(plan(s, now).once.length <= 60, "stays under the notification limit");
s.meds = []; s.bills = [];
s.docs = [{ id: 1, n: "Passport", kind: "Passport", exp: dateKey(new Date(+now + 80 * 864e5)), lead: 30 }];
s.alarms = [{ id: 2, t: "06:30", label: "Wake up", days: [], snooze: 5, on: 1 }];
assert.ok(plan(s, now).once.some((o) => o.title === "Wake up" && o.ring), "alarms are marked ring");
assert.ok(!plan(s, now).once.some((o) => o.title === "Passport" && o.ring), "other reminders are not");
// a one-time alarm that rang while the app was closed switches itself off, and is not set for tomorrow
const one = { id: 5, t: "07:00", label: "Once", days: [], snooze: 5, on: 1 as const };
s = blank(); s.alarms = [{ ...one }];
const d9 = new Date(2026, 5, 10, 9, 0, 0), d6 = new Date(2026, 5, 10, 6, 0, 0);
rollAlarms(s, d6);
assert.equal(s.alarms[0].on, 1, "armed before its time: stays on");
rollAlarms(s, d9);
assert.equal(s.alarms[0].on, 0, "its time passed while closed: switched off");
s.alarms = [{ ...one }]; rollAlarms(s, d9);
assert.equal(s.alarms[0].on, 1, "switched on after today's time: waits for tomorrow");
rollAlarms(s, new Date(2026, 5, 11, 9, 0, 0));
assert.equal(s.alarms[0].on, 0, "and is switched off once tomorrow's time has passed");
s.alarms = [{ ...one, days: [0] }]; rollAlarms(s, d9);
assert.equal(s.alarms[0].on, 1, "repeating alarms are left alone");
console.log("plan checks passed");
