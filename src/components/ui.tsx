import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { cssInterop } from "nativewind";
import { ComponentProps, createContext, ReactNode, useContext, useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleProp, Text, TextInput, TextInputProps, TextProps, View, ViewStyle } from "react-native";
import Animated, { FadeInDown, interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useLayout } from "../theme/layout";
import { DUR, EASE, Press, SPRING, useMotion } from "../theme/motion";
import { font } from "../theme/tokens";

cssInterop(SafeAreaView, { className: "style" });

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");

/** Scrolling screen with the app background and a 16px gutter. */
export function Screen({ children, edges = ["top"], wide }: { children: ReactNode; edges?: ("top" | "bottom")[]; wide?: boolean }) {
  const { maxW, narrowW } = useLayout();
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-bg">
      {/* a class and a style on the same scroll content container can override each other (suspected cause of off-centre content in wide web windows), so the width limit lives on an inner View */}
      <ScrollView contentContainerStyle={{ alignItems: "center" }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={{ maxWidth: wide ? maxW : narrowW }} className="w-full gap-3 p-4 pb-12">{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

type Tone = "ink" | "muted" | "brand" | "bad" | "ok" | "warn" | "onBrand" | "panelText" | "panelStrong";
const SIZE: Record<keyof typeof font, string> = { xs: "text-xs", sm: "text-xs", md: "text-md", base: "text-base", lg: "text-lg", xl: "text-xl", xxl: "text-2xl", xxxl: "text-3xl" };
const WEIGHT = { "400": "font-i4", "500": "font-i5", "600": "font-i6", "700": "font-i7" };
// brand text uses brandDeep: brand itself fails 4.5:1 on dark cards in 4 of 5 palettes.
const TONE: Record<Tone, string> = { ink: "text-ink", muted: "text-muted", brand: "text-brandDeep", bad: "text-bad", ok: "text-ok", warn: "text-warn", onBrand: "text-brandInk", panelText: "text-panelText", panelStrong: "text-panelStrong" };

export function T({ children, size = "base", weight = "400", tone = "ink", className, ...rest }: TextProps & { size?: keyof typeof font; weight?: keyof typeof WEIGHT; tone?: Tone; className?: string }) {
  return <Text {...rest} className={cx(SIZE[size], WEIGHT[weight], TONE[tone], className)}>{children}</Text>;
}

/** On Home, each card sits inside this so its title row links to the widget page. */
export type IconName = ComponentProps<typeof Ionicons>["name"];
export const CardLinkCtx = createContext<{ key: string; icon: IconName } | null>(null);

/** Hairline above a list row. Draws outside the row so the first row in a Card can clip it. */
export const Divider = () => <View pointerEvents="none" className="absolute -top-px left-0 right-0 h-px bg-line" />;

/** 28px brand-tinted tile that holds a widget icon. */
export function IconTile({ name, size = 16 }: { name: IconName; size?: number }) {
  const { c } = useTheme();
  return <View className="h-7 w-7 items-center justify-center rounded-sm bg-brandSoft"><Ionicons name={name} size={size} color={c.brandDeep} /></View>;
}

/** Page title row used under the top bar: optional back link, big title, optional small action. */
export function PageHead({ title, back, action }: { title: string; back?: boolean; action?: { label: string; onPress: () => void } }) {
  return (
    <View>
      {back ? (
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate("/"))} accessibilityRole="button" accessibilityLabel="Back to Home" hitSlop={{ top: 8, bottom: 8, right: 16 }} className="self-start pb-0.5 pt-1.5 active:opacity-70">
          <T size="md" weight="600" tone="brand">‹ Home</T>
        </Pressable>
      ) : null}
      <View className="mt-1 flex-row items-center justify-between gap-3">
        <T size="xxl" weight="700" className="flex-1 tracking-tight">{title}</T>
        {action ? <Btn small label={action.label} onPress={action.onPress} /> : null}
      </View>
    </View>
  );
}

export function Card({ title, small, right, onPress, children }: { title?: string; small?: string; right?: ReactNode; onPress?: () => void; children: ReactNode }) {
  const { c } = useTheme();
  const motion = useMotion();
  const link = useContext(CardLinkCtx);
  const head = title ? (
    <Pressable disabled={!link} onPress={() => link && router.navigate({ pathname: "/w/[key]", params: { key: link.key } })} accessibilityRole={link ? "link" : undefined} accessibilityLabel={link ? `Open ${title}` : undefined}
      className="mb-2 min-h-7 flex-row items-center justify-between gap-2">
      <View className="min-w-0 flex-shrink flex-row items-center gap-2">
        {link ? <IconTile name={link.icon} /> : null}
        <T weight="600" className="tracking-tight">{title}</T>
        {link ? <Ionicons name="chevron-forward" size={16} color={c.brandDeep} /> : null}
      </View>
      <View className="flex-row items-center gap-3">
        {small ? <T size="sm" tone="muted">{small}</T> : null}
        {right}
      </View>
    </Pressable>
  ) : null;
  return (
    <Animated.View entering={motion ? FadeInDown.duration(DUR.base).easing(EASE) : undefined}>
      <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? "button" : undefined} className="rounded-lg border border-line bg-card p-4 active:opacity-70">
        {head}
        {/* a row draws its divider 1px above itself, so the first one falls outside this box and is clipped (the preview hides it with :first-of-type) */}
        <View className="overflow-hidden">{children}</View>
      </Pressable>
    </Animated.View>
  );
}

