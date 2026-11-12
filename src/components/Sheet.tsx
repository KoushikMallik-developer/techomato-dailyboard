import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { addRep, dateKey, fromKey, todayKey } from "../lib/date";
import { byId, CATS, monthKey, newNote, PCAT, PST, setTaskDone, syncTaskEvent, syncWaterHabit, taskOf, dk } from "../lib/logic";
import { useStore } from "../store/store";
import { State, TaskListKey } from "../store/types";
import { useUi } from "../store/ui";
import { useLayout } from "../theme/layout";
import { DUR, EASE, useMotion } from "../theme/motion";
import { useTheme } from "../theme/ThemeProvider";
import { WIDGETS } from "../widgets/registry";
import { DateTimeInput } from "./DateTimeInput";
import { Btn, Chip, Chips, Input, LinkBtn, Note, T } from "./ui";

type Opt = [string | number, string];
type Field = { n: string; l: string; t?: "text" | "num" | "date" | "time" | "sel" | "area" | "days" | "rep"; req?: boolean; o?: Opt[]; d?: string | number };
type Item = { id: number } & Record<string, unknown>;
type Def = {
  name: string;
  L?: (s: State, ctx: string) => Item[];
  f: (day: string, slot?: string) => Field[];
  def?: () => Record<string, unknown>;
  save?: (s: State, v: Record<string, any>, ctx: string) => void; // custom forms have no stored item of their own
};
const F = (n: string, l: string, t: Field["t"] = "text", o: Partial<Field> = {}): Field => ({ n, l, t, ...o });
const PRIO: Opt[] = [["h", "High"], ["m", "Medium"], ["l", "Low"]];
const T0 = () => todayKey();
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const TYPES: Record<string, Def> = {
  task: { name: "Task", L: (s, c) => s[c as TaskListKey] as unknown as Item[], f: () => [F("t", "Task", "text", { req: true }), F("p", "Priority", "sel", { o: PRIO, d: "m" }), F("due", "Due date", "date"), F("rep", "Repeat", "rep", { d: "" }), F("cal", "Calendar", "sel", { o: [["", "Not on calendar"], ["1", "Show on calendar on its due date"]], d: "" }), F("time", "Event time (optional)", "time")], def: () => ({ c: T0(), x: 0, f: null, cal: "", time: "" }) },
  habit: { name: "Habit", L: (s) => s.habits as unknown as Item[], f: () => [F("n", "Habit name", "text", { req: true }), F("rt", "Reminder time (optional)", "time")], def: () => ({ done: {} }) },
  spend: { name: "Entry", L: (s) => s.spend as unknown as Item[], f: () => [F("k", "Type", "sel", { o: [["x", "Expense"], ["i", "Income"]], d: "x" }), F("a", "Amount", "num", { req: true }), F("l", "Description"), F("c", "Category", "sel", { o: CATS.map((c) => [c, c] as Opt), d: "Food" }), F("d", "Date", "date", { d: T0() })], def: () => ({}) },
  goal: { name: "Goal", L: (s) => s.goals as unknown as Item[], f: () => [F("t", "Goal", "text", { req: true }), F("target", "Target", "num", { req: true }), F("cur", "Progress so far", "num", { d: 0 }), F("unit", "Unit, e.g. km or books"), F("due", "Target date", "date")], def: () => ({ log: [] }) },
  glog: { name: "Log progress", f: () => [F("v", "Amount to add", "num", { req: true }), F("d", "Date", "date", { d: T0() })], save(s, v, ctx) { const g = byId(s.goals, ctx); if (g) { g.cur += v.v; g.log.push({ d: v.d, v: v.v }); } } },
  journal: { name: "Journal entry", L: (s) => s.journal as unknown as Item[], f: () => [F("d", "Date", "date", { d: T0() }), F("mood", "Mood", "sel", { o: [[1, "1 · Rough"], [2, "2 · Low"], [3, "3 · Okay"], [4, "4 · Good"], [5, "5 · Great"]], d: 3 }), F("txt", "What happened today?", "area")], def: () => ({}) },
  event: { name: "Event", L: (s) => s.events as unknown as Item[], f: (day, slot) => [F("t", "Title", "text", { req: true }), F("d", "Date", "date", { d: day, req: true }), F("time", "Time", "time", { d: slot || "09:00" }), F("dur", "Length", "sel", { o: [[15, "15 min"], [30, "30 min"], [60, "1 hour"], [90, "1.5 hours"], [120, "2 hours"], [180, "3 hours"]], d: 60 }), F("rep", "Repeat", "rep", { d: "" }), F("cat", "Type", "sel", { o: [["Personal", "Personal"], ["Office", "Office"], ["Other", "Other"]], d: "Personal" })], def: () => ({}) },
  learn: { name: "Learning item", L: (s) => s.learn as unknown as Item[], f: () => [F("t", "What are you learning?", "text", { req: true }), F("kind", "Type", "sel", { o: [["Course", "Course"], ["Book", "Book"], ["Skill", "Skill or practice"], ["Video series", "Video series"]], d: "Course" }), F("src", "Platform or author (optional)"), F("total", "Total amount", "num", { req: true }), F("unit", "Unit, e.g. lessons or pages", "text", { d: "lessons" }), F("done", "Done so far", "num", { d: 0 }), F("due", "Finish by (optional)", "date"), F("st", "Status", "sel", { o: [["active", "In progress"], ["paused", "Paused"], ["done", "Finished"]], d: "active" }), F("note", "Note (optional)")], def: () => ({ log: [], f: null }) },
  llog: { name: "Log session", f: () => [F("v", "Amount done (lessons, pages...)", "num", { req: true }), F("m", "Minutes studied", "num", { d: 0 }), F("d", "Date", "date", { d: T0() })], save(s, v, ctx) { const g = byId(s.learn, ctx); if (!g) return; g.done += v.v; g.log.push({ d: v.d, v: v.v, m: v.m }); if (g.done >= g.total) { g.st = "done"; g.f = v.d; } } },
  proj: { name: "Project", L: (s) => s.proj as unknown as Item[], f: () => [F("t", "Project name", "text", { req: true }), F("desc", "What is it about? (optional)", "area"), F("cat", "Category", "sel", { o: PCAT.map((c) => [c, c] as Opt), d: "Tech" }), F("pr", "Priority", "sel", { o: PRIO, d: "m" }), F("st", "Status", "sel", { o: PST.map((s) => [s[0], s[1]] as Opt), d: "active" }), F("start", "Start date (optional)", "date"), F("due", "Target date (optional)", "date")], def: () => ({ tasks: [], ms: [], ups: [], time: [], links: [], c: T0() }) },
  ptask: { name: "Project task", L: (s, c) => byId(s.proj, c)!.tasks as unknown as Item[], f: () => [F("t", "Task", "text", { req: true }), F("p", "Priority", "sel", { o: PRIO, d: "m" }), F("due", "Due date (optional)", "date")], def: () => ({ x: 0, f: null }) },
  pms: { name: "Milestone", L: (s, c) => byId(s.proj, c)!.ms as unknown as Item[], f: () => [F("t", "Milestone", "text", { req: true }), F("due", "Date (optional)", "date")], def: () => ({ x: 0 }) },
  ptime: { name: "Time spent", L: (s, c) => byId(s.proj, c)!.time as unknown as Item[], f: () => [F("h", "Hours", "num", { req: true }), F("d", "Date", "date", { d: T0() }), F("t", "What did you work on? (optional)")], def: () => ({}) },
  plink: { name: "Link", L: (s, c) => byId(s.proj, c)!.links as unknown as Item[], f: () => [F("t", "Label"), F("u", "Web address, starting with https://", "text", { req: true })], def: () => ({}) },
  watch: { name: "Movie or series", L: (s) => s.watch as unknown as Item[], f: () => [F("t", "Title", "text", { req: true }), F("type", "Type", "sel", { o: [["Movie", "Movie"], ["Series", "Web series"]], d: "Movie" }), F("plat", "Where to watch", "sel", { o: [["", "Not set"], ["Netflix", "Netflix"], ["Prime Video", "Prime Video"], ["Disney+ Hotstar", "Disney+ Hotstar"], ["JioCinema", "JioCinema"], ["YouTube", "YouTube"], ["Cinema", "Cinema"], ["Other", "Other"]], d: "" }), F("st", "Status", "sel", { o: [["todo", "To watch"], ["doing", "Watching"], ["done", "Watched"]], d: "todo" }), F("se", "Season (series)", "num", { d: "" }), F("ep", "Episode reached (series)", "num", { d: "" }), F("rate", "Your rating", "sel", { o: [[0, "Not rated"], [1, "1 of 5"], [2, "2 of 5"], [3, "3 of 5"], [4, "4 of 5"], [5, "5 of 5"]], d: 0 }), F("plan", "Plan to watch on (optional)", "date"), F("note", "Note (optional)")], def: () => ({ c: T0(), f: null }) },
  alarm: { name: "Alarm", L: (s) => s.alarms as unknown as Item[], f: () => [F("t", "Time", "time", { req: true, d: "07:00" }), F("label", "Label"), F("days", "Repeat", "days"), F("snooze", "Snooze for", "sel", { o: [[5, "5 minutes"], [10, "10 minutes"], [15, "15 minutes"]], d: 5 })], def: () => ({ on: 1 }) },
  date: { name: "Yearly date", L: (s) => s.dates as unknown as Item[], f: () => [F("n", "Name or occasion", "text", { req: true }), F("kind", "Type", "sel", { o: [["Birthday", "Birthday"], ["Anniversary", "Anniversary"], ["Other", "Other"]], d: "Birthday" }), F("d", "Date", "date", { req: true, d: T0() }), F("hy", "Year", "sel", { o: [["1", "Year is known (show age or years)"], ["", "Ignore the year"]], d: "1" }), F("rem", "Remind me", "sel", { o: [[0, "On the day"], [1, "1 day before"], [3, "3 days before"], [7, "1 week before"], [14, "2 weeks before"]], d: 3 })], def: () => ({}) },
  bill: { name: "Bill", L: (s) => s.bills as unknown as Item[], f: () => [F("n", "Bill name", "text", { req: true }), F("a", "Amount", "num", { req: true }), F("day", "Due day of month (1-31)", "num", { req: true, d: 1 })], def: () => ({ paid: "", from: monthKey() }) },
  sub: { name: "Subscription", L: (s) => s.subs as unknown as Item[], f: () => [F("n", "Service name", "text", { req: true }), F("a", "Price", "num", { req: true }), F("cycle", "Billed", "sel", { o: [["w", "Every week"], ["m", "Every month"], ["y", "Every year"]], d: "m" }), F("next", "Next renewal", "date", { req: true, d: T0() }), F("act", "Status", "sel", { o: [[1, "Active"], [0, "Cancelled"]], d: 1 })], def: () => ({}) },
  doc: { name: "Document", L: (s) => s.docs as unknown as Item[], f: () => [F("n", "Name, e.g. Car insurance", "text", { req: true }), F("kind", "Type", "sel", { o: ["Insurance", "Licence", "PUC", "Warranty", "Passport", "Other"].map((k) => [k, k] as Opt), d: "Insurance" }), F("exp", "Expiry date", "date", { req: true, d: T0() }), F("lead", "Remind me", "sel", { o: [[7, "7 days before"], [15, "15 days before"], [30, "30 days before"], [60, "60 days before"]], d: 30 })], def: () => ({ seen: T0() }) },
  trip: { name: "Trip", L: (s) => s.trips as unknown as Item[], f: () => [F("n", "Trip name", "text", { req: true }), F("from", "Start date", "date", { req: true, d: T0() }), F("to", "End date", "date", { req: true, d: T0() }), F("budget", "Budget (optional)", "num", { d: 0 }), F("spent", "Spent so far", "num", { d: 0 })], def: () => ({ items: [] }) },
  titem: { name: "Packing item", L: (s, c) => (byId(s.trips, c)?.items ?? []) as unknown as Item[], f: () => [F("t", "Item", "text", { req: true })], def: () => ({ x: 0 }) },
  med: { name: "Medicine", L: (s) => s.meds as unknown as Item[], f: () => [F("n", "Medicine", "text", { req: true }), F("dose", "Dose, e.g. 1 tablet (optional)"), F("t1", "First dose", "time", { req: true, d: "08:00" }), F("t2", "Second dose (optional)", "time"), F("t3", "Third dose (optional)", "time"), F("act", "Status", "sel", { o: [[1, "Taking"], [0, "Paused"]], d: 1 })], def: () => ({ taken: {} }) },
  shop: { name: "Item", L: (s) => s.shop as unknown as Item[], f: () => [F("t", "Item", "text", { req: true }), F("q", "Quantity (optional)")], def: () => ({ x: 0 }) },
  weight: { name: "Weight (kg)", L: (s) => s.weight as unknown as Item[], f: () => [F("v", "Weight in kg", "num", { req: true }), F("d", "Date", "date", { d: T0() })], def: () => ({}) },
  sleep: { name: "Sleep", f: () => [F("h", "Hours slept", "num", { req: true }), F("d", "Night ending on", "date", { d: T0() })], save(s, v) { s.health.sleep[v.d] = v.h; } },
};

