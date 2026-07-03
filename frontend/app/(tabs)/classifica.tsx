import React, { useCallback, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, radius, spacing } from "@/src/theme/theme";
import { AppText, Display } from "@/src/components/ui";
import { api, videoFileUrl } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";

const FILTERS = [
  { id: "", label: "Tutte" },
  { id: "saper-fare", label: "Saper Fare" },
  { id: "gusto", label: "Gusto" },
  { id: "creativita", label: "Creatività" },
  { id: "commercio", label: "Commercio" },
  { id: "identita", label: "Identità" },
];

export default function Classifica() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { user } = useAuth();

  const [mode, setMode] = useState<"feed" | "rank">("feed");
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = mode === "feed" ? await api.applications(filter || undefined) : await api.leaderboard(filter || undefined);
      setItems(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [mode, filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onVote = async (item: any) => {
    if (!user) {
      router.push("/auth");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, voted: !it.voted, votes: it.votes + (it.voted ? -1 : 1) } : it
      )
    );
    try {
      await api.vote(item.id);
    } catch {
      load();
    }
  };

  const viewabilityPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 80 },
      onViewableItemsChanged: ({ viewableItems }: any) => {
        if (viewableItems?.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
      },
    },
  ]).current;

  const Overlay = (
    <View style={[styles.overlayHeader, { paddingTop: insets.top + spacing.sm, pointerEvents: "box-none" }]}>
      <View style={styles.segment}>
        <Segment label="Feed" active={mode === "feed"} onPress={() => setMode("feed")} testID="seg-feed" />
        <Segment label="Classifica" active={mode === "rank"} onPress={() => setMode("rank")} testID="seg-rank" />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xl }}
        style={{ marginTop: spacing.md }}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.id || "all"}
            testID={`filter-${f.id || "all"}`}
            onPress={() => {
              Haptics.selectionAsync();
              setFilter(f.id);
            }}
            style={[styles.chip, filter === f.id ? styles.chipActive : styles.chipIdle]}
          >
            <AppText size={13} weight="medium" color={filter === f.id ? colors.onBrandPrimary : colors.onSurfaceSecondary}>
              {f.label}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const empty = (
    <View style={[styles.center, { height: height * 0.7 }]}>
      <Ionicons name="film-outline" size={44} color={colors.muted} />
      <AppText size={15} color={colors.muted} style={{ marginTop: spacing.md, textAlign: "center" }}>
        Nessuna candidatura ancora.
      </AppText>
      <Pressable onPress={() => router.push("/(tabs)/candidati")} style={styles.emptyCta}>
        <AppText size={14} weight="bold" color={colors.brandPrimary}>
          Candidati ora
        </AppText>
      </Pressable>
    </View>
  );

  // ---- RANK LIST ----
  if (mode === "rank") {
    return (
      <View style={styles.root}>
        {loading ? (
          <View style={[styles.center, { flex: 1 }]}>
            <ActivityIndicator color={colors.brandPrimary} />
          </View>
        ) : items.length === 0 ? (
          <ScrollView contentContainerStyle={{ paddingTop: insets.top + 110 }}>{empty}</ScrollView>
        ) : (
          <FlatList
            testID="rank-list"
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingTop: insets.top + 110, paddingBottom: 120, paddingHorizontal: spacing.xl }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View testID={`rank-item-${item.id}`} style={styles.rankRow}>
                <Display size={26} color={index < 3 ? colors.brandPrimary : colors.muted} style={{ width: 34 }}>
                  {index + 1}
                </Display>
                <Image source={{ uri: item.poster }} style={styles.rankThumb} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Display size={19} numberOfLines={1}>
                    {item.business_name}
                  </Display>
                  <AppText size={12} color={colors.brandSecondary}>
                    {item.category_name}
                  </AppText>
                </View>
                <Pressable testID={`rank-vote-${item.id}`} onPress={() => onVote(item)} style={styles.voteChip}>
                  <Ionicons name={item.voted ? "heart" : "heart-outline"} size={18} color={item.voted ? colors.brandPrimary : colors.onSurface} />
                  <AppText size={13} weight="bold" color={colors.onSurface}>
                    {item.votes}
                  </AppText>
                </Pressable>
              </View>
            )}
          />
        )}
        {Overlay}
      </View>
    );
  }

  // ---- FEED ----
  return (
    <View style={[styles.root, { backgroundColor: "#000" }]}>
      {loading ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        empty
      ) : (
        <FlatList
          testID="feed-list"
          data={items}
          keyExtractor={(i) => i.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          viewabilityConfigCallbackPairs={viewabilityPairs}
          renderItem={({ item, index }) => (
            <FeedItem
              item={item}
              isActive={index === activeIndex}
              height={height}
              bottomInset={insets.bottom + 78}
              onVote={() => onVote(item)}
            />
          )}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        />
      )}
      {Overlay}
    </View>
  );
}