export function Btn({ label, onPress, ghost, danger, small, style, className }: { label: string; onPress: () => void; ghost?: boolean; danger?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; className?: string }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" style={style} hitSlop={small ? { top: 6, bottom: 6 } : undefined}
      className={cx("items-center justify-center active:opacity-70", small ? "min-h-8 rounded-sm px-3 py-[7px]" : "min-h-hit rounded-md px-4", ghost ? "border border-line bg-transparent" : danger ? "bg-bad" : "bg-brand", className)}>
      <T weight="600" size={small ? "md" : "base"} tone={ghost ? "ink" : danger ? "onBrand" : "onBrand"}>{label}</T>
    </Press>
  );
}

/** Small tappable text. The hit slop keeps the touch target at 44px. */
export function LinkBtn({ label, onPress, tone = "muted" }: { label: string; onPress: () => void; tone?: Tone }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }} className="rounded-xs px-1.5 py-1 active:opacity-70">
      <T size="sm" tone={tone}>{label}</T>
    </Pressable>
  );
}

export function Seg<V extends string>({ value, options, onChange }: { value: V; options: [V, string][]; onChange: (v: V) => void }) {
  return (
    <View className="flex-row gap-[3px] rounded-md border border-line bg-soft p-[3px]">
      {options.map(([v, label]) => (
        <Pressable key={v} onPress={() => onChange(v)} accessibilityRole="button" accessibilityState={{ selected: v === value }}
          className={cx("min-h-hit flex-1 items-center justify-center rounded-sm border active:opacity-70", v === value ? "border-line bg-card" : "border-transparent")}>
          <T size="md" weight={v === value ? "600" : "500"} tone={v === value ? "ink" : "muted"}>{label}</T>
        </Pressable>
      ))}
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} scale={0.94} accessibilityRole="button" accessibilityState={{ selected: !!on }} hitSlop={{ top: 10, bottom: 10 }}
      className={cx("rounded-full border px-[11px] py-1 active:opacity-70", on ? "border-brand bg-brand" : "border-line bg-transparent")}>
      <T size="sm" tone={on ? "onBrand" : "muted"}>{label}</T>
    </Press>
  );
}

export function Check({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const { c } = useTheme();
  const ok = useMotion(), pop = useSharedValue(1), was = useRef(on);
  useEffect(() => { if (on && !was.current && ok) { pop.value = 0.5; pop.value = withSpring(1, { damping: 9, stiffness: 300 }); } was.current = on; }, [on, ok, pop]);
  const tick = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: on }} hitSlop={11}
      className={cx("h-[22px] w-[22px] items-center justify-center rounded-xs border-[1.5px]", on ? "border-brand bg-brand" : "border-muted bg-transparent")}>
      {on ? <Animated.View style={tick}><Ionicons name="checkmark" size={16} color={c.brandInk} /></Animated.View> : null}
    </Pressable>
  );
}

