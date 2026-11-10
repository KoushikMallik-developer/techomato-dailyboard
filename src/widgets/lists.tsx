import { useState } from "react";
import { Pressable, View } from "react-native";
import { Bars, LineChart } from "../components/charts";
import { Bar, Btn, Card, Chip, Chips, Day, Empty, Input, LinkBtn, Note, QuickAdd, Row, Seg, Stats, T, Tag } from "../components/ui";
import { todayKey } from "../lib/date";
import { billDue, billState, dl, lastDays, MOODS, money, num, syncWaterHabit, toggleBill, water, watchSub } from "../lib/logic";
import { useStore } from "../store/store";
import { State, Watch } from "../store/types";
import { useUi } from "../store/ui";
import { CheckRow, MoreLink } from "./shared";

/* ---------------- Shopping ---------------- */
export function ShopCard() {
  const { state, update } = useStore();
  const L = state.shop.filter((t) => !t.x);
  return (
    <Card title="Shopping list" small={`${L.length} to get`}>
      {L.length === 0 ? <Empty text="List is empty." /> : L.slice(0, 4).map((t) => (
        <CheckRow key={t.id} on={false} label={`Got it: ${t.t}`} title={t.t} sub={t.q} onToggle={() => update((s) => { const x = s.shop.find((y) => y.id === t.id); if (x) x.x = 1; })} />
      ))}
      {L.length > 4 ? <MoreLink to="shop" n={L.length - 4} /> : null}
    </Card>
  );
}
export function ShopPage() {
  const { state, update } = useStore();
  const { openSheet } = useUi();
  const [text, setText] = useState(""), [sure, setSure] = useState(false);
  const L = state.shop.slice().sort((a, b) => a.x - b.x), got = state.shop.filter((t) => t.x).length;
  const add = () => { const t = text.trim(); if (!t) return; update((s) => { s.shop.push({ id: s.nid++, t, q: "", x: 0 }); }); setText(""); };
  return (
    <>
      <QuickAdd value={text} onChange={setText} onAdd={add} placeholder="Add an item" />
      <Card title="List" small={`${state.shop.length - got} to get`}>
        {L.length === 0 ? <Empty text="List is empty." /> : L.map((t) => (
          <CheckRow key={t.id} on={!!t.x} label={`${t.x ? "Put back" : "Got it"}: ${t.t}`} title={t.t} sub={t.q} onPress={() => openSheet("shop", "", t.id)}
            onToggle={() => update((s) => { const x = s.shop.find((y) => y.id === t.id); if (x) x.x = x.x ? 0 : 1; })} />
        ))}
        {got ? <Btn className="mt-4" ghost={!sure} danger={sure} label={sure ? `Confirm: remove ${got}` : "Clear checked items"} onPress={() => { if (!sure) { setSure(true); return; } update((s) => { s.shop = s.shop.filter((t) => !t.x); }); setSure(false); }} /> : null}
      </Card>
    </>
  );
}

/* ---------------- Bills ---------------- */
export function BillsCard() {
  const { state } = useStore();
  const L = state.bills.slice().sort((a, b) => billState(a).s - billState(b).s || a.day - b.day).filter((b) => billState(b).s < 9);
  return (
    <Card title="Bills" small={`${L.length} unpaid`}>
      {L.length === 0 ? <Empty text="All bills paid this month." /> : L.slice(0, 3).map((x) => { const st = billState(x); return <Row key={x.id} title={x.n} sub={`${money(state, x.a)} · due ${dl(billDue(x))}`} right={<Tag label={st.t} tone={st.c} />} />; })}
    </Card>
  );
}
export function BillsPage() {
  const { state, update } = useStore();
  const { openSheet } = useUi();
  const m = todayKey().slice(0, 7), unpaid = state.bills.filter((b) => b.paid !== m);
  const L = state.bills.slice().sort((a, b) => billState(a).s - billState(b).s || a.day - b.day);
  return (
    <>
      <Stats items={[[money(state, state.bills.reduce((a, b) => a + b.a, 0)), "Monthly total"], [money(state, unpaid.reduce((a, b) => a + b.a, 0)), "Still to pay"], [unpaid.length, "Unpaid"]]} />
      <Card title="This month">
        {L.length === 0 ? <Empty text="No bills yet." /> : L.map((b) => { const st = billState(b); return (
          <CheckRow key={b.id} on={b.paid === m} label={`${b.paid === m ? "Mark unpaid" : "Mark paid"}: ${b.n}`} title={b.n} sub={`${money(state, b.a)} · due ${dl(billDue(b))}`}
            tag={<Tag label={st.t} tone={st.c} />} onPress={() => openSheet("bill", "", b.id)} onToggle={() => update((s) => { const x = s.bills.find((y) => y.id === b.id); if (x) toggleBill(s, x); })} />
        ); })}
      </Card>
    </>
  );
}

