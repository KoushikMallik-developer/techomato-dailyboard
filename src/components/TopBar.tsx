import { View } from "react-native";
import { Logo } from "./Logo";
import { T } from "./ui";

/** Logo and app name. Quick add lives in the tab bar. */
export function TopBar() {
  return (
    <View className="flex-row items-center gap-2 pt-0.5">
      <Logo size={22} />
      <T weight="700" size="base" className="tracking-tight">DailyBoard</T>
    </View>
  );
}
