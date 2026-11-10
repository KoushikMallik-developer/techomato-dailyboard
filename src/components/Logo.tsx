import Svg, { Rect } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

/** The DailyBoard mark: four masonry tiles. Same geometry as assets/brand/logo.svg and scripts/make-icons.py. */
export function Logo({ size = 30 }: { size?: number }) {
  const { c } = useTheme();
  // Graphite dark has brandDeep == brand, which would hide the accent tile; fall back to a translucent ink.
  const accent = c.brandDeep.toLowerCase() === c.brand.toLowerCase() ? c.brandInk : c.brandDeep;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image" accessibilityLabel="DailyBoard">
      <Rect width={24} height={24} rx={5.5} fill={c.brand} />
      <Rect x={4} y={4} width={6.5} height={9} rx={1.5} fill={c.brandInk} />
      <Rect x={13.5} y={4} width={6.5} height={5} rx={1.5} fill={accent} opacity={0.55} />
      <Rect x={13.5} y={12} width={6.5} height={8} rx={1.5} fill={c.brandInk} />
      <Rect x={4} y={16} width={6.5} height={4} rx={1.5} fill={c.brandInk} />
    </Svg>
  );
}
