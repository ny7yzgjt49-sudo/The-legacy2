import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, radius, spacing } from "@/src/theme/theme";
import { AppText, Display } from "@/src/components/ui";
import { api, videoFileUrl } from "@/src/api/client";

const HERO =
  "https://images.unsplash.com/photo-1612101983284-c15859891526?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400";

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.home();
      setData(res);
    } catch {
      // keep previous
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

  const stats = data?.stats ?? { applications: 0, votes: 0, tour_stops: 0, regions: 20 };
  const featured = data?.featured ?? [];
  const pillars = data?.pillars ?? [];

  return (
    <View style={styles.root}>
      <ScrollView
        testID="home-scroll"
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
        {/* Hero */}
        <View style={[styles.hero]}>
          <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          <LinearGradient
            colors={["rgba(15,26,42,0.35)", "rgba(15,26,42,0.75)", colors.surface]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing.xl }]}>
            <View style={styles.badge}>
              <View style={styles.dot} />
              <AppText size={11} weight="bold" color={colors.onBrandTertiary} style={{ letterSpacing: 1.5 }}>
                MADE IN ITALY
              </AppText>
            </View>
            <Display size={52} style={{ marginTop: spacing.lg }}>
              The Legacy{"\n"}Lab
            </Display>
            <AppText size={15} color={colors.onSurfaceSecondary} style={{ marginTop: spacing.md, lineHeight: 22 }}>
              L'ecosistema che custodisce, racconta e fa crescere l'eccellenza italiana.
            </AppText>
            <Pressable
              testID="hero-apply-cta"
              onPress={() => router.push("/(tabs)/candidati")}
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
            >
              <AppText size={15} weight="bold" color={colors.onBrandPrimary}>
                Candida la tua storia
              </AppText>
              <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat value={stats.applications} label="Candidature" />
          <View style={styles.statDivider} />
          <Stat value={stats.votes} label="Voti" />
          <View style={styles.statDivider} />
          <Stat value={stats.regions} label="Regioni" />
        </View>

        {/* Featured */}
        <SectionHeader title="In evidenza" subtitle="Le storie più votate della community" />
        {loading ? (
          <ActivityIndicator color={colors.brandPrimary} style={{ marginVertical: spacing.xl }} />
        ) : featured.length === 0 ? (
          <View style={styles.emptyFeatured}>
            <Ionicons name="film-outline" size={26} color={colors.muted} />
            <AppText size={14} color={colors.muted} style={{ marginTop: spacing.sm, textAlign: "center" }}>
              Ancora nessuna candidatura.{"\n"}Sii il primo a raccontare la tua eccellenza.
            </AppText>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}
          >
            {featured.map((app: any) => (
              <Pressable
                key={app.id}
                testID={`featured-${app.id}`}
                onPress={() => router.push("/(tabs)/classifica")}
                style={[styles.featuredCard, { width: width * 0.62 }]}
              >
                <Image source={{ uri: app.poster }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient
                  colors={["transparent", "rgba(11,21,34,0.95)"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.featuredBadge}>
                  <Ionicons name="heart" size={12} color={colors.brandPrimary} />
                  <AppText size={12} weight="bold" color={colors.onSurface}>
                    {app.votes}
                  </AppText>
                </View>
                <View style={styles.featuredInfo}>
                  <AppText size={11} weight="medium" color={colors.brandSecondary} style={{ letterSpacing: 0.5 }}>
                    {app.category_name?.toUpperCase()}
                  </AppText>
                  <Display size={22} style={{ marginTop: 2 }} numberOfLines={2}>
                    {app.business_name}
                  </Display>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Pillars */}
        <SectionHeader title="I 5 Pilastri" subtitle="Scegli il tuo mondo di appartenenza" />
        <View style={styles.pillarGrid}>
          {pillars.map((p: any) => (
            <Pressable
              key={p.id}
              testID={`pillar-${p.id}`}
              onPress={() => router.push("/(tabs)/candidati")}
              style={[styles.pillarCard, { width: (width - spacing.xl * 2 - spacing.md) / 2 }]}
            >
              <Image source={{ uri: p.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={["rgba(15,26,42,0.2)", "rgba(15,26,42,0.9)"]} style={StyleSheet.absoluteFill} />
              <View style={styles.pillarInfo}>
                <Display size={20}>{p.name}</Display>
                <AppText size={11} color={colors.onSurfaceTertiary} style={{ marginTop: 2 }}>
                  {p.tagline}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Mission */}
        <View style={styles.mission}>
          <View style={styles.quoteBar} />
          <Display size={26} style={{ lineHeight: 32 }}>
            Non un programma TV, ma un'infrastruttura nazionale per il Made in Italy.
          </Display>
          <AppText size={14} color={colors.onSurfaceSecondary} style={{ marginTop: spacing.lg, lineHeight: 23 }}>
            L'82% delle imprese italiane è a conduzione familiare, ma solo il 30% sopravvive oltre il fondatore.
            The Legacy Lab connette imprese, istituzioni, università, capitali e media per custodire e far crescere
            l'eccellenza italiana attraverso un viaggio nazionale in 20 regioni.
          </AppText>
        </View>

        {/* Visione CTA */}
        <Pressable
          testID="home-visione-cta"
          onPress={() => router.push("/progetto")}
          style={({ pressed }) => [styles.visioneCard, pressed && { opacity: 0.9 }]}
        >
          <View style={{ flex: 1 }}>
            <AppText size={11} weight="bold" color={colors.brandSecondary} style={{ letterSpacing: 1 }}>
              CHI SIAMO · HUB UNIVERSITARIO
            </AppText>
            <Display size={26} style={{ marginTop: 4 }}>
              La nostra visione
            </Display>
            <AppText size={13} color={colors.onSurfaceTertiary} style={{ marginTop: 4 }}>
              Da dove nasce l'idea, il Founder e il progetto nazionale.
            </AppText>
          </View>
          <View style={styles.visioneArrow}>
            <Ionicons name="arrow-forward" size={20} color={colors.onBrandPrimary} />
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Display size={30} color={colors.brandPrimary}>
        {value}
      </Display>
      <AppText size={12} color={colors.muted} style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing["2xl"], marginBottom: spacing.lg }}>
      <Display size={28}>{title}</Display>
      <AppText size={13} color={colors.muted} style={{ marginTop: 2 }}>
        {subtitle}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 480, justifyContent: "flex-end" },
  heroContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brandPrimary },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    height: 52,
    borderRadius: radius.pill,
    marginTop: spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statDivider: { width: 1, height: 32, backgroundColor: colors.divider },
  featuredCard: {
    height: 220,
    borderRadius: radius.lg,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: colors.surfaceSecondary,
  },
  featuredBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(11,21,34,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  featuredInfo: { padding: spacing.lg },
  emptyFeatured: { alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.xl },
  pillarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  pillarCard: {
    height: 130,
    borderRadius: radius.lg,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: colors.surfaceSecondary,
  },
  pillarInfo: { padding: spacing.md },
  mission: {
    marginHorizontal: spacing.xl,
    marginTop: spacing["3xl"],
    paddingLeft: spacing.lg,
  },
  quoteBar: {
    position: "absolute",
    left: 0,
    top: 4,
    bottom: 4,
    width: 3,
    backgroundColor: colors.brandPrimary,
    borderRadius: 2,
  },
  visioneCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginHorizontal: spacing.xl,
    marginTop: spacing["2xl"],
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  visioneArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
});
