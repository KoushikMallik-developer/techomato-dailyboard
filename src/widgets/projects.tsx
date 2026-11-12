import { ReactNode, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { Bars } from "../components/charts";
import { Bar, Btn, Card, Chip, Chips, Empty, Input, LinkBtn, Note as NoteText, QuickAdd, Row, Seg, Stats, T, Tag } from "../components/ui";
import { ago, dateKey, todayKey } from "../lib/date";
import { byId, dl, dleft, dnum, lastDays, num, phealth, pHours, pOver, pPct, PST, setTaskDone } from "../lib/logic";
import { useStore } from "../store/store";
import { Note as NoteT, Project } from "../store/types";
import { useUi } from "../store/ui";
import { space } from "../theme/tokens";
import { go, CheckRow } from "./shared";
import { NoteRow, useOpenNote } from "./notes";

const PTONE = { active: "b", idea: "", hold: "m", done: "ok" } as const;
const PPR = { h: "High", m: "Medium", l: "Low" } as const;
const byDue = (a: { due: string }, b: { due: string }) => (a.due || "9999").localeCompare(b.due || "9999");

export function useOpenProject() {
  const { set } = useUi();
  return (id: number) => { set({ pid: id, pview: "detail", sheet: null }); go("proj"); };
}

function ProjRow({ p, board }: { p: Project; board?: boolean }) {
  const open = useOpenProject();
  const pc = pPct(p), nx = p.tasks.filter((t) => !t.x).sort(byDue)[0], hl = phealth(p);
  return (
    <Pressable onPress={() => open(p.id)} accessibilityRole="button" className="py-2 gap-1">
      <View className="flex-row gap-1.5 flex-wrap items-center">
        <T weight="600">{p.t}</T>{p.pr === "h" ? <Tag label="High" tone="h" /> : null}{hl && !board ? <Tag label={hl[0]} tone={hl[1]} /> : null}
      </View>
      <T size="sm" tone="muted">{p.tasks.length ? `${pc}% · ${p.tasks.filter((t) => t.x).length}/${p.tasks.length} tasks` : "No tasks yet"}{p.due && p.st !== "done" ? " · " + dleft(p.due) : ""}</T>
      {nx && p.st !== "done" && !board ? <T size="sm" tone="muted">Next: {nx.t}</T> : null}
      <Bar pct={pc} />
    </Pressable>
  );
}

export function ProjCard() {
  const { state } = useStore();
  const L = state.proj.filter((p) => p.st === "active").sort(byDue), late = state.proj.reduce((a, p) => a + pOver(p).length, 0);
  return (
    <Card title="Projects" small={`${L.length} in progress`}>
      {L.length ? L.slice(0, 3).map((p) => <ProjRow key={p.id} p={p} />) : <Empty text="No project in progress." />}
      {late ? <T size="sm" tone="bad">{late} overdue project {late === 1 ? "task" : "tasks"}</T> : null}
    </Card>
  );
}

function Hd({ title, small, action }: { title: string; small: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-center mb-2">
      <T weight="600" className="flex-1">{title} <T size="sm" tone="muted">{small}</T></T>{action}
    </View>
  );
}

function Detail({ id }: { id: number }) {
  const { state, update } = useStore();
  const { set, openSheet } = useUi();
  const openNote = useOpenNote();
  const [up, setUp] = useState(""), [tk, setTk] = useState(""), [delUp, setDelUp] = useState(-1); // delUp: the log entry waiting for a second tap to delete
  const p = byId(state.proj, id);
  if (!p) return null;
  const mut = (fn: (x: Project) => void) => update((s) => { const x = byId(s.proj, id); if (x) fn(x); });
  const pc = pPct(p), tl = p.tasks.length, dn = p.tasks.filter((t) => t.x).length, hl = phealth(p), hrs = pHours(p), late = pOver(p).length, today = todayKey();
  const rk = { h: 0, m: 1, l: 2 };
  const ms = p.ms.slice().sort((a, b) => a.x - b.x || byDue(a, b));
  const ts = p.tasks.slice().sort((a, b) => a.x - b.x || byDue(a, b) || rk[a.p || "m"] - rk[b.p || "m"]);
  const nts = state.notes.filter((n) => n.pid === p.id && n.st === "on");
  return (
    <>
      <View className="flex-row justify-between items-center min-h-hit">
        <LinkBtn tone="brand" label="‹ Projects" onPress={() => set({ pview: "list" })} />
        <View className="flex-row gap-4">
          <LinkBtn tone="brand" label="Duplicate" onPress={() => { let nid = 0; update((s) => { const x = byId(s.proj, id)!, cp: Project = JSON.parse(JSON.stringify(x)); cp.id = s.nid++; nid = cp.id; cp.t = x.t + " (copy)"; cp.st = "idea"; cp.c = todayKey(); cp.ups = []; cp.time = []; cp.ms.forEach((m) => { m.id = s.nid++; m.x = 0; }); cp.tasks.forEach((t) => { t.id = s.nid++; t.x = 0; t.f = null; delete t.ptid; }); cp.links.forEach((l) => { l.id = s.nid++; }); s.proj.unshift(cp); }); set({ pid: nid }); }} />
          <LinkBtn tone="brand" label="Edit" onPress={() => openSheet("proj", "", p.id)} />
        </View>
      </View>
      <T size="xxl" weight="700">{p.t}</T>
      <Chips><Tag label={PST.find((s) => s[0] === p.st)![1]} tone={PTONE[p.st]} /><Tag label={PPR[p.pr] + " priority"} tone={p.pr === "h" ? "h" : p.pr === "m" ? "m" : ""} /><Tag label={p.cat} />{hl && p.st !== "done" ? <Tag label={hl[0]} tone={hl[1]} /> : null}</Chips>
      {p.desc ? <T>{p.desc}</T> : null}
      <Stats items={[[pc + "%", "Complete"], [p.due ? (dnum(p.due) < 0 ? "Late" : dnum(p.due)) : "–", p.due ? "Days left" : "No target"], [tl - dn, "Open tasks"]]} />
      <Bar pct={pc} />
      <NoteText>{p.start ? "Started " + dl(p.start) + ". " : ""}{p.due ? "Target " + dl(p.due) + ". " : ""}{late ? late + " overdue " + (late === 1 ? "task" : "tasks") + ". " : ""}{hrs ? num(hrs) + " hours logged." : ""}</NoteText>
      <Seg value={p.st} onChange={(v) => mut((x) => { x.st = v; })} options={PST.map((s) => [s[0], s[1]] as [Project["st"], string])} />

      <Card>
        <Hd title="Milestones" small={`${p.ms.filter((m) => m.x).length}/${p.ms.length}`} action={<LinkBtn tone="brand" label="Add" onPress={() => openSheet("pms", String(p.id))} />} />
        {ms.length ? ms.map((m) => <CheckRow key={m.id} on={!!m.x} label={`${m.x ? "Reopen" : "Complete"}: ${m.t}`} title={m.t} sub={m.due ? (m.x ? dl(m.due) : dleft(m.due)) : ""} onPress={() => openSheet("pms", String(p.id), m.id)} onToggle={() => mut((x) => { const y = byId(x.ms, m.id); if (y) y.x = y.x ? 0 : 1; })} />) : <Empty text="No milestones. Add the big checkpoints." />}
      </Card>

      <Card>
        <Hd title="Tasks" small={`${dn}/${tl} done`} />
        {ts.length ? ts.map((t) => {
          const pl = t.ptid ? byId(state.personal, t.ptid) : null, over = !t.x && t.due && t.due < today;
          return (
            <View key={t.id}>
              <CheckRow on={!!t.x} label={`${t.x ? "Reopen" : "Complete"}: ${t.t}`} title={t.t} sub={t.due ? (over ? dleft(t.due) : dl(t.due)) : ""} subTone={over ? "bad" : "muted"} tag={t.p === "h" && !t.x ? <Tag label="High" tone="h" /> : undefined}
                onPress={() => openSheet("ptask", String(p.id), t.id)}
                onToggle={() => update((s) => { const x = byId(s.proj, id); const y = x && byId(x.tasks, t.id); if (!x || !y) return; y.x = y.x ? 0 : 1; y.f = y.x ? todayKey() : null; const l = y.ptid ? byId(s.personal, y.ptid) : null; if (l) setTaskDone(s, l, y.x); })} />
              {!t.x ? <View className="ml-[34px] mb-1">{pl ? <T size="sm" tone="muted">In Personal tasks</T> : <LinkBtn tone="brand" label="Add to my tasks" onPress={() => update((s) => { const x = byId(s.proj, id); const y = x && byId(x.tasks, t.id); if (!y) return; const n = { id: s.nid++, t: y.t, p: y.p || "m", due: y.due || "", c: todayKey(), x: 0 as const, f: null, cal: "" as const, time: "" }; s.personal.unshift(n); y.ptid = n.id; })} />}</View> : null}
            </View>
          );
        }) : <Empty text="No tasks yet." />}
        <QuickAdd value={tk} onChange={setTk} placeholder="Add a task" onAdd={() => { const v = tk.trim(); if (!v) return; update((s) => { const x = byId(s.proj, id); if (x) x.tasks.push({ id: s.nid++, t: v, x: 0, p: "m", due: "", f: null }); }); setTk(""); }} />
        {tl && dn === tl && p.st === "active" ? <Btn label="All tasks done. Mark project done" onPress={() => mut((x) => { x.st = "done"; })} className="mt-3" /> : null}
      </Card>

      <Card>
        <Hd title="Time spent" small={`${num(hrs)} h total`} action={<LinkBtn tone="brand" label="Log time" onPress={() => openSheet("ptime", String(p.id))} />} />
        <Bars data={lastDays(7, (k) => p.time.filter((x) => x.d === k).reduce((a, x) => a + x.h, 0))} fmt={(n) => num(n) + " h"} />
        {p.time.slice().sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 4).map((x) => <Row key={x.id} title={x.t || "Work session"} sub={dl(x.d)} right={<T weight="600">{num(x.h)} h</T>} onPress={() => openSheet("ptime", String(p.id), x.id)} />)}
      </Card>

      <Card>
        <Hd title="Notes" small={String(nts.length)} action={<LinkBtn tone="brand" label="New note" onPress={() => { let nid = 0; update((s) => { const x = byId(s.proj, id)!; if (!s.nfold.includes("Projects")) s.nfold.push("Projects"); const n: NoteT = { id: s.nid++, t: x.t + " notes", body: "", items: [], lab: "Projects", pin: 0, st: "on", rem: "", m: Date.now(), tr: 0, pid: x.id }; s.notes.unshift(n); nid = n.id; }); set({ nfolder: "Projects" }); openNote(nid); }} />} />
        {nts.length ? nts.map((n) => <NoteRow key={n.id} n={n} onOpen={() => openNote(n.id)} />) : <Empty text="Keep project notes in the Notes widget." />}
      </Card>

      <Card>
        <Hd title="Links" small={String(p.links.length)} action={<LinkBtn tone="brand" label="Add" onPress={() => openSheet("plink", String(p.id))} />} />
        {p.links.length ? p.links.map((l) => /^https?:\/\//i.test(l.u) ? (
          <View key={l.id} className="flex-row justify-between items-center min-h-hit">
            <Pressable onPress={() => { if (/^https?:\/\//i.test(l.u)) Linking.openURL(l.u).catch(() => {}); }} accessibilityRole="link" className="flex-1"><T tone="brand">{l.t || l.u}</T></Pressable>
            <LinkBtn label="Edit" onPress={() => openSheet("plink", String(p.id), l.id)} />
          </View>
        ) : <Row key={l.id} title={l.t || l.u} right={<T size="sm" tone="muted">Not a web link</T>} onPress={() => openSheet("plink", String(p.id), l.id)} />) : <Empty text="Repos, docs, designs and references." />}
      </Card>

      <Card>
        <Hd title="Progress log" small={String(p.ups.length)} />
        <QuickAdd value={up} onChange={setUp} placeholder="What did you do today?" onAdd={() => { const v = up.trim(); if (!v) return; mut((x) => { x.ups.push({ d: todayKey(), t: v }); }); setUp(""); }} />
        {p.ups.map((u, i) => [u, i] as const).sort((a, b) => (a[0].d < b[0].d ? 1 : -1)).map(([u, i]) => (
          <Row key={i} title={u.t} sub={dl(u.d)} right={<LinkBtn label={delUp === i ? "Delete?" : "×"} onPress={() => { if (delUp !== i) { setDelUp(i); setTimeout(() => setDelUp(-1), 4000); return; } mut((x) => { x.ups.splice(i, 1); }); setDelUp(-1); }} />} />
        ))}
      </Card>
    </>
  );
}

export function ProjPage() {
  const { state, update } = useStore();
  const { ui } = useUi();
  const [f, setF] = useState("All"), [q, setQ] = useState(""), [mode, setMode] = useState<"list" | "board">("list"), [sort, setSort] = useState<"due" | "pr" | "prog" | "new">("due");
  if (ui.pview === "detail" && byId(state.proj, ui.pid)) return <Detail id={ui.pid} />;
  const wk = dateKey(ago(6)), late = state.proj.reduce((a, x) => a + pOver(x).length, 0), risk = state.proj.filter((x) => { const k = phealth(x); return k && (k[0] === "At risk" || k[0] === "Overdue"); }).length;
  const base = state.proj.filter((x) => (x.t + " " + x.desc + " " + x.cat).toLowerCase().includes(q.toLowerCase()));
  const rk = { h: 0, m: 1, l: 2 }, st = (x: Project) => (x.st === "active" ? 0 : x.st === "idea" ? 1 : x.st === "hold" ? 2 : 3);
  const cmp = { due: byDue, pr: (a: Project, b: Project) => rk[a.pr] - rk[b.pr], prog: (a: Project, b: Project) => pPct(b) - pPct(a), new: (a: Project, b: Project) => b.id - a.id }[sort];
  const L = base.filter((x) => f === "All" || x.st === f).sort((a, b) => st(a) - st(b) || cmp(a, b));
  const next = () => setSort(({ due: "pr", pr: "prog", prog: "new", new: "due" } as const)[sort]);
  const move = (x: Project, d: number) => update((s) => { const y = byId(s.proj, x.id); const i = PST.findIndex((z) => z[0] === x.st) + d; if (y && PST[i]) y.st = PST[i][0]; });
  return (
    <>
      <Stats items={[[state.proj.filter((x) => x.st === "active").length, "In progress"], [state.proj.reduce((a, x) => a + (x.st === "done" ? 0 : x.tasks.filter((t) => !t.x).length), 0), "Open tasks"], [num(state.proj.reduce((a, x) => a + pHours(x, wk), 0)), "Hours this week"]]} />
      {late || risk ? <NoteText tone="bad">{[late ? late + " overdue " + (late === 1 ? "task" : "tasks") : "", risk ? risk + " " + (risk === 1 ? "project" : "projects") + " at risk" : ""].filter(Boolean).join(" · ")}</NoteText> : null}
      <Seg value={mode} onChange={setMode} options={[["list", "List"], ["board", "Board"]]} />
      <Input value={q} onChangeText={setQ} placeholder="Search projects" accessibilityLabel="Search projects" />
      {mode === "board" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[3] }}>
          {PST.map((s) => { const col = base.filter((x) => x.st === s[0]).sort(byDue); return (
            <View key={s[0]} className="w-[240px] gap-2">
              <T weight="600">{s[1]} <T tone="muted">{col.length}</T></T>
              {col.length ? col.map((x) => { const i = PST.findIndex((z) => z[0] === x.st); return (
                <Card key={x.id}>
                  <ProjRow p={x} board />
                  <View className="flex-row justify-between mt-2">
                    {i > 0 ? <LinkBtn label={"◀ " + PST[i - 1][1]} onPress={() => move(x, -1)} /> : <View />}
                    {i < 3 ? <LinkBtn label={PST[i + 1][1] + " ▶"} onPress={() => move(x, 1)} /> : null}
                  </View>
                </Card>
              ); }) : <Empty text="Empty" />}
            </View>
          ); })}
        </ScrollView>
      ) : (
        <>
          <Chips>
            {[["All", "All"], ...PST].map((s) => <Chip key={s[0]} label={s[1]} on={f === s[0]} onPress={() => setF(s[0])} />)}
            <Chip label={"Sort: " + { due: "Target date", pr: "Priority", prog: "Progress", new: "Newest" }[sort]} onPress={next} />
          </Chips>
          <Card>{L.length ? L.map((x) => <ProjRow key={x.id} p={x} />) : <Empty text="No projects here. Tap Add." />}</Card>
        </>
      )}
    </>
  );
}

