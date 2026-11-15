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
import { AuthShell } from "../components/AuthShell";
import { Login } from "../components/Login";
import { T } from "../components/ui";
import { VerifyEmail } from "../components/VerifyEmail";
import { SheetHost } from "../components/Sheet";
import { cloudOn } from "../lib/cloud";
import { StoreProvider, useStore } from "../store/store";
import { UiProvider } from "../store/ui";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";

// The native splash stays up until the fonts load; then BrandSplash (same logo spot, plus name and "by techomato") covers the app until saved data is ready.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

function Shell({ onReady }: { onReady: () => void }) {
  const { c, dark } = useTheme(), { account } = useStore();
  useEffect(() => { if (account.known) onReady(); }, [account.known, onReady]); // saved data has loaded, and so has the sign-in state
  if (!account.known) return null;
  if (!cloudOn && !__DEV__) return <><StatusBar style={dark ? "light" : "dark"} /><AuthShell><T size="xl" weight="700">Setup missing</T><T tone="muted">This build has no Firebase keys, so sign-in is not possible. Add the EXPO_PUBLIC_FIREBASE_* values to the build and rebuild.</T></AuthShell></>; // never open the app without a login wall in a release build
  if (cloudOn && !account.signedIn) return <><StatusBar style={dark ? "light" : "dark"} /><Login /></>; // no sign-in, no app
  if (cloudOn && !account.verified) return <><StatusBar style={dark ? "light" : "dark"} /><VerifyEmail /></>; // nor before the email is confirmed
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
  const [loaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [ready, setReady] = useState(false), [showSplash, setShowSplash] = useState(true);
  const onReady = useCallback(() => setReady(true), []), onGone = useCallback(() => setShowSplash(false), []);
  const fonts = loaded || !!fontError; // a font that fails to load must not leave the app on the splash screen
  useEffect(() => { if (fonts) SplashScreen.hide(); }, [fonts]); // hand over from the native splash to BrandSplash
  if (!fonts) return null;
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, overflow: "hidden" }}>
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
