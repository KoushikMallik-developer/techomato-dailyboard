import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { DateTimeInput } from "../components/DateTimeInput";
import { Btn, Card, Chip, Chips, Check, Empty, Input, LinkBtn, Note as NoteText, QuickAdd, T } from "../components/ui";
import { todayKey } from "../lib/date";
import { byId, newNote, ngroup, nsnip, nstamp, ntitle, nwords } from "../lib/logic";
import { useStore } from "../store/store";
import { Note } from "../store/types";
import { useUi } from "../store/ui";
import { useTheme } from "../theme/ThemeProvider";
import { go, MoreLink } from "./shared";

/** One note in a list: bold title, then time and a snippet. */
export function NoteRow({ n, folder, onOpen }: { n: Note; folder?: boolean; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" className="py-2 min-h-hit gap-0.5">
      <T weight="600">{ntitle(n)}</T>
      <T size="sm" tone="muted" numberOfLines={1}>{n.rem && n.st === "on" ? "⏰ " : ""}{nstamp(n)}  {nsnip(n)}</T>
      {folder ? <T size="xs" tone="brand">{n.lab}</T> : null}
    </Pressable>
  );
}

export function useOpenNote() {
  const { set } = useUi();
  return (id: number) => { set({ nview: "edit", nid: id }); go("notes"); };
}

export function NotesCard() {
  const { state } = useStore();
  const open = useOpenNote();
  const L = state.notes.filter((n) => n.st === "on").sort((a, b) => b.pin - a.pin || b.m - a.m);
  return (
    <Card title="Notes" small={`${L.length} notes`}>
      {L.length ? L.slice(0, 3).map((n) => <NoteRow key={n.id} n={n} onOpen={() => open(n.id)} />) : <Empty text="No notes yet." />}
      {L.length > 3 ? <MoreLink to="notes" n={L.length - 3} /> : null}
    </Card>
  );
}

function NBar({ left, onLeft, children }: { left: string; onLeft: () => void; children?: React.ReactNode }) {
  return (
    <View className="flex-row justify-between items-center min-h-hit">
      <LinkBtn tone="brand" label={"‹ " + left} onPress={onLeft} />
      <View className="flex-row gap-4">{children}</View>
    </View>
  );
}

