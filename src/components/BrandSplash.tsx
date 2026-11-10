import { useEffect, useState } from "react";
import { Animated, Image, StyleSheet, Text, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MIN_MS = 1200; // long enough to read the name, even when the app is ready sooner

/**
 * Second half of the splash. The native splash (app.json) can only show one centred image, so it shows the logo tile;
 * this overlay takes over in the same spot, adds the name under it and "by techomato" at the bottom, then fades out once the app is ready.
 * It sits outside the theme provider (which waits for saved data), so it follows the system light/dark setting like the native splash does.
 */
export function BrandSplash({ ready, onGone }: { ready: boolean; onGone: () => void }) {
  const dark = useColorScheme() === "dark";
  const { bottom } = useSafeAreaInsets();
  const [text] = useState(() => new Animated.Value(0));
  const [overlay] = useState(() => new Animated.Value(1));
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    Animated.timing(text, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    const t = setTimeout(() => setWaited(true), MIN_MS);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    if (ready && waited) Animated.timing(overlay, { toValue: 0, duration: 300, useNativeDriver: true }).start(({ finished }) => { if (finished) onGone(); });
  }, [ready, waited, overlay, onGone]);

  const ink = dark ? "#F1EFEA" : "#17181C", soft = dark ? "#A3A6AF" : "#5B5F6A";
  return (
    <Animated.View accessibilityLabel="DailyBoard by techomato" style={[StyleSheet.absoluteFill, { opacity: overlay, backgroundColor: dark ? "#141417" : "#FFFFFF", alignItems: "center", justifyContent: "center" }]}>
      {/* same image, width and centre as the native splash, so the tile does not move when this takes over */}
      <Image source={require("../../assets/splash-icon.png")} style={{ width: 200, height: 200 }} resizeMode="contain" />
      <Animated.View style={{ opacity: text, position: "absolute", top: "50%", marginTop: 96 }}>
        <Text style={{ color: ink }} className="font-i7 text-3xl tracking-tight">DailyBoard</Text>
      </Animated.View>
      <Animated.View style={{ opacity: text, position: "absolute", bottom: bottom + 28 }}>
        <Text style={{ color: soft }} className="font-i5 text-md tracking-wide">by techomato</Text>
      </Animated.View>
    </Animated.View>
  );
}
