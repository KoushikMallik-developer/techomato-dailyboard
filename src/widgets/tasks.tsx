import { useState } from "react";
import { Btn, Card, Day, Empty, Input, QuickAdd, Seg, Stats } from "../components/ui";
import { ago, dateKey, todayKey } from "../lib/date";
import { agoTxt, dl, dueTxt, setTaskDone, sortOpen } from "../lib/logic";
import { useStore } from "../store/store";
import { Task, TaskListKey } from "../store/types";
import { useUi } from "../store/ui";
import { CheckRow, MoreLink, PrioTag } from "./shared";

export function useTaskToggle() {
  const { update } = useStore();
  return (list: TaskListKey, id: number) => update((s) => { const t = s[list].find((y) => y.id === id); if (t) setTaskDone(s, t, t.x ? 0 : 1); });
}
const open = (l: Task[]) => l.filter((t) => !t.x).sort(sortOpen);

export function TasksCard({ list, title }: { list: TaskListKey; title: string }) {
  const { state } = useStore();
  const toggle = useTaskToggle();
  const o = open(state[list]);
  return (
    <Card title={title} small={`${o.length} open`}>
      {o.length === 0 ? <Empty text="All clear." /> : o.slice(0, 4).map((t) => { const d = dueTxt(t); return <CheckRow key={t.id} on={false} onToggle={() => toggle(list, t.id)} label={`Mark done: ${t.t}`} title={t.t} sub={d.text} subTone={d.late ? "bad" : "muted"} tag={<PrioTag p={t.p} />} />; })}
      {o.length > 4 ? <MoreLink to={list} n={o.length - 4} /> : null}
    </Card>
  );
}

export function TasksPage({ list }: { list: TaskListKey }) {
  const { state, update } = useStore();
  const { openSheet } = useUi();
  const toggle = useTaskToggle();
  const [tab, setTab] = useState<"open" | "done">("open");
  const [text, setText] = useState(""), [q, setQ] = useState(""), [sure, setSure] = useState(false);
  const all = state[list], today = todayKey(), wk = dateKey(ago(6)), ql = q.toLowerCase();
  const o = open(all).filter((t) => t.t.toLowerCase().includes(ql));
  const d = all.filter((t) => t.x && t.t.toLowerCase().includes(ql)).sort((a, b) => ((a.f ?? "") < (b.f ?? "") ? 1 : -1));
  const add = () => { const t = text.trim(); if (!t) return; update((s) => { s[list].unshift({ id: s.nid++, t, p: "m", due: "", c: today, x: 0, f: null, cal: "", time: "" }); }); setText(""); };
  const clear = () => { if (!sure) { setSure(true); return; } update((s) => { s[list] = s[list].filter((t) => !t.x); }); setSure(false); }; // linked events of removed tasks are dropped by the store
  return (
    <>
      <Stats items={[[open(all).length, "Open"], [all.filter((t) => !t.x && t.due && t.due < today).length, "Overdue"], [all.filter((t) => t.x && (t.f ?? "") >= wk).length, "Done, 7 days"]]} />
      <QuickAdd value={text} onChange={setText} onAdd={add} placeholder={`Quick add a ${list} task`} />
      <Seg value={tab} onChange={(v) => { setTab(v); setSure(false); }} options={[["open", "Open"], ["done", "Completed history"]]} />
      <Input value={q} onChangeText={setQ} placeholder="Search tasks" accessibilityLabel="Search tasks" />
      <Card>
        {tab === "open" ? (o.length ? o.map((t) => {
          const dt = dueTxt(t);
          return <CheckRow key={t.id} on={false} onToggle={() => toggle(list, t.id)} label={`Mark done: ${t.t}`} title={t.t} sub={(dt.text || "No due date") + (t.cal ? " · On calendar" : "")} subTone={dt.late ? "bad" : "muted"} tag={<PrioTag p={t.p} />} onPress={() => openSheet("task", list, t.id)} />;
        }) : <Empty text="Nothing here." />) : d.length ? (
          <>
            {d.map((t, i) => {
              const head = i === 0 || d[i - 1].f !== t.f ? <Day key={"d" + t.id} label={dl(t.f ?? todayKey())} /> : null;
              return [head, <CheckRow key={t.id} on onToggle={() => toggle(list, t.id)} label={`Reopen: ${t.t}`} title={t.t} sub={"Added " + agoTxt(t.c)} tag={<PrioTag p={t.p} />} onPress={() => openSheet("task", list, t.id)} />];
            })}
            <Btn label={sure ? `Confirm: remove ${d.length}` : "Clear completed"} ghost={!sure} danger={sure} onPress={clear} className="mt-4" />
          </>
        ) : <Empty text="Nothing completed yet." />}
      </Card>
    </>
  );
}
