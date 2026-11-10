import { router } from "expo-router";
import { View } from "react-native";
import { IconTile, Screen, T } from "../../components/ui";
import { TopBar } from "../../components/TopBar";
import { liveStat } from "../../lib/logic";
import { useStore } from "../../store/store";
import { useLayout } from "../../theme/layout";
import { Press } from "../../theme/motion";
import { WIDGETS } from "../../widgets/registry";

export default function Apps() {
  const { state } = useStore();
  const { tileCols } = useLayout();
  return (
    <Screen wide>
      <TopBar />
      {/* rows of `tileCols` tiles: percentage widths plus a gap add up to more than 100% and wrap early */}
      {Array.from({ length: Math.ceil(state.order.length / tileCols) }, (_, r) => (
        <View key={r} className="flex-row gap-3">
          {Array.from({ length: tileCols }, (_, i) => {
            const k = state.order[r * tileCols + i];
            if (!k) return <View key={i} className="min-h-tile min-w-0 flex-1 p-4" />; // empty slot: a lone last tile stays left-aligned at the same size
            const w = WIDGETS[k];
            return (
              <Press key={k} onPress={() => router.navigate({ pathname: "/w/[key]", params: { key: k } })} accessibilityRole="button" accessibilityLabel={`${w.title}, ${liveStat(state, k)}`}
                className={`min-h-tile min-w-0 flex-1 gap-3 rounded-lg border border-line bg-card p-4 active:opacity-70 ${state.on[k] ? "" : "opacity-55"}`}>
                <IconTile name={w.icon} />
                <View className="min-w-0"><T size="md" weight="600">{w.title}</T>
                <T size="sm" tone="muted">{liveStat(state, k)}</T>
                <T size="sm" tone="muted">{w.blurb}</T></View>
              </Press>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}
