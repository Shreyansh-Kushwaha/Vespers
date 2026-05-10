import { View, type ViewStyle } from "react-native";
import { colors } from "../lib/theme";

/**
 * A 1px navy-tinted divider — the page's visual backbone. Mirrors
 * `.hairline` in globals.css.
 */
export function Hairline({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[{ height: 1, backgroundColor: colors.rule, width: "100%" }, style]}
    />
  );
}
