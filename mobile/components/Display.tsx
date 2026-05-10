import type { TextProps } from "react-native";
import { StyleSheet, Text } from "react-native";
import { colors, fonts } from "../lib/theme";

/**
 * Fraunces serif body text. Replaces the web's `.display` class.
 *
 * The variants:
 *   <Display>...</Display>            → 18px serif body
 *   <Display heading>...</Display>    → larger heading variant
 *   <Display italic>...</Display>     → italic emphasis (used for in-line accent)
 */
interface Props extends TextProps {
  italic?: boolean;
  heading?: boolean;
  size?: number;
  color?: string;
}

export function Display({
  italic,
  heading,
  size,
  color = colors.ink,
  style,
  children,
  ...rest
}: Props) {
  const family = italic ? fonts.displayItalic : fonts.display;
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        heading && styles.heading,
        {
          fontFamily: family,
          fontSize: size ?? (heading ? 36 : 18),
          color,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.ink,
    lineHeight: 30,
  },
  heading: {
    lineHeight: 40,
    letterSpacing: -0.4,
  },
});
