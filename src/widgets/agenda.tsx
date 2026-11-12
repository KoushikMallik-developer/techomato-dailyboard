import { ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, G } from "react-native-svg";
import { Card, LinkBtn, Row, T, Tag } from "../components/ui";
import { todayKey } from "../lib/date";
import { useNow } from "../lib/useNow";
import { allTasks, billState, dateLabel, daysTo, dueTxt, ended, eventsOn, evSort, inTxt, money, nextOcc, ntitle, score, sortOpen, water } from "../lib/logic";
import { useStore } from "../store/store";
import { DUR, useMotion } from "../theme/motion";
import { useTheme } from "../theme/ThemeProvider";
import { EvRow } from "./calendar";
import { useToggle } from "./habits";
import { useDoses } from "./more";
import { go, CheckRow, PrioTag } from "./shared";
import { useOpenNote } from "./notes";
import { useOpenProject } from "./projects";
import { useTaskToggle } from "./tasks";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

export function Hero() {
  const { c } = useTheme();
  const { state } = useStore();
  const t = todayKey(), sc = score(state), R = 34, C = 2 * Math.PI * R;
  const ok = useMotion(), prog = useSharedValue(0);
  useEffect(() => { prog.value = ok ? withTiming(sc / 100, { duration: DUR.slow + 400, easing: Easing.out(Easing.cubic) }) : sc / 100; }, [sc, ok, prog]);
  const ring = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - prog.value) }));
  const due = allTasks(state).filter((x) => !x.x && x.due && x.due <= t).length;
  const stat = (v: string | number, l: string) => <View key={l} className="min-w-0 flex-1 rounded-md bg-panel2 px-3 py-2.5"><T size="lg" weight="700" tone="panelStrong" className="tracking-tight">{v}</T><T size="xs" tone="panelText">{l}</T></View>;
  return (
    <View className="gap-4 rounded-lg bg-panel p-[18px]">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <T size="md" tone="panelText">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</T>
          <T size="xl" weight="700" tone="panelStrong" className="mt-0.5 tracking-tight">{greeting()}{state.name ? ", " + state.name : ""}</T>
        </View>
        <View accessibilityRole="image" accessibilityLabel={`Life score ${sc} out of 100`} className="h-[84px] w-[84px] items-center justify-center">
          <Svg width={84} height={84} viewBox="0 0 84 84" className="absolute">
            <G transform="rotate(-90 42 42)">
              <Circle cx={42} cy={42} r={R} fill="none" stroke={c.panelLine} strokeWidth={8} />
              <AnimatedCircle cx={42} cy={42} r={R} fill="none" stroke={c.ring} strokeWidth={8} strokeLinecap="round" strokeDasharray={C} animatedProps={ring} />
            </G>
          </Svg>
          <T size="xl" weight="700" tone="panelStrong">{sc}</T>
        </View>
      </View>
      <View className="flex-row gap-2">
        {stat(`${state.habits.filter((x) => x.done[t]).length}/${state.habits.length}`, "Habits")}
        {stat(due, "Tasks due")}
        {stat(`${water(state)(t)}/${state.waterTarget}`, "Water")}
      </View>
    </View>
  );
}

