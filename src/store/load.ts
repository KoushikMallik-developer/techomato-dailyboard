import { rollSubs } from "../lib/subs";
import { purgeTrash, rollAlarms, rollEvents } from "../lib/logic";
import { ALL_WIDGETS, seed } from "./seed";
import { State } from "./types";

/** Turns saved text into a State. Throws when the text is not a usable state, so the caller can keep a copy instead of overwriting it. */
export function load(raw: string | null): State {
  if (!raw) return seed();
  const p = JSON.parse(raw) as State;
  if (!Array.isArray(p.habits) || !Array.isArray(p.order) || !p.health) throw new Error("shape");
  const base = seed() as unknown as Record<string, unknown>, s: State = { ...base, ...p } as State; // lists added in later versions start empty instead of missing
  const bad = (a: unknown, b: unknown) => b == null || Array.isArray(a) !== Array.isArray(b) || typeof a !== typeof b;
  Object.keys(base).forEach((k) => { if (base[k] !== undefined && bad(base[k], (s as unknown as Record<string, unknown>)[k])) (s as unknown as Record<string, unknown>)[k] = base[k]; }); // a field of the wrong type (null list, text for a number) would crash every screen, so it falls back to the empty default
  s.order = s.order.filter((k) => ALL_WIDGETS.includes(k)); // drop widgets that no longer exist
  ALL_WIDGETS.forEach((k) => { if (!s.order.includes(k)) { s.order.push(k); s.on[k] = true; } }); // add new ones
  s.alerts = { ...s.alerts, lead: 15 }; // event alerts are always 15 minutes before and at the start
  purgeTrash(s);
  rollEvents(s);
  rollSubs(s);
  rollAlarms(s);
  return s;
}
