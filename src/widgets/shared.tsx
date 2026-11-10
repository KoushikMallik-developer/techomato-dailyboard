import { router } from "expo-router";
import { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Check, Divider, T, Tag } from "../components/ui";
import { Prio } from "../store/types";

export const go = (key: string) => router.navigate({ pathname: "/w/[key]", params: { key } });

export const PrioTag = ({ p }: { p: Prio }) => <Tag label={p === "h" ? "High" : p === "m" ? "Med" : "Low"} tone={p === "h" ? "h" : p === "m" ? "m" : ""} />;

/** Checkbox, tappable title, optional tag, and a sub line. The pattern behind every to-do style list. */
export function CheckRow({ on, onToggle, label, title, sub, subTone, tag, onPress }: { on: boolean; onToggle: () => void; label: string; title: string; sub?: string; subTone?: "muted" | "bad"; tag?: ReactNode; onPress?: () => void }) {
  return (
    <View className="relative min-h-hit flex-row items-center gap-3 py-2.5">
      <Divider />
      <Check on={on} onPress={onToggle} label={label} />
      <Pressable disabled={!onPress} onPress={onPress} className="flex-1" accessibilityRole={onPress ? "button" : undefined}>
        <T weight="500" tone={on ? "muted" : "ink"} className={on ? "line-through" : undefined}>{title}</T>
        {sub ? <T size="sm" tone={subTone ?? "muted"}>{sub}</T> : null}
      </Pressable>
      {tag}
    </View>
  );
}

export const MoreLink = ({ to, n }: { to: string; n: number }) => <Pressable onPress={() => go(to)} accessibilityRole="button" accessibilityLabel={`Show ${n} more`} hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }} className="self-start py-1 active:opacity-70"><T size="sm" tone="brand">+ {n} more</T></Pressable>;
