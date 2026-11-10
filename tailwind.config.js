// Colours are CSS variables set at runtime by ThemeProvider (palette + light/dark), so one class works in every theme.
const names = ["bg", "card", "soft", "ink", "muted", "line", "brand", "brandInk", "brandSoft", "brandDeep", "panel", "panel2", "panelText", "panelStrong", "panelLine", "ring", "ok", "okSoft", "warn", "warnSoft", "bad", "badSoft"];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class", // on web NativeWind otherwise locks the scheme to the OS ("media") and throws when it is set
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: { ...Object.fromEntries(names.map((n) => [n, `var(--c-${n})`])), scrim: "rgba(10,17,30,0.55)", "scrim-strong": "rgba(10,17,30,0.75)" }, // scrim: modal backdrop, same in both themes
      borderRadius: { xs: "6px", sm: "8px", md: "12px", lg: "16px", sheet: "20px" },
      fontSize: { xs: "12px", md: "13px", base: "15px", lg: "17px", xl: "20px", "2xl": "26px", "3xl": "32px", display: "56px" },
      fontFamily: { i4: ["Inter_400Regular"], i5: ["Inter_500Medium"], i6: ["Inter_600SemiBold"], i7: ["Inter_700Bold"] },
      spacing: { hit: "44px" },
      minHeight: { hit: "44px", tile: "134px", note: "160px" },
    },
  },
  plugins: [],
};