/** Entries in the Quick add menu: [type, ctx, label, widget whose icon is used]. */
const QUICK: [string, string, string, string][] = [
  ["task", "personal", "Personal task", "personal"], ["task", "office", "Office task", "office"], ["spend", "", "Expense or income", "spend"], ["event", "", "Event", "calendar"],
  ["date", "", "Yearly date", "dates"], ["alarm", "", "Alarm", "alarms"], ["note", "", "Note", "notes"], ["learn", "", "Learning item", "learn"], ["proj", "", "Project", "proj"],
  ["watch", "", "Movie or series", "watch"], ["journal", "", "Journal entry", "journal"], ["shop", "", "Shopping item", "shop"], ["sub", "", "Subscription", "subs"], ["doc", "", "Document expiry", "docs"], ["trip", "", "Trip", "trips"], ["med", "", "Medicine", "meds"], ["habit", "", "New habit", "habits"],
  ["goal", "", "New goal", "goals"], ["sleep", "", "Log sleep", "health"], ["weight", "", "Log weight", "health"],
];

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && dateKey(new Date(v + "T12:00:00")) === v; // 2026-02-30 would roll over to March and match no day
const isTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export function SheetHost() {
  const { ui, closeSheet, set } = useUi();
  const { c, vars } = useTheme();
  const { sheetW } = useLayout();
  const motion = useMotion();
  const { update } = useStore();
  const s = ui.sheet;
  const open = !!s;
  const type = s?.type ?? "";
  const menu = type === "menu";

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={closeSheet} statusBarTranslucent>
      {/* a Modal is a separate native window, so the theme variables must be set again */}
      <View style={vars} className="flex-1">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-end bg-scrim">
        <Pressable className="flex-1" onPress={closeSheet} accessibilityLabel="Close" />
        <Animated.View entering={motion ? SlideInDown.duration(DUR.base).easing(EASE) : undefined} style={{ maxWidth: sheetW, maxHeight: "88%", width: "100%", alignSelf: "center" }}>
        <View className="shrink rounded-t-sheet bg-card px-4 pb-[18px] pt-2">
          <View className="mx-auto mb-3 mt-1 h-1 w-[38px] rounded-sm bg-line" />
          {s && menu ? (
            <>
              <View className="mb-3 flex-row items-center justify-between">
                <T size="lg" weight="700">Quick add</T><LinkBtn label="Close" onPress={closeSheet} />
              </View>
              <ScrollView contentContainerClassName="flex-row flex-wrap gap-2">
                {QUICK.map((q) => (
                  <Pressable key={q[2]} accessibilityRole="button" onPress={() => {
                    if (q[0] === "note") { let id = 0; update((st) => { id = newNote(st, "All").id; }); closeSheet(); set({ nview: "edit", nid: id }); router.push({ pathname: "/w/[key]", params: { key: "notes" } }); }
                    else set({ sheet: { type: q[0], ctx: q[1], id: "" } });
                  }} className="min-h-12 w-[48%] flex-row items-center gap-2 rounded-md bg-soft p-3 active:opacity-70">
                    <Ionicons name={WIDGETS[q[3] as keyof typeof WIDGETS].icon} size={18} color={c.brand} /><T size="md" weight="500" className="flex-1">{q[2]}</T>
                  </Pressable>
                ))}
                <Pressable accessibilityRole="button" onPress={() => { update((st) => { const t = todayKey(); st.health.water[t] = (st.health.water[t] || 0) + 1; syncWaterHabit(st); }); closeSheet(); }}
                  className="min-h-12 w-[48%] flex-row items-center gap-2 rounded-md bg-soft p-3 active:opacity-70">
                  <Ionicons name="water-outline" size={18} color={c.brand} /><T size="md" weight="500">Water +1</T>
                </Pressable>
              </ScrollView>
            </>
          ) : s && TYPES[type] ? <Form key={type + s.ctx + s.id} req={s} /> : null}
        </View>
        </Animated.View>
      </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Form({ req }: { req: NonNullable<ReturnType<typeof useUi>["ui"]["sheet"]> }) {
  const { state, update } = useStore();
  const { ui, closeSheet } = useUi();
  const D = TYPES[req.type];
  const item = req.id && D.L ? (D.L(state, req.ctx).find((x) => x.id === Number(req.id)) ?? null) : null;
  const fields = D.f(ui.day, ui.slot).filter((f) => !((f.n === "rep" || f.n === "dur") && item?.tid)); // an event linked to a task repeats through the task
  const [vals, setVals] = useState<Record<string, any>>(() => {
    const o: Record<string, any> = {};
    fields.forEach((f) => { o[f.n] = f.t === "days" ? (item?.days as number[] | undefined) ?? [] : item && item[f.n] !== undefined && item[f.n] !== null ? item[f.n] : f.d !== undefined ? f.d : ""; });
    return o;
  });
  const [bad, setBad] = useState("");
  const [badF, setBadF] = useState(""); // field the error belongs to
  const fail = (field: string, msg: string) => { setBad(msg); setBadF(field); };
  const [sure, setSure] = useState(false);
  const set = (n: string, v: unknown) => setVals((o) => ({ ...o, [n]: v }));
  const title = req.type === "task" ? (req.ctx === "office" ? "Office task" : "Personal task") : D.name;
  const ev = req.type === "event" && item?.tid ? taskOf(state, item as never) : undefined;

  const submit = () => {
    const v: Record<string, any> = {};
    for (const f of fields) {
      if (f.t === "days") { v[f.n] = vals[f.n]; continue; }
      if (f.t === "rep") { v[f.n] = vals[f.n]; continue; }
      const raw = String(vals[f.n] ?? "").trim();
      if (f.t === "num") { v[f.n] = raw === "" ? (f.d !== undefined ? f.d : 0) : parseFloat(raw); if (!Number.isFinite(v[f.n]) || v[f.n] < 0 || (f.req && !(v[f.n] > 0))) { fail(f.n, `${f.l}: enter a number${f.req ? " above 0" : ", not negative"}`); return; } }
      else if (f.t === "sel") { const o = f.o!.find((x) => String(x[0]) === raw); v[f.n] = o ? o[0] : raw; }
      else {
        if (f.req && !raw) { fail(f.n, `${f.l} is required`); return; }
        if (f.t === "date" && raw && !isDate(raw)) { fail(f.n, `${f.l}: use YYYY-MM-DD`); return; }
        if (f.t === "time" && raw && !isTime(raw)) { fail(f.n, `${f.l}: use 24-hour HH:MM`); return; }
        v[f.n] = raw;
      }
    }
    if (req.type === "trip" && v.to < v.from) { fail("to", "End date is before the start date"); return; }
    if (req.type === "bill") v.day = Math.min(31, Math.max(1, Math.round(v.day)));
    if (req.type === "task" && (v.cal === "1" || v.rep) && !v.due) v.due = todayKey(); // a calendar event or a repeat needs a date
    const first = (d: string) => (v.rep?.[0] === "D" && !v.rep.includes(String(fromKey(d).getDay())) ? addRep(d, v.rep) : d); // the first date has to be one of the chosen days
    if (req.type === "task" && v.due) v.due = first(v.due);
    if (req.type === "event" && !item?.tid) v.d = first(v.d);
    if (req.type === "plink" && v.u && !/^https?:\/\//i.test(v.u)) { fail("u", "Web address must start with https://"); return; }
    update((s) => {
      if (D.save) { D.save(s, v, req.ctx); return; }
      const L = D.L!(s, req.ctx);
      let it: any;
      const same = req.type === "journal" && !req.id ? L.find((x) => x.d === v.d) : undefined; // one journal entry per day
      if (req.id || same) { it = same ?? L.find((x) => x.id === Number(req.id)); Object.assign(it, v); }
      else { it = { id: s.nid++, ...D.def!(), ...v }; L.unshift(it); }
      if (req.type === "bill") s.spend.forEach((x) => { if (x.bid === it.id && x.d.slice(0, 7) === todayKey().slice(0, 7)) { x.a = v.a; x.l = v.n; } }); // keep the linked payment in step
      if (req.type === "task") syncTaskEvent(s, it, req.ctx as TaskListKey);
      if (req.type === "ptask" && it.ptid) { const pl = byId(s.personal, it.ptid); if (pl) { pl.t = it.t; pl.due = it.due || ""; } }
      if (req.type === "watch") it.f = it.st === "done" ? (it.f || todayKey()) : null; // watched date follows the status
      if (req.type === "event" && it.tid) { const tt = taskOf(s, it); if (tt) { tt.t = it.t; tt.due = it.d; tt.time = it.time; } }
    });
    closeSheet();
  };

  const del = () => {
    if (!sure) { setSure(true); return; }
    update((s) => {
      const L = D.L!(s, req.ctx), i = L.findIndex((x) => x.id === Number(req.id));
      if (i < 0) return;
      const gone = L[i] as any;
      if (gone.tid) { const tt = taskOf(s, gone); if (tt) tt.cal = ""; }
      if (gone.bid) { const b = byId(s.bills, gone.bid); if (b && b.paid === todayKey().slice(0, 7) && gone.d.slice(0, 7) === b.paid) b.paid = ""; } // deleting a bill payment marks the bill unpaid
      L.splice(i, 1);
    });
    closeSheet();
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3 pb-2">
      <View className="flex-row items-center justify-between">
        <T size="lg" weight="700">{req.id ? "Edit " + title.toLowerCase() : D.save ? D.name : "New " + title.toLowerCase()}</T>
        <LinkBtn label="Cancel" onPress={closeSheet} />
      </View>
      {fields.map((f) => (
        <View key={f.n} className="gap-1.5">
          <T size="sm" tone="muted">{f.l}{f.req ? " *" : ""}</T>
          {f.t === "rep" ? (() => {
            const cur = String(vals[f.n]), digits = cur === "d" ? "0123456" : cur[0] === "D" ? cur.slice(1) : "";
            const fromDigits = (d: string) => (d.length === 7 ? "d" : d ? "D" + d : ""); // every day chosen = daily, none = does not repeat
            return (
              <>
                <Chips>
                  <Chip label="Every day" on={cur === "d"} onPress={() => set(f.n, cur === "d" ? "" : "d")} />
                  <Chip label="Every week" on={cur === "w"} onPress={() => set(f.n, cur === "w" ? "" : "w")} />
                </Chips>
                <Chips>{["S", "M", "T", "W", "T", "F", "S"].map((l, i) => { const on = digits.includes(String(i)); return <Chip key={i} label={l} a11y={WEEKDAY[i]} on={on} onPress={() => set(f.n, fromDigits([...new Set(on ? digits.replace(String(i), "") : digits + i)].sort().join("")))} />; })}</Chips>
                {cur === "m" || cur === "y" ? <Note>Repeats every {cur === "m" ? "month" : "year"} now. Pick a day or Every day or Every week to change it.</Note> : null}
                <Note>Pick the days it repeats on. Leave everything unselected to not repeat.</Note>
              </>
            );
          })() : f.t === "sel" ? (
            <Chips>{f.o!.map((o) => <Chip key={String(o[0])} label={o[1]} on={String(vals[f.n]) === String(o[0])} onPress={() => set(f.n, o[0])} />)}</Chips>
          ) : f.t === "days" ? (
            <>
              <Chips>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => <Chip key={d} label={d} on={vals[f.n].includes(i)} onPress={() => set(f.n, vals[f.n].includes(i) ? vals[f.n].filter((x: number) => x !== i) : [...vals[f.n], i].sort())} />)}</Chips>
              <Chips><Chip label="Every day" on={vals[f.n].length === 7} onPress={() => set(f.n, vals[f.n].length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6])} /></Chips>
              <Note>Leave all unselected to ring once.</Note>
            </>
          ) : (
            <>
              {f.t === "date" || f.t === "time" ? (
                <DateTimeInput mode={f.t} value={String(vals[f.n] ?? "")} onChange={(v) => set(f.n, v)} label={f.l} placeholder={f.t === "date" ? "Pick a date" : "Pick a time"} />
              ) : (
                <Input value={String(vals[f.n] ?? "")} onChangeText={(v) => set(f.n, v)} accessibilityLabel={f.l} multiline={f.t === "area"}
                  keyboardType={f.t === "num" ? "decimal-pad" : "default"} maxLength={f.t === "area" ? 600 : 80} className={f.t === "area" ? "min-h-[88px] pt-3" : undefined} />
              )}
              {f.t === "time" && !f.req ? <Chips><Chip label="Clear" onPress={() => set(f.n, "")} /></Chips> : null}
              {f.t === "date" ? (
                <Chips>
                  <Chip label="Today" onPress={() => set(f.n, todayKey())} /><Chip label="Tomorrow" onPress={() => set(f.n, dk(1))} /><Chip label="Next week" onPress={() => set(f.n, dk(7))} />
                  {!f.req ? <Chip label="Clear" onPress={() => set(f.n, "")} /> : null}
                </Chips>
              ) : null}
            </>
          )}
          {bad && badF === f.n ? <T size="sm" tone="bad" accessibilityRole="alert" accessibilityLiveRegion="polite">{bad}</T> : null}
        </View>
      ))}
            <Btn label={req.id ? "Save changes" : "Save"} onPress={submit} />
      {ev ? (
        <>
          <Note>This event is linked to a task. Changes here update the task.</Note>
          <Btn ghost label={ev.x ? "Reopen linked task" : "Mark linked task done"} onPress={() => { update((s) => { const t = taskOf(s, item as never); if (t) setTaskDone(s, t, t.x ? 0 : 1); }); closeSheet(); }} />
        </>
      ) : null}
      {req.id && D.L ? <Btn danger={sure} ghost={!sure} label={sure ? "Tap again to delete" : "Delete"} onPress={del} /> : null}
      <View className="h-px bg-card" />
    </ScrollView>
  );
}
