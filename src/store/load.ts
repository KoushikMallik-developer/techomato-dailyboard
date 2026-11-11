import { rollSubs } from "../lib/subs";
import { purgeTrash, rollEvents } from "../lib/logic";
import { ALL_WIDGETS, seed } from "./seed";
import { State } from "./types";

/** Turns saved text into a State. Throws when the text is not a usable state, so the caller can keep a copy instead of overwriting it. */
export function load(raw: string | null): State {
  if (!raw) return seed();
  const p = JSON.parse(raw) as State;
  if (!Array.isArray(p.habits) || !Array.isArray(p.order) || !p.health) throw new Error("shape");
  const s: State = { ...seed(), ...p }; // lists added in later versions start empty instead of missing
  s.order = s.order.filter((k) => ALL_WIDGETS.includes(k)); // drop widgets that no longer exist
  ALL_WIDGETS.forEach((k) => { if (!s.order.includes(k)) { s.order.push(k); s.on[k] = true; } }); // add new ones
  purgeTrash(s);
  rollEvents(s);
  rollSubs(s);
  return s;
}
