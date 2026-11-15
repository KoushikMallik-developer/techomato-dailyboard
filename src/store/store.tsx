import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { todayKey } from "../lib/date";
import { rollSubs } from "../lib/subs";
import { rollAlarms, rollEvents, taskOf } from "../lib/logic";
import { checkVerified, cloudOn, MAX_CLOUD, pullCloud, pushCloud, watchUser } from "../lib/cloud";
import { decide } from "../lib/syncPlan";
import { load } from "./load";
import { seed } from "./seed";
import { State } from "./types";

/** The short Firebase error code for the status line, e.g. permission-denied when the rules are missing. */
const why = (e: unknown) => String((e as { code?: string })?.code ?? "error").replace("firestore/", "");

/** Bump when State changes in a way that needs a reset. Old data is dropped, not migrated, while the app is a prototype. */
const KEY = "techomato-lifeboard:v2", TS = KEY + ":ts", OWNER = KEY + ":uid"; // OWNER: who the data on this phone belongs to; TS: when this device last changed the data, so the newer side wins when syncing

type Account = { email: string | null; signedIn: boolean; verified: boolean; known: boolean; sync: string; recheck: () => Promise<boolean> }; // known: the sign-in state has been read from the device
type Ctx = { state: State; update: (fn: (s: State) => void) => void; reset: (forget?: boolean) => void; account: Account };
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), readFailed = useRef(false);
  const cur = useRef<State | null>(null); // the newest state: update() runs on it at once, so callers can read an id it made right after the call
  const put = useCallback((s: State) => { cur.current = s; setState(s); }, []);
  const edited = useRef(0), pushed = useRef(0), pulled = useRef(false); // last local edit, last time the cloud had that edit, whether this sign-in has been compared with the cloud yet
  const [user, setUser] = useState<{ uid: string; email: string | null; verified: boolean } | null>(null), [sync, setSync] = useState(""), [tick, setTick] = useState(0), [known, setKnown] = useState(false);
  const touch = useCallback(() => { edited.current = Date.now(); AsyncStorage.setItem(TS, String(edited.current)).catch(() => {}); }, []);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(TS), AsyncStorage.getItem(KEY)]).then(([t, raw]) => {
      // no TS yet: data from before sync existed counts as edited now so it is uploaded; a new phone starts at 0 ("never edited") and uploads nothing
      edited.current = t !== null ? Number(t) || 0 : raw ? Date.now() : 0;
      if (t === null) AsyncStorage.setItem(TS, String(edited.current)).catch(() => {});
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
    if (JSON.stringify(next) !== JSON.stringify(prev)) touch(); // only a real change counts as an edit, not the redraw on return to the app
    rollEvents(next);
    rollSubs(next);
    rollAlarms(next);
    next.events = next.events.filter((e) => !e.tid || taskOf(next, e)); // a deleted task takes its calendar event with it
    put(next);
  }, [put, touch]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") update(() => {}); // new day while away: redraw and roll repeats forward
      else setTimeout(() => { if (cur.current && !readFailed.current) AsyncStorage.setItem(KEY, JSON.stringify(cur.current)).catch(() => {}); }, 0); // do not wait for the 300 ms delay; one tick later, so a note flushed by this same event is included
    });
    let day = todayKey();
    const id = setInterval(() => { if (todayKey() !== day) { day = todayKey(); update(() => {}); } }, 30000); // midnight while the app is open
    return () => { sub.remove(); clearInterval(id); };
  }, [update]);
  const keepCopy = () => { if (cur.current && !readFailed.current) AsyncStorage.setItem(KEY + ":before", JSON.stringify(cur.current)).catch(() => {}); }; // restore and erase leave a way back
  const reset = useCallback((forget?: boolean) => { // forget: the account was deleted, so no safety copy may stay on the phone
    if (forget) AsyncStorage.multiRemove([KEY + ":before", KEY + ":corrupt"]).catch(() => {}); else keepCopy();
    touch(); put(seed());
  }, [put, touch]);

  // Cloud sync: the device stays the working copy; the signed-in user's data is saved to Firestore a few seconds after each change.
  useEffect(() => watchUser((u) => { pulled.current = false; setKnown(true); setUser(u ? { uid: u.uid, email: u.email, verified: u.emailVerified } : null); setSync(""); }), []);
  const ready = !!state;
  const recheck = useCallback(async () => { const ok = await checkVerified(); if (ok) setUser((u) => (u ? { ...u, verified: true } : u)); return ok; }, []);
  useEffect(() => {
    if (!user?.verified || !ready) return; // the rules only let a verified email write
    let dead = false;
    pulled.current = false;
    (async () => {
      const owner = await AsyncStorage.getItem(OWNER);
      if (dead) return;
      if (owner && owner !== user.uid) { // someone else's data is on this phone: keep a copy, start empty
        if (cur.current) await AsyncStorage.setItem(KEY + ":before", JSON.stringify(cur.current)).catch(() => {});
        edited.current = pushed.current = 0; AsyncStorage.setItem(TS, "0").catch(() => {});
        put(seed());
      }
      AsyncStorage.setItem(OWNER, user.uid).catch(() => {});
      const c = await pullCloud(user.uid);
      if (dead) return;
      const go = decide(c ? c.ts : null, edited.current);
      if (go === "load" && c) { // the cloud copy is newer: take it, keeping the local one so nothing is lost
        const n = load(c.json), hadEdits = edited.current > 0;
        if (cur.current) AsyncStorage.setItem(KEY + ":before", JSON.stringify(cur.current)).catch(() => {});
        edited.current = pushed.current = c.ts; AsyncStorage.setItem(TS, String(c.ts)).catch(() => {});
        put(n); setSync(hadEdits ? "Loaded newer data from another device. Your earlier copy is kept on this phone." : "Loaded your data from the cloud.");
      } else { setSync(go === "push" ? "Syncing." : "Up to date."); pushed.current = go === "push" ? 0 : edited.current; }
      pulled.current = true; setTick((t) => t + 1);
    })().catch((e) => { if (!dead) setSync(`Could not reach the cloud (${why(e)}). Your data is safe on this device.`); });
    return () => { dead = true; };
  }, [user, ready, put, touch]);
  useEffect(() => {
    if (!user?.verified || !ready || !state || !pulled.current || edited.current <= pushed.current) return;
    const ts = edited.current, id = setTimeout(() => {
      const json = JSON.stringify(state);
      if (json.length > MAX_CLOUD) { setSync("Your data is too big to sync (over 300 KB). It is still saved on this device."); return; }
      setSync("Saving."); // "Synced." only after the server confirms; offline, a write stays pending
      pushCloud(user.uid, json, ts).then(() => { pushed.current = ts; setSync("Synced."); }, (e) => setSync(`Could not sync (${why(e)}). It will retry on your next change.`));
    }, 4000);
    return () => clearTimeout(id);
  }, [state, user, ready, tick]);

  if (!state) return null; // the splash screen stays up until storage has been read
  return <StoreCtx.Provider value={{ state, update, reset, account: { email: user?.email ?? null, signedIn: !!user, verified: !!user?.verified, known: known || !cloudOn, sync: cloudOn ? sync : "", recheck } }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}
