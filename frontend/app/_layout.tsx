import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/context/AuthContext";
import { colors } from "@/src/theme/theme";

// Disable logbox errors etc so that users can see the app
LogBox.ignoreAllLogs(true);

// Keep the native splash visible from cold start until icon fonts register.
// Required because @expo/vector-icons' componentDidMount fallback fires
// Font.loadAsync against a broken vendor path if any <Icon> mounts before
// the family is registered — which throws on Android Expo Go.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [iconsLoaded, iconErr] = useIconFonts();
  const [fontsLoaded, fontErr] = useFonts({
    CormorantGaramond_400Regular: require("../assets/fonts/CormorantGaramond-Regular.ttf"),
    CormorantGaramond_500Medium: require("../assets/fonts/CormorantGaramond-Medium.ttf"),
    CormorantGaramond_600SemiBold: require("../assets/fonts/CormorantGaramond-SemiBold.ttf"),
    CormorantGaramond_700Bold: require("../assets/fonts/CormorantGaramond-Bold.ttf"),
    Satoshi_400Regular: require("../assets/fonts/Satoshi-Regular.ttf"),
    Satoshi_500Medium: require("../assets/fonts/Satoshi-Medium.ttf"),
    Satoshi_700Bold: require("../assets/fonts/Satoshi-Bold.ttf"),
    Satoshi_900Black: require("../assets/fonts/Satoshi-Black.ttf"),
  });

  const ready = (iconsLoaded || iconErr) && (fontsLoaded || fontErr);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.surface },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" options={{ presentation: "modal" }} />
          </Stack>
        </AuthProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
