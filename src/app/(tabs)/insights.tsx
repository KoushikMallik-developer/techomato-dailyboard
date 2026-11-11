import { useState } from "react";
import { View } from "react-native";
import { Columns, Donut, Trend } from "../../components/charts";
import { TopBar } from "../../components/TopBar";
import { Bar, BigNum, Card, Divider, Empty, Row, Screen, Seg, T } from "../../components/ui";
import { fromKey } from "../../lib/date";
import { allTasks, attention, lastDays, monthSum, money, num, spentOn, streaks, water } from "../../lib/logic";
import { review } from "../../lib/review";
import { useStore } from "../../store/store";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"], DAY_NAME = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export default function Insights() {
  const { state: s } = useStore();
  const [span, setSpan] = useState<"7" | "30">("7");
  const n = Number(span), rv = review(s, n);
  const days = lastDays(n, () => 0), keys = days.map((d) => d.k), prev = lastDays(2 * n, () => 0).slice(0, n).map((d) => d.k), set = new Set(keys);
  const sp = spentOn(s), w = water(s), H = s.habits.length;

  // habits: share of habits done each day, and which weekday is strongest over the last 8 weeks
  const pct = (k: string) => (H ? Math.round((s.habits.filter((h) => h.done[k]).length / H) * 100) : 0);
  const rate = H ? Math.round(sum(keys.map(pct)) / n) : 0;
  const wk = lastDays(56, () => 0), byDay = DAYS.map((_, d) => { const ks = wk.map((p) => p.k).filter((k) => (fromKey(k).getDay() + 6) % 7 === d); return ks.length ? Math.round(sum(ks.map(pct)) / ks.length) : 0; });
  const best = Math.max(...byDay), bestDay = byDay.indexOf(best);
  const ranking = s.habits.map((x) => ({ x, st: streaks(x.done) })).sort((a, b) => b.st.rate - a.st.rate);

  // money
  const total = sum(keys.map(sp)), before = sum(prev.map(sp));
  const cats = Object.entries(s.spend.filter((e) => e.k !== "i" && set.has(e.d)).reduce<Record<string, number>>((o, e) => ({ ...o, [e.c]: (o[e.c] || 0) + e.a }), {})).sort((a, b) => b[1] - a[1]);
  const monthSpent = monthSum(s, "x");

  // health and mood
  const hit = keys.filter((k) => w(k) >= s.waterTarget).length;
  const sleep = days.map((d) => s.health.sleep[d.k] || null), slept = sleep.filter((v): v is number => v != null);
  const mood = days.map((d) => { const m = s.journal.filter((e) => e.d === d.k && e.mood).map((e) => e.mood); return m.length ? sum(m) / m.length : null; }), moods = mood.filter((v): v is number => v != null);
  const kg = s.weight.slice().sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-30).map((x) => x.v);
  const done = allTasks(s).filter((t) => t.x && t.f && set.has(t.f));
  const notes = attention(s);

  const tile = (v: string | number, l: string) => <View key={l} className="min-w-0 flex-1 rounded-md bg-panel2 p-3"><T size="xl" weight="700" tone="panelStrong">{v}</T><T size="sm" tone="panelText">{l}</T></View>;
  const cap = (a: string, b: string) => <View className="mb-1.5 flex-row justify-between"><T size="sm" tone="muted">{a}</T><T size="sm" tone="muted">{b}</T></View>;
  return (
    <Screen>
      <TopBar />
      <Seg value={span} onChange={setSpan} options={[["7", "Last 7 days"], ["30", "Last 30 days"]]} />
      <View className="gap-3 rounded-lg border border-panelLine bg-panel p-4">
        <View><T size="sm" tone="panelText">Last {n} days</T><T size="xxl" weight="700" tone="panelStrong">{H ? `${rate}% of habits done` : "Your summary"}</T></View>
        <View className="flex-row gap-2">{tile(done.length, "Tasks done")}{tile(`${hit}/${n}`, "Water goal")}{tile(moods.length ? num(sum(moods) / moods.length) : "–", "Avg mood")}</View>
      </View>

      <Card title="Focus next">
        {rv.focus.length ? rv.focus.map((f, i) => <Row key={i} title={f} />) : <Empty text="Nothing stands out. Keep going." />}
      </Card>

      <Card title="Habits" small="share of habits done each day">
        {H ? (
          <View className="gap-4">
            <Columns data={days.map((d, i) => ({ l: d.l, v: pct(d.k), hi: i === n - 1 }))} label="Habits done per day, percent" top={100} fmt={(v) => v + "%"} />
            <View>
              {cap("By weekday, last 8 weeks", best > 0 ? `Strongest: ${DAY_NAME[bestDay]}` : "")}
              <Columns data={byDay.map((v, i) => ({ l: DAYS[i], v, hi: i === bestDay && best > 0 }))} label="Habits done by weekday, percent" top={100} fmt={(v) => v + "%"} height={72} />
            </View>
            <View>
              {cap("Ranking", "30-day rate")}
              {ranking.map((r) => (
                <View key={r.x.id} className="flex-row items-center gap-3 py-1.5">
                  <T size="md" className="w-1/3" numberOfLines={1}>{r.x.n}</T><View className="flex-1"><Bar pct={r.st.rate} /></View><T size="md" className="w-10 text-right">{r.st.rate}%</T>
                </View>
              ))}
            </View>
          </View>
        ) : <Empty text="Add a habit to see how it goes." />}
      </Card>

      <Card title="Money" small={`last ${n} days`}>
        <View className="gap-4">
          <View className="flex-row justify-between"><BigNum label="spent" value={money(s, total)} /><BigNum label={`previous ${n} days`} value={money(s, before)} /></View>
          {before > 0 ? <T tone={total <= before ? "ok" : "bad"} size="md">{total <= before ? "Down " : "Up "}{Math.abs(Math.round(((total - before) / before) * 100))}% on the previous {n} days.</T> : null}
          {total > 0 ? (
            <>
              <Columns data={days.map((d, i) => ({ l: d.l, v: sp(d.k), hi: i === n - 1 }))} label="Spending per day" fmt={(v) => money(s, v)} />
              <Donut label="Spending by category" parts={cats.map(([c, v]) => ({ label: c, v, text: money(s, v) }))} />
            </>
          ) : <Empty text="No spending in this period." />}
          {s.budget > 0 ? <View><Bar pct={(monthSpent / s.budget) * 100} tone={monthSpent > s.budget ? "bad" : monthSpent > s.budget * 0.8 ? "warn" : undefined} /><T size="sm" tone="muted" className="mt-1.5">{money(s, monthSpent)} of your {money(s, s.budget)} monthly budget</T></View> : null}
        </View>
      </Card>

      <Card title="Health" small={`last ${n} days`}>
        <View className="gap-4">
          <View>{cap("Water, glasses a day", `goal ${s.waterTarget}`)}<Columns data={days.map((d, i) => ({ l: d.l, v: w(d.k), hi: i === n - 1 }))} target={s.waterTarget} label="Water per day" /></View>
          {slept.length > 1 ? <View>{cap("Sleep, hours", `${num(Math.min(...slept))} to ${num(Math.max(...slept))} h, average ${num(sum(slept) / slept.length)} h`)}<Trend values={sleep} label="Sleep per night" fmt={(v) => num(v) + " h"} /></View> : <Empty text="Log sleep on two nights to see a trend." />}
          {kg.length > 1 ? <View>{cap("Weight, kg", `now ${num(kg[kg.length - 1])}, ${kg[kg.length - 1] <= kg[0] ? "down" : "up"} ${num(Math.abs(kg[kg.length - 1] - kg[0]))} since first entry shown`)}<Trend values={kg} label="Weight" fmt={(v) => num(v) + " kg"} /></View> : null}
        </View>
      </Card>

      <Card title="Mood" small="from your journal">
        {moods.length > 1 ? <View>{cap("1 rough, 5 great", `average ${num(sum(moods) / moods.length)}`)}<Trend values={mood} min={1} max={5} label="Mood per day" fmt={num} /></View> : <Empty text="Write journal entries on two days to see your mood trend." />}
      </Card>

      <Card title="Tasks finished" small={`${done.length} in ${n} days`}>
        {done.length ? <Columns data={days.map((d, i) => ({ l: d.l, v: done.filter((t) => t.f === d.k).length, hi: i === n - 1 }))} label="Tasks finished per day" /> : <Empty text="No finished tasks in this period." />}
      </Card>

      <Card title="Review" small={`last ${n} days vs the ${n} before`}>
        {rv.metrics.map((m) => (
          <View key={m.label} className="relative min-h-hit flex-row items-center justify-between gap-3 py-2.5">
            <Divider />
            <View className="flex-1"><T weight="500">{m.label}</T>{m.delta ? <T size="sm" tone={m.good === true ? "ok" : m.good === false ? "bad" : "muted"}>{m.delta}</T> : null}</View>
            <T weight="700">{m.value}</T>
          </View>
        ))}
      </Card>

      <Card title="Things to look at">
        {notes.length ? notes.map((x, i) => <Row key={i} title={x} />) : <Empty text="Nothing needs attention." />}
      </Card>
    </Screen>
  );
}
