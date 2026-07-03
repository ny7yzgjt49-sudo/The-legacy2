import React, { useCallback, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, radius, spacing } from "@/src/theme/theme";
import { AppText, Display } from "@/src/components/ui";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";

const MAP_IMG =
  "https://images.unsplash.com/photo-1524398039352-5905418087d4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

const MONTHS = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return { day: d.getDate(), month: MONTHS[d.getMonth()], year: d.getFullYear() };
}

export default function Tour() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [stops, setStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.tour();
      setStops(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleRegister = async (stop: any) => {
    if (!user) {
      router.push("/auth");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStops((prev) => prev.map((s) => (s.id === stop.id ? { ...s, registered: !s.registered } : s)));
    try {
      await api.registerTour(stop.id);
    } catch {
      load();
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        testID="tour-scroll"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.brandPrimary}
          />
        }
      >
        <View style={styles.hero}>
          <Image source={{ uri: MAP_IMG }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          <LinearGradient
            colors={["rgba(15,26,42,0.5)", "rgba(15,26,42,0.8)", colors.surface]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing.xl }]}>
            <AppText size={11} weight="bold" color={colors.onBrandTertiary} style={{ letterSpacing: 1.5 }}>
              SELECTION TOUR NAZIONALE
            </AppText>
            <Display size={44} style={{ marginTop: spacing.sm }}>
              Il Tour{"\n"}Nazionale
            </Display>
            <AppText size={14} color={colors.onSurfaceSecondary} style={{ marginTop: spacing.sm }}>
              80 seminari · 20 regioni · un'unica missione.
            </AppText>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing["2xl"] }} />
        ) : (
          <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
            {stops.map((stop) => {
              const { day, month, year } = fmtDate(stop.date);
              return (
                <View key={stop.id} testID={`tour-stop-${stop.id}`} style={styles.stopRow}>
                  <View style={styles.dateBox}>
                    <Display size={26} color={colors.brandPrimary}>
                      {day}
                    </Display>
                    <AppText size={11} weight="bold" color={colors.onSurfaceSecondary} style={{ letterSpacing: 1 }}>
                      {month}
                    </AppText>
                    <AppText size={10} color={colors.muted}>
                      {year}
                    </AppText>
                  </View>

                  <View style={styles.stopInfo}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="location" size={13} color={colors.brandSecondary} />
                      <AppText size={12} weight="medium" color={colors.brandSecondary}>
                        {stop.city}, {stop.region}
                      </AppText>
                    </View>
                    <Display size={22} style={{ marginTop: 2 }}>
                      {stop.title}
                    </Display>
                    <AppText size={13} color={colors.onSurfaceTertiary} style={{ marginTop: 4, lineHeight: 19 }}>
                      {stop.description}
                    </AppText>
                    <AppText size={12} color={colors.muted} style={{ marginTop: 6 }}>
                      {stop.venue}
                    </AppText>

                    <Pressable
                      testID={`tour-register-${stop.id}`}
                      onPress={() => toggleRegister(stop)}
                      style={[styles.regBtn, stop.registered ? styles.regBtnActive : styles.regBtnIdle]}
                    >
                      <Ionicons
                        name={stop.registered ? "checkmark-circle" : "ticket-outline"}
                        size={16}
                        color={stop.registered ? colors.onBrandPrimary : colors.brandPrimary}
                      />
                      <AppText
                        size={13}
                        weight="bold"
                        color={stop.registered ? colors.onBrandPrimary : colors.brandPrimary}
                      >
                        {stop.registered ? "Iscritto" : "Prenota il posto"}
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 320, justifyContent: "flex-end" },
  heroContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  stopRow: { flexDirection: "row", gap: spacing.lg, marginBottom: spacing.xl },
  dateBox: {
    width: 60,
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  stopInfo: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  regBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  regBtnIdle: { backgroundColor: colors.brandTertiary },
  regBtnActive: { backgroundColor: colors.brandPrimary },
});
