import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { todayKey } from "../lib/date";
import { RingItem } from "./types";

/** Screen state that is not saved: which sheet is open, selected day, open note or project, ringing alarms. */
export type SheetReq = { type: string; ctx: string; id: string } | null;
export type Ui = {
  sheet: SheetReq; day: string; cal: { y: number; m: number }; cview: "day" | "week" | "month" | "agenda"; slot: string;
  nview: "folders" | "list" | "edit"; nfolder: string; nid: number;
  pview: "list" | "detail"; pid: number; ring: RingItem[];
};
type Ctx = { ui: Ui; set: (p: Partial<Ui> | ((u: Ui) => Partial<Ui>)) => void; openSheet: (type: string, ctx?: string, id?: string | number) => void; closeSheet: () => void };
const C = createContext<Ctx | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [ui, setUi] = useState<Ui>(() => ({
    sheet: null, day: todayKey(), cal: { y: new Date().getFullYear(), m: new Date().getMonth() }, cview: "day", slot: "",
    nview: "folders", nfolder: "All", nid: 0, pview: "list", pid: 0, ring: [],
  }));
  useEffect(() => { // after midnight or a long background, jump back to today
    let last = todayKey();
    const sub = AppState.addEventListener("change", (a) => {
      const t = todayKey();
      if (a === "active" && t !== last) { last = t; const d = new Date(); setUi((u) => ({ ...u, day: t, cal: { y: d.getFullYear(), m: d.getMonth() } })); }
    });
    return () => sub.remove();
  }, []);
  const set = useCallback((p: Partial<Ui> | ((u: Ui) => Partial<Ui>)) => setUi((u) => ({ ...u, ...(typeof p === "function" ? p(u) : p) })), []);
  const openSheet = useCallback((type: string, ctx = "", id: string | number = "") => set({ sheet: { type, ctx, id: String(id) } }), [set]);
  const closeSheet = useCallback(() => set({ sheet: null, slot: "" }), [set]);
  const v = useMemo(() => ({ ui, set, openSheet, closeSheet }), [ui, set, openSheet, closeSheet]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

export function useUi(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error("useUi must be used inside UiProvider");
  return c;
}
