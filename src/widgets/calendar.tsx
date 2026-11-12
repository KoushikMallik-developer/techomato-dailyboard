import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Btn, Card, Chips, Empty, Note, Row, Seg, Stats, T, Tag, Toggle } from "../components/ui";
import { dateKey, fromKey, todayKey } from "../lib/date";
import { useNow } from "../lib/useNow";
import { billDue, datesOn, dateLabel, dl, dayTxt, eventsBetween, ended, eventsOn, evSort, hm, marks, money, nextAlarm, ntitle, taskOf, untilTxt, allTasks } from "../lib/logic";
import { ensurePermission, notificationsSupported } from "../lib/notify";
import { useStore } from "../store/store";
import { CalEvent, RingItem } from "../store/types";
import { useUi } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import { MoreLink, PrioTag } from "./shared";
import { useOpenNote } from "./notes";
import { useOpenProject } from "./projects";
import { TimeGrid } from "./timegrid";

export function EvRow({ e, showDate }: { e: CalEvent; showDate?: boolean }) {
  const { state } = useStore();
  const { openSheet } = useUi();
  const t = e.tid ? taskOf(state, e) : null, done = !!(t && t.x);
  return <Row title={e.t} done={done} sub={`${showDate ? dl(e.d) + " · " : ""}${e.time || "All day"}${t ? " · Task" : ""}${e.rep ? " · Repeats" : ""}`} onPress={() => openSheet("event", "", e.id)} right={<Tag label={done ? "Done" : e.cat} tone={done ? "ok" : e.cat === "Office" ? "b" : ""} />} />;
}

export function CalendarCard() {
  const { state } = useStore();
  const now = useNow(), t = todayKey();
  const L = eventsBetween(state, t, 90).slice(0, 3);
  return (
    <Card title="Calendar" small={`${eventsOn(state, t).filter((e) => !ended(e, now)).length} today`}>
      {L.length ? L.map((e) => <EvRow key={e.id + e.d} e={e} showDate />) : <Empty text="Nothing coming up." />}
    </Card>
  );
}

const VIEWS: ["day" | "week" | "month" | "agenda", string][] = [["day", "Day"], ["week", "Week"], ["month", "Month"], ["agenda", "Agenda"]];
const DAY_MS = 864e5;

