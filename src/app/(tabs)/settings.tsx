import { useEffect, useState } from "react";
import { Alert, AppState, Platform, Pressable, Share, View } from "react-native";
import { allowExactAlarms, exactAlarmsAllowed, syncNotifications, testAlarm } from "../../lib/notify";
import { Btn, Card, Chip, Chips, Input, LinkBtn, Note, Screen, Seg, T, Toggle } from "../../components/ui";
import { TopBar } from "../../components/TopBar";
import { useStore } from "../../store/store";
import { State } from "../../store/types";
import { PALETTES } from "../../theme/palettes";
import { addSample, hasSample, removeSample } from "../../store/seed";
import { WIDGETS } from "../../widgets/registry";

export default function Settings() {
  const { state, update, reset, replace } = useStore();
  const [name, setName] = useState(state.name);
  const [sure, setSure] = useState(false), [text, setText] = useState(""), [msg, setMsg] = useState(""), [exact, setExact] = useState(true);
  // Re-check on return from Android's own settings. After a grant the schedule is rebuilt, because alarms scheduled before it are only approximate.
  useEffect(() => {
    const check = () => { exactAlarmsAllowed().then(setExact).catch(() => {}); };
    check();
    const sub = AppState.addEventListener("change", (a) => { if (a === "active") check(); });
    return () => sub.remove();
  }, []);
  const move = (i: number, d: -1 | 1) => update((s) => { const j = i + d; if (j < 0 || j >= s.order.length) return; [s.order[i], s.order[j]] = [s.order[j], s.order[i]]; });
  const restore = () => {
    try {
      const v = JSON.parse(text) as State;
      if (!v || !Array.isArray(v.habits) || !Array.isArray(v.order) || !v.health) throw new Error("shape");
      replace(v); setMsg("Backup restored."); setText("");
    } catch { setMsg("That text is not a valid backup. Nothing was changed."); }
  };
  return (
    <Screen>
      <TopBar />
      <Card title="Profile">
        <View className="gap-3">
          <Input value={name} onChangeText={(v) => { setName(v); update((s) => { s.name = v.trim(); }); }} placeholder="Your name" maxLength={30} accessibilityLabel="Your name" />
          <T size="sm" tone="muted">Currency</T>
          <Chips>{["₹", "$", "€", "£"].map((cu) => <Chip key={cu} label={cu} on={state.cur === cu} onPress={() => update((s) => { s.cur = cu; })} />)}</Chips>
        </View>
      </Card>
      <Card title="Color palette">
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(PALETTES).map(([id, p]) => {
            const on = (PALETTES[state.palette] ? state.palette : "orange") === id;
            return (
              <Pressable key={id} onPress={() => update((s) => { s.palette = id; })} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={p.name}
                className={`min-h-[64px] w-[31%] items-center justify-center gap-1.5 rounded-md bg-soft p-2 active:opacity-70 ${on ? "border-2 border-brand" : "border border-line"}`}>
                <View className="flex-row">{[p.light.brand, p.light.panel, p.light.bg].map((x, i) => <View key={i} style={{ backgroundColor: x }} className={`h-[18px] w-[18px] rounded-full border border-line ${i ? "-ml-[5px]" : ""}`} />)}</View>
                <T size="sm" weight={on ? "600" : "400"}>{p.name}</T>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Card title="Appearance"><Seg value={state.theme} onChange={(v) => update((s) => { s.theme = v; })} options={[["system", "System"], ["light", "Light"], ["dark", "Dark"]]} /></Card>
      <Card title="Widgets" small="on, off, order">
        {state.order.map((k, i) => (
          <View key={k} className="min-h-12 flex-row items-center justify-between gap-3 py-1">
            <T className="flex-1">{WIDGETS[k].title}</T>
            {i > 0 ? <LinkBtn label="↑" onPress={() => move(i, -1)} /> : <View className="w-2.5" />}
            {i < state.order.length - 1 ? <LinkBtn label="↓" onPress={() => move(i, 1)} /> : <View className="w-2.5" />}
            <Toggle value={!!state.on[k]} onChange={(v) => update((s) => { s.on[k] = v; })} label={`Show ${WIDGETS[k].title} on Home`} />
          </View>
        ))}
      </Card>
      <Card title="Reminders" small="phone notifications">
        {([["habits", "Habit reminder times"], ["bills", "Bills (day before and on the day)"], ["tasks", "Task due dates"], ["notes", "Note reminders"], ["subs", "Subscription renewals (day before)"], ["docs", "Document expiry dates"], ["meds", "Medicine times"]] as const).map(([k, label]) => (
          <View key={k} className="min-h-12 flex-row items-center justify-between gap-3 py-1">
            <T className="flex-1">{label}</T>
            <Toggle value={state.notif?.[k] !== false} onChange={(v) => update((s) => { s.notif = { ...s.notif, [k]: v }; })} label={`Remind me about ${label.toLowerCase()}`} />
          </View>
        ))}
        {Platform.OS === "android" && !exact ? <><Note tone="bad">Alarms may ring late or not at all while the phone sleeps, because exact alarms are not allowed.</Note><Btn label="Allow exact alarms" onPress={() => { allowExactAlarms().then((ok) => { setExact(ok); if (ok) syncNotifications(state).catch(() => {}); }).catch(() => {}); }} /></> : null}
        <Btn ghost label="Test alarm in 1 minute" onPress={() => { testAlarm(state).then((n) => Alert.alert("Test alarm set", `It will go off in 1 minute. ${n} reminders are waiting in total. Lock the phone now and wait.`)).catch(() => Alert.alert("Could not set a test alarm", "Check that notifications are allowed for this app.")); }} />
        <Note>Alarms, event alerts and yearly dates have their own switches. Reminders go out at 09:00; the phone must allow notifications.</Note>
      </Card>
      <Card title="Your data">
        <Note>Everything is stored on this device. Share a backup to keep a copy, or paste a backup below to restore it.</Note>
        <View className="mt-3 gap-3">
          <Btn ghost label="Share a backup" onPress={() => { Share.share({ message: JSON.stringify(state) }).catch(() => {}); }} />
          <Input value={text} onChangeText={setText} placeholder="Paste a backup here" multiline accessibilityLabel="Backup data" className="min-h-24 pt-3 text-xs" />
          <Btn label="Restore from text" onPress={restore} />
          {msg ? <Note tone={msg.startsWith("That") ? "bad" : "ok"}>{msg}</Note> : null}
          <Btn ghost label={hasSample(state) ? "Remove sample data" : "Load sample data"} onPress={() => update((s) => { if (hasSample(s)) removeSample(s); else addSample(s); })} />
          <Note>Sample data fills every widget with made-up items so you can try the app. Removing it keeps everything you added yourself. Sample items you edited are removed too.</Note>
          <Btn ghost={!sure} danger={sure} label={sure ? "Confirm: erase all my data" : "Erase all data"} onPress={() => { if (!sure) { setSure(true); return; } reset(); setSure(false); }} />
        </View>
      </Card>
    </Screen>
  );
}
