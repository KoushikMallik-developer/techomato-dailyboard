import Svg, { Circle, Line, Polyline, Rect, Text as SText } from "react-native-svg";
import { Pt } from "../lib/logic";
import { useTheme } from "../theme/ThemeProvider";

/** Bar chart ported from bars() in the preview. 336x124 viewBox, optional dashed target line. */
export function Bars({ data, fmt = (n: number) => String(n), target }: { data: Pt[]; fmt?: (n: number) => string; target?: number }) {
  const { c } = useTheme();
  const mx = Math.max(1, target || 0, ...data.map((d) => d.v)), n = data.length, step = 336 / n, bw = Math.min(22, step - 6);
  const ty = target ? 100 - (target / mx) * 84 : 0;
  return (
    <Svg viewBox="0 0 336 124" width="100%" height={124} accessibilityLabel={`Bar chart, highest ${fmt(mx)}`}>
      <SText x={0} y={10} fontSize={10} fill={c.muted}>{fmt(mx)}</SText>
      <Line x1={0} y1={14} x2={336} y2={14} stroke={c.line} strokeWidth={1} />
      <Line x1={0} y1={100} x2={336} y2={100} stroke={c.line} strokeWidth={1} />
      {target ? <Line x1={0} x2={336} y1={ty} y2={ty} stroke={c.muted} strokeWidth={1} strokeDasharray="4 3" /> : null}
      {data.map((d, i) => {
        const h = (d.v / mx) * 84;
        return (
          <Rect key={d.k} x={i * step + (step - bw) / 2} y={100 - h} width={bw} height={h} rx={3} fill={d.hi ? c.brand : c.ring} opacity={d.hi ? 1 : 0.55} />
        );
      })}
      {data.map((d, i) => <SText key={"l" + d.k} x={i * step + step / 2} y={114} fontSize={9} textAnchor="middle" fill={c.muted}>{d.l}</SText>)}
    </Svg>
  );
}

/** Line chart for weight. */
export function LineChart({ values, unit }: { values: number[]; unit: string }) {
  const { c } = useTheme();
  const mn = Math.min(...values) - 0.3, mx = Math.max(...values) + 0.3;
  const pts = values.map((v, i) => [8 + i * (320 / (values.length - 1)), 94 - ((v - mn) / (mx - mn)) * 78] as const);
  const r = (n: number) => (Math.round(n * 10) / 10).toLocaleString();
  return (
    <Svg viewBox="0 0 336 110" width="100%" height={110} accessibilityLabel={`Weight from ${values[0]} to ${values[values.length - 1]} ${unit}`}>
      <SText x={0} y={10} fontSize={10} fill={c.muted}>{r(mx)} {unit}</SText>
      <Line x1={0} y1={100} x2={336} y2={100} stroke={c.line} strokeWidth={1} />
      <SText x={0} y={109} fontSize={10} fill={c.muted}>{r(mn)} {unit}</SText>
      <Polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={c.brand} strokeWidth={2} />
      {pts.map((p, i) => <Circle key={i} cx={p[0]} cy={p[1]} r={3} fill={c.brand} />)}
    </Svg>
  );
}
