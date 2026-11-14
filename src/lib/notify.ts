// Local notifications for alarms, calendar event alerts and yearly dates (native only).
// The schedule is rebuilt from the saved state whenever it changes, so it always matches what the app shows.
import { AppState, Platform } from "react-native";
import type { NotificationRequestInput } from "expo-notifications";
import { State } from "../store/types";
import { plan } from "./plan";

// Two channels, because a channel cannot be changed once created and each has its own tone: alarms ring (alarm.wav), everything else chimes (reminder.wav).
const ALARM = "dailyboard-alarm-v1", REMIND = "dailyboard-reminder-v1";
const where = (loud: boolean) => (Platform.OS === "android" ? { channelId: loud ? ALARM : REMIND } : {});
const tone = (loud: boolean) => (loud ? "alarm.wav" : "reminder.wav"); // Android takes the tone from the channel; iOS from here
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
  N.setNotificationHandler({ handleNotification: async (n) => ({ shouldShowBanner: true, shouldShowList: !(n.request.content.data?.ring && AppState.currentState === "active"), shouldPlaySound: true, shouldSetBadge: false }) }); // the custom tone always plays, also while the app is open; the app's own ring screen shows beside the banner but the notification list stays clean
  if (Platform.OS === "android") {
    for (const old of ["dailyboard-alarms", "dailyboard-alarms-v2"]) await N.deleteNotificationChannelAsync(old).catch(() => {});
    // alarm audio usage: sounds on the alarm volume, also when the ringer is on silent; public: shows on the lock screen
    await N.setNotificationChannelAsync(ALARM, { name: "Alarms", importance: N.AndroidImportance.MAX, vibrationPattern: [0, 500, 300, 500], sound: "alarm.wav", audioAttributes: { usage: N.AndroidAudioUsage.ALARM, contentType: N.AndroidAudioContentType.SONIFICATION }, lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC, bypassDnd: true, enableLights: true });
    await N.setNotificationChannelAsync(REMIND, { name: "Reminders", importance: N.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250], sound: "reminder.wav", audioAttributes: { usage: N.AndroidAudioUsage.NOTIFICATION, contentType: N.AndroidAudioContentType.SONIFICATION } });
  }

}

/** Clears the alarm notification, which also stops its tone: used when the ring screen is dismissed or snoozed. */
export async function silence() { if (notificationsSupported) await (await mod()).dismissAllNotificationsAsync().catch(() => {}); }

let testAt = 0; // when the pending test alarm goes off; a sync must not cancel it
const testItem = (N: Awaited<ReturnType<typeof mod>>): NotificationRequestInput => ({ content: { title: "Test alarm", body: "Alarms work with the screen off.", sound: tone(true) }, trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(testAt), delivery: "alarmClock", ...where(true) } });

/** Sets one alarm a minute from now the same way real ones are set, and returns how many reminders are waiting in total. */
export async function testAlarm(s: State): Promise<number> {
  const N = await mod();
  if (!(await ensurePermission())) throw new Error("notifications not allowed");
  testAt = Date.now() + 60000;
  await syncNotifications(s); // through the queue, so it cannot race a sync; run() adds the test item
  return (await N.getAllScheduledNotificationsAsync()).length;
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
  const p = plan(s);
  const put = (c: Parameters<typeof N.scheduleNotificationAsync>[0]) => N.scheduleNotificationAsync(c).catch(() => {}); // one bad reminder must not drop the ones after it
  if (testAt > Date.now()) await put(testItem(N)); // a pending test alarm survives a sync
  for (const d of p.daily) await put({ content: { title: d.title, body: d.body, sound: tone(false), data: { ring: !!d.ring } }, trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: d.hour, minute: d.minute, delivery: d.ring ? "alarmClock" : "bestEffort", ...where(false) } });
  for (const w of p.weekly) await put({ content: { title: w.title, body: w.body, sound: tone(!!w.ring), data: { ring: !!w.ring } }, trigger: { type: N.SchedulableTriggerInputTypes.WEEKLY, weekday: w.weekday, hour: w.hour, minute: w.minute, delivery: w.ring ? "alarmClock" : "bestEffort", ...where(!!w.ring) } });
  for (const o of p.once) await put({ content: { title: o.title, body: o.body, sound: tone(!!o.loud), data: { ring: !!o.ring } }, trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: o.at, delivery: o.ring || o.exact ? "alarmClock" : "bestEffort", ...where(!!o.loud) } });
}
