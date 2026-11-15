import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

const MIN_MS = 1800; // long enough to see the logo build and the name, even when the app is ready sooner
const BRAND = "#C8381F", DEEP = "#8E2413"; // the logo's colours (assets/splash-icon.png)
// The four tiles of the logo in a 120 x 120 box: same geometry as assets/brand/logo.svg (24-unit grid x 5), same look as the native splash image.
const TILES = [
  { x: 20, y: 20, w: 32.5, h: 45, c: "#FFFFFF" },
  { x: 67.5, y: 20, w: 32.5, h: 25, c: DEEP },
  { x: 67.5, y: 60, w: 32.5, h: 40, c: "#FFFFFF" },
  { x: 20, y: 80, w: 32.5, h: 20, c: "#FFFFFF" },
];

/**
 * Second half of the splash. The native splash (app.json) can only show one centred still image, so it shows the logo tile;
 * this overlay takes over in the same spot with the same picture (the tile does not move), then the four tiles collapse and spring back one by one,
 * a light sweeps across, a brand glow breathes behind it, the name rises in, a shimmer shows loading, and the whole thing fades out once the app is ready.
 * It sits outside the theme provider (which waits for saved data), so it follows the system light/dark setting like the native splash does.
 */
export function BrandSplash({ ready, onGone }: { ready: boolean; onGone: () => void }) {
  const dark = useColorScheme() === "dark";
  const { bottom } = useSafeAreaInsets();
  const [tiles] = useState(() => TILES.map(() => new Animated.Value(1)));
  const [shine] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));
  const [text] = useState(() => new Animated.Value(0));
  const [sweep] = useState(() => new Animated.Value(0));
  const [overlay] = useState(() => new Animated.Value(1));
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    let stop: (() => void) | undefined, off = false;
    const t = setTimeout(() => setWaited(true), MIN_MS);
    const out = { easing: Easing.out(Easing.cubic), useNativeDriver: true };
    // Reduced motion: the words still fade in, but the glow, the tile build, the light sweep and the shimmer stay out.
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((calm) => {
      if (off) return;
      Animated.timing(text, { toValue: 1, duration: 500, delay: 250, ...out }).start();
      if (calm) return;
      Animated.timing(glow, { toValue: 1, duration: 1000, ...out }).start();
      tiles.forEach((v, i) => Animated.sequence([
        Animated.delay(150 + i * 90),
        Animated.timing(v, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.spring(v, { toValue: 1, friction: 4, tension: 150, useNativeDriver: true }),
      ]).start());
      Animated.timing(shine, { toValue: 1, duration: 650, delay: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
      const loop = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
      loop.start();
      stop = () => loop.stop();
    });
    return () => { off = true; stop?.(); clearTimeout(t); };
  }, [tiles, shine, glow, text, sweep]);

  useEffect(() => {
    if (ready && waited) Animated.timing(overlay, { toValue: 0, duration: 350, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => { if (finished) onGone(); });
  }, [ready, waited, overlay, onGone]);

  const ink = dark ? "#F1EFEA" : "#17181C", soft = dark ? "#A3A6AF" : "#5B5F6A", track = dark ? "#2A2B31" : "#E7E4DE";
  return (
    <Animated.View
      accessibilityLabel="DailyBoard by techomato"
      style={[StyleSheet.absoluteFill, { opacity: overlay, transform: [{ scale: overlay.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1] }) }], backgroundColor: dark ? "#141417" : "#FFFFFF", alignItems: "center", justifyContent: "center", overflow: "hidden" }]}
    >
      {/* a soft brand glow behind the logo, breathing in as the app starts */}
      <Animated.View pointerEvents="none" style={{ position: "absolute", opacity: glow, transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
        <Svg width={420} height={420}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={BRAND} stopOpacity={dark ? 0.38 : 0.2} />
              <Stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={420} height={420} fill="url(#glow)" />
        </Svg>
      </Animated.View>
      {/* the logo, 120 x 120 at the centre like the tile in the native splash image; the tiles spring in one after another, then a light sweeps across */}
      <View style={{ width: 120, height: 120, borderRadius: 27.5, backgroundColor: BRAND, overflow: "hidden" }}>
        {TILES.map((t, i) => (
          <Animated.View key={i} style={{ position: "absolute", left: t.x, top: t.y, width: t.w, height: t.h, borderRadius: 7.5, backgroundColor: t.c, transform: [{ scale: tiles[i] }] }} />
        ))}
        <Animated.View pointerEvents="none" style={{ position: "absolute", top: -30, left: 0, width: 36, height: 180, backgroundColor: "rgba(255,255,255,0.32)", transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-90, 150] }) }, { rotate: "20deg" }] }} />
      </View>
      <Animated.View style={{ opacity: text, position: "absolute", top: "50%", marginTop: 96, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <Text style={{ color: ink }} className="font-i7 text-3xl tracking-tight">DailyBoard</Text>
      </Animated.View>
      {/* loading shimmer: a short brand bar sliding along a thin track */}
      <Animated.View style={{ opacity: text, position: "absolute", top: "50%", marginTop: 152 }}>
        <View style={{ width: 64, height: 3, borderRadius: 2, backgroundColor: track, overflow: "hidden" }}>
          <Animated.View style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: BRAND, transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-28, 64] }) }] }} />
        </View>
      </Animated.View>
      <Animated.View style={{ opacity: text, position: "absolute", bottom: bottom + 28 }}>
        <Text style={{ color: soft }} className="font-i5 text-md tracking-wide">by techomato</Text>
      </Animated.View>
    </Animated.View>
  );
}
