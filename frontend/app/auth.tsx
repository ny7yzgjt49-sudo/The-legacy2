import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, radius, spacing } from "@/src/theme/theme";
import { AppText, Display, Button } from "@/src/components/ui";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";

const HERO = "https://images.unsplash.com/photo-1612101983284-c15859891526?w=1200&q=85";

export default function Auth() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register } = useAuth();

  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const submit = async () => {
    setError("");
    if (tab === "forgot") {
      if (!email.trim()) { setError("Inserisci la tua email."); return; }
      setLoading(true);
      try {
        await api.forgotPassword(email.trim());
        setForgotSent(true);
      } catch (e: any) {
        setError(e.message || "Errore nell'invio");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!email.trim() || !password.trim() || (tab === "register" && !name.trim())) {
      setError("Compila tutti i campi.");
      return;
    }
    if (password.length < 6) {
      setError("La password deve avere almeno 6 caratteri.");
      return;
    }
    setLoading(true);
    try {
      if (tab === "login") await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
      router.back();
    } catch (e: any) {
      setError(e.message || "Autenticazione non riuscita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["rgba(15,26,42,0.4)", "rgba(15,26,42,0.85)", colors.surface]} style={StyleSheet.absoluteFill} />
        <Pressable testID="auth-close" onPress={() => router.back()} style={[styles.close, { top: insets.top + spacing.sm }]}>
          <Ionicons name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.heroText}>
          <AppText size={11} weight="bold" color={colors.onBrandTertiary} style={{ letterSpacing: 1.5 }}>
            THE LEGACY LAB
          </AppText>
          <Display size={38} style={{ marginTop: spacing.xs }}>
            {tab === "login" ? "Bentornato" : "Unisciti a noi"}
          </Display>
        </View>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {tab !== "forgot" && (
          <View style={styles.tabs}>
            <Pressable testID="tab-login" onPress={() => { setTab("login"); setError(""); }} style={[styles.tab, tab === "login" && styles.tabActive]}>
              <AppText size={14} weight="bold" color={tab === "login" ? colors.onBrandPrimary : colors.onSurfaceSecondary}>Accedi</AppText>
            </Pressable>
            <Pressable testID="tab-register" onPress={() => { setTab("register"); setError(""); }} style={[styles.tab, tab === "register" && styles.tabActive]}>
              <AppText size={14} weight="bold" color={tab === "register" ? colors.onBrandPrimary : colors.onSurfaceSecondary}>Registrati</AppText>
            </Pressable>
          </View>
        )}

        {tab === "forgot" && (
          <>
            <Pressable onPress={() => { setTab("login"); setForgotSent(false); setError(""); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xl }}>
              <Ionicons name="arrow-back" size={16} color={colors.muted} />
              <AppText size={13} color={colors.muted}>Torna al login</AppText>
            </Pressable>
            <Display size={26} style={{ marginBottom: spacing.sm }}>Password dimenticata?</Display>
            <AppText size={14} color={colors.muted} style={{ marginBottom: spacing.xl }}>
              Inserisci la tua email e ti mandiamo un link per reimpostare la password.
            </AppText>
          </>
        )}

        {forgotSent ? (
          <View style={{ alignItems: "center", padding: spacing.xl, gap: spacing.md }}>
            <Ionicons name="mail-outline" size={44} color={colors.brandPrimary} />
            <AppText size={15} weight="bold" color={colors.onSurface} style={{ textAlign: "center" }}>Controlla la tua email</AppText>
            <AppText size={13} color={colors.muted} style={{ textAlign: "center" }}>Ti abbiamo inviato un link per reimpostare la password.</AppText>
          </View>
        ) : (
          <>
            {tab === "register" && (
              <Field label="Nome">
                <TextInput testID="input-name" value={name} onChangeText={setName} placeholder="Il tuo nome" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="words" />
              </Field>
            )}

            <Field label="Email">
              <TextInput
                testID="input-email"
                value={email}
                onChangeText={setEmail}
                placeholder="nome@email.com"
                placeholderTextColor={colors.muted}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>

            {tab !== "forgot" && (
              <Field label="Password">
                <TextInput testID="input-password" value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry />
              </Field>
            )}

            {error ? (
              <AppText testID="auth-error" size={13} color={colors.error} style={{ marginBottom: spacing.md }}>{error}</AppText>
            ) : null}

            <Button
              testID="auth-submit"
              title={tab === "login" ? "Accedi" : tab === "register" ? "Crea account" : "Invia link"}
              loading={loading}
              onPress={submit}
            />

            {tab === "login" && (
              <Pressable testID="forgot-link" onPress={() => { setTab("forgot"); setError(""); }} style={{ marginTop: spacing.lg, alignItems: "center" }}>
                <AppText size={13} color={colors.muted}>Hai dimenticato la password?</AppText>
              </Pressable>
            )}

            {tab === "register" && (
              <AppText size={12} color={colors.muted} style={{ textAlign: "center", marginTop: spacing.lg, lineHeight: 18 }}>
                Registrandoti aderisci alla community del Made in Italy di The Legacy Lab.
              </AppText>
            )}
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <AppText size={12} weight="medium" color={colors.onSurfaceSecondary} style={{ marginBottom: spacing.sm, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 240, justifyContent: "flex-end" },
  heroText: { padding: spacing.xl },
  close: { position: "absolute", right: spacing.lg, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill, padding: 4, marginBottom: spacing.xl },
  tab: { flex: 1, height: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: colors.brandPrimary },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: colors.onSurface,
    fontFamily: fonts.text,
    fontSize: 15,
  },
});
