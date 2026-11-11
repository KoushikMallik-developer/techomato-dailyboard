// Local notifications for alarms, calendar event alerts and yearly dates (native only).
// The schedule is rebuilt from the saved state whenever it changes, so it always matches what the app shows.
import { AppState, Platform } from "react-native";
import { State } from "../store/types";
import { plan } from "./plan";

const CHANNEL = "dailyboard-alarms";
export const notificationsSupported = Platform.OS !== "web";

async function mod() { return import("expo-notifications"); }

/** Ask once. Returns true when notifications are allowed. */
export async function ensurePermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const N = await mod();
  const cur = await N.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  return (await N.requestPermissionsAsync()).granted;
}

/** Android 14 and newer deny exact alarms by default; without them an alarm can arrive late, or not at all while the phone idles. */
export async function exactAlarmsAllowed(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  return (await (await mod()).getExactAlarmPermissionsAsync()).granted;
}

/** Opens the system screen where the user allows exact alarms. */
export async function allowExactAlarms(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  return (await (await mod()).requestExactAlarmPermissionsAsync()).granted;
}

export async function setupNotifications() {
  if (!notificationsSupported) return;
  const N = await mod();
  N.setNotificationHandler({ handleNotification: async (n) => { const quiet = !!n.request.content.data?.ring && AppState.currentState === "active"; return { shouldShowBanner: !quiet, shouldShowList: !quiet, shouldPlaySound: !quiet, shouldSetBadge: false }; } }); // the app rings alarms and event alerts itself while open
  if (Platform.OS === "android") await N.setNotificationChannelAsync(CHANNEL, { name: "Alarms and reminders", importance: N.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], sound: "default" });
}

/** One sync at a time: a second one cancelling in the middle of the first would leave stale or doubled reminders. */
let queue: Promise<unknown> = Promise.resolve();
export const syncNotifications = (s: State): Promise<void> => (queue = queue.catch(() => {}).then(() => run(s))) as Promise<void>;

// Exact (alarm-clock) delivery only for what needs the minute: alarms, event alerts and medicine doses. Google Play restricts exact alarms to the core of an app, so bills, documents, habits and the like use normal delivery and fall back to it on their own when the permission is off.
async function run(s: State) {
  if (!notificationsSupported) return;
  const N = await mod();
  if (!(await N.getPermissionsAsync()).granted) return;
  await N.cancelAllScheduledNotificationsAsync();
  const p = plan(s), ch = Platform.OS === "android" ? { channelId: CHANNEL } : {};
  for (const d of p.daily) await N.scheduleNotificationAsync({ content: { title: d.title, body: d.body, sound: "default" }, trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: d.hour, minute: d.minute, ...ch } });
  for (const w of p.weekly) await N.scheduleNotificationAsync({ content: { title: w.title, body: w.body, sound: "default", data: { ring: !!w.ring } }, trigger: { type: N.SchedulableTriggerInputTypes.WEEKLY, weekday: w.weekday, hour: w.hour, minute: w.minute, delivery: w.ring ? "alarmClock" : "bestEffort", ...ch } });
  for (const o of p.once) await N.scheduleNotificationAsync({ content: { title: o.title, body: o.body, sound: "default", data: { ring: !!o.ring } }, trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: o.at, delivery: o.ring || o.exact ? "alarmClock" : "bestEffort", ...ch } });
}
