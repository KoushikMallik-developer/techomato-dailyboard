import { View } from "react-native";
import { Bar, Btn, Card, Empty, Note, Row, Stats, Tag } from "../components/ui";
import { ago, dateKey, todayKey } from "../lib/date";
import { dl, dnum, money } from "../lib/logic";
import { useStore } from "../store/store";
import { Med, Trip } from "../store/types";
import { useUi } from "../store/ui";
import { CheckRow, MoreLink } from "./shared";

/* ---------------- Documents and vehicle ---------------- */
const dtag = (exp: string, lead: number) => { const n = dnum(exp); return <Tag label={n < 0 ? "Expired" : n === 0 ? "Today" : `${n}d left`} tone={n < 0 ? "h" : n <= lead ? "m" : ""} />; };

export function DocsCard() {
  const { state } = useStore();
  const { openSheet } = useUi();
  const L = state.docs.slice().sort((a, b) => (a.exp < b.exp ? -1 : 1)), due = L.filter((d) => dnum(d.exp) <= d.lead).length;
  return (
    <Card title="Documents" small={due ? `${due} need attention` : undefined}>
      {L.length === 0 ? <Empty text="No documents yet." /> : L.slice(0, 3).map((d) => <Row key={d.id} title={d.n} sub={`${d.kind} · ${dl(d.exp)}`} right={dtag(d.exp, d.lead)} onPress={() => openSheet("doc", "", d.id)} />)}
      {L.length > 3 ? <MoreLink to="docs" n={L.length - 3} /> : null}
    </Card>
  );
}

export function DocsPage() {
  const { state } = useStore();
  const { openSheet } = useUi();
  const L = state.docs.slice().sort((a, b) => (a.exp < b.exp ? -1 : 1));
  return (
    <>
      <Stats items={[[L.length, "Tracked"], [L.filter((d) => dnum(d.exp) <= d.lead && dnum(d.exp) >= 0).length, "Expiring soon"], [L.filter((d) => dnum(d.exp) < 0).length, "Expired"]]} />
      <Card title="All documents">
        {L.length === 0 ? <Empty text="Add insurance, licence, PUC, warranty or passport. Tap + Add." /> : L.map((d) => <Row key={d.id} title={d.n} sub={`${d.kind} · expires ${dl(d.exp)}`} right={dtag(d.exp, d.lead)} onPress={() => openSheet("doc", "", d.id)} />)}
      </Card>
      <Note>You get a reminder at 09:00, the number of days before expiry that you chose for each one, and again on the day.</Note>
    </>
  );
}

/* ---------------- Trips ---------------- */
const packed = (t: Trip) => `${t.items.filter((i) => i.x).length}/${t.items.length} packed`;
const ordered = (L: Trip[]) => { const t = todayKey(); return L.slice().sort((a, b) => Number(a.to < t) - Number(b.to < t) || (a.from < b.from ? -1 : 1)); };
const when = (t: Trip) => `${dl(t.from)} to ${dl(t.to)}`;

export function TripsCard() {
  const { state } = useStore();
  const { openSheet } = useUi();
  const t0 = todayKey(), L = ordered(state.trips).filter((t) => t.to >= t0);
  return (
    <Card title="Trips" small={L.length ? `${L.length} coming up` : undefined}>
      {L.length === 0 ? <Empty text="No trips planned." /> : L.slice(0, 2).map((t) => { const n = dnum(t.from); return <Row key={t.id} title={t.n} sub={`${when(t)} · ${packed(t)}`} right={<Tag label={n <= 0 ? "Now" : `In ${n}d`} tone={n <= 7 ? "m" : ""} />} onPress={() => openSheet("trip", "", t.id)} />; })}
      {L.length > 2 ? <MoreLink to="trips" n={L.length - 2} /> : null}
    </Card>
  );
}