function Editor({ id }: { id: number }) {
  const { c } = useTheme();
  const { state, update } = useStore();
  const { ui, set } = useUi();
  const n = byId(state.notes, id);
  const [menu, setMenu] = useState(false);
  const [title, setTitle] = useState(n?.t ?? ""), [body, setBody] = useState(n?.body ?? "");
  // Typing is saved 500 ms after the last key, not on every key: each save copies and redraws the whole app. Other edits flush it first so they apply in order.
  const queue = useRef<((x: Note) => void)[]>([]), timer = useRef<ReturnType<typeof setTimeout> | null>(null), flushRef = useRef<() => void>(() => {});
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const q = queue.current;
    queue.current = [];
    if (q.length) update((s) => { const x = byId(s.notes, id); if (x) { q.forEach((f) => f(x)); x.m = Date.now(); } });
  };
  useEffect(() => { flushRef.current = flush; });
  useEffect(() => () => flushRef.current(), []); // leaving the editor saves what is waiting
  if (!n) return null;
  const mut = (fn: (x: Note) => void) => { flush(); update((s) => { const x = byId(s.notes, id); if (x) { fn(x); x.m = Date.now(); } }); };
  const later = (fn: (x: Note) => void) => { queue.current.push(fn); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(flush, 500); };
  const fo = ui.nfolder, back = fo === "Trash" ? "Recently Deleted" : fo === "All" ? "Notes" : fo;
  const leave = () => {
    flush();
    update((s) => { const x = byId(s.notes, id); if (x && !x.t.trim() && !x.body.trim() && !x.items.length) s.notes = s.notes.filter((y) => y !== x); }); // an empty note is not kept
    set({ nview: "list" });
  };
  const input = "bg-transparent px-0 font-i4 text-ink";
  const hasTask = !!(n.tkid && byId(state.personal, n.tkid));
  return (
    <>
      <NBar left={back} onLeft={leave}>
        <LinkBtn tone="brand" label={n.pin ? "Unpin" : "Pin"} onPress={() => mut((x) => { x.pin = x.pin ? 0 : 1; })} />
        <LinkBtn tone="brand" label="Checklist" onPress={() => mut((x) => { x.items.push({ t: "", x: 0 }); })} />
        <LinkBtn tone="brand" label="More" onPress={() => setMenu(!menu)} />
      </NBar>
      {menu ? (
        <Card>
          <T size="sm" tone="muted">Folder</T>
          <Chips>{state.nfold.map((f) => <Chip key={f} label={f} on={f === n.lab} onPress={() => mut((x) => { x.lab = f; })} />)}</Chips>
          <T size="sm" tone="muted" className="mt-3">Remind me on</T>
          <DateTimeInput mode="date" value={n.rem} label="Reminder date" placeholder="No reminder" onChange={(v) => mut((x) => { x.rem = v; })} />
          <Chips><Chip label="Today" onPress={() => mut((x) => { x.rem = todayKey(); })} /><Chip label="Clear" onPress={() => mut((x) => { x.rem = ""; })} /></Chips>
          {n.rem ? <NoteText>Reminder: {n.rem}</NoteText> : null}
          <View className="flex-row flex-wrap gap-2 mt-3">
            <Btn ghost label="Duplicate" onPress={() => { update((s) => { const x = byId(s.notes, id)!, cp: Note = JSON.parse(JSON.stringify(x)); cp.id = s.nid++; cp.t = x.t + " (copy)"; cp.pin = 0; delete cp.tkid; cp.m = Date.now(); s.notes.unshift(cp); }); set({ nview: "list" }); }} />
            <Btn ghost label={hasTask ? "Task added" : "Make a task"} onPress={() => { if (!hasTask) update((s) => { const x = byId(s.notes, id)!, t = { id: s.nid++, t: ntitle(x), p: "m" as const, due: x.rem || "", c: todayKey(), x: 0 as const, f: null, cal: "" as const, time: "" }; s.personal.unshift(t); x.tkid = t.id; }); }} />
            <Btn danger label="Delete note" onPress={() => { mut((x) => { x.st = "trash"; x.tr = Date.now(); x.pin = 0; }); set({ nview: "list" }); }} />
          </View>
        </Card>
      ) : null}
      <T size="xs" tone="muted" className="text-center">{new Date(n.m).toLocaleString([], { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {nwords(n)} words</T>
      <TextInput value={title} onChangeText={(v) => { setTitle(v); later((x) => { x.t = v; }); }} placeholder="Title" placeholderTextColor={c.muted} maxLength={120} accessibilityLabel="Title" className={`${input} font-i7 text-[26px]`} />
      <TextInput value={body} onChangeText={(v) => { setBody(v); later((x) => { x.body = v; }); }} placeholder="Note" placeholderTextColor={c.muted} multiline maxLength={8000} accessibilityLabel="Note text" textAlignVertical="top" className={`${input} min-h-note text-base`} />
      {n.items.map((it, i) => (
        <View key={i} className="flex-row items-center gap-3 min-h-hit">
          <Check on={!!it.x} label={`${it.x ? "Uncheck" : "Check"} item ${i + 1}`} onPress={() => mut((x) => { x.items[i].x = x.items[i].x ? 0 : 1; })} />
          <TextInput defaultValue={it.t} onChangeText={(v) => later((x) => { x.items[i].t = v; })} placeholder="List item" placeholderTextColor={c.muted} maxLength={120} accessibilityLabel={`Checklist item ${i + 1}`}
            onSubmitEditing={() => mut((x) => { if (x.items[i].t.trim()) x.items.splice(i + 1, 0, { t: "", x: 0 }); else x.items.splice(i, 1); })} blurOnSubmit={false}
            className={`flex-1 font-i4 text-base text-ink ${it.x ? "line-through opacity-60" : ""}`} />
          <LinkBtn label="×" onPress={() => mut((x) => { x.items.splice(i, 1); })} />
        </View>
      ))}
      {n.items.length ? <LinkBtn tone="brand" label="+ Add item" onPress={() => mut((x) => { x.items.push({ t: "", x: 0 }); })} /> : null}
    </>
  );
}

export function NotesPage() {
  const { state, update } = useStore();
  const { ui, set } = useUi();
  const open = useOpenNote();
  const [q, setQ] = useState(""), [folderName, setFolderName] = useState(""), [sure, setSure] = useState("");
  const live = state.notes.filter((n) => n.st === "on"), gone = state.notes.filter((n) => n.st === "trash"), fo = ui.nfolder;
  const nn = () => { let id = 0; update((s) => { id = newNote(s, fo).id; }); set({ nview: "edit", nid: id }); };

  if (ui.nview === "edit" && byId(state.notes, ui.nid)) return <Editor key={ui.nid} id={ui.nid} />;

  if (ui.nview === "list") {
    const trash = fo === "Trash", ql = q.toLowerCase();
    const base = trash ? gone : live.filter((n) => fo === "All" || n.lab === fo);
    const L = base.filter((n) => (n.t + " " + n.body + " " + n.items.map((i) => i.t).join(" ") + " " + n.lab).toLowerCase().includes(ql)).sort((a, b) => (trash ? 0 : b.pin - a.pin) || b.m - a.m);
    return (
      <>
        <NBar left="Folders" onLeft={() => { set({ nview: "folders" }); setQ(""); }}>
          {trash ? (gone.length ? <LinkBtn tone="brand" label={sure === "all" ? "Tap again to delete all" : "Delete All"} onPress={() => { if (sure !== "all") { setSure("all"); return; } update((s) => { s.notes = s.notes.filter((x) => x.st !== "trash"); }); setSure(""); }} /> : null) : <LinkBtn tone="brand" label="New note" onPress={nn} />}
        </NBar>
        <T size="xxl" weight="700">{trash ? "Recently Deleted" : fo === "All" ? "All Notes" : fo}</T>
        <Input value={q} onChangeText={setQ} placeholder="Search" accessibilityLabel="Search notes" />
        {L.length === 0 ? <Card><Empty text={trash ? "No deleted notes." : "No notes."} /></Card> : L.map((n, i) => {
          const grp = (x: Note) => (trash ? "" : ngroup(x)), g = grp(n), head = g && (i === 0 || grp(L[i - 1]) !== g) ? <T key={"g" + n.id} size="sm" weight="600" tone="muted" className="mt-2">{g}</T> : null;
          return [head, <Card key={n.id}>{trash ? (
            <View className="flex-row justify-between items-center gap-3">
              <T className="flex-1">{ntitle(n)}</T>
              <LinkBtn tone="brand" label="Recover" onPress={() => update((s) => { const x = byId(s.notes, n.id); if (x) { x.st = "on"; x.m = Date.now(); } })} />
              <LinkBtn tone="bad" label={sure === "n" + n.id ? "Sure?" : "Delete"} onPress={() => { if (sure !== "n" + n.id) { setSure("n" + n.id); return; } update((s) => { s.notes = s.notes.filter((x) => x.id !== n.id); }); setSure(""); }} />
            </View>
          ) : <NoteRow n={n} folder={fo === "All"} onOpen={() => open(n.id)} />}</Card>];
        })}
        <NoteText center>{L.length} {L.length === 1 ? "Note" : "Notes"}{trash ? ". Notes are deleted for good after 30 days." : ""}</NoteText>
        {!trash && fo !== "All" && fo !== "Notes" ? <Btn ghost danger={sure === "f"} label={sure === "f" ? "Tap again to delete this folder and its notes" : "Delete folder"} onPress={() => {
          if (sure !== "f") { setSure("f"); return; }
          update((s) => { s.notes.forEach((x) => { if (x.lab === fo && x.st === "on") { x.st = "trash"; x.tr = Date.now(); x.pin = 0; } }); s.nfold = s.nfold.filter((f) => f !== fo); });
          set({ nview: "folders", nfolder: "All" }); setSure("");
        }} /> : null}
      </>
    );
  }

  const row = (label: string, count: number, to: string) => (
    <Pressable key={to} onPress={() => { set({ nfolder: to, nview: "list" }); setQ(""); }} accessibilityRole="button" className="flex-row justify-between items-center min-h-hit">
      <T weight="500">{label}</T><T tone="muted">{count} ›</T>
    </Pressable>
  );
  const addFolder = () => { const v = folderName.trim(); if (!v) return; update((s) => { if (!s.nfold.includes(v)) s.nfold.push(v); }); setFolderName(""); };
  return (
    <>
      <T size="xxl" weight="700">Folders</T>
      <Card>
        {row("All Notes", live.length, "All")}
        {state.nfold.map((f) => row(f, live.filter((n) => n.lab === f).length, f))}
        {row("Recently Deleted", gone.length, "Trash")}
      </Card>
      <QuickAdd value={folderName} onChange={setFolderName} onAdd={addFolder} placeholder="New folder name" />
      <Btn label="New note" onPress={nn} />
      <View className="h-2 rounded-xs" />
    </>
  );
}
