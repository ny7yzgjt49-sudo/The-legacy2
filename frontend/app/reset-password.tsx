import React, { useState } from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, radius, spacing } from "@/src/theme/theme";
import { AppText, Display, Button } from "@/src/components/ui";
import { api } from "@/src/api/client";

export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError("");
    if (password.length < 8) { setError("La password deve avere almeno 8 caratteri."); return; }
    if (password !== confirm) { setError("Le password non coincidono."); return; }
    if (!token) { setError("Token mancante."); return; }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Link non valido o scaduto.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.root}>
        <Ionicons name="checkmark-circle" size={52} color={colors.success} />
        <Display size={28} style={styles.title}>Password aggiornata!</Display>
        <AppText size={14} color={colors.muted} style={styles.body}>
          Ora puoi accedere con la tua nuova password.
        </AppText>
        <Button title="Accedi" fullWidth={false} style={{ paddingHorizontal: spacing["3xl"] }} onPress={() => router.replace("/auth")} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Display size={30} style={{ marginBottom: spacing.sm }}>Nuova password</Display>
      <AppText size={14} color={colors.muted} style={{ marginBottom: spacing.xl }}>
        Scegli una password di almeno 8 caratteri.
      </AppText>

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Nuova password"
        placeholderTextColor={colors.muted}
        style={styles.input}
        secureTextEntry
      />
      <TextInput
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Conferma password"
        placeholderTextColor={colors.muted}
        style={[styles.input, { marginTop: spacing.md }]}
        secureTextEntry
      />

      {error ? (
        <AppText size={13} color={colors.error} style={{ marginTop: spacing.md }}>{error}</AppText>
      ) : null}

      <Button title="Reimposta password" loading={loading} style={{ marginTop: spacing.xl }} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, padding: spacing.xl, paddingTop: 80, alignItems: "stretch" },
  title: { marginTop: spacing.lg, textAlign: "center" },
  body: { textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 22 },
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
