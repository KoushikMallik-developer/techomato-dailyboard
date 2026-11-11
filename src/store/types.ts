export type WidgetKey =
  | "habits" | "personal" | "office" | "calendar" | "alarms" | "dates" | "spend" | "goals" | "learn"
  | "proj" | "health" | "journal" | "notes" | "watch" | "bills" | "shop" | "subs" | "docs" | "trips" | "meds";

export type ThemeMode = "system" | "light" | "dark";
/** How often a task or event repeats: "" none, d daily, w weekly, m monthly, y yearly. */
export type Rep = "" | "d" | "w" | "m" | "y";
export type Prio = "h" | "m" | "l";
export type TaskListKey = "personal" | "office";

export type Habit = { id: number; n: string; rt: string; done: Record<string, 1> };
/** cal "1" = shown on the calendar (a linked event with event.tid = task.id exists). */
export type Task = { id: number; t: string; p: Prio; due: string; c: string; x: 0 | 1; f: string | null; cal: "" | "1"; time: string; rep?: Rep; nx?: number };
export type CalEvent = { id: number; t: string; d: string; time: string; cat: string; tid?: number; tk?: TaskListKey; rep?: Rep };
export type Spend = { id: number; k: "x" | "i"; a: number; l: string; c: string; d: string; bid?: number };
export type Goal = { id: number; t: string; target: number; cur: number; unit: string; due: string; log: { d: string; v: number }[] };
export type Journal = { id: number; d: string; mood: number; txt: string };
export type Watch = { id: number; t: string; type: "Movie" | "Series"; plat: string; st: "todo" | "doing" | "done"; se: number | ""; ep: number | ""; rate: number; plan: string; note: string; c: string; f: string | null };
export type NoteItem = { t: string; x: 0 | 1 };
export type Note = { id: number; t: string; body: string; items: NoteItem[]; lab: string; pin: 0 | 1; st: "on" | "trash"; rem: string; m: number; tr: number; pid?: number; tkid?: number };
export type Learn = { id: number; t: string; kind: string; src: string; total: number; done: number; unit: string; due: string; st: "active" | "paused" | "done"; f: string | null; note: string; log: { d: string; v: number; m: number }[] };
export type ProjTask = { id: number; t: string; x: 0 | 1; p: Prio; due: string; f: string | null; ptid?: number };
export type Project = {
  id: number; t: string; desc: string; st: "idea" | "active" | "hold" | "done"; pr: Prio; cat: string; start: string; due: string; c: string;
  tasks: ProjTask[]; ms: { id: number; t: string; x: 0 | 1; due: string }[]; ups: { d: string; t: string }[];
  time: { id: number; d: string; h: number; t: string }[]; links: { id: number; t: string; u: string }[];
};
export type Alarm = { id: number; t: string; label: string; days: number[]; snooze: number; on: 0 | 1 };
export type YDate = { id: number; n: string; kind: string; d: string; hy: "1" | ""; rem: number };
export type Bill = { id: number; n: string; a: number; day: number; paid: string };
/** A recurring service. next = next renewal date; act 0 = cancelled. */
export type Sub = { id: number; n: string; a: number; cycle: "w" | "m" | "y"; next: string; act: 0 | 1 };
/** seen: the day it was added, so a reminder for a document added inside its lead window goes out once, the next morning. */
export type Doc = { id: number; n: string; kind: string; exp: string; lead: number; seen?: string };
export type Trip = { id: number; n: string; from: string; to: string; budget: number; spent: number; items: { id: number; t: string; x: 0 | 1 }[] };
/** Up to three dose times a day. taken maps a date to the dose times ticked that day. */
export type Med = { id: number; n: string; dose: string; t1: string; t2: string; t3: string; act: 0 | 1; taken: Record<string, string[]> };
export type ShopItem = { id: number; t: string; q: string; x: 0 | 1 };
export type RingItem = { kind: "alarm" | "event"; title: string; time: string; pre?: number; snooze: number; snoozed?: 1 };

/** Everything the app stores on the device. The storage key is bumped when this shape changes. */
export type State = {
  nid: number; name: string; cur: string; theme: ThemeMode; palette: string;
  order: WidgetKey[]; on: Partial<Record<WidgetKey, boolean>>;
  budget: number; waterTarget: number;
  habits: Habit[]; personal: Task[]; office: Task[]; spend: Spend[]; goals: Goal[]; journal: Journal[]; events: CalEvent[];
  watch: Watch[]; notes: Note[]; nfold: string[]; learn: Learn[]; proj: Project[]; alarms: Alarm[];
  fired: Record<string, string>; snz: { at: number; item: RingItem }[]; alerts: { on: 0 | 1; lead: number };
  /** catBudgets: monthly limit per spending category. */
  dates: YDate[]; bills: Bill[]; shop: ShopItem[]; subs: Sub[]; docs: Doc[]; trips: Trip[]; meds: Med[]; catBudgets: Record<string, number>; weight: { id: number; d: string; v: number }[];
  /** Water and sleep days the sample data added, so removing it can take them out again. */
  sampleHealth?: { water: string[]; sleep: string[] };
  notif?: { habits?: boolean; bills?: boolean; tasks?: boolean; notes?: boolean; subs?: boolean; docs?: boolean; meds?: boolean }; // reminder categories, on unless set to false
  health: { water: Record<string, number>; sleep: Record<string, number> };
};