/* ---------------- Watchlist ---------------- */
function WatchRow({ w, mini }: { w: Watch; mini?: boolean }) {
  const { update } = useStore();
  const { openSheet } = useUi();
  const sub = watchSub(w, mini);
  return (
    <CheckRow on={w.st === "done"} label={`${w.st === "done" ? "Move back to the list" : "Mark watched"}: ${w.t}`} title={w.t} sub={sub + (!mini && w.type === "Series" && w.st !== "done" ? " · tap +1 below" : "")}
      onPress={() => openSheet("watch", "", w.id)} tag={w.st === "doing" ? <Tag label="Watching" tone="ok" /> : <Tag label={w.type === "Series" ? "Series" : "Movie"} tone={w.type === "Series" ? "b" : ""} />}
      onToggle={() => update((s) => { const x = s.watch.find((y) => y.id === w.id); if (!x) return; x.st = x.st === "done" ? "todo" : "done"; x.f = x.st === "done" ? todayKey() : null; })} />
  );
}
export function WatchCard() {
  const { state } = useStore();
  const L = state.watch.filter((w) => w.st !== "done").sort((a, b) => (a.st === "doing" ? 0 : 1) - (b.st === "doing" ? 0 : 1) || (a.plan || "9999").localeCompare(b.plan || "9999") || b.id - a.id);
  return (
    <Card title="Watchlist" small={`${L.length} to go`}>
      {L.length === 0 ? <Empty text="Nothing queued. Add something to watch." /> : L.slice(0, 4).map((w) => <WatchRow key={w.id} w={w} mini />)}
      {L.length > 4 ? <MoreLink to="watch" n={L.length - 4} /> : null}
    </Card>
  );
}
export function WatchPage() {
  const { state, update } = useStore();
  const [tab, setTab] = useState<Watch["st"]>("todo"), [type, setType] = useState("All"), [q, setQ] = useState(""), [text, setText] = useState(""), [nt, setNt] = useState<"Movie" | "Series">("Movie"), [pick, setPick] = useState(0);
  const by = (st: Watch["st"]) => state.watch.filter((w) => w.st === st);
  const pk = pick ? state.watch.find((w) => w.id === pick) : null;
  const add = () => { const t = text.trim(); if (!t) return; update((s) => { s.watch.unshift({ id: s.nid++, t, type: nt, plat: "", st: "todo", se: "", ep: "", rate: 0, plan: "", note: "", c: todayKey(), f: null }); }); setText(""); };
  const doPick = () => { const c = state.watch.filter((w) => w.st === "todo" && (type === "All" || w.type === type) && w.id !== pick); if (c.length) setPick(c[Math.floor(Math.random() * c.length)].id); };
  const ql = q.toLowerCase();
  const L = by(tab).filter((w) => (type === "All" || w.type === type) && (w.t + " " + w.plat + " " + w.note).toLowerCase().includes(ql));
  const rated = tab === "done" ? L.filter((w) => w.rate) : [];
  const plus = (w: Watch) => update((s) => { const x = s.watch.find((y) => y.id === w.id); if (!x) return; x.ep = (Number(x.ep) || 0) + 1; if (!x.se) x.se = 1; if (x.st === "todo") x.st = "doing"; });
  const sorted = tab === "done" ? L.slice().sort((a, b) => ((a.f || "") < (b.f || "") ? 1 : -1)) : L.slice().sort((a, b) => (a.plan || "9999").localeCompare(b.plan || "9999") || b.id - a.id);
  return (
    <>
      <Stats items={[[by("todo").length, "To watch"], [by("doing").length, "Watching"], [by("done").length, "Watched"]]} />
      {pk && pk.st === "todo" ? (
        <Card title="Tonight's pick">
          <T size="xl" weight="700">{pk.t}</T>
          <T tone="muted" className="mb-3">{pk.type === "Series" ? "Web series" : "Movie"}{pk.plat ? " · " + pk.plat : ""}</T>
          <Chips><Btn label="Start watching" onPress={() => { update((s) => { const x = s.watch.find((y) => y.id === pk.id); if (x) x.st = "doing"; }); setPick(0); setTab("doing"); }} /><Btn ghost label="Pick another" onPress={doPick} /><LinkBtn label="Dismiss" onPress={() => setPick(0)} /></Chips>
        </Card>
      ) : null}
      <QuickAdd value={text} onChange={setText} onAdd={add} placeholder="Add a movie or series" extra={<Chip label={nt} onPress={() => setNt(nt === "Movie" ? "Series" : "Movie")} on />} />
      <Seg value={tab} onChange={setTab} options={[["todo", `To watch ${by("todo").length}`], ["doing", `Watching ${by("doing").length}`], ["done", `Watched ${by("done").length}`]]} />
      <Chips>
        {[["All", "All"], ["Movie", "Movies"], ["Series", "Web series"]].map((c) => <Chip key={c[0]} label={c[1]} on={type === c[0]} onPress={() => { setType(c[0]); setPick(0); }} />)}
        {tab === "todo" ? <Chip label="Pick for me" onPress={doPick} /> : null}
      </Chips>
      <Input value={q} onChangeText={setQ} placeholder="Search title, platform or note" accessibilityLabel="Search watchlist" />
      <Card>
        {sorted.length === 0 ? <Empty text="Nothing here." /> : sorted.map((w, i) => {
          const head = tab === "done" && (i === 0 || sorted[i - 1].f !== w.f) ? <Day key={"d" + w.id} label={w.f ? dl(w.f) : "Earlier"} /> : null;
          return [head, <View key={w.id}><WatchRow w={w} />
            {w.type === "Series" && w.st !== "done" ? <View className="ml-[34px] mb-1"><LinkBtn label="+1 episode" tone="brand" onPress={() => plus(w)} /></View> : null}
            {tab !== "done" && w.note ? <View className="ml-[34px] mb-1.5"><Note>{w.note}</Note></View> : null}</View>];
        })}
        {rated.length ? <Note>Average rating: {num(rated.reduce((a, w) => a + w.rate, 0) / rated.length)} of 5</Note> : null}
      </Card>
    </>
  );
}