/** Everything that needs attention today, pulled from every widget. */
export function Agenda() {
  const now = useNow();
  const { state } = useStore();
  const toggle = useTaskToggle(), toggleHabit = useToggle(), { slots, toggle: takeDose } = useDoses();
  const openNote = useOpenNote(), openProject = useOpenProject();
  const [all, setAll] = useState(false);
  const t = todayKey();
  const ev = eventsOn(state, t).filter((e) => !e.tid && !ended(e, now)).sort(evSort);
  const tk = (["personal", "office"] as const).flatMap((k) => state[k].map((x) => ({ k, x }))).filter((r) => !r.x.x && r.x.due && r.x.due <= t).sort((a, b) => sortOpen(a.x, b.x));
  const bl = state.bills.filter((b) => billState(b).s <= 1);
  const rows: { key: string; node: ReactNode }[] = [];
  const add = (key: string, node: ReactNode) => rows.push({ key, node });
  ev.forEach((e) => add("e" + e.id, <EvRow e={e} />));
  tk.forEach(({ k, x }) => { const d = dueTxt(x); add("t" + x.id, <CheckRow on={false} onToggle={() => toggle(k, x.id)} label={`Mark done: ${x.t}`} title={x.t} sub={d.text} subTone={d.late ? "bad" : "muted"} tag={<PrioTag p={x.p} />} />); });
  state.habits.filter((h) => !h.done[t]).forEach((h) => add("h" + h.id, <CheckRow on={false} onToggle={() => toggleHabit(h.id, t)} label={`Mark done: ${h.n}`} title={h.n} sub={h.rt ? "Habit · " + h.rt : "Habit"} />));
  slots.filter((x) => !x.on).forEach((x) => add("m" + x.m.id + x.t, <CheckRow on={false} onToggle={() => takeDose(x.m.id, x.t)} label={`Taken: ${x.m.n} at ${x.t}`} title={x.m.dose ? `${x.m.n} · ${x.m.dose}` : x.m.n} sub={"Medicine · " + x.t} />));
  const glasses = water(state)(t);
  if (glasses < state.waterTarget) add("water", <Row title="Water" sub={`${glasses}/${state.waterTarget} glasses so far`} right={<Tag label="Today" tone="b" />} onPress={() => go("health")} />);
  state.goals.filter((g) => g.due === t && g.cur < g.target).forEach((g) => add("g" + g.id, <Row title={"Goal: " + g.t} sub={`${g.cur}/${g.target} ${g.unit}`} right={<Tag label="Due" tone="b" />} onPress={() => go("goals")} />));
  state.subs.filter((x) => x.act && x.next === t).forEach((x) => add("s" + x.id, <Row title={x.n + " renews"} sub={money(state, x.a)} right={<Tag label="Today" tone="m" />} onPress={() => go("subs")} />));
  state.docs.filter((d) => d.exp === t).forEach((d) => add("c" + d.id, <Row title={d.n + " expires"} sub={d.kind} right={<Tag label="Today" tone="h" />} onPress={() => go("docs")} />));
  state.trips.filter((x) => x.from === t).forEach((x) => add("r" + x.id, <Row title={"Trip starts: " + x.n} sub={`${x.items.filter((i) => i.x).length}/${x.items.length} packed`} right={<Tag label="Today" tone="b" />} onPress={() => go("trips")} />));
  state.learn.filter((l) => l.due === t && l.st === "active").forEach((l) => add("l" + l.id, <Row title={"Finish: " + l.t} right={<Tag label="Target" tone="b" />} onPress={() => go("learn")} />));
  state.proj.filter((x) => x.st !== "done").forEach((x) => {
    const row = (k: string, l: string, title: string, tag: string) => add("p" + x.id + k, <Row title={`${l}: ${title}`} sub={x.t} right={<Tag label={tag} tone={tag === "Overdue" ? "h" : "b"} />} onPress={() => openProject(x.id)} />);
    if (x.due === t) row("t", "Target", x.t, "Today");
    x.ms.forEach((m) => { if (!m.x && m.due === t) row("m" + m.id, "Milestone", m.t, "Today"); });
    x.tasks.forEach((k) => { if (!k.x && k.due === t) row("k" + k.id, "Task", k.t, "Today"); else if (!k.x && k.due && k.due < t && x.st === "active") row("k" + k.id, "Task", k.t, "Overdue"); });
  });
  state.notes.filter((n) => n.rem === t && n.st === "on").forEach((n) => add("n" + n.id, <Row title={"Note: " + ntitle(n)} right={<Tag label="Reminder" tone="b" />} onPress={() => openNote(n.id)} />));
  state.watch.filter((w) => w.plan === t && w.st !== "done").forEach((w) => add("w" + w.id, <Row title={"Watch: " + w.t} sub={(w.type === "Series" ? "Web series" : "Movie") + (w.plat ? " · " + w.plat : "")} right={<Tag label="Tonight" tone="b" />} onPress={() => go("watch")} />));
  state.dates.filter((x) => daysTo(x) <= x.rem).sort((a, b) => daysTo(a) - daysTo(b)).forEach((x) => { const n = daysTo(x); add("d" + x.id, <Row title={x.n} sub={`${x.kind === "Other" ? "Yearly date" : x.kind} · ${dateLabel(x, Number(nextOcc(x).slice(0, 4)))}`} right={<Tag label={inTxt(n)} tone={n === 0 ? "ok" : "m"} />} onPress={() => go("dates")} />); });
  bl.forEach((b) => add("b" + b.id, <Row title={b.n + " bill"} sub={money(state, b.a)} right={<Tag label={billState(b).t} tone={billState(b).c} />} onPress={() => go("bills")} />));
  return (
    <Card title="Today's agenda" small={`${rows.length} items`}>
      {rows.length ? (all ? rows : rows.slice(0, 8)).map((r) => <View key={r.key}>{r.node}</View>) : <T tone="muted" className="py-4 text-center">Nothing urgent today.</T>}
      {rows.length > 8 ? <View className="items-start pt-1"><LinkBtn tone="brand" label={all ? "Show less" : `Show all ${rows.length}`} onPress={() => setAll(!all)} /></View> : null}
    </Card>
  );
}

