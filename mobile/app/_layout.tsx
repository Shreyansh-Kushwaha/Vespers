import {
  Allura_400Regular,
  useFonts as useAllura,
} from "@expo-google-fonts/allura";
import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
  useFonts as useFraunces,
} from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  useFonts as useInter,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
  useFonts as useMono,
} from "@expo-google-fonts/jetbrains-mono";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../lib/theme";

// Hold the splash screen until our editorial fonts have actually loaded —
// otherwise the first paint shows system fonts and snaps to Fraunces, which
// looks janky and breaks the "set in print" feeling.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [allura] = useAllura({ Allura_400Regular });
  const [fraunces] = useFraunces({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
  });
  const [inter] = useInter({ Inter_400Regular, Inter_500Medium });
  const [mono] = useMono({ JetBrainsMono_400Regular });

  const fontsReady = allura && fraunces && inter && mono;

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          animation: "fade",
        }}
      />
    </SafeAreaProvider>
  );
}
