import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, radius, spacing } from "@/src/theme/theme";
import { AppText, Display, Button } from "@/src/components/ui";
import { api, videoFileUrl, videoThumbnailUrl } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) { setError(true); setLoading(false); return; }
    api.application(id)
      .then(setItem)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const onVote = async () => {
    if (!user) { router.push("/auth"); return; }
    if (!item) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItem((prev: any) => ({
      ...prev,
      voted: !prev.voted,
      votes: prev.votes + (prev.voted ? -1 : 1),
    }));
    try {
      await api.vote(item.id);
    } catch {
      api.application(id!).then(setItem).catch(() => {});
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
        <AppText size={15} color={colors.muted} style={{ marginTop: spacing.md, textAlign: "center" }}>
          Candidatura non trovata.
        </AppText>
        <Pressable onPress={() => router.replace("/(tabs)")} style={styles.backCta}>
          <AppText size={14} weight="bold" color={colors.brandPrimary}>Torna alla home</AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <VideoPlayer videoId={item.video_id} poster={item.has_thumbnail ? videoThumbnailUrl(item.video_id) : item.poster} />

      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")} style={[styles.backBtn, { top: insets.top + spacing.sm }]}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </Pressable>

      <View style={styles.body}>
        <View style={styles.catPill}>
          <AppText size={11} weight="bold" color={colors.onBrandPrimary} style={{ letterSpacing: 0.5 }}>
            {item.category_name?.toUpperCase()}
          </AppText>
        </View>

        <Display size={34} style={{ marginTop: spacing.md }}>
          {item.business_name}
        </Display>

        {item.location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs }}>
            <Ionicons name="location" size={13} color={colors.brandSecondary} />
            <AppText size={13} color={colors.brandSecondary}>{item.location}</AppText>
          </View>
        ) : null}

        <AppText size={15} color={colors.onSurfaceSecondary} style={{ marginTop: spacing.lg, lineHeight: 24 }}>
          {item.description}
        </AppText>

        <View style={styles.divider} />

        <View style={styles.voteRow}>
          <View>
            <Display size={40} color={colors.brandPrimary}>{item.votes}</Display>
            <AppText size={12} color={colors.muted}>voti ricevuti</AppText>
          </View>
          <Pressable onPress={onVote} style={[styles.voteBtn, item.voted && styles.voteBtnActive]}>
            <Ionicons name={item.voted ? "heart" : "heart-outline"} size={22} color={item.voted ? "#fff" : colors.onSurface} />
            <AppText size={15} weight="bold" color={item.voted ? "#fff" : colors.onSurface}>
              {item.voted ? "Hai votato" : "Vota"}
            </AppText>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Button
          title="Scopri le altre candidature"
          variant="outline"
          onPress={() => router.push("/(tabs)/classifica")}
        />
      </View>
    </ScrollView>
  );
}

function VideoPlayer({ videoId, poster }: { videoId: string; poster: string }) {
  const player = useVideoPlayer(videoFileUrl(videoId), (p) => {
    p.loop = true;
    p.muted = false;
  });

  return (
    <View style={styles.videoWrap}>
      <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={2} />
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls />
      <LinearGradient
        colors={["rgba(15,26,42,0.2)", "transparent", "rgba(15,26,42,0.6)"]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, padding: spacing["3xl"] },
  videoWrap: { height: 340, backgroundColor: "#000" },
  backBtn: {
    position: "absolute",
    left: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: spacing.xl },
  catPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xl },
  voteRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voteBtnActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  backCta: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
});
