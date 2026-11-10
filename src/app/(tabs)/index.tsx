import { router } from "expo-router";
import { View } from "react-native";
import { Card, CardLinkCtx, LinkBtn, Screen, T } from "../../components/ui";
import { TopBar } from "../../components/TopBar";
import { useStore } from "../../store/store";
import { useLayout } from "../../theme/layout";
import { Agenda, Hero } from "../../widgets/agenda";
import { WIDGETS } from "../../widgets/registry";

export default function Home() {
  const { state } = useStore();
  const { homeCols } = useLayout();
  const shown = state.order.filter((k) => state.on[k]).map((k) => WIDGETS[k]);
  return (
    <Screen wide>
      <TopBar />
      <Hero />
      <Agenda />
      <View className="flex-row items-start gap-3">
        {Array.from({ length: homeCols }, (_, col) => (
          <View key={col} className="min-w-0 flex-1 gap-3">
            {shown.filter((_, i) => i % homeCols === col).map((w) => {
              const C = w.Card;
              return <CardLinkCtx.Provider key={w.key} value={{ key: w.key, icon: w.icon }}><C /></CardLinkCtx.Provider>;
            })}
          </View>
        ))}
      </View>
      {shown.length === 0 ? <Card><T tone="muted">No widgets on Home. Turn some on in Settings.</T></Card> : null}
      <View className="items-center"><LinkBtn label="See all widgets" onPress={() => router.navigate("/apps")} /></View>
    </Screen>
  );
}
