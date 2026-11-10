import { useState } from "react";
import { View } from "react-native";
import { Bars } from "../components/charts";
import { Bar, BigNum, Btn, Card, Chip, Chips, Day, Empty, Input, LinkBtn, Note, Row, Seg, Stats, T, Tag } from "../components/ui";
import { fromKey, todayKey } from "../lib/date";
import { budgetRows, CATS, daysTo, dateLabel, dl, dleft, inTxt, lastDays, learnNeed, lmin, lstreak, money, monthSum, nextOcc, num, spentOn } from "../lib/logic";
import { useStore } from "../store/store";
import { YDate } from "../store/types";
import { useUi } from "../store/ui";
import { MoreLink } from "./shared";

/* ---------------- Money ---------------- */
export function SpendCard() {
  const { state } = useStore();
  const m = monthSum(state, "x"), pct = Math.min(100, (m / state.budget) * 100), over = budgetRows(state).filter((r) => r.limit && r.pct >= 100);
  return (
    <Card title="Money" small={money(state, state.budget) + " budget"}>
      <View className="flex-row justify-between">
        <BigNum label="Today" value={money(state, spentOn(state)(todayKey()))} />
        <BigNum label="This month" value={money(state, m)} />
      </View>
      <View className="mt-3"><Bar pct={pct} /></View>
      {over.length ? <T size="md" tone="bad" className="mt-2">{over.map((r) => r.c).join(", ")} over limit</T> : null}
    </Card>
  );
}
export function SpendPage() {
  const { state, update } = useStore();
  const { openSheet } = useUi();
  const [cat, setCat] = useState("All"), [bud, setBud] = useState(String(state.budget));
  const m = monthSum(state, "x"), inc = monthSum(state, "i"), pct = Math.min(100, (m / state.budget) * 100), sp = spentOn(state);
  const rows = budgetRows(state); // fixed order, so a row does not jump while its limit is typed
  const setLimit = (c: string, v: string) => update((s) => { const n = parseFloat(v); if (v.trim() === "") delete s.catBudgets[c]; else if (n >= 0) s.catBudgets[c] = n; });
  const L = state.spend.filter((e) => cat === "All" || e.c === cat || (cat === "Income" && e.k === "i")).sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : b.id - a.id));
  return (
    <>
      <Stats items={[[money(state, sp(todayKey())), "Spent today"], [money(state, m), "Spent this month"], [money(state, inc - m), "Net this month"]]} />
      <Card title="Budget" small={`${Math.round(pct)}% used`}>
        <Bar pct={pct} />
        <View className="flex-row justify-between items-center mt-3 gap-3">
          <T tone={m > state.budget ? "bad" : "muted"} size="md" className="flex-1">{m > state.budget ? "Over by " + money(state, m - state.budget) : money(state, state.budget - m) + " left"}</T>
          <Input value={bud} onChangeText={(v) => { setBud(v); const n = parseFloat(v); if (n >= 0) update((s) => { s.budget = n; }); }} keyboardType="numeric" accessibilityLabel="Monthly budget" className="w-[110px]" />
        </View>
      </Card>
      <Card title="Last 14 days" small="expenses"><Bars data={lastDays(14, sp)} fmt={(n) => money(state, n)} /></Card>
      <Card title="By category" small="this month · set a limit for any">
        {rows.map((r) => (
          <View key={r.c} className="gap-2 py-2">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <T weight="500">{r.c}</T>
                <T size="sm" tone={r.pct >= 100 ? "bad" : "muted"}>{r.limit ? (r.pct >= 100 ? `${money(state, r.spent - r.limit)} over` : `${money(state, r.spent)} of ${money(state, r.limit)} · ${money(state, r.limit - r.spent)} left`) : `${money(state, r.spent)} spent, no limit`}</T>
              </View>
              <Input defaultValue={r.limit ? String(r.limit) : ""} onChangeText={(v) => setLimit(r.c, v)} placeholder="No limit" keyboardType="numeric" accessibilityLabel={`${r.c} monthly limit`} className="w-28 text-right" />
            </View>
            {r.limit || r.spent ? <Bar pct={r.limit ? r.pct : m ? (r.spent / m) * 100 : 0} tone={r.pct >= 100 ? "bad" : r.pct >= 80 ? "warn" : undefined} /> : null}
          </View>
        ))}
        <Note>{"Without a limit the bar shows that category's share of this month's spending."}</Note>
      </Card>
      <Card title="History" small="tap to edit">
        <Chips>{["All", ...CATS, "Income"].map((k) => <Chip key={k} label={k} on={cat === k} onPress={() => setCat(k)} />)}</Chips>
        {L.length === 0 ? <Empty text="No entries." /> : L.map((e, i) => {
          const head = i === 0 || L[i - 1].d !== e.d ? <Day key={"d" + e.id} label={dl(e.d)} right={money(state, sp(e.d))} /> : null;
          return [head, <Row key={e.id} title={e.l || "Entry"} sub={e.c + (e.bid ? " · paid from Bills" : "")} onPress={() => openSheet("spend", "", e.id)} right={<T weight="600" tone={e.k === "i" ? "ok" : "ink"}>{e.k === "i" ? "+" : ""}{money(state, e.a)}</T>} />];
        })}
      </Card>
    </>
  );
}

