import { useEffect, useState } from "react";
import { AppState, Platform, Pressable, View } from "react-native";
import { authMessage, cloudOn, deleteAccount, logOut } from "../../lib/cloud";
import { allowExactAlarms, exactAlarmsAllowed, syncNotifications } from "../../lib/notify";
import { Btn, Card, Chip, Chips, Input, LinkBtn, Note, Screen, Seg, T, Toggle } from "../../components/ui";
import { TopBar } from "../../components/TopBar";
import { useStore } from "../../store/store";
import { PALETTES } from "../../theme/palettes";
import { WIDGETS } from "../../widgets/registry";

export default function Settings() {
  const { state, update, reset, account } = useStore();
  const [busy, setBusy] = useState(false), [amsg, setAmsg] = useState("");
  const auth = (fn: () => Promise<unknown>) => { setBusy(true); setAmsg(""); fn().then(() => {}, (e) => setAmsg(authMessage(e))).finally(() => setBusy(false)); };
  const [name, setName] = useState(state.name);
  const [sure, setSure] = useState(false), [sureDel, setSureDel] = useState(false), [exact, setExact] = useState(true);
  // Re-check on return from Android's own settings. After a grant the schedule is rebuilt, because alarms scheduled before it are only approximate.
  useEffect(() => {
    const check = () => { exactAlarmsAllowed().then(setExact).catch(() => {}); };
    check();
    const sub = AppState.addEventListener("change", (a) => { if (a === "active") check(); });
    return () => sub.remove();
  }, []);
  const move = (i: number, d: -1 | 1) => update((s) => { const j = i + d; if (j < 0 || j >= s.order.length) return; [s.order[i], s.order[j]] = [s.order[j], s.order[i]]; });
  return (
    <Screen>
      <TopBar />
      <Card title="Profile">
        <View className="gap-3">
          <Input value={name} onChangeText={(v) => { setName(v); update((s) => { s.name = v.trim(); }); }} placeholder="Your name" maxLength={30} accessibilityLabel="Your name" />
          <T size="sm" tone="muted">Currency</T>
          <Chips>{([["₹", "Rupee"], ["$", "Dollar"], ["€", "Euro"], ["£", "Pound"]] as const).map(([cu, name]) => <Chip key={cu} label={cu} a11y={name} on={state.cur === cu} onPress={() => update((s) => { s.cur = cu; })} />)}</Chips>
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
            {i > 0 ? <LinkBtn label="↑" a11y={`Move ${WIDGETS[k].title} up`} onPress={() => move(i, -1)} /> : <View className="w-2.5" />}
            {i < state.order.length - 1 ? <LinkBtn label="↓" a11y={`Move ${WIDGETS[k].title} down`} onPress={() => move(i, 1)} /> : <View className="w-2.5" />}
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
        <Note>Alarms, event alerts and yearly dates have their own switches. Reminders go out at 09:00; the phone must allow notifications.</Note>
      </Card>
      <Card title="Account and data">
        <View className="gap-3">
          {cloudOn ? (
            <>
              <T>{account.email ?? "Signed in"}</T>
              {account.sync ? <Note>{account.sync}</Note> : null}
              {amsg ? <Note tone="bad">{amsg}</Note> : null}
              <Note>Your data is stored on this phone and backed up to your account while you are signed in.</Note>
              <Btn ghost label={busy ? "Please wait" : "Sign out"} onPress={() => auth(logOut)} />
              <Btn ghost={!sureDel} danger={sureDel} label={sureDel ? "Confirm: delete my account for good" : "Delete account"} onPress={() => { if (!sureDel) { setSureDel(true); return; } setSureDel(false); auth(() => deleteAccount().then(() => reset(true))); }} />
            </>
          ) : <Note>Your data is stored on this phone. Sign in is off because this build has no Firebase keys; add them to .env and restart.</Note>}
          <View className="h-px bg-line" />
          <Btn ghost={!sure} danger={sure} label={sure ? "Confirm: erase all my data" : "Erase all data"} onPress={() => { if (!sure) { setSure(true); return; } reset(); setSure(false); }} />
        </View>
      </Card>
    </Screen>
  );
}