/* ---------------- Journal ---------------- */
export function JournalCard() {
  const { state, update } = useStore();
  const t = todayKey(), e = state.journal.find((x) => x.d === t), last = state.journal.slice().sort((a, b) => (a.d < b.d ? 1 : -1))[0];
  const mood = (m: number) => update((s) => { let en = s.journal.find((x) => x.d === t); if (!en) { en = { id: s.nid++, d: t, mood: 3, txt: "" }; s.journal.push(en); } en.mood = m; });
  return (
    <Card title="Journal" small={e ? "Logged today" : "Not logged"}>
      <T tone="muted" size="md" className="mb-2">How are you today?</T>
      <View className="flex-row gap-1.5" accessibilityLabel="Mood today">
        {[1, 2, 3, 4, 5].map((m) => (
          <Pressable key={m} onPress={() => mood(m)} accessibilityRole="button" accessibilityState={{ selected: e?.mood === m }}
            className={`min-h-hit flex-1 items-center justify-center rounded-sm border active:opacity-70 ${e?.mood === m ? "border-brand bg-brand" : "border-line bg-soft"}`}>
            <T size="xs" weight="600" tone={e?.mood === m ? "onBrand" : "muted"}>{MOODS[m]}</T>
          </Pressable>
        ))}
      </View>
      {last && last.txt ? <T tone="muted" size="md" className="mt-2.5">{dl(last.d)}: {last.txt.slice(0, 90)}{last.txt.length > 90 ? "..." : ""}</T> : null}
    </Card>
  );
}
export function JournalPage() {
  const { state } = useStore();
  const { openSheet } = useUi();
  const [q, setQ] = useState("");
  const ql = q.toLowerCase(), L = state.journal.filter((e) => (e.txt + " " + MOODS[e.mood]).toLowerCase().includes(ql)).sort((a, b) => (a.d < b.d ? 1 : -1));
  const wk = lastDays(7, () => 0)[0].k, m7 = state.journal.filter((e) => e.d >= wk && e.mood);
  return (
    <>
      <Stats items={[[state.journal.length, "Entries"], [m7.length ? num(m7.reduce((a, e) => a + e.mood, 0) / m7.length) : "–", "Avg mood, 7 days"], [state.journal.filter((e) => e.txt).length, "With notes"]]} />
      <Card title="Mood, last 14 days" small="1 rough to 5 great"><Bars data={lastDays(14, (k) => state.journal.find((x) => x.d === k)?.mood ?? 0)} /></Card>
      <Input value={q} onChangeText={setQ} placeholder="Search entries or moods" accessibilityLabel="Search journal" />
      <Card title="Entries" small="tap to edit">
        {L.length === 0 ? <Empty text="No entries." /> : L.map((e) => <Row key={e.id} title={e.txt || "No note"} sub={`${dl(e.d)} · ${MOODS[e.mood]}`} onPress={() => openSheet("journal", "", e.id)} />)}
      </Card>
    </>
  );
}

