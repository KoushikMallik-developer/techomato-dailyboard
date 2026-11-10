import { createContext, ReactNode, useContext, useMemo } from "react";
import { vars } from "nativewind";
import { useColorScheme, View } from "react-native";
import { useStore } from "../store/store";
import { Colors, PALETTES } from "./palettes";

type Theme = { c: Colors; dark: boolean; vars: ReturnType<typeof vars> };
const ThemeCtx = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const system = useColorScheme();
  const value = useMemo<Theme>(() => {
    const dark = state.theme === "system" ? system !== "light" : state.theme === "dark";
    const p = PALETTES[state.palette] ?? PALETTES.orange;
    const c = dark ? p.dark : p.light;
    return { c, dark, vars: vars(Object.fromEntries(Object.entries(c).map(([k, v]) => [`--c-${k}`, v]))) };
  }, [state.theme, state.palette, system]);
  return <ThemeCtx.Provider value={value}><View style={value.vars} className="flex-1">{children}</View></ThemeCtx.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeCtx);
  if (!t) throw new Error("useTheme must be used inside ThemeProvider");
  return t;
}
