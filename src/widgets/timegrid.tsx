import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { T } from "../components/ui";
import { todayKey } from "../lib/date";
import { layout } from "../lib/logic";
import { CalEvent } from "../store/types";
import { useTheme } from "../theme/ThemeProvider";

const GUTTER = 40, hh = (h: number) => String(h).padStart(2, "0") + ":00";
const clock = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** An hour-by-hour grid for one day or a week, like a work calendar. Shows only the hours that matter: 07:00 to 20:00, wider when events fall outside that. */
export function TimeGrid({ days, byDay, onSlot, onEvent, onDay, selected, faded }: {
  days: string[]; byDay: Record<string, CalEvent[]>; onSlot: (day: string, time: string) => void; onEvent: (id: number) => void; onDay?: (day: string) => void; selected?: string; faded?: (e: CalEvent) => boolean;
}) {
  const { c } = useTheme();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id); }, []);
  const today = todayKey(), week = days.length > 1, HR = week ? 46 : 56;
  const blocks = days.map((d) => layout(byDay[d] ?? []));
  const all = blocks.flat(), from = Math.min(7, ...all.map((b) => Math.floor(b.start / 60))), to = Math.min(23, Math.max(20, ...all.map((b) => Math.floor((b.end - 1) / 60))));
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i), H = (to - from + 1) * HR, nowMin = now.getHours() * 60 + now.getMinutes();
  const color = (cat: string) => (cat === "Office" ? c.ok : cat === "Other" ? c.warn : c.brand);
  return (
    <View>
      {week ? (
        <View style={{ flexDirection: "row", paddingLeft: GUTTER, paddingBottom: 6 }}>
          {days.map((d) => {
            const dt = new Date(d + "T12:00:00"), on = d === selected, isToday = d === today;
            return (
              <Pressable key={d} onPress={() => onDay?.(d)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={dt.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} style={{ flex: 1, alignItems: "center", gap: 2 }}>
                <T size="xs" tone="muted">{["S", "M", "T", "W", "T", "F", "S"][dt.getDay()]}</T>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.brand : "transparent", borderWidth: isToday && !on ? 1.5 : 0, borderColor: c.brand }}>
                  <T size="md" weight={isToday ? "700" : "500"} tone={on ? "onBrand" : isToday ? "brand" : "ink"}>{dt.getDate()}</T>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", height: H }}>
        <View style={{ width: GUTTER }}>
          {hours.map((h, i) => <View key={h} style={{ position: "absolute", top: i * HR - 7, right: 6 }}><T size="xs" tone="muted">{hh(h)}</T></View>)}
        </View>
        {days.map((d, di) => (
          <View key={d} style={{ flex: 1, borderLeftWidth: 1, borderColor: c.line, backgroundColor: d === selected && week ? c.soft : "transparent" }}>
            {hours.map((h, i) => (
              <Pressable key={h} onPress={() => onSlot(d, hh(h))} accessibilityRole="button" accessibilityLabel={`Add event on ${d} at ${hh(h)}`} style={{ position: "absolute", top: i * HR, left: 0, right: 0, height: HR, borderTopWidth: 1, borderColor: c.line }} />
            ))}
            {blocks[di].map(({ e, start, end, lane, n }) => {
              const col = color(e.cat), top = ((start - from * 60) / 60) * HR, h = Math.max(22, ((end - start) / 60) * HR - 2);
              return (
                <Pressable key={e.id} onPress={() => onEvent(e.id)} accessibilityRole="button" accessibilityLabel={`${e.t}, ${clock(start)} to ${clock(end)}`}
                  style={{ position: "absolute", top, height: h, left: `${(lane / n) * 100}%`, width: `${100 / n}%`, paddingHorizontal: 1 }}>
                  <View style={{ flex: 1, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: col, backgroundColor: col + "26", opacity: faded?.(e) ? 0.45 : 1, paddingHorizontal: 5, paddingVertical: 2, overflow: "hidden" }}>
                    <T size="xs" weight="600" numberOfLines={week ? 2 : 1}>{e.t}</T>
                    {!week && !e.tid && h >= 36 ? <T size="xs" tone="muted" numberOfLines={1}>{clock(start)} to {clock(end)}</T> : null}
                  </View>
                </Pressable>
              );
            })}
            {d === today && nowMin >= from * 60 && nowMin <= (to + 1) * 60 ? (
              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: ((nowMin - from * 60) / 60) * HR, height: 2, backgroundColor: c.bad }}>
                <View style={{ position: "absolute", left: -4, top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: c.bad }} />
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
