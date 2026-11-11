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
  // Layout is inline styles, not classNames: the animated Press wrapper must not decide the widths on a real device.
  const item = (i: number) => {
    const route = state.routes[i], focused = state.index === i, [icon, label] = TABS[route.name] ?? ["ellipse-outline" as Icon, route.name];
    return (
      <Press key={route.key} scale={0.92} onPress={() => navigateToTab(route.key)} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
        style={{ flex: 1, flexBasis: 0, minHeight: 44, alignItems: "center", paddingTop: 10, paddingBottom: 8, gap: 2 }}>
        <Ionicons name={icon} size={22} color={focused ? c.brandDeep : c.muted} />
        <T size="xs" weight={focused ? "600" : "500"} tone={focused ? "brand" : "muted"}>{label}</T>
      </Press>
    );
  };
  return (
    <View style={{ paddingBottom: insets.bottom, paddingHorizontal: 8, width: "100%", alignSelf: "stretch", alignItems: "center", backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.line }}>
      <View style={{ width: "100%", maxWidth: maxW, flexDirection: "row", alignItems: "center" }}>
        {item(0)}{item(1)}
        <Press scale={0.9} onPress={() => openSheet("menu")} accessibilityRole="button" accessibilityLabel="Quick add"
          style={{ width: 52, height: 52, marginTop: -18, marginHorizontal: 6, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: c.brand, elevation: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}>
          <Ionicons name="add" size={28} color={c.brandInk} />
        </Press>
        {item(2)}{item(3)}
      </View>
    </View>
  );
}
