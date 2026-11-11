import { ComponentProps, useState } from "react";
import { Pressable } from "react-native";
import { Easing, useReducedMotion } from "react-native-reanimated";

/** Motion rules for the app: short, ease-out, never decorative. Everything checks the system "reduce motion" setting first. */
export const EASE = Easing.out(Easing.cubic);
export const DUR = { press: 90, fast: 200, base: 300, slow: 600 } as const;
export const SPRING = { damping: 16, stiffness: 240 } as const;

/** True when animations are allowed (the user has not asked the system to reduce motion). */
export const useMotion = () => !useReducedMotion();

/** A Pressable that shrinks slightly while pressed. Takes className like any other component.
 *  shortcut: plain Pressable with a state-driven scale (no spring), because an Animated(Pressable) wrapper dropped its styles on a real Android device; upgrade once that is understood. */
export function Press({ scale = 0.97, onPressIn, onPressOut, style, ...rest }: ComponentProps<typeof Pressable> & { className?: string; scale?: number }) {
  const [down, setDown] = useState(false), ok = useMotion();
  return (
    <Pressable {...rest} style={[style as never, down && ok ? { transform: [{ scale }], opacity: 0.7 } : null]}
      onPressIn={(e) => { setDown(true); onPressIn?.(e); }}
      onPressOut={(e) => { setDown(false); onPressOut?.(e); }} />
  );
}
