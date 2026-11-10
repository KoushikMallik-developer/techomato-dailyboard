import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { TopBar } from "../components/TopBar";
import { Card, Divider, Empty, Input, PageHead, Screen, T } from "../components/ui";
import { searchResults } from "../lib/logic";
import { useStore } from "../store/store";
import { WidgetKey } from "../store/types";
import { useTheme } from "../theme/ThemeProvider";
import { go } from "../widgets/shared";
import { WIDGETS } from "../widgets/registry";

export default function Search() {
  const { c } = useTheme();
  const { state } = useStore();
  const [q, setQ] = useState("");
  const R = searchResults(state, q);
  return (
    <Screen>
      <TopBar />
      <PageHead back title="Search" />
      <Input value={q} onChangeText={setQ} placeholder="Search everything" autoFocus accessibilityLabel="Search everything" className="bg-card" />
      <Card>
        {R === null ? <Empty text="Type at least two letters." /> : R.length === 0 ? <Empty text="No matches." /> : R.map((r, i) => (
          <Pressable key={i} onPress={() => go(r.k)} accessibilityRole="button" className="relative min-h-12 flex-row items-center gap-3 py-2.5 active:opacity-70">
            <Divider />
            <Ionicons name={WIDGETS[r.k as WidgetKey].icon} size={20} color={c.brand} />
            <View className="flex-1"><T weight="500" numberOfLines={2}>{r.title.slice(0, 90)}</T><T size="sm" tone="muted">{r.sub}</T></View>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