/** Brand-coloured switch, 44x26 like the preview. Hit area is padded to 44px tall. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c } = useTheme();
  const ok = useMotion(), p = useSharedValue(value ? 1 : 0);
  useEffect(() => { p.value = ok ? withSpring(value ? 1 : 0, SPRING) : value ? 1 : 0; }, [value, ok, p]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], [c.line, c.brand]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * 18 }] }));
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} hitSlop={9}>
      <Animated.View style={[{ height: 26, width: 44, borderRadius: 13, justifyContent: "center" }, track]}>
        <Animated.View style={[{ height: 20, width: 20, borderRadius: 10, marginLeft: 3, backgroundColor: "#fff" }, knob]} />
      </Animated.View>
    </Pressable>
  );
}

export function Bar({ pct, tone }: { pct: number; tone?: "warn" | "bad" }) {
  const { c } = useTheme();
  const p = Math.max(0, Math.min(100, pct)), ok = useMotion(), w = useSharedValue(0);
  useEffect(() => { w.value = ok ? withTiming(p, { duration: DUR.slow, easing: EASE }) : p; }, [p, ok, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View className="h-2 overflow-hidden rounded bg-soft">
      <Animated.View style={[{ height: "100%", backgroundColor: tone ? (tone === "bad" ? c.bad : c.warn) : p >= 100 ? c.ok : c.brand }, fill]} />
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <T tone="muted" className="py-4 text-center">{text}</T>;
}

export function Stats({ items }: { items: [string | number, string][] }) {
  return (
    <View className="flex-row gap-2">
      {items.map(([v, l]) => (
        <View key={l} className="flex-1 rounded-md border border-line bg-card p-3">
          <T size="xl" weight="700">{v}</T>
          <T size="xs" tone="muted">{l}</T>
        </View>
      ))}
    </View>
  );
}

type TagTone = "" | "ok" | "m" | "h" | "b";
const TAG: Record<TagTone, [string, Tone]> = { ok: ["bg-okSoft", "ok"], m: ["bg-warnSoft", "warn"], h: ["bg-badSoft", "bad"], b: ["bg-brandSoft", "brand"], "": ["bg-soft", "muted"] };
/** Small status pill. Tones: ok green, m amber, h red, b brand, "" neutral. */
export function Tag({ label, tone = "" }: { label: string; tone?: TagTone }) {
  const [bg, text] = TAG[tone];
  return <View className={cx("self-start rounded-xs px-1.5 py-0.5", bg)}><T size="xs" weight="600" tone={text} className="uppercase tracking-wide">{label}</T></View>;
}

export function Input({ className, ...rest }: TextInputProps & { className?: string }) {
  const { c } = useTheme();
  return <TextInput placeholderTextColor={c.muted} textAlignVertical={rest.multiline ? "top" : undefined} {...rest} className={cx("min-h-hit rounded-sm border border-line bg-soft px-3 py-2.5 font-i4 text-base text-ink", className)} />;
}

/** Input and an Add button on one line. */
export function QuickAdd({ value, onChange, onAdd, placeholder, extra }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string; extra?: ReactNode }) {
  return (
    <View className="flex-row items-center gap-2">
      <Input value={value} onChangeText={onChange} onSubmitEditing={onAdd} placeholder={placeholder} accessibilityLabel={placeholder} maxLength={100} returnKeyType="done" className="flex-1" />
      {extra}
      <Btn label="Add" onPress={onAdd} />
    </View>
  );
}

/** Tappable list row: title and sub on the left, tag or value on the right. */
export function Row({ title, sub, right, onPress, done }: { title: string; sub?: string; right?: ReactNode; onPress?: () => void; done?: boolean; last?: boolean }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? "button" : undefined} className="relative min-h-hit flex-row items-center justify-between gap-3 py-2.5 active:opacity-70">
      <Divider />
      <View className="flex-1">
        <T weight="500" tone={done ? "muted" : "ink"} className={done ? "line-through" : undefined}>{title}</T>
        {sub ? <T size="sm" tone="muted">{sub}</T> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Day({ label, right }: { label: string; right?: string }) {
  return (
    <View className="flex-row justify-between pb-0.5 pt-3.5">
      <T size="xs" weight="600" tone="muted" className="uppercase tracking-wider">{label}</T>{right ? <T size="xs" tone="muted">{right}</T> : null}
    </View>
  );
}

export function Note({ children, tone = "muted", center }: { children: ReactNode; tone?: Tone; center?: boolean }) {
  return <T size="sm" tone={tone} className={center ? "text-center" : undefined}>{children}</T>;
}

/** Row of wrapping chips. */
export function Chips({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-1.5">{children}</View>;
}

export function BigNum({ label, value }: { label: string; value: string | number }) {
  return <View><T size="sm" tone="muted">{label}</T><T size="xl" weight="700">{value}</T></View>;
}