/* ---------------- Goals ---------------- */
export function GoalsCard() {
  const { state } = useStore();
  return (
    <Card title="Goals" small={`${state.goals.length} active`}>
      {state.goals.length === 0 ? <Empty text="No goals yet." /> : state.goals.slice(0, 3).map((g) => { const p = Math.min(100, (g.cur / g.target) * 100); return (
        <View key={g.id} className="mt-2 gap-1.5">
          <View className="flex-row justify-between"><T weight="500">{g.t}</T><T tone="muted" size="md">{Math.round(p)}%</T></View><Bar pct={p} />
        </View>
      ); })}
    </Card>
  );
}
export function GoalsPage() {
  const { state } = useStore();
  const { openSheet } = useUi();
  const G = state.goals;
  return (
    <>
      <Stats items={[[G.length, "Goals"], [G.filter((g) => g.cur >= g.target).length, "Reached"], [Math.round((G.reduce((a, g) => a + Math.min(1, g.cur / g.target), 0) / (G.length || 1)) * 100) + "%", "Avg progress"]]} />
      {G.length === 0 ? <Card><Empty text="No goals yet. Tap Add." /></Card> : null}
      {G.map((g) => {
        const p = Math.min(100, (g.cur / g.target) * 100), left = g.due ? Math.round((+fromKey(g.due) - +fromKey(todayKey())) / 864e5) : null;
        const need = left !== null && left > 0 && g.cur < g.target ? `${num((g.target - g.cur) / left)} ${g.unit} per day to finish on time` : "";
        return (
          <Card key={g.id}>
            <View className="flex-row justify-between gap-3">
              <View className="flex-1"><T weight="600">{g.t}</T><T size="sm" tone="muted">{num(g.cur)} of {num(g.target)} {g.unit}{left !== null ? " · " + (left < 0 ? "past target date" : left + " days left") : ""}</T></View>
              <LinkBtn label="Edit" onPress={() => openSheet("goal", "", g.id)} />
            </View>
            <View className="my-3"><Bar pct={p} /></View>
            <View className="flex-row justify-between items-center gap-3">
              <T size="md" tone="muted" className="flex-1">{Math.round(p)}%{need ? " · " + need : ""}</T>
              <Btn label="Log progress" onPress={() => openSheet("glog", String(g.id))} />
            </View>
            {g.log.length ? <><T weight="600" className="mt-3">Recent progress</T>{g.log.slice().sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 3).map((l, i) => <Row key={i} title={dl(l.d)} right={<T weight="600">+{num(l.v)} {g.unit}</T>} />)}</> : null}
          </Card>
        );
      })}
    </>
  );
}

/* ---------------- Learning ---------------- */
export function LearnCard() {
  const { state } = useStore();
  const act = state.learn.filter((l) => l.st === "active"), wk = lastDays(7, lmin(state)).reduce((a, d) => a + d.v, 0), ls = lstreak(state);
  return (
    <Card title="Learning" small={`${act.length} active`}>
      {act.length ? act.slice(0, 3).map((l) => { const p = Math.min(100, (l.done / l.total) * 100); return (
        <View key={l.id} className="mt-2 gap-1.5"><View className="flex-row justify-between"><T weight="500">{l.t}</T><T tone="muted" size="md">{Math.round(p)}%</T></View><Bar pct={p} /></View>
      ); }) : <Empty text="Nothing in progress." />}
      <Note>{wk} min this week{ls ? ` · ${ls}-day study streak` : ""}</Note>
    </Card>
  );
}
export function LearnPage() {
  const { state } = useStore();
  const { openSheet } = useUi();
  const [tab, setTab] = useState<"active" | "done">("active");
  const by = (f: "active" | "done") => state.learn.filter((l) => (f === "done" ? l.st === "done" : l.st !== "done"));
  const L = by(tab).sort((a, b) => (tab === "done" ? ((a.f || "") < (b.f || "") ? 1 : -1) : (a.due || "9999").localeCompare(b.due || "9999")));
  return (
    <>
      <Stats items={[[state.learn.filter((l) => l.st === "active").length, "In progress"], [lastDays(7, lmin(state)).reduce((a, d) => a + d.v, 0), "Minutes this week"], [lstreak(state), "Day streak"]]} />
      <Card title="Study time" small="minutes, last 14 days"><Bars data={lastDays(14, lmin(state))} fmt={(n) => n + " min"} /></Card>
      <Seg value={tab} onChange={setTab} options={[["active", `In progress ${by("active").length}`], ["done", `Finished ${by("done").length}`]]} />
      {L.length === 0 ? <Card><Empty text={tab === "done" ? "Nothing finished yet." : "Nothing in progress. Tap Add."} /></Card> : L.map((l) => {
        const p = Math.min(100, (l.done / l.total) * 100), left = l.due && l.st !== "done" ? dleft(l.due) : "", need = learnNeed(l), mins = l.log.reduce((a, x) => a + (x.m || 0), 0);
        return (
          <Card key={l.id}>
            <View className="flex-row justify-between gap-3">
              <View className="flex-1 gap-1">
                <View className="flex-row gap-1.5 flex-wrap items-center"><T weight="600">{l.t}</T><Tag label={l.kind} />{l.st === "paused" ? <Tag label="Paused" tone="m" /> : null}</View>
                <T size="sm" tone="muted">{l.src ? l.src + " · " : ""}{num(l.done)} of {num(l.total)} {l.unit}{left ? " · " + left : ""}{l.st === "done" && l.f ? " · finished " + dl(l.f) : ""}</T>
              </View>
              <LinkBtn label="Edit" onPress={() => openSheet("learn", "", l.id)} />
            </View>
            <View className="my-3"><Bar pct={p} /></View>
            <View className="flex-row justify-between items-center gap-3">
              <T size="md" tone="muted" className="flex-1">{Math.round(p)}%{need ? " · " + need : ""}{mins ? ` · ${Math.floor(mins / 60)}h ${mins % 60}m studied` : ""}</T>
              {l.st === "done" ? null : <Btn label="Log session" onPress={() => openSheet("llog", String(l.id))} />}
            </View>
            {l.note ? <Note>{l.note}</Note> : null}
            {l.log.length ? <><T weight="600" className="mt-3">Recent sessions</T>{l.log.slice().sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 3).map((x, i) => <Row key={i} title={dl(x.d) + (x.m ? " · " + x.m + " min" : "")} right={<T weight="600">+{num(x.v)} {l.unit}</T>} />)}</> : null}
          </Card>
        );
      })}
    </>
  );
}

