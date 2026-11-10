import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { todayKey } from "../lib/date";
import { RingItem } from "./types";

/** Screen state that is not saved: which sheet is open, selected day, open note or project, ringing alarms. */
export type SheetReq = { type: string; ctx: string; id: string } | null;
export type Ui = {
  sheet: SheetReq; day: string; cal: { y: number; m: number };
  nview: "folders" | "list" | "edit"; nfolder: string; nid: number;
  pview: "list" | "detail"; pid: number; ring: RingItem[];
};
type Ctx = { ui: Ui; set: (p: Partial<Ui> | ((u: Ui) => Partial<Ui>)) => void; openSheet: (type: string, ctx?: string, id?: string | number) => void; closeSheet: () => void };
const C = createContext<Ctx | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [ui, setUi] = useState<Ui>(() => ({
    sheet: null, day: todayKey(), cal: { y: new Date().getFullYear(), m: new Date().getMonth() },
    nview: "folders", nfolder: "All", nid: 0, pview: "list", pid: 0, ring: [],
  }));
  const set = useCallback((p: Partial<Ui> | ((u: Ui) => Partial<Ui>)) => setUi((u) => ({ ...u, ...(typeof p === "function" ? p(u) : p) })), []);
  const openSheet = useCallback((type: string, ctx = "", id: string | number = "") => set({ sheet: { type, ctx, id: String(id) } }), [set]);
  const closeSheet = useCallback(() => set({ sheet: null }), [set]);
  const v = useMemo(() => ({ ui, set, openSheet, closeSheet }), [ui, set, openSheet, closeSheet]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

export function useUi(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error("useUi must be used inside UiProvider");
  return c;
}
