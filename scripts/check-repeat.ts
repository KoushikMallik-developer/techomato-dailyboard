// Run: npx tsx scripts/check-repeat.ts  (plain asserts, no test framework in this project yet)
import assert from "node:assert/strict";
import { addRep, todayKey } from "../src/lib/date";
import { rollEvents, setTaskDone } from "../src/lib/logic";
import { seed } from "../src/store/seed";
import { Task } from "../src/store/types";

assert.equal(addRep("2026-01-31", "m"), "2026-02-28");
assert.equal(addRep("2028-02-29", "y"), "2029-02-28");
assert.equal(addRep("2026-12-31", "d"), "2027-01-01");
assert.equal(addRep("2026-03-01", "w"), "2026-03-08");

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
console.log("repeat checks passed");
