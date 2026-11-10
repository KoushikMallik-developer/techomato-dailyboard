import { cssInterop } from "nativewind";
import { ComponentProps } from "react";
import { Pressable } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

/** Motion rules for the app: short, ease-out, never decorative. Everything checks the system "reduce motion" setting first. */
export const EASE = Easing.out(Easing.cubic);
export const DUR = { press: 90, fast: 200, base: 300, slow: 600 } as const;
export const SPRING = { damping: 16, stiffness: 240 } as const;

/** True when animations are allowed (the user has not asked the system to reduce motion). */
export const useMotion = () => !useReducedMotion();

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: "style" });

/** A Pressable that shrinks slightly while pressed and springs back. Takes className like any other component. */
export function Press({ scale = 0.97, onPressIn, onPressOut, style, ...rest }: ComponentProps<typeof Pressable> & { className?: string; scale?: number }) {
  const v = useSharedValue(1), ok = useMotion();
  const a = useAnimatedStyle(() => ({ transform: [{ scale: v.value }] }));
  return (
    <AnimatedPressable {...rest} style={[style as never, a]}
      onPressIn={(e) => { if (ok) v.set(withTiming(scale, { duration: DUR.press })); onPressIn?.(e); }}
      onPressOut={(e) => { if (ok) v.set(withSpring(1, { damping: 14, stiffness: 320 })); onPressOut?.(e); }} />
  );
}
