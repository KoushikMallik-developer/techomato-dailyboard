import { ComponentRef, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Card, Empty, LinkBtn, Note, Stats, T } from "../components/ui";
import { ago, dateKey, todayKey } from "../lib/date";
import { dl, streaks } from "../lib/logic";
import { useStore } from "../store/store";
import { useUi } from "../store/ui";

function useToggle() {
  const { update } = useStore();
  return (id: number, k: string) => update((s) => { const x = s.habits.find((y) => y.id === id); if (!x) return; if (x.done[k]) delete x.done[k]; else x.done[k] = 1; });
}

function Dot({ on, today, label, onPress }: { on: boolean; today?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}
      className={`h-[22px] w-[22px] rounded-full ${today ? "border-2" : "border-[1.5px]"} ${on ? "border-brand bg-brand" : today ? "border-ink" : "border-line"}`} />
  );
}

export function HabitsCard() {
  const { state } = useStore();
  const toggle = useToggle();
  const t = todayKey();
  return (
    <Card title="Habits" small={`${state.habits.filter((h) => h.done[t]).length}/${state.habits.length} today`}>
      {state.habits.length === 0 ? <Empty text="No habits yet." /> : state.habits.map((h) => (
        <View key={h.id} className="flex-row justify-between items-center py-2 gap-3">
          <View className="flex-1">
            <T weight="500">{h.n}</T>
            <T size="sm" tone="muted">{streaks(h.done).cur}-day streak</T>
          </View>
          <View className="flex-row gap-1.5">
            {[6, 5, 4, 3, 2, 1, 0].map((j) => { const k = dateKey(ago(j)); return <Dot key={k} on={!!h.done[k]} today={j === 0} label={`${h.n}, ${dl(k)}, ${h.done[k] ? "done" : "not done"}`} onPress={() => toggle(h.id, k)} />; })}
          </View>
        </View>
      ))}
    </Card>
  );
}

/** 12 weeks, Monday to Sunday, one column per week. */
function Heat({ id, name, done }: { id: number; name: string; done: Record<string, 1> }) {
  const toggle = useToggle();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null), placed = useRef(false); // open at the latest week once, not on every redraw
  const cells: (string | null)[] = Array((ago(83).getDay() + 6) % 7).fill(null);
  for (let j = 83; j >= 0; j--) cells.push(dateKey(ago(j)));
  while (cells.length % 7) cells.push(null);
  const cols: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  const today = todayKey();
  return (
    // 28px cells (above the 24px WCAG minimum) in a strip that scrolls sideways, starting at the latest week
    <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={ref} onContentSizeChange={() => { if (!placed.current) { placed.current = true; ref.current?.scrollToEnd({ animated: false }); } }} accessibilityLabel="Last 12 weeks, Monday to Sunday">
      <View className="flex-row gap-[3px]">
      {cols.map((col, ci) => (
        <View key={ci} className="w-7 gap-[3px]">
          {col.map((k, ri) => k ? (
            <Pressable key={k} onPress={() => toggle(id, k)} accessibilityRole="checkbox" accessibilityState={{ checked: !!done[k] }} accessibilityLabel={`${name}, ${dl(k)}, ${done[k] ? "done" : "not done"}`}
              className={`h-7 w-7 rounded-xs ${done[k] ? "bg-brand" : "bg-soft"} ${k === today ? "border-2 border-ink" : ""}`} />
          ) : <View key={"b" + ri} className="h-7 w-7" />)}
        </View>
      ))}
      </View>
    </ScrollView>
  );
}

export function HabitsPage() {
  const { state } = useStore();
  const { openSheet } = useUi();
  const hs = state.habits, st = hs.map((h) => streaks(h.done)), t = todayKey();
  const avg = hs.length ? Math.round(st.reduce((a, s) => a + s.rate, 0) / hs.length) : 0;
  return (
    <>
      <Stats items={[[`${hs.filter((h) => h.done[t]).length}/${hs.length}`, "Done today"], [Math.max(0, ...st.map((s) => s.cur)), "Longest streak"], [`${avg}%`, "30-day rate"]]} />
      {hs.length === 0 ? <Card><Empty text="No habits yet. Tap Add." /></Card> : null}
      {hs.map((h, i) => (
        <Card key={h.id}>
          <View className="flex-row justify-between gap-3 mb-3">
            <View className="flex-1">
              <T weight="600">{h.n}</T>
              <T size="sm" tone="muted">Streak {st[i].cur} · Best {st[i].best} · 30-day {st[i].rate}%{h.rt ? " · Reminder " + h.rt : ""}</T>
            </View>
            <LinkBtn label="Edit" onPress={() => openSheet("habit", "", h.id)} />
          </View>
          <Heat id={h.id} name={h.n} done={h.done} />
          <View className="mt-2"><Note>Last 12 weeks. Tap a square to fix a past day.</Note></View>
        </Card>
      ))}
    </>
  );
}
