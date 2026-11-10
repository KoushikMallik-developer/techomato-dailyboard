import { Ionicons } from "@expo/vector-icons";
import { ComponentProps, ComponentType } from "react";
import { WidgetKey } from "../store/types";
import { AlarmsCard, AlarmsPage, CalendarCard, CalendarPage } from "./calendar";
import { HabitsCard, HabitsPage } from "./habits";
import { BillsCard, BillsPage, HealthCard, HealthPage, JournalCard, JournalPage, ShopCard, ShopPage, WatchCard, WatchPage } from "./lists";
import { DatesCard, DatesPage, GoalsCard, GoalsPage, LearnCard, LearnPage, SpendCard, SpendPage } from "./money";
import { NotesCard, NotesPage } from "./notes";
import { ProjCard, ProjPage } from "./projects";
import { SubsCard, SubsPage } from "./subs";
import { TasksCard, TasksPage } from "./tasks";

type IconName = ComponentProps<typeof Ionicons>["name"];

export type Widget = {
  key: WidgetKey;
  title: string;
  blurb: string;
  icon: IconName;
  Card: ComponentType;
  Page: ComponentType;
  /** Form opened by the Add button on the page: [type, ctx]. */
  add?: [string, string];
};

export const WIDGETS: Record<WidgetKey, Widget> = {
  habits: { key: "habits", title: "Habits", blurb: "Streaks and 12-week history", icon: "checkmark-circle-outline", Card: HabitsCard, Page: HabitsPage, add: ["habit", ""] },
  personal: { key: "personal", title: "Personal tasks", blurb: "Home and life admin", icon: "person-outline", Card: () => <TasksCard list="personal" title="Personal tasks" />, Page: () => <TasksPage list="personal" />, add: ["task", "personal"] },
  office: { key: "office", title: "Office tasks", blurb: "Work to-dos", icon: "briefcase-outline", Card: () => <TasksCard list="office" title="Office tasks" />, Page: () => <TasksPage list="office" />, add: ["task", "office"] },
  calendar: { key: "calendar", title: "Calendar", blurb: "Events and agenda", icon: "calendar-outline", Card: CalendarCard, Page: CalendarPage, add: ["event", ""] },
  alarms: { key: "alarms", title: "Alarms", blurb: "Alarms and event alerts", icon: "alarm-outline", Card: AlarmsCard, Page: AlarmsPage, add: ["alarm", ""] },
  dates: { key: "dates", title: "Yearly dates", blurb: "Birthdays and anniversaries", icon: "gift-outline", Card: DatesCard, Page: DatesPage, add: ["date", ""] },
  spend: { key: "spend", title: "Money", blurb: "Spending, income, budget", icon: "wallet-outline", Card: SpendCard, Page: SpendPage, add: ["spend", ""] },
  goals: { key: "goals", title: "Goals", blurb: "Targets with progress logs", icon: "flag-outline", Card: GoalsCard, Page: GoalsPage, add: ["goal", ""] },
  learn: { key: "learn", title: "Learning", blurb: "Courses, books and study log", icon: "book-outline", Card: LearnCard, Page: LearnPage, add: ["learn", ""] },
  proj: { key: "proj", title: "Projects", blurb: "Side projects with tasks", icon: "rocket-outline", Card: ProjCard, Page: ProjPage, add: ["proj", ""] },
  health: { key: "health", title: "Health", blurb: "Water, sleep, weight", icon: "heart-outline", Card: HealthCard, Page: HealthPage },
  journal: { key: "journal", title: "Journal", blurb: "Daily notes and mood", icon: "journal-outline", Card: JournalCard, Page: JournalPage, add: ["journal", ""] },
  notes: { key: "notes", title: "Notes", blurb: "Folders, checklists and reminders", icon: "document-text-outline", Card: NotesCard, Page: NotesPage, add: ["note", ""] },
  watch: { key: "watch", title: "Watchlist", blurb: "Movies and series to watch", icon: "film-outline", Card: WatchCard, Page: WatchPage, add: ["watch", ""] },
  bills: { key: "bills", title: "Bills", blurb: "Due dates and paid status", icon: "receipt-outline", Card: BillsCard, Page: BillsPage, add: ["bill", ""] },
  subs: { key: "subs", title: "Subscriptions", blurb: "Renewals and yearly cost", icon: "repeat-outline", Card: SubsCard, Page: SubsPage, add: ["sub", ""] },
  shop: { key: "shop", title: "Shopping list", blurb: "Groceries and errands", icon: "cart-outline", Card: ShopCard, Page: ShopPage },
};
