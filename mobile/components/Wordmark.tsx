import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../lib/theme";

/**
 * Calligraphic "Vespers" wordmark, set in Allura.
 *
 * The web variant uses a left-to-right clip-path wipe-in animation and a
 * navy→violet gradient text fill. On native, react-native cannot mask text
 * with a gradient without expo-linear-gradient + MaskedView, which adds
 * dependency weight for a single screen of static decoration. We render the
 * solid brand navy instead — visually identical at phone scale.
 *
 * Sizing follows the web's `text-[19vw] sm:text-[17vw]` clamp; on a typical
 * 390pt phone width that's ~74pt, so we hard-code 96pt to feel hero-scale on
 * screens where the wordmark is the only thing on screen, and accept a smaller
 * variant via the size prop.
 */
export function Wordmark({ size = 96 }: { size?: number }) {
  return (
    <View>
      <Text
        accessibilityRole="header"
        style={[
          styles.text,
          {
            fontSize: size,
            // Allura's tall ascenders + descenders need extra leading.
            lineHeight: size * 1.05,
            // Push the baseline down so the script sits flush like in the web.
            paddingBottom: size * 0.32,
          },
        ]}
      >
        Vespers
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.script,
    color: colors.aubergine,
    includeFontPadding: false,
  },
});