export function CalendarPage() {
  const { c } = useTheme();
  const { state } = useStore();
  const { ui, set, openSheet } = useUi();
  const openNote = useOpenNote(), openProject = useOpenProject();
  const { y, m } = ui.cal, first = new Date(y, m, 1, 12), n = new Date(y, m + 1, 0).getDate(), today = todayKey(), view = ui.cview, day = ui.day;
  const lead = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = Array(lead).fill(null);
  for (let i = 1; i <= n; i++) cells.push(i);
  while (cells.length % 7) cells.push(null);
  const go = (k: string) => { const d = fromKey(k); set({ day: k, cal: { y: d.getFullYear(), m: d.getMonth() } }); };
  const nav = (d: number) => set((u) => { let mm = u.cal.m + d, yy = u.cal.y; if (mm < 0) { mm = 11; yy--; } if (mm > 11) { mm = 0; yy++; } return { cal: { y: yy, m: mm } }; });
  const step = (d: number) => (view === "month" ? nav(d) : go(dateKey(new Date(+fromKey(day) + d * (view === "week" ? 7 : 1) * DAY_MS))));
  const mon = new Date(+fromKey(day) - ((fromKey(day).getDay() + 6) % 7) * DAY_MS), week = Array.from({ length: 7 }, (_, i) => dateKey(new Date(+mon + i * DAY_MS)));
  const grid = view === "day" ? [day] : week, byDay: Record<string, CalEvent[]> = {};
  if (view === "day" || view === "week") grid.forEach((k) => { byDay[k] = eventsOn(state, k); });
  const title = view === "month" ? first.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : view === "week" ? `${fromKey(week[0]).toLocaleDateString(undefined, { day: "numeric", month: "short" })} to ${fromKey(week[6]).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
    : fromKey(day).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeline = view === "day" || view === "week";
  const ev = eventsOn(state, day).filter((e) => !timeline || !e.time).sort(evSort); // on the hour grid, timed events sit in the grid; the list keeps what has no time
  const td = allTasks(state).filter((t) => !t.x && t.due === day && !state.events.some((e) => e.tid === t.id));
  const bl = state.bills.filter((b) => billDue(b) === day && b.paid !== today.slice(0, 7));
  const up = eventsBetween(state, dateKey(new Date(+fromKey(day) + DAY_MS)), 14);
  const items: { key: string; node: React.ReactNode }[] = [];
  const add = (key: string, node: React.ReactNode) => items.push({ key, node });
  ev.forEach((e) => add("e" + e.id + e.d, <EvRow e={e} />));
  state.learn.filter((l) => l.due === day && l.st === "active").forEach((l) => add("l" + l.id, <Row title={"Finish: " + l.t} right={<Tag label="Learning" tone="b" />} onPress={() => openSheet("learn", "", l.id)} />));
  state.proj.filter((x) => x.st !== "done").forEach((x) => {
    const row = (k: string, l: string, t: string) => add("p" + x.id + k, <Row title={`${l}: ${t}`} sub={x.t} right={<Tag label="Project" tone="b" />} onPress={() => openProject(x.id)} />);
    if (x.due === day) row("t", "Target", x.t);
    x.ms.forEach((mm) => { if (!mm.x && mm.due === day) row("m" + mm.id, "Milestone", mm.t); });
    x.tasks.forEach((t) => { if (!t.x && t.due === day) row("k" + t.id, "Task", t.t); });
  });
  state.notes.filter((x) => x.rem === day && x.st === "on").forEach((x) => add("n" + x.id, <Row title={"Note: " + ntitle(x)} right={<Tag label="Reminder" tone="b" />} onPress={() => openNote(x.id)} />));
  state.watch.filter((w) => w.plan === day && w.st !== "done").forEach((w) => add("w" + w.id, <Row title={"Watch: " + w.t} sub={(w.type === "Series" ? "Web series" : "Movie") + (w.plat ? " · " + w.plat : "")} right={<Tag label="Watchlist" tone="b" />} onPress={() => openSheet("watch", "", w.id)} />));
  datesOn(state, day).forEach((x) => add("d" + x.id, <Row title={x.n} sub={`${x.kind === "Other" ? "Yearly" : x.kind} · ${dateLabel(x, Number(day.slice(0, 4)))}`} right={<Tag label="Yearly" tone="ok" />} onPress={() => openSheet("date", "", x.id)} />));
  td.forEach((t) => add("t" + t.id, <Row title={t.t} sub="Task due" right={<PrioTag p={t.p} />} />));
  bl.forEach((b) => add("b" + b.id, <Row title={b.n} sub={money(state, b.a) + " due"} right={<Tag label="Bill" tone="m" />} />));
  return (
    <>
      <Card>
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => step(-1)} accessibilityRole="button" accessibilityLabel="Previous" className="w-hit h-hit items-center justify-center"><Ionicons name="chevron-back" size={22} color={c.ink} /></Pressable>
          <T weight="700" className="flex-1 text-center" numberOfLines={2}>{title}</T>
          <Pressable onPress={() => step(1)} accessibilityRole="button" accessibilityLabel="Next" className="w-hit h-hit items-center justify-center"><Ionicons name="chevron-forward" size={22} color={c.ink} /></Pressable>
        </View>
        <View className="mt-2 flex-row items-center gap-2">
          <View className="flex-1"><Seg value={view} options={VIEWS} onChange={(v) => set({ cview: v })} /></View>
          <Btn small ghost label="Today" onPress={() => go(today)} />
        </View>
      </Card>
      {timeline ? (
        <Card>
          <TimeGrid days={grid} byDay={byDay} selected={day} onDay={go} faded={(e) => !!(e.tid && taskOf(state, e)?.x)} onEvent={(id) => openSheet("event", "", id)} onSlot={(k, time) => { set({ day: k, slot: time }); openSheet("event", "", ""); }} />
        </Card>
      ) : null}
      {view === "month" ? (
        <Card>
          <View className="flex-row">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <T key={i} size="xs" weight="600" tone="muted" className="flex-1 pb-0.5 text-center uppercase">{d}</T>)}</View>
          {Array.from({ length: cells.length / 7 }, (_, r) => (
            <View key={r} className="flex-row">
              {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
                if (!d) return <View key={i} className="flex-1 h-hit" />;
                const k = dateKey(new Date(y, m, d, 12)), sel = k === day, has = marks(state, k);
                return (
                  <Pressable key={i} onPress={() => set({ day: k })} accessibilityRole="button" accessibilityState={{ selected: sel }} accessibilityLabel={dl(k) + (has ? ", has items" : "")} className="flex-1 h-hit items-center justify-center">
                    <View className={`h-10 w-10 max-w-full items-center justify-center rounded-sm ${sel ? "bg-brand" : k === today ? "border-[1.5px] border-brand" : ""}`}>
                      <T size="md" weight={k === today ? "700" : "400"} tone={sel ? "onBrand" : k === today ? "brand" : "ink"}>{d}</T>
                      {has ? <View className={`absolute bottom-[5px] h-1 w-1 rounded-full ${sel ? "bg-brandInk" : "bg-brand"}`} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Card>
      ) : null}
      {timeline && !items.length ? null : (
        <Card title={timeline ? "All day and other" : dl(day)} small={timeline ? dl(day) : "agenda"}>
          {items.length ? items.map((i) => <View key={i.key}>{i.node}</View>) : <Empty text="Nothing planned. Tap Add to schedule something." />}
        </Card>
      )}
      <Note>{state.alerts.on ? "Events with a time ring 15 minutes before and at the start. Tap an empty hour to add an event." : "Event alerts are off. Turn them on in Alarms."}</Note>
      {!timeline && up.length ? <Card title="Next 14 days">{up.map((e) => <EvRow key={e.id + e.d} e={e} showDate />)}</Card> : null}
    </>
  );
}

/* ---------------- Alarms ---------------- */
function AlarmRows({ ids }: { ids: number[] }) {
  const { state, update } = useStore();
  const { openSheet } = useUi();
  return (
    <>
      {ids.map((id) => {
        const a = state.alarms.find((x) => x.id === id)!;
        return (
          <View key={a.id} className={`min-h-14 flex-row items-center justify-between ${a.on ? "" : "opacity-55"}`}>
            <Pressable onPress={() => openSheet("alarm", "", a.id)} accessibilityRole="button" className="flex-1">
              <T size="xxl" weight="700">{a.t}</T><T size="sm" tone="muted">{a.label || "Alarm"} · {dayTxt(a.days)}</T>
            </Pressable>
            <Toggle value={!!a.on} onChange={(v) => update((s) => { const x = s.alarms.find((y) => y.id === id); if (x) x.on = v ? 1 : 0; })} label={`${a.label || "Alarm"} at ${a.t}`} />
          </View>
        );
      })}
    </>
  );
}

export function AlarmsCard() {
  const { state } = useStore();
  const nx = nextAlarm(state), L = state.alarms.slice().sort((a, b) => (a.t < b.t ? -1 : 1));
  return (
    <Card title="Alarms" small={nx ? "Next in " + untilTxt(+nx.t - +new Date()) : "None on"}>
      {L.length ? <AlarmRows ids={L.slice(0, 3).map((a) => a.id)} /> : <Empty text="No alarms yet." />}
      {L.length > 3 ? <MoreLink to="alarms" n={L.length - 3} /> : null}
    </Card>
  );
}

export function AlarmsPage() {
  const { state, update } = useStore();
  const { set } = useUi();
  const [perm, setPerm] = useState<string>(notificationsSupported ? "checking" : "unsupported");
  useEffect(() => { if (notificationsSupported) import("expo-notifications").then((N) => N.getPermissionsAsync()).then((p) => setPerm(p.granted ? "granted" : "denied")).catch(() => setPerm("denied")); }, []);
  const nx = nextAlarm(state), L = state.alarms.slice().sort((a, b) => (a.t < b.t ? -1 : 1)), lead = state.alerts.lead * 60000, now = new Date();
  const up = state.events.filter((e) => e.time).map((e) => ({ e, s: new Date(e.d + "T" + e.time + ":00") })).filter((x) => x.s > now && !(x.e.tid && taskOf(state, x.e)?.x)).sort((a, b) => +a.s - +b.s).slice(0, 5);
  const fire = (item: RingItem) => set((u) => ({ ring: u.ring.concat(item) }));
  return (
    <>
      <Stats items={[[state.alarms.filter((a) => a.on).length, "Alarms on"], [nx ? nx.a.t : "–", "Next alarm"], [nx ? untilTxt(+nx.t - +now) : "–", "Rings in"]]} />
      <Card title="Your alarms" small="tap a time to edit">{L.length ? <AlarmRows ids={L.map((a) => a.id)} /> : <Empty text="No alarms yet. Tap Add." />}</Card>
      <Card title="Calendar event alerts">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1"><T>Ring for every calendar event</T><T size="sm" tone="muted">Before the start and at the start time</T></View>
          <Toggle value={!!state.alerts.on} onChange={(v) => update((s) => { s.alerts.on = v ? 1 : 0; })} label="Event alerts" />
        </View>
        <T size="sm" tone="muted" className="mt-3">Rings 15 minutes before the start and again at the start time.</T>
        <View className="mt-3">
          {state.alerts.on ? (up.length ? <><T weight="600">Next alerts</T>{up.map((x) => <Row key={x.e.id} title={x.e.t} sub={dl(x.e.d)} right={<Tag label={`${hm(new Date(+x.s - lead))} and ${x.e.time}`} />} />)}</> : <Empty text="No upcoming events with a time." />) : <Empty text="Alerts are off." />}
        </View>
        <Note>All-day events have no start time, so they do not ring. Done tasks linked to an event stay quiet.</Note>
      </Card>
      <Card title="Try it">
        <Chips>
          <Btn label="Ring an alarm now" onPress={() => fire({ kind: "alarm", title: "Test alarm", time: hm(new Date()), snooze: 5 })} />
          <Btn ghost label="Test an event alert" onPress={() => fire({ kind: "event", title: "Team standup", time: hm(new Date(Date.now() + 15 * 60000)), pre: 15, snooze: 5 })} />
        </Chips>
        <View className="mt-3 gap-2">
          <Note>While the app is open, alarms ring with a full-screen card and vibration. When it is closed, they arrive as phone notifications.{perm === "unsupported" ? " Notifications are not available on the web." : ""}</Note>
          {perm === "denied" ? <Btn ghost label="Allow notifications" onPress={() => ensurePermission().then((ok) => setPerm(ok ? "granted" : "denied"))} /> : null}
          {perm === "granted" ? <Note>Notifications are allowed. Alarms, event alerts and yearly dates are scheduled on this phone.</Note> : null}
        </View>
      </Card>
    </>
  );
}

