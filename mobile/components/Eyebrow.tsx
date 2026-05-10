import type { TextStyle } from "react-native";
import { Text } from "react-native";
import { colors, eyebrow } from "../lib/theme";

interface Props {
  children: React.ReactNode;
  color?: string;
  size?: number;
  spacing?: number;
  style?: TextStyle;
}

/**
 * Mirrors `.eyebrow` from frontend/app/globals.css. Used liberally as
 * letter-spaced uppercase mono labels — section numbers, datelines, footers.
 */
export function Eyebrow({
  children,
  color = colors.margin,
  size = 11,
  spacing,
  style,
}: Props) {
  return (
    <Text
      style={[
        eyebrow,
        { color, fontSize: size, letterSpacing: spacing ?? size * 0.22 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