export function TripsPage() {
  const { state, update } = useStore();
  const { openSheet } = useUi();
  const L = ordered(state.trips);
  if (L.length === 0) return <Card title="Trips"><Empty text="No trips yet. Tap + Add." /></Card>;
  return (
    <>
      {L.map((t) => (
        <Card key={t.id} title={t.n} small={when(t)}>
          {t.budget ? <View className="gap-1.5 pb-2"><Bar pct={(t.spent / t.budget) * 100} tone={t.spent > t.budget ? "bad" : undefined} /><Note>{money(state, t.spent)} of {money(state, t.budget)} budget</Note></View> : null}
          {t.items.length === 0 ? <Empty text="No packing items." /> : t.items.map((i) => (
            <CheckRow key={i.id} on={!!i.x} label={`${i.x ? "Unpack" : "Packed"}: ${i.t}`} title={i.t} onPress={() => openSheet("titem", String(t.id), i.id)}
              onToggle={() => update((s) => { const it = s.trips.find((y) => y.id === t.id)?.items.find((y) => y.id === i.id); if (it) it.x = it.x ? 0 : 1; })} />
          ))}
          <View className="flex-row gap-2 pt-3"><Btn small ghost label="Add item" onPress={() => openSheet("titem", String(t.id))} /><Btn small ghost label="Edit trip" onPress={() => openSheet("trip", "", t.id)} /></View>
        </Card>
      ))}
    </>
  );
}

/* ---------------- Medicines ---------------- */
const times = (m: Med) => [...new Set([m.t1, m.t2, m.t3].filter(Boolean))].sort(); // the same time twice counts once
const label = (m: Med) => (m.dose ? `${m.n} · ${m.dose}` : m.n);

/** Today's doses, earliest first. */
export function useDoses() {
  const { state, update } = useStore();
  const k = todayKey();
  const slots = state.meds.filter((m) => m.act).flatMap((m) => times(m).map((t) => ({ m, t, on: !!m.taken[k]?.includes(t) }))).sort((a, b) => (a.t < b.t ? -1 : 1));
  const toggle = (id: number, t: string) => update((s) => {
    const m = s.meds.find((x) => x.id === id);
    if (!m) return;
    const a = (m.taken[k] ??= []), i = a.indexOf(t);
    if (i < 0) a.push(t); else a.splice(i, 1);
    const old = dateKey(ago(14));
    Object.keys(m.taken).forEach((d) => { if (d < old) delete m.taken[d]; }); // keep two weeks
  });
  return { slots, toggle, done: slots.filter((x) => x.on).length };
}

export function MedsCard() {
  const { slots, toggle, done } = useDoses();
  return (
    <Card title="Medicines" small={slots.length ? `${done}/${slots.length} taken today` : undefined}>
      {slots.length === 0 ? <Empty text="No medicines yet." /> : slots.slice(0, 4).map((x) => <CheckRow key={x.m.id + x.t} on={x.on} label={`${x.on ? "Not taken" : "Taken"}: ${x.m.n} at ${x.t}`} title={label(x.m)} sub={x.t} onToggle={() => toggle(x.m.id, x.t)} />)}
      {slots.length > 4 ? <MoreLink to="meds" n={slots.length - 4} /> : null}
    </Card>
  );
}

export function MedsPage() {
  const { state } = useStore();
  const { openSheet } = useUi();
  const { slots, toggle, done } = useDoses();
  return (
    <>
      <Card title="Today" small={slots.length ? `${done}/${slots.length} taken` : undefined}>
        {slots.length === 0 ? <Empty text="No doses today." /> : slots.map((x) => <CheckRow key={x.m.id + x.t} on={x.on} label={`${x.on ? "Not taken" : "Taken"}: ${x.m.n} at ${x.t}`} title={label(x.m)} sub={x.t} onToggle={() => toggle(x.m.id, x.t)} />)}
      </Card>
      <Card title="All medicines">
        {state.meds.length === 0 ? <Empty text="Tap + Add." /> : state.meds.map((m) => <Row key={m.id} title={label(m)} done={!m.act} sub={times(m).join(", ")} right={m.act ? undefined : <Tag label="Paused" />} onPress={() => openSheet("med", "", m.id)} />)}
      </Card>
      <Note>{"You get phone reminders for your next few days of doses. Ticking a dose cancels its reminder. Open the app every couple of days to keep them coming."}</Note>
    </>
  );
}
