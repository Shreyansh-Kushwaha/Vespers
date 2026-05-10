import { useEffect, useRef } from "react";
import { Animated, type ViewStyle } from "react-native";

/**
 * Subtle fade + slide-up reveal. Mirrors the web's framer-motion `Reveal`
 * (8px translateY, ~600ms, ease-out). Uses RN's Animated API so we don't
 * depend on reanimated worklets for trivial decorations.
 *
 * `delay` is in seconds to match the web component's API.
 */
export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay: delay * 1000,
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 600,
        delay: delay * 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translate]);

  return (
    <Animated.View
      style={[
        { opacity, transform: [{ translateY: translate }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
