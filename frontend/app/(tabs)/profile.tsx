import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing } from "@/src/theme/theme";
import { AppText, Display, Button } from "@/src/components/ui";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";

const BANNER = "https://images.unsplash.com/photo-1524398039352-5905418087d4?w=1200&q=85";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.myApplications();
      setApps(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!user) {
    return (
      <View style={styles.root}>
        <View style={[styles.banner, { height: 300 }]}>
          <Image source={{ uri: BANNER }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["rgba(15,26,42,0.4)", colors.surface]} style={StyleSheet.absoluteFill} />
        </View>
        <View style={[styles.center, { flex: 1, padding: spacing.xl, marginTop: -80 }]}>
          <View style={styles.falconCircle}>
            <Ionicons name="person" size={40} color={colors.brandPrimary} />
          </View>
          <Display size={30} style={{ marginTop: spacing.lg, textAlign: "center" }}>
            La tua eredità
          </Display>
          <AppText size={14} color={colors.muted} style={{ marginTop: spacing.sm, textAlign: "center" }}>
            Accedi per gestire le tue candidature e seguire il tour.
          </AppText>
          <View style={{ height: spacing.xl }} />
          <Button testID="profile-login" title="Accedi / Registrati" fullWidth={false} style={{ paddingHorizontal: spacing["3xl"] }} onPress={() => router.push("/auth")} />
        </View>
      </View>
    );
  }

  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View style={styles.banner}>
        <Image source={{ uri: BANNER }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["rgba(15,26,42,0.35)", "rgba(15,26,42,0.85)", colors.surface]} style={StyleSheet.absoluteFill} />
        <View style={[styles.profileHead, { paddingTop: insets.top + spacing.xl }]}>
          <View style={styles.avatar}>
            <AppText size={26} weight="black" color={colors.onBrandPrimary}>
              {initials}
            </AppText>
          </View>
          <Display size={30} style={{ marginTop: spacing.md }}>
            {user.name}
          </Display>
          <AppText size={13} color={colors.onSurfaceTertiary}>
            {user.email}
          </AppText>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Display size={24}>Le mie candidature</Display>
          <AppText size={13} color={colors.muted}>
            {apps.length}
          </AppText>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
        ) : apps.length === 0 ? (
          <View style={[styles.emptyBox]}>
            <Ionicons name="videocam-outline" size={28} color={colors.muted} />
            <AppText size={14} color={colors.muted} style={{ marginTop: spacing.sm, textAlign: "center" }}>
              Non hai ancora candidature.
            </AppText>
            <Pressable onPress={() => router.push("/(tabs)/candidati")} style={styles.emptyCta}>
              <AppText size={14} weight="bold" color={colors.brandPrimary}>
                Candidati ora
              </AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {apps.map((a) => (
              <Pressable
                key={a.id}
                testID={`my-app-${a.id}`}
                onPress={() => router.push("/(tabs)/classifica")}
                style={[styles.card, { width: (width - spacing.xl * 2 - spacing.md) / 2 }]}
              >
                <Image source={{ uri: a.poster }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={["transparent", "rgba(11,21,34,0.92)"]} style={StyleSheet.absoluteFill} />
                <View style={styles.cardBadge}>
                  <Ionicons name="heart" size={11} color={colors.brandPrimary} />
                  <AppText size={11} weight="bold" color="#fff">
                    {a.votes}
                  </AppText>
                </View>
                <View style={{ padding: spacing.md }}>
                  <Display size={17} numberOfLines={1}>
                    {a.business_name}
                  </Display>
                  <AppText size={10} color={colors.brandSecondary}>
                    {a.category_name}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable testID="profile-logout" onPress={logout} style={styles.logout}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <AppText size={14} weight="medium" color={colors.error}>
            Esci
          </AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: "center", justifyContent: "center" },
  banner: { height: 260, justifyContent: "flex-end" },
  profileHead: { alignItems: "center", paddingBottom: spacing.xl },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  falconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg },
  card: { height: 150, borderRadius: radius.lg, overflow: "hidden", justifyContent: "flex-end", backgroundColor: colors.surfaceSecondary },
  cardBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(11,21,34,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  emptyBox: { alignItems: "center", padding: spacing["2xl"], marginTop: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  emptyCta: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brandPrimary },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing["2xl"], paddingVertical: spacing.lg },
});
