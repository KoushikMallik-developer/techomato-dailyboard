import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { rollSubs } from "../lib/subs";
import { purgeTrash, rollEvents, taskOf } from "../lib/logic";
import { ALL_WIDGETS, seed } from "./seed";
import { State } from "./types";

/** Bump when State changes in a way that needs a reset. Old data is dropped, not migrated, while the app is a prototype. */
const KEY = "techomato-lifeboard:v2";

type Ctx = { state: State; update: (fn: (s: State) => void) => void; reset: () => void; replace: (s: State) => void };
const StoreCtx = createContext<Ctx | null>(null);

function load(raw: string | null): State {
  if (!raw) return seed();
  try {
    const s = JSON.parse(raw) as State;
    if (!Array.isArray(s.habits) || !Array.isArray(s.order) || !s.health) return seed();
    s.subs ??= []; s.catBudgets ??= {}; // added after the first release
    s.order = s.order.filter((k) => ALL_WIDGETS.includes(k)); // drop widgets that no longer exist
    ALL_WIDGETS.forEach((k) => { if (!s.order.includes(k)) { s.order.push(k); s.on[k] = true; } }); // add new ones
    purgeTrash(s);
    rollEvents(s);
    rollSubs(s);
    return s;
  } catch {
    return seed();
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => setState(load(raw)), () => setState(seed()));
  }, []);

  useEffect(() => {
    if (!state) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}); }, 300);
  }, [state]);

  const update = useCallback((fn: (s: State) => void) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as State; // small data, so a plain deep copy is enough
      fn(next);
      rollEvents(next);
      rollSubs(next);
      next.events = next.events.filter((e) => !e.tid || taskOf(next, e)); // a deleted task takes its calendar event with it
      return next;
    });
  }, []);
  const reset = useCallback(() => setState(seed()), []);
  const replace = useCallback((s: State) => setState(load(JSON.stringify(s))), []);

  if (!state) return null; // the splash screen stays up until storage has been read
  return <StoreCtx.Provider value={{ state, update, reset, replace }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
