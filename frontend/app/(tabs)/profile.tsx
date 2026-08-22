import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions, Alert, ToastAndroid, Platform, Linking } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing } from "@/src/theme/theme";
import { AppText, Display, Button } from "@/src/components/ui";
import { api, videoThumbnailUrl } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";

const BANNER = "https://images.unsplash.com/photo-1524398039352-5905418087d4?w=1200&q=85";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [resending, setResending] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.myApplications(1);
      setApps(res.items);
      setHasMore(res.has_more);
      setPage(2);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.myApplications(page);
      setApps((prev) => [...prev, ...res.items]);
      setHasMore(res.has_more);
      setPage((p) => p + 1);
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page]);

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Elimina candidatura",
      "Sei sicuro? Questa azione è irreversibile.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            setDeleting((prev) => new Set(prev).add(id));
            setApps((prev) => prev.filter((a) => a.id !== id));
            try {
              await api.deleteApplication(id);
            } catch {
              load();
            } finally {
              setDeleting((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }
          },
        },
      ]
    );
  };

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

      {!user.email_verified && (
        <View style={styles.verifyBanner}>
          <Ionicons name="mail-outline" size={18} color={colors.warning} />
          <AppText size={13} color={colors.warning} style={{ flex: 1 }}>
            Verifica la tua email per completare il profilo.
          </AppText>
          <Pressable
            disabled={resending}
            onPress={async () => {
              setResending(true);
              try {
                await api.resendVerify();
                if (Platform.OS === "android") {
                  ToastAndroid.show("Email inviata!", ToastAndroid.SHORT);
                } else {
                  Alert.alert("Email inviata!", "Controlla la tua casella di posta.");
                }
              } catch {
                Alert.alert("Errore", "Riprova tra qualche minuto.");
              } finally {
                setResending(false);
              }
            }}
          >
            {resending
              ? <ActivityIndicator size="small" color={colors.warning} />
              : <AppText size={12} weight="bold" color={colors.warning} style={{ textDecorationLine: "underline" }}>Reinvia</AppText>
            }
          </Pressable>
        </View>
      )}

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
                onPress={() => router.push(`/c/${a.id}`)}
                style={[styles.card, { width: (width - spacing.xl * 2 - spacing.md) / 2 }]}
              >
                <Image
                  source={{ uri: a.has_thumbnail ? videoThumbnailUrl(a.video_id) : a.poster }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
                <LinearGradient colors={["transparent", "rgba(11,21,34,0.92)"]} style={StyleSheet.absoluteFill} />
                {deleting.has(a.id) ? (
                  <View style={[StyleSheet.absoluteFill, styles.deletingOverlay]}>
                    <ActivityIndicator color={colors.onSurface} />
                  </View>
                ) : null}
                <View style={styles.cardBadge}>
                  <Ionicons name="heart" size={11} color={colors.brandPrimary} />
                  <AppText size={11} weight="bold" color="#fff">
                    {a.votes}
                  </AppText>
                </View>
                <Pressable
                  testID={`delete-app-${a.id}`}
                  onPress={() => confirmDelete(a.id)}
                  style={styles.deleteBtn}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={13} color="#fff" />
                </Pressable>
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

        {hasMore && (
          <Pressable onPress={loadMore} style={styles.loadMore} disabled={loadingMore}>
            {loadingMore
              ? <ActivityIndicator color={colors.brandPrimary} />
              : <AppText size={14} weight="medium" color={colors.brandPrimary}>Carica altri</AppText>
            }
          </Pressable>
        )}

        <View style={styles.legalLinks}>
          <Pressable onPress={() => router.push("/privacy-policy")} style={styles.legalBtn}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.muted} />
            <AppText size={13} color={colors.muted}>Privacy Policy</AppText>
          </Pressable>
          <AppText size={13} color={colors.muted}>·</AppText>
          <Pressable onPress={() => router.push("/terms")} style={styles.legalBtn}>
            <Ionicons name="document-text-outline" size={15} color={colors.muted} />
            <AppText size={13} color={colors.muted}>Termini di servizio</AppText>
          </Pressable>
        </View>

        <Pressable testID="profile-logout" onPress={logout} style={styles.logout}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <AppText size={14} weight="medium" color={colors.error}>
            Esci
          </AppText>
        </Pressable>

        <Pressable
          testID="profile-delete-account"
          onPress={() => {
            Alert.alert(
              "Elimina account",
              "Sei sicuro? Tutti i tuoi dati, candidature e video verranno eliminati definitivamente. Questa azione non può essere annullata.",
              [
                { text: "Annulla", style: "cancel" },
                {
                  text: "Elimina definitivamente",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await api.deleteAccount();
                      logout();
                    } catch {
                      Alert.alert("Errore", "Non è stato possibile eliminare l'account. Riprova più tardi.");
                    }
                  },
                },
              ]
            );
          }}
          style={styles.deleteAccount}
        >
          <Ionicons name="trash-outline" size={15} color={colors.muted} />
          <AppText size={12} color={colors.muted}>
            Elimina account
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
  loadMore: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.lg, marginTop: spacing.md },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing["2xl"], paddingVertical: spacing.lg },
  legalLinks: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xl, flexWrap: "wrap" },
  legalBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  deleteAccount: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, marginTop: spacing.sm, paddingVertical: spacing.md, opacity: 0.6 },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: "rgba(255, 202, 40, 0.1)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 202, 40, 0.3)",
  },
  deleteBtn: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  deletingOverlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