/* ---------------- Health ---------------- */
export const changeWater = (s: State, d: number) => { const t = todayKey(); s.health.water[t] = Math.max(0, (s.health.water[t] || 0) + d); syncWaterHabit(s); };
function Step({ label, plus, onPress }: { label: string; plus?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className={`h-10 w-10 items-center justify-center rounded-md active:opacity-70 ${plus ? "bg-brand" : "border border-line bg-soft"}`}>
      <T size="xl" weight="600" tone={plus ? "onBrand" : "ink"}>{plus ? "+" : "−"}</T>
    </Pressable>
  );
}
export function HealthCard() {
  const { state, update } = useStore();
  const t = todayKey(), w = water(state)(t), sl = state.health.sleep[t];
  return (
    <Card title="Health" small="Today">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 pr-3">
          <T size="xl" weight="700">{w}<T tone="muted"> / {state.waterTarget} glasses</T></T>
          <View className="mt-2"><Bar pct={(w / state.waterTarget) * 100} /></View>
        </View>
        <View className="flex-row gap-2"><Step label="Remove a glass" onPress={() => update((s) => changeWater(s, -1))} /><Step plus label="Add a glass" onPress={() => update((s) => changeWater(s, 1))} /></View>
      </View>
      <T tone="muted" size="md" className="mt-3">Sleep last night: {sl ? sl + " h" : "not logged"}</T>
    </Card>
  );
}
export function HealthPage() {
  const { state, update } = useStore();
  const { openSheet } = useUi();
  const t = todayKey(), w = water(state)(t), sl = lastDays(7, (k) => state.health.sleep[k] || 0), sv = sl.filter((d) => d.v);
  const [wt, setWt] = useState(String(state.waterTarget));
  const W = state.weight.slice().sort((a, b) => (a.d < b.d ? -1 : 1));
  const setTarget = (v: string) => { setWt(v); const n = parseInt(v, 10); if (n >= 1 && n <= 30) update((s) => { s.waterTarget = n; syncWaterHabit(s); }); };
  return (
    <>
      <Stats items={[[`${w}/${state.waterTarget}`, "Glasses today"], [state.health.sleep[t] ? state.health.sleep[t] + " h" : "–", "Sleep last night"], [W.length ? W[W.length - 1].v + " kg" : "–", "Weight"]]} />
      <Card title="Water" small={"daily target " + state.waterTarget}>
        <View className="flex-row justify-between items-center">
          <T size="xxl" weight="700">{w}</T>
          <View className="flex-row gap-2"><Step label="Remove a glass" onPress={() => update((s) => changeWater(s, -1))} /><Step plus label="Add a glass" onPress={() => update((s) => changeWater(s, 1))} /></View>
        </View>
        <View className="my-3"><Bars data={lastDays(7, water(state))} target={state.waterTarget} /></View>
        <View className="flex-row items-center justify-between gap-3">
          <T tone="muted" size="md">Daily target (glasses)</T>
          <Input value={wt} onChangeText={setTarget} keyboardType="number-pad" maxLength={2} accessibilityLabel="Daily water target" className="w-20 text-center" />
        </View>
      </Card>
      <Card title="Sleep" small={sv.length ? "avg " + num(sv.reduce((a, d) => a + d.v, 0) / sv.length) + " h" : ""}>
        <Bars data={sl} fmt={(n) => num(n) + " h"} target={8} />
        <Btn label="Log sleep" onPress={() => openSheet("sleep")} className="mt-3 self-start" />
      </Card>
      <Card title="Weight">
        {W.length > 1 ? <><LineChart values={W.map((x) => x.v)} unit="kg" /><T tone="muted" size="md" className="my-2">Change since first entry: {num(W[W.length - 1].v - W[0].v)} kg</T></> : null}
        {W.slice().reverse().slice(0, 5).map((x) => <Row key={x.id} title={dl(x.d)} right={<T weight="600">{x.v} kg</T>} onPress={() => openSheet("weight", "", x.id)} />)}
        <Btn label="Log weight" onPress={() => openSheet("weight")} className="mt-3 self-start" />
      </Card>
    </>
  );
}
