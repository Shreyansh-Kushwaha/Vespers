import type { TextProps } from "react-native";
import { Text } from "react-native";
import { colors, fonts } from "../lib/theme";

/**
 * Inline calligraphic accent (Allura). Used to highlight a single word
 * inside a Fraunces sentence — "weighing", "quiet", "yours", "heard".
 *
 * The web sets these about 1.05em larger than the surrounding text and tints
 * them with the brand navy. We do the same with the `size` and `color` props.
 */
export function Script({
  size = 32,
  color = colors.aubergine,
  style,
  children,
  ...rest
}: TextProps & { size?: number; color?: string }) {
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fonts.script,
          color,
          fontSize: size,
          // Allura needs extra room; line-height matches surrounding leading
          // so the baseline still aligns when used inline.
          lineHeight: size * 1.0,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
