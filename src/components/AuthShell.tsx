import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { Logo } from "./Logo";
import { T } from "./ui";

/** Brand header plus a card, shared by the sign-in and verify-email screens. `below` is a note under the card. */
export function AuthShell({ children, below }: { children: ReactNode; below?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {/* the same red as the splash, with the logo on a light tile so it stays visible */}
          <SafeAreaView edges={["top"]} style={{ backgroundColor: c.brand, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingBottom: 72 }}>
            <View className="items-center gap-3 px-6 pt-10">
              <View style={{ backgroundColor: c.brandInk }} className="h-[84px] w-[84px] items-center justify-center rounded-[24px]"><Logo size={60} decorative /></View>
              <T size="xxxl" weight="700" tone="onBrand" className="tracking-tight">DailyBoard</T>
              <T tone="onBrand" className="opacity-90">Plan. Track. Remember.</T>
            </View>
          </SafeAreaView>
          <SafeAreaView edges={["bottom"]} style={{ flex: 1, alignItems: "center", marginTop: -48, paddingHorizontal: 16, paddingBottom: 24 }}>
            <View style={{ maxWidth: 440, width: "100%" }} className="gap-5 rounded-lg border border-line bg-card p-5">{children}</View>
            {below ? <T size="sm" tone="muted" className="mt-5 px-6 text-center">{below}</T> : null}
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
