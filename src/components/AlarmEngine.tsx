import { useEffect, useRef } from "react";
import { AppState, BackHandler, Modal, Platform, Vibration, View } from "react-native";
import { ago, dateKey } from "../lib/date";
import { eventsOn, taskOf } from "../lib/logic";
import { ensurePermission, setupNotifications, silence, syncNotifications } from "../lib/notify";
import { plan } from "../lib/plan";
import { useStore } from "../store/store";
import { useTheme } from "../theme/ThemeProvider";
import { RingItem } from "../store/types";
import { useUi } from "../store/ui";
import { Btn, T } from "./ui";


/** Rings alarms and calendar event alerts while the app is open (port of tick() in the preview), and keeps the system notification schedule in step. */
export function AlarmEngine() {
  const { state, update } = useStore();
  const { ui, set } = useUi();
  const { vars } = useTheme();
  const latest = useRef(state);
  useEffect(() => { latest.current = state; });
  const seen = useRef(new Set<string>()); // guards against firing twice before the state update lands

  useEffect(() => {
    setupNotifications().then(() => setTimeout(() => { ensurePermission().catch(() => {}); }, 3000)).catch(() => {});
    const id = setInterval(() => {
      const s = latest.current, now = new Date(), nk = dateKey(now), tmr = dateKey(new Date(+now + 864e5)), dow = (now.getDay() + 6) % 7;
      const fires: RingItem[] = [], keys: string[] = [], off: number[] = [];
      const once = (k: string, item: RingItem, alarmId?: number) => { if (s.fired[k] || seen.current.has(k)) return; seen.current.add(k); keys.push(k); fires.push(item); if (alarmId !== undefined) off.push(alarmId); };
      s.alarms.forEach((a) => {
        if (!a.on || (a.days.length && !a.days.includes(dow))) return;
        const diff = +now - +new Date(nk + "T" + a.t + ":00");
        if (diff >= 0 && diff < 120000) once("a" + a.id + nk + a.t, { kind: "alarm", title: a.label || "Alarm", time: a.t, snooze: a.snooze }, a.days.length ? undefined : a.id);
      });
      if (s.alerts.on) eventsOn(s, nk).concat(eventsOn(s, tmr)).forEach((e) => {
        if (!e.time) return;
        const tk = e.tid ? taskOf(s, e) : null; if (tk && tk.x) return;
        const start = new Date(e.d + "T" + e.time + ":00"), lead = s.alerts.lead * 60000, base = "e" + e.id + e.d + e.time;
        if (+now >= +start - lead && now < start) once(base + "p", { kind: "event", title: e.t, time: e.time, pre: Math.max(1, Math.ceil((+start - +now) / 60000)), snooze: 5 });
        if (now >= start && +now - +start < 120000) once(base + "n", { kind: "event", title: e.t, time: e.time, pre: 0, snooze: 5 });
      });
      const dueSnz = s.snz.filter((z) => z.at <= +now);
      const old = dateKey(ago(3)), stale = Object.keys(s.fired).filter((k) => s.fired[k] < old);
      if (!fires.length && !dueSnz.length && !stale.length) return;
      update((st) => {
        keys.forEach((k) => { st.fired[k] = nk; });
        st.alarms.forEach((a) => { if (off.includes(a.id)) a.on = 0; }); // a one-time alarm switches itself off
        st.snz = st.snz.filter((z) => z.at > +now);
        stale.forEach((k) => { delete st.fired[k]; });
      });
      const items = fires.concat(dueSnz.map((z) => z.item));
      if (items.length) set((u) => ({ ring: u.ring.concat(items) }));
    }, 1000);
    return () => clearInterval(id);
  }, [update, set]);

  // Rebuild the system notification schedule only when what should be scheduled changes (ticking a habit or typing a note does not).
  const sig = JSON.stringify(plan(state));
  useEffect(() => {
    const t = setTimeout(() => { syncNotifications(latest.current).catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [sig]);

  // An alarm that woke the app (it came to the foreground within moments of the ring screen, before or after it) closes the app again when the last ring is done: the app may be showing over the lock screen, and must not stay usable there.
  const woke = useRef(0), ringAt = useRef(0), leave = useRef(false), ringing = ui.ring.length > 0;
  useEffect(() => { woke.current = Date.now(); const sub = AppState.addEventListener("change", (a) => { if (a === "active") woke.current = Date.now(); }); return () => sub.remove(); }, []);
  useEffect(() => { if (ringing) ringAt.current = Date.now(); }, [ringing]);
  const next = () => {
    silence(); set((u) => ({ ring: u.ring.slice(1) }));
    if (Math.abs(woke.current - ringAt.current) < 3000 && ui.ring.length <= 1 && Platform.OS === "android") leave.current = true;
  };
  // Leave from an effect, so the sync sees the state that includes a new snooze, and it reaches the schedule before the app goes away.
  useEffect(() => { if (!ringing && leave.current) { leave.current = false; syncNotifications(latest.current).catch(() => {}).finally(() => BackHandler.exitApp()); } }, [ringing]);

  const r = ui.ring[0];
  useEffect(() => {
    if (!r || Platform.OS === "web") return;
    Vibration.vibrate([0, 500, 400, 500], true);
    return () => Vibration.cancel();
  }, [r]);
  if (!r) return null;
  const sub = r.snoozed ? "Snoozed reminder" : r.kind === "event" ? (r.pre ? "Starts in " + r.pre + " min" : "Starting now") : "";
  return (
    <Modal visible transparent animationType="fade" onRequestClose={next}>
      <View style={vars} className="flex-1 justify-center bg-scrim-strong p-4">
        <View accessibilityRole="alert" className="w-full max-w-[360px] items-center gap-3 self-center rounded-sheet bg-card px-4 pb-[18px] pt-[22px]">
          <T tone="muted">{r.kind === "alarm" ? "Alarm" : "Calendar event"}</T>
          <T weight="700" className="text-display tracking-tighter">{r.time}</T>
          <T size="xl" weight="600" className="text-center">{r.title}</T>
          <T size="sm" tone="muted">{sub}{ui.ring.length > 1 ? ` · +${ui.ring.length - 1} more` : ""}</T>
          <Btn label="Dismiss" className="self-stretch"onPress={next} />
          <Btn ghost label={`Snooze ${r.snooze || 5} min`} className="self-stretch"onPress={() => { update((s) => { s.snz.push({ at: Date.now() + (r.snooze || 5) * 60000, item: { ...r, snoozed: 1 } }); }); next(); }} />
        </View>
      </View>
    </Modal>
  );
}


