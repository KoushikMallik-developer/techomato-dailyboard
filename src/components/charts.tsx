import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Polyline, Rect, Text as SText } from "react-native-svg";
import { Pt } from "../lib/logic";
import { useTheme } from "../theme/ThemeProvider";
import { T } from "./ui";

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

/** Small charts drawn with Views and react-native-svg, themed through the palette. Each one carries a one-line text summary for screen readers. */
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export type BarPoint = { l: string; v: number; hi?: boolean };

/** Vertical bars with an optional dashed target line. Labels show on every bar for a week, and every fifth for longer spans. */
export function Columns({ data, target, label, fmt = String, height = 112, top = 0 }: { data: BarPoint[]; target?: number; label: string; fmt?: (v: number) => string; height?: number; top?: number }) {
  const { c } = useTheme();
  const n = data.length, max = Math.max(1, top, target ?? 0, ...data.map((d) => d.v)), gap = n > 14 ? 2 : 6;
  const summary = `${label}. Highest ${fmt(Math.max(0, ...data.map((d) => d.v)))}, average ${fmt(n ? sum(data.map((d) => d.v)) / n : 0)}${target ? `, target ${fmt(target)}` : ""}.`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary}>
      <View style={{ height, flexDirection: "row", alignItems: "flex-end", gap }}>
        {data.map((d, i) => <View key={i} style={{ flex: 1, height: d.v > 0 ? Math.max(3, (d.v / max) * height) : 0, backgroundColor: c.brand, opacity: d.hi ? 1 : 0.55, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />)}
        {target ? <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: (target / max) * height, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.muted }} /> : null}
      </View>
      <View style={{ flexDirection: "row", gap, marginTop: 4 }}>
        {data.map((d, i) => <View key={i} style={{ flex: 1, alignItems: "center" }}>{n <= 8 || (n - 1 - i) % 5 === 0 ? <T size="xs" tone="muted" numberOfLines={1} className="w-7 text-center">{d.l}</T> : null}</View>)}
      </View>
    </View>
  );
}

/** A line through the points that have a value; days without one are skipped. */
export function Trend({ values, min, max, label, fmt = String, height = 96 }: { values: (number | null)[]; min?: number; max?: number; label: string; fmt?: (v: number) => string; height?: number }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  const lo = min ?? Math.min(...nums), top = max ?? Math.max(...nums), hi = top === lo ? lo + 1 : top, pad = 6;
  const x = (i: number) => (values.length < 2 ? w / 2 : pad + (i / (values.length - 1)) * (w - 2 * pad)), y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (height - 2 * pad);
  const pts = values.flatMap((v, i) => (v == null ? [] : [{ x: x(i), y: y(v) }]));
  const summary = `${label}. Latest ${fmt(nums[nums.length - 1])}, lowest ${fmt(Math.min(...nums))}, highest ${fmt(Math.max(...nums))}.`;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityRole="image" accessibilityLabel={summary} style={{ height }}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Line x1={0} x2={w} y1={height - 1} y2={height - 1} stroke={c.line} strokeWidth={1} />
          {pts.length > 1 ? <Polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={c.brand} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /> : null}
          {pts.length <= 31 ? pts.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} fill={c.brand} />) : null}
        </Svg>
      ) : null}
    </View>
  );
}

export type Part = { label: string; v: number; text: string };

/** Ring split into parts, with a legend beside it. Colours come from the palette in a fixed order. */
export function Donut({ parts, label, size = 116 }: { parts: Part[]; label: string; size?: number }) {
  const { c } = useTheme();
  const total = sum(parts.map((p) => p.v));
  if (total <= 0) return null;
  const colors = [c.brand, c.ok, c.warn, c.bad, c.brandDeep, c.muted], R = size / 2 - 8, C = 2 * Math.PI * R;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${label}. ${parts.map((p) => `${p.label} ${Math.round((p.v / total) * 100)} percent`).join(", ")}.`} className="flex-row items-center gap-4">
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <Circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={c.soft} strokeWidth={14} />
          {parts.map((p, i) => { const len = (p.v / total) * C, off = (sum(parts.slice(0, i).map((q) => q.v)) / total) * C; return <Circle key={p.label} cx={size / 2} cy={size / 2} r={R} fill="none" stroke={colors[i % colors.length]} strokeWidth={14} strokeDasharray={`${Math.max(len - 2, 0)} ${C}`} strokeDashoffset={-off} />; })}
        </G>
      </Svg>
      <View className="flex-1 gap-1.5">
        {parts.map((p, i) => (
          <View key={p.label} className="flex-row items-center gap-2">
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors[i % colors.length] }} />
            <T size="md" className="flex-1" numberOfLines={1}>{p.label}</T>
            <T size="md" weight="600">{p.text}</T>
          </View>
        ))}
      </View>
    </View>
  );
}
