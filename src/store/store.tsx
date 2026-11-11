import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { todayKey } from "../lib/date";
import { rollSubs } from "../lib/subs";
import { rollEvents, taskOf } from "../lib/logic";
import { load } from "./load";
import { seed } from "./seed";
import { State } from "./types";

/** Bump when State changes in a way that needs a reset. Old data is dropped, not migrated, while the app is a prototype. */
const KEY = "techomato-lifeboard:v2";

type Ctx = { state: State; update: (fn: (s: State) => void) => void; reset: () => void; replace: (s: State) => void };
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), readFailed = useRef(false);
  const cur = useRef<State | null>(null); // the newest state: update() runs on it at once, so callers can read an id it made right after the call
  const put = useCallback((s: State) => { cur.current = s; setState(s); }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      try { put(load(raw)); } catch {
        if (raw) AsyncStorage.setItem(KEY + ":corrupt", raw).catch(() => {}); // keep what could not be read instead of overwriting it
        put(seed());
      }
    }, () => { readFailed.current = true; put(seed()); }); // a failed read must not be saved over the real data
  }, [put]);

  useEffect(() => {
    if (!state || readFailed.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {}); }, 300);
  }, [state]);

  const update = useCallback((fn: (s: State) => void) => {
    const prev = cur.current;
    if (!prev) return;
    const next = JSON.parse(JSON.stringify(prev)) as State; // small data, so a plain deep copy is enough
    fn(next);
    rollEvents(next);
    rollSubs(next);
    next.events = next.events.filter((e) => !e.tid || taskOf(next, e)); // a deleted task takes its calendar event with it
    put(next);
  }, [put]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") update(() => {}); // new day while away: redraw and roll repeats forward
      else if (cur.current && !readFailed.current) AsyncStorage.setItem(KEY, JSON.stringify(cur.current)).catch(() => {}); // do not wait for the 300 ms delay
    });
    let day = todayKey();
    const id = setInterval(() => { if (todayKey() !== day) { day = todayKey(); update(() => {}); } }, 30000); // midnight while the app is open
    return () => { sub.remove(); clearInterval(id); };
  }, [update]);
  const reset = useCallback(() => put(seed()), [put]);
  const replace = useCallback((s: State) => put(load(JSON.stringify(s))), [put]);

  if (!state) return null; // the splash screen stays up until storage has been read
  return <StoreCtx.Provider value={{ state, update, reset, replace }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
