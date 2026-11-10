import "../global.css";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BrandSplash } from "../components/BrandSplash";
import { AlarmEngine } from "../components/AlarmEngine";
import { SheetHost } from "../components/Sheet";
import { StoreProvider } from "../store/store";
import { UiProvider } from "../store/ui";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";

// The native splash stays up until the fonts load; then BrandSplash (same logo spot, plus name and "by techomato") covers the app until saved data is ready.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

function Shell({ onReady }: { onReady: () => void }) {
  const { c, dark } = useTheme();
  useEffect(() => { onReady(); }, [onReady]); // Shell mounts only once saved data has loaded
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="w/[key]" />
        <Stack.Screen name="search" />
      </Stack>
      <SheetHost />
      <AlarmEngine />
    </>
  );
}

export default function Root() {
  const [fonts] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [ready, setReady] = useState(false), [showSplash, setShowSplash] = useState(true);
  const onReady = useCallback(() => setReady(true), []), onGone = useCallback(() => setShowSplash(false), []);
  useEffect(() => { if (fonts) SplashScreen.hide(); }, [fonts]); // hand over from the native splash to BrandSplash
  if (!fonts) return null;
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <StoreProvider>
          <ThemeProvider>
            <UiProvider>
              <Shell onReady={onReady} />
            </UiProvider>
          </ThemeProvider>
        </StoreProvider>
        {showSplash ? <BrandSplash ready={ready} onGone={onGone} /> : null}
      </View>
    </SafeAreaProvider>
  );
}
