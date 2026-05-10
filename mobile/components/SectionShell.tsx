import { StyleSheet, View } from "react-native";
import { colors, space } from "../lib/theme";
import { Eyebrow } from "./Eyebrow";
import { Hairline } from "./Hairline";
import { Reveal } from "./Reveal";

/**
 * Mirrors frontend/components/marketing/SectionShell.tsx. Each movement
 * presents itself with a top hairline + section dateline:
 *
 *   ─────────────────
 *   § 02  —  THE LETTER
 *
 *   <children>
 */
export function SectionShell({
  number,
  title,
  children,
  topRule = true,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
  topRule?: boolean;
}) {
  return (
    <View style={styles.section}>
      {topRule && <Hairline />}
      <View style={styles.body}>
        <Reveal>
          <Eyebrow style={styles.dateline}>
            § {number}    —    {title}
          </Eyebrow>
        </Reveal>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.paper,
  },
  body: {
    paddingHorizontal: space.lg,
    paddingTop: space.xxl,
    paddingBottom: space.xl + space.md,
  },
  dateline: {
    marginBottom: space.xl,
  },
});