/* ---------------- Yearly dates ---------------- */
export function DateRow({ id }: { id: number }) {
  const { state } = useStore();
  const { openSheet } = useUi();
  const x = state.dates.find((d) => d.id === id)!, n = daysTo(x), nk = nextOcc(x);
  return (
    <Row title={x.n} sub={`${fromKey(nk).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${x.kind === "Other" ? "" : x.kind + " · "}${dateLabel(x, Number(nk.slice(0, 4)))}`}
      right={<Tag label={inTxt(n)} tone={n === 0 ? "ok" : n <= x.rem ? "m" : ""} />} onPress={() => openSheet("date", "", x.id)} />
  );
}
export function DatesCard() {
  const { state } = useStore();
  const L = state.dates.slice().sort((a, b) => daysTo(a) - daysTo(b));
  return (
    <Card title="Yearly dates" small={`${state.dates.filter((x) => daysTo(x) <= 30).length} in 30 days`}>
      {L.length ? L.slice(0, 3).map((x) => <DateRow key={x.id} id={x.id} />) : <Empty text="No dates yet." />}
      {L.length > 3 ? <MoreLink to="dates" n={L.length - 3} /> : null}
    </Card>
  );
}
const monthOf = (x: YDate) => { const nk = nextOcc(x); return fromKey(nk).toLocaleDateString(undefined, { month: "long" }) + (nk.slice(0, 4) !== todayKey().slice(0, 4) ? " " + nk.slice(0, 4) : ""); };
export function DatesPage() {
  const { state } = useStore();
  const [kind, setKind] = useState("All");
  const all = state.dates.slice().sort((a, b) => daysTo(a) - daysTo(b)), L = all.filter((x) => kind === "All" || x.kind === kind);
  const first = all[0] ? ((n) => (n === 0 ? "Today" : n + (n === 1 ? " day" : " days")))(daysTo(all[0])) : "–";
  return (
    <>
      <Stats items={[[first, "Until next"], [all.filter((x) => daysTo(x) <= 30).length, "In next 30 days"], [all.length, "Saved dates"]]} />
      {all.length ? <Note>Next: {all[0].n}</Note> : null}
      <Chips>{[["All", "All"], ["Birthday", "Birthdays"], ["Anniversary", "Anniversaries"], ["Other", "Other"]].map((k) => <Chip key={k[0]} label={k[1]} on={kind === k[0]} onPress={() => setKind(k[0])} />)}</Chips>
      <Card title="Coming up" small="tap to edit">
        {L.length === 0 ? <Empty text="No dates here. Tap Add." /> : L.map((x, i) => {
          const head = i === 0 || monthOf(L[i - 1]) !== monthOf(x) ? <Day key={"m" + x.id} label={monthOf(x)} /> : null;
          return [head, <DateRow key={x.id} id={x.id} />];
        })}
      </Card>
      <Note>These repeat every year. Each one sends a notification at 9:00 on the day you chose (allow notifications in Alarms).</Note>
    </>
  );
}

