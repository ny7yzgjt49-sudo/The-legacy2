import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing } from "@/src/theme/theme";
import { AppText, Display, Button } from "@/src/components/ui";
import { api } from "@/src/api/client";

export default function VerifyEmail() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    api.verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <View style={styles.root}>
      {status === "loading" && (
        <>
          <Ionicons name="mail-outline" size={52} color={colors.brandPrimary} />
          <Display size={28} style={styles.title}>Verifica in corso…</Display>
        </>
      )}
      {status === "success" && (
        <>
          <Ionicons name="checkmark-circle" size={52} color={colors.success} />
          <Display size={28} style={styles.title}>Email verificata!</Display>
          <AppText size={14} color={colors.muted} style={styles.body}>
            Il tuo account è confermato. Puoi accedere a tutte le funzionalità.
          </AppText>
          <Button title="Vai alla home" fullWidth={false} style={{ paddingHorizontal: spacing["3xl"] }} onPress={() => router.replace("/(tabs)")} />
        </>
      )}
      {status === "error" && (
        <>
          <Ionicons name="close-circle" size={52} color={colors.error} />
          <Display size={28} style={styles.title}>Link non valido</Display>
          <AppText size={14} color={colors.muted} style={styles.body}>
            Il link è scaduto o è già stato usato. Richiedi un nuovo link dalla tua area profilo.
          </AppText>
          <Button title="Torna alla home" fullWidth={false} variant="outline" style={{ paddingHorizontal: spacing["3xl"] }} onPress={() => router.replace("/(tabs)")} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: spacing["3xl"] },
  title: { marginTop: spacing.lg, textAlign: "center" },
  body: { textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 22 },
});
