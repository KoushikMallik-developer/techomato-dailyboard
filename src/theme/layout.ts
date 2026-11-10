import { useWindowDimensions } from "react-native";

/** Width breakpoints: phone, tablet, desktop/web. Everything that depends on screen width reads this. */
export function useLayout() {
  const { width } = useWindowDimensions();
  const tablet = width >= 600, desktop = width >= 1024;
  return {
    width,
    /** Widest a page column may be. */
    maxW: desktop ? 1040 : tablet ? 680 : 440,
    /** Widest a form-style page (Insights, Settings, widget pages) may be. */
    narrowW: tablet ? 680 : 440,
    /** Widest a sheet or dialog may be. */
    sheetW: tablet ? 560 : 440,
    /** Columns in the Widgets tile grid. */
    tileCols: desktop ? 4 : tablet ? 3 : 2,
    /** Columns of cards on Home. */
    homeCols: desktop ? 2 : 1,
  };
}
