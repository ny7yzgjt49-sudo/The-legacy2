import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Component, useEffect } from "react";
import { View, Pressable, LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { usePushNotifications } from "@/src/hooks/usePushNotifications";
import { colors, spacing } from "@/src/theme/theme";
import { Display, AppText } from "@/src/components/ui";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
          <Display size={28} style={{ textAlign: "center" }}>Qualcosa è andato storto</Display>
          <AppText size={14} color={colors.muted} style={{ textAlign: "center", marginTop: spacing.md, lineHeight: 22 }}>
            Si è verificato un errore inaspettato.{"\n"}Riprova o riavvia l'app.
          </AppText>
          <Pressable
            onPress={() => this.setState({ hasError: false })}
            style={{ marginTop: spacing.xl, paddingHorizontal: spacing["3xl"], height: 52, borderRadius: 999, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" }}
          >
            <AppText size={15} weight="bold" color="#fff">Riprova</AppText>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function NotificationRegistrar() {
  const { user } = useAuth();
  usePushNotifications(user?.id ?? null);
  return null;
}

if (!__DEV__) LogBox.ignoreAllLogs(true);

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
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AuthProvider>
            <NotificationRegistrar />
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.surface },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="auth" options={{ presentation: "modal" }} />
              <Stack.Screen name="verify-email" />
              <Stack.Screen name="reset-password" />
              <Stack.Screen name="c/[id]" />
            </Stack>
          </AuthProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