function FeedItem({ item, isActive, height, bottomInset, onVote }: any) {
  const player = useVideoPlayer(videoFileUrl(item.video_id), (p) => {
    p.loop = true;
    p.muted = false;
  });

  React.useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]);

  return (
    <View style={{ height, width: "100%", backgroundColor: "#000" }}>
      <Image source={{ uri: item.poster }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={2} />
      {Platform.OS !== "web" ? (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      ) : null}
      <LinearGradient
        colors={["transparent", "rgba(11,21,34,0.4)", "rgba(11,21,34,0.95)"]}
        locations={[0.4, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Right actions */}
      <View style={[styles.actions, { bottom: bottomInset + 20 }]}>
        <Pressable testID={`feed-vote-${item.id}`} onPress={onVote} style={styles.actionBtn}>
          <Ionicons name={item.voted ? "heart" : "heart-outline"} size={34} color={item.voted ? colors.brandPrimary : "#fff"} />
          <AppText size={13} weight="bold" color="#fff">
            {item.votes}
          </AppText>
        </Pressable>
      </View>

      {/* Info */}
      <View style={[styles.feedInfo, { bottom: bottomInset + 20 }]}>
        <View style={styles.catPill}>
          <AppText size={11} weight="bold" color={colors.onBrandPrimary} style={{ letterSpacing: 0.5 }}>
            {item.category_name?.toUpperCase()}
          </AppText>
        </View>
        <Display size={30} style={{ marginTop: spacing.sm }}>
          {item.business_name}
        </Display>
        {item.location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Ionicons name="location" size={13} color={colors.brandSecondary} />
            <AppText size={13} color={colors.brandSecondary}>
              {item.location}
            </AppText>
          </View>
        ) : null}
        <AppText size={14} color={colors.onSurfaceSecondary} numberOfLines={2} style={{ marginTop: 6, lineHeight: 20 }}>
          {item.description}
        </AppText>
      </View>
    </View>
  );
}

function Segment({ label, active, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.segBtn, active && styles.segBtnActive]}>
      <AppText size={13} weight="bold" color={active ? colors.onBrandPrimary : colors.onSurfaceSecondary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: "center", justifyContent: "center" },
  overlayHeader: { position: "absolute", top: 0, left: 0, right: 0, paddingBottom: spacing.sm },
  segment: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "rgba(11,21,34,0.7)",
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: { paddingHorizontal: spacing.xl, height: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segBtnActive: { backgroundColor: colors.brandPrimary },
  chip: { height: 36, flexShrink: 0, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipIdle: { backgroundColor: "rgba(11,21,34,0.6)", borderColor: colors.borderStrong },
  actions: { position: "absolute", right: spacing.lg, alignItems: "center", gap: spacing.lg },
  actionBtn: { alignItems: "center", gap: 4 },
  feedInfo: { position: "absolute", left: spacing.xl, right: 80 },
  catPill: { alignSelf: "flex-start", backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rankThumb: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary },
  voteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCta: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brandPrimary },
});
