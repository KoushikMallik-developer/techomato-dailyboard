import { useState } from "react";
import { View } from "react-native";
import { Bar, BigNum, Card, Divider, Empty, Row, Screen, Seg, Stats, T } from "../../components/ui";
import { TopBar } from "../../components/TopBar";
import { allTasks, attention, lastDays, money, num, spentOn, streaks, water } from "../../lib/logic";
import { review } from "../../lib/review";
import { useStore } from "../../store/store";

export default function Insights() {
  const { state: s } = useStore();
  const [span, setSpan] = useState<"7" | "30">("7");
  const rv = review(s, Number(span));
  const d7 = lastDays(7, () => 0).map((d) => d.k), prev = lastDays(14, () => 0).map((d) => d.k).slice(0, 7), w = water(s), sp = spentOn(s);
  const hdone = s.habits.reduce((a, h) => a + d7.filter((k) => h.done[k]).length, 0), hrate = s.habits.length ? Math.round((hdone / (s.habits.length * 7)) * 100) : 0;
  const tdone = allTasks(s).filter((t) => t.x && (t.f ?? "") >= d7[0]).length;
  const sum = d7.reduce((a, k) => a + sp(k), 0), spp = prev.reduce((a, k) => a + sp(k), 0);
  const mo = s.journal.filter((e) => e.d >= d7[0] && e.mood), sl = d7.map((k) => s.health.sleep[k]).filter(Boolean);
  const hit = d7.filter((k) => w(k) >= s.waterTarget).length;
  const hb = s.habits.map((x) => ({ x, st: streaks(x.done) })).sort((a, b) => b.st.rate - a.st.rate), notes = attention(s);
  const tile = (v: string | number, l: string) => <View key={l} className="flex-1 rounded-md bg-panel2 p-3"><T size="xl" weight="700" tone="panelStrong">{v}</T><T size="sm" tone="panelText">{l}</T></View>;
  return (
    <Screen>
      <TopBar />
      <View className="gap-3 rounded-lg border border-panelLine bg-panel p-4">
        <View><T size="sm" tone="panelText">Last 7 days</T><T size="xxl" weight="700" tone="panelStrong">{hrate}% of habits done</T></View>
        <View className="flex-row gap-2">{tile(tdone, "Tasks done")}{tile(`${hit}/7`, "Water goal")}{tile(mo.length ? num(mo.reduce((a, e) => a + e.mood, 0) / mo.length) : "–", "Avg mood")}</View>
      </View>
      <Card title="Review" small={`last ${span} days vs the ${span} before`}>
        <Seg value={span} onChange={setSpan} options={[["7", "Week"], ["30", "Month"]]} />
        <View className="mt-2">
          {rv.metrics.map((m) => (
            <View key={m.label} className="relative min-h-hit flex-row items-center justify-between gap-3 py-2.5">
              <Divider />
              <View className="flex-1"><T weight="500">{m.label}</T>{m.delta ? <T size="sm" tone={m.good === true ? "ok" : m.good === false ? "bad" : "muted"}>{m.delta}</T> : null}</View>
              <T weight="700">{m.value}</T>
            </View>
          ))}
        </View>
      </Card>
      <Card title="Focus next">
        {rv.focus.length ? rv.focus.map((f, i) => <Row key={i} title={f} />) : <Empty text="Nothing stands out. Keep going." />}
      </Card>
      <Card title="Spending" small="vs previous 7 days">
        <View className="flex-row justify-between"><BigNum label="this week" value={money(s, sum)} /><BigNum label="last week" value={money(s, spp)} /></View>
        <T tone="muted" size="md" className="mt-3">{spp ? (sum <= spp ? "Down " : "Up ") + Math.abs(Math.round(((sum - spp) / spp) * 100)) + "% compared with last week." : "Not enough history to compare."}</T>
      </Card>
      <Card title="Health" small="7-day average">
        <Stats items={[[num(d7.reduce((a, k) => a + w(k), 0) / 7), "Glasses a day"], [sl.length ? num(sl.reduce((a, b) => a + b, 0) / sl.length) + " h" : "–", "Sleep"], [`${hit}/7`, "Water goal hit"]]} />
      </Card>
      <Card title="Habit ranking" small="30-day rate">
        {hb.length ? hb.map((r) => (
          <View key={r.x.id} className="flex-row items-center gap-3 py-1.5">
            <T size="md" className="w-1/3">{r.x.n}</T><View className="flex-1"><Bar pct={r.st.rate} /></View><T size="md">{r.st.rate}%</T>
          </View>
        )) : <Empty text="No habits yet." />}
      </Card>
      <Card title="Things to look at">
        {notes.length ? notes.map((n, i) => <Row key={i} title={n} />) : <Empty text="Nothing needs attention." />}
      </Card>
    </Screen>
  );
}
