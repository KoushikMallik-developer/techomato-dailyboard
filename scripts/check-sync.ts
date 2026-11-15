// Run: npx tsx scripts/check-sync.ts
import assert from "node:assert/strict";
import { decide, removeAccount, within } from "../src/lib/syncPlan";

assert.equal(decide(null, 0), "wait", "new phone, empty cloud: send nothing");
assert.equal(decide(5, 0), "load", "new phone, cloud has data: take it");
assert.equal(decide(0, 0), "wait", "both untouched: send nothing");
assert.equal(decide(null, 7), "push", "edited phone, empty cloud: upload");
assert.equal(decide(5, 7), "push", "phone newer: upload");
assert.equal(decide(9, 7), "load", "cloud newer: take it");
assert.equal(decide(7, 7), "wait", "same time: already in sync, upload nothing");
const later = (ms: number, v = 1) => new Promise<number>((ok) => setTimeout(() => ok(v), ms));
(async () => {
  assert.equal(await within(later(5), 100), 1, "fast work passes through");
  await assert.rejects(within(later(100), 10), { code: "network" }, "slow work gives up as a network error");
  await assert.rejects(within(Promise.reject({ code: "x" }), 100), { code: "x" }, "real errors are kept");
  const log: string[] = [];
  await removeAccount(async () => { log.push("backup"); }, async () => { log.push("login"); }, 50);
  assert.deepEqual(log, ["backup", "login"], "backup goes first, then the login");
  log.length = 0;
  await assert.rejects(removeAccount(() => new Promise(() => {}), async () => { log.push("login"); }, 10), { code: "network" }, "offline backup delete times out");
  await later(30);
  assert.deepEqual(log, [], "after a timeout the login stays");
  console.log("sync checks passed");
})();
