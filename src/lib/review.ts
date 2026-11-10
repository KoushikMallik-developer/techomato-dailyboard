// Weekly and monthly review: this period against the one before it, plus a few things worth acting on.
import { State } from "../store/types";
import { ago, dateKey, todayKey } from "./date";
import { allTasks, lmin, money, monthSum, num, spentOn, water } from "./logic";

export type Metric = { label: string; value: string; delta: string; good: boolean | null }; // good: null = no change or no basis to compare

const keys = (from: number, n: number) => Array.from({ length: n }, (_, i) => dateKey(ago(from + i)));
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0);

export function review(s: State, n: number) {
  const cur = keys(0, n), prev = keys(n, n), curSet = new Set(cur), prevSet = new Set(prev);
  const sp = spentOn(s), w = water(s), lm = lmin(s);
  const rate = (ks: string[]) => (s.habits.length ? Math.round((sum(s.habits.map((h) => ks.filter((k) => h.done[k]).length)) / (s.habits.length * ks.length)) * 100) : 0);
  const tasks = (set: Set<string>) => allTasks(s).filter((t) => t.x && t.f && set.has(t.f)).length;
  const mood = (set: Set<string>) => avg(s.journal.filter((e) => set.has(e.d) && e.mood).map((e) => e.mood));
  const sleep = (ks: string[]) => avg(ks.map((k) => s.health.sleep[k]).filter(Boolean));
  const hit = (ks: string[]) => ks.filter((k) => w(k) >= s.waterTarget).length;

  const m = (label: string, a: number, b: number, fmt: (x: number) => string, unit: string, higherIsBetter = true, hasBasis = true): Metric => {
    const d = a - b;
    return { label, value: fmt(a), delta: !hasBasis ? "" : d === 0 ? "no change" : `${d > 0 ? "up" : "down"} ${fmt(Math.abs(d))}${unit}`, good: !hasBasis || d === 0 ? null : (d > 0) === higherIsBetter };
  };
  const spCur = sum(cur.map(sp)), spPrev = sum(prev.map(sp));
  const metrics: Metric[] = [
    m("Habits done", rate(cur), rate(prev), (x) => x + "%", " pts", true, s.habits.length > 0),
    m("Tasks finished", tasks(curSet), tasks(prevSet), String, ""),
    m("Spent", spCur, spPrev, (x) => money(s, x), "", false, spPrev > 0),
    m("Learning", sum(cur.map(lm)), sum(prev.map(lm)), (x) => x + " min", "", true, s.learn.length > 0),
    m("Water goal met", hit(cur), hit(prev), (x) => `${x}/${n} days`, ""),
  ];
  if (sleep(cur)) metrics.push(m("Average sleep", sleep(cur), sleep(prev), (x) => num(x) + " h", "", true, sleep(prev) > 0));
  if (mood(curSet)) metrics.push(m("Average mood", mood(curSet), mood(prevSet), (x) => num(x) + "/5", "", true, mood(prevSet) > 0));

  const focus: string[] = [], today = todayKey();
  const weakest = s.habits.map((h) => ({ h, d: cur.filter((k) => h.done[k]).length })).sort((a, b) => a.d - b.d)[0];
  if (weakest && weakest.d / n < 0.5) focus.push(`${weakest.h.n}: done ${weakest.d} of ${n} days. Try a fixed time or a reminder.`);
  if (spPrev > 0 && spCur > spPrev * 1.2) focus.push(`Spending is up ${Math.round(((spCur - spPrev) / spPrev) * 100)}% on the previous period.`);
  if (s.budget > 0 && monthSum(s, "x") > s.budget) focus.push(`This month's spending is over your ${money(s, s.budget)} budget.`);
  const late = allTasks(s).filter((t) => !t.x && t.due && t.due < today).length;
  if (late) focus.push(`${late} overdue task${late > 1 ? "s" : ""}. Finish them or move the dates.`);
  if (sleep(cur) && sleep(cur) < 7) focus.push(`Sleep averaged ${num(sleep(cur))} h. Aim for 7 or more.`);
  if (hit(cur) < n / 2) focus.push(`Water goal met on ${hit(cur)} of ${n} days.`);
  if (!s.journal.some((e) => curSet.has(e.d))) focus.push("No journal entries in this period.");
  return { metrics, focus: focus.slice(0, 4) };
}
