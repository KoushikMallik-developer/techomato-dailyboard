import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ComponentProps } from "react";
import { View } from "react-native";
import { useUi } from "../store/ui";
import { Press } from "../theme/motion";
import { useLayout } from "../theme/layout";
import { useTheme } from "../theme/ThemeProvider";
import { T } from "./ui";

type Props = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];
type Icon = ComponentProps<typeof Ionicons>["name"];
const TABS: Record<string, [Icon, string]> = { index: ["home-outline", "Home"], apps: ["grid-outline", "Widgets"], insights: ["bar-chart-outline", "Insights"], settings: ["options-outline", "Settings"] };

/** Home, Widgets, a raised quick-add button, Insights, Settings. Same layout as the HTML preview. */
export function TabBar({ state, navigateToTab, insets }: Props) {
  const { c } = useTheme();
  const { openSheet } = useUi();
  const { maxW } = useLayout();
  const item = (i: number) => {
    const route = state.routes[i], focused = state.index === i, [icon, label] = TABS[route.name] ?? ["ellipse-outline" as Icon, route.name];
    return (
      <Press key={route.key} scale={0.92} onPress={() => navigateToTab(route.key)} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} className="min-h-hit flex-1 items-center gap-0.5 pb-2 pt-2.5 active:opacity-70">
        <Ionicons name={icon} size={22} color={focused ? c.brandDeep : c.muted} />
        <T size="xs" weight={focused ? "600" : "500"} tone={focused ? "brand" : "muted"}>{label}</T>
      </Press>
    );
  };
  return (
    <View style={{ paddingBottom: insets.bottom }} className="flex-row items-center justify-center self-stretch border-t border-line bg-card px-2">
      <View style={{ maxWidth: maxW }} className="w-full flex-row items-center self-center">
        {item(0)}{item(1)}
        <Press scale={0.9} onPress={() => openSheet("menu")} accessibilityRole="button" accessibilityLabel="Quick add"
          className="-mt-[18px] mx-1.5 shadow-lg shadow-black/25 h-[52px] w-[52px] items-center justify-center rounded-lg bg-brand active:opacity-70">
          <Ionicons name="add" size={28} color={c.brandInk} />
        </Press>
        {item(2)}{item(3)}
      </View>
    </View>
  );
}
