// Subscriptions: recurring services with a renewal date. Pure helpers over the State.
import { State, Sub } from "../store/types";
import { addRep, todayKey } from "./date";

export const CYCLE_NAME = { w: "week", m: "month", y: "year" } as const;

/** Cost spread over a month, so weekly, monthly and yearly plans can be added together. */
export const perMonth = (x: Sub) => (x.cycle === "y" ? x.a / 12 : x.cycle === "w" ? (x.a * 52) / 12 : x.a);
export const perYear = (x: Sub) => perMonth(x) * 12;
export const activeSubs = (s: State) => s.subs.filter((x) => x.act);

/** A renewal date that has passed moves to the next one, as if the plan renewed on its own. */
export function rollSubs(s: State) {
  const today = todayKey();
  s.subs.forEach((x) => { if (x.act) for (let i = 0; x.next < today && i < 800; i++) x.next = addRep(x.next, x.cycle); });
}
