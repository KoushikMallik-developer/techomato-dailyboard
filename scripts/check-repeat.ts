// Run: npx tsx scripts/check-repeat.ts  (plain asserts, no test framework in this project yet)
import assert from "node:assert/strict";
import { addRep, dateKey, occursOn, todayKey } from "../src/lib/date";
import { isLate, layout, streaks, ended, eventsBetween, eventsOn, rollEvents, setTaskDone } from "../src/lib/logic";
import { seed } from "../src/store/seed";
import { Task } from "../src/store/types";

assert.equal(addRep("2026-01-31", "m"), "2026-02-28");
assert.equal(addRep("2028-02-29", "y"), "2029-02-28");
assert.equal(addRep("2026-12-31", "d"), "2027-01-01");
assert.equal(addRep("2026-03-01", "w"), "2026-03-08");
// chosen weekdays: 0 = Sunday ... 6 = Saturday. 2026-03-01 is a Sunday.
assert.equal(addRep("2026-03-01", "D135"), "2026-03-02", "Sunday to Monday");
assert.equal(addRep("2026-03-02", "D135"), "2026-03-04", "Monday to Wednesday");
assert.equal(addRep("2026-03-06", "D135"), "2026-03-09", "Friday wraps to next Monday");
assert.equal(addRep("2026-03-02", "D1"), "2026-03-09", "a single day repeats weekly");
assert.equal(addRep("2026-03-02", "D"), "2026-03-03", "no day chosen counts as every day, never stalls");

const s = seed();
const today = todayKey();
const t: Task = { id: 9001, t: "Pay rent", p: "m", due: "2020-01-06", c: today, x: 0, f: null, cal: "", time: "", rep: "w" };
s.personal.unshift(t);
setTaskDone(s, t, 1);
const next = s.personal.find((x) => x.id === t.nx)!;
assert.ok(next && !next.x && next.due > today && next.rep === "w", "next copy is open, repeating and due after today");
assert.equal(s.personal.filter((x) => x.t === "Pay rent").length, 2);
setTaskDone(s, t, 0); // reopening drops the untouched copy
assert.equal(s.personal.filter((x) => x.t === "Pay rent").length, 1);
assert.equal(t.nx, undefined);

s.events.push({ id: 9002, t: "Gym", d: "2020-01-01", time: "", cat: "Personal", rep: "w" }, { id: 9003, t: "Once", d: "2020-01-01", time: "", cat: "Personal" });
rollEvents(s);
const g = s.events.find((e) => e.id === 9002)!;
assert.ok(g.d >= today && g.d.slice(0, 4) >= today.slice(0, 4), "repeating event rolled to today or later");
assert.equal(s.events.find((e) => e.id === 9003)!.d, "2020-01-01");
// a repeating event shows on every day it repeats, not only the next one
const cs = seed();
cs.events.push({ id: 9100, t: "Class", d: "2026-03-02", time: "18:00", cat: "Personal", rep: "D135" }, { id: 9101, t: "Standup", d: "2026-03-02", time: "", cat: "Office", rep: "d" }, { id: 9102, t: "Sync", d: "2026-03-02", time: "", cat: "Office", rep: "w" });
const names = (d: string) => eventsOn(cs, d).map((e) => e.t).sort().join(",");
assert.equal(names("2026-03-02"), "Class,Standup,Sync", "the day it sits on, once");
assert.equal(names("2026-03-03"), "Standup", "Tuesday: only the daily one");
assert.equal(names("2026-03-04"), "Class,Standup", "Wednesday: chosen day and daily");
assert.equal(names("2026-03-09"), "Class,Standup,Sync", "next Monday: weekly again");
assert.equal(names("2026-03-01"), "", "never before its date");
assert.equal(eventsOn(cs, "2026-03-04").find((e) => e.t === "Class")!.d, "2026-03-04", "the copy carries the day it is shown on");
assert.equal(eventsBetween(cs, "2026-03-02", 7).filter((e) => e.t === "Class").length, 3, "Mon, Wed, Fri in one week");
// an event that is over drops out of Today's Agenda; all-day events stay
const ev1 = { id: 1, t: "x", d: "2026-03-02", time: "10:00", cat: "Personal", dur: 30 };
assert.equal(ended(ev1, new Date(2026, 2, 2, 10, 29)), false, "still running");
assert.equal(ended(ev1, new Date(2026, 2, 2, 10, 30)), true, "over at its end");
assert.equal(ended({ ...ev1, dur: undefined }, new Date(2026, 2, 2, 10, 59)), false, "no length means one hour");
assert.equal(ended({ ...ev1, time: "" }, new Date(2026, 2, 2, 23, 59)), false, "all-day never ends early");
// a task is overdue after its time, or after its day when it has no time
const tk = { id: 1, t: "x", p: "m", due: "2026-03-02", c: "", x: 0, f: null, cal: "1", time: "10:00" } as never;
assert.equal(isLate(tk, new Date(2026, 2, 2, 9, 59)), false, "before its time");
assert.equal(isLate(tk, new Date(2026, 2, 2, 10, 0)), true, "at its time");
assert.equal(isLate({ ...(tk as object), cal: "", time: "" } as never, new Date(2026, 2, 2, 23, 59)), false, "no time: overdue only next day");
assert.equal(isLate({ ...(tk as object), cal: "", time: "" } as never, new Date(2026, 2, 3, 0, 1)), true, "next day");
assert.equal(ended({ ...ev1, time: "23:30", dur: 90 }, new Date(2026, 2, 2, 23, 59)), false, "runs past midnight");
assert.equal(ended({ ...ev1, time: "23:30", dur: 90 }, new Date(2026, 2, 3, 1, 0)), true, "over after midnight");
assert.equal(ended({ ...ev1, tid: 5 }, new Date(2026, 2, 2, 12, 0)), false, "a task event has no end time");
assert.equal(addRep("2026-03-02", "D9"), "2026-03-03", "a bad weekday list falls back to every day instead of looping forever");
assert.equal(occursOn("D9", "2026-03-02", "2026-03-05"), true, "a bad weekday list repeats every day, the same as addRep");
// overlapping events share the width; one that starts after another ends reuses its lane
const L3 = layout([{ ...ev1, id: 1, time: "09:00", dur: 60 }, { ...ev1, id: 2, time: "09:30", dur: 60 }, { ...ev1, id: 3, time: "10:00", dur: 60 }]);
assert.deepEqual(L3.map((b) => [b.e.id, b.lane, b.n]), [[1, 0, 2], [2, 1, 2], [3, 0, 2]], "three overlapping events: two lanes");
assert.equal(layout([{ ...ev1, id: 4, time: "09:00", dur: 60 }, { ...ev1, id: 5, time: "10:00", dur: 60 }]).every((b) => b.n === 1), true, "back to back events do not share a lane");
const run500 = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [dateKey(new Date(Date.now() - i * 864e5)), 1])) as Record<string, 1>;
assert.equal(streaks(run500).best >= streaks(run500).cur, true, "best streak is never below the current one");
console.log("repeat checks passed");
