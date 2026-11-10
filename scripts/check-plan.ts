// Run: npx tsx scripts/check-plan.ts  (plain asserts: the review, the notification plan, budgets and subscriptions)
import assert from "node:assert/strict";
import { dateKey, todayKey } from "../src/lib/date";
import { budgetRows } from "../src/lib/logic";
import { perMonth, perYear, rollSubs } from "../src/lib/subs";
import { plan } from "../src/lib/plan";
import { review } from "../src/lib/review";
import { seed } from "../src/store/seed";

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
console.log("plan checks passed");
