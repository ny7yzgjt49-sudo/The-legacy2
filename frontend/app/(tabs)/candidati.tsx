import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, radius, spacing } from "@/src/theme/theme";
import { AppText, Display, Button } from "@/src/components/ui";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";

const PILLARS = [
  { id: "saper-fare", name: "Il Saper Fare", tagline: "Artigianato & manifattura", image: "https://images.unsplash.com/photo-1611523794717-4d1f87dabf3b?w=600&q=80" },
  { id: "gusto", name: "Il Gusto", tagline: "Food & wine", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80" },
  { id: "creativita", name: "La Creatività", tagline: "Moda, design & arte", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80" },
  { id: "commercio", name: "Il Commercio", tagline: "Retail & export", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80" },
  { id: "identita", name: "L'Identità", tagline: "Brand & heritage", image: "https://images.unsplash.com/photo-1524398039352-5905418087d4?w=600&q=80" },
];

export default function Candidati() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState(1);
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [camPerm, requestCam] = ImagePicker.useCameraPermissions();
  const [libPerm, requestLib] = ImagePicker.useMediaLibraryPermissions();

  const player = useVideoPlayer(video?.uri ?? null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // ---- Auth gate ----
  if (!user) {
    return (
      <View style={[styles.root, styles.center]}>
        <Ionicons name="videocam-outline" size={48} color={colors.brandPrimary} />
        <Display size={30} style={{ marginTop: spacing.lg, textAlign: "center" }}>
          Candida la tua storia
        </Display>
        <AppText size={14} color={colors.muted} style={{ marginTop: spacing.sm, textAlign: "center", paddingHorizontal: spacing.xl }}>
          Accedi per pubblicare il tuo mini video e raccontare la tua eccellenza italiana.
        </AppText>
        <View style={{ height: spacing.xl }} />
        <Button testID="apply-login-cta" title="Accedi / Registrati" fullWidth={false} style={{ paddingHorizontal: spacing["3xl"] }} onPress={() => router.push("/auth")} />
      </View>
    );
  }

  // ---- Success ----
  if (done) {
    return (
      <View style={[styles.root, styles.center]}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={44} color={colors.onBrandPrimary} />
        </View>
        <Display size={32} style={{ marginTop: spacing.xl, textAlign: "center" }}>
          Candidatura inviata!
        </Display>
        <AppText size={14} color={colors.muted} style={{ marginTop: spacing.sm, textAlign: "center", paddingHorizontal: spacing.xl }}>
          La tua storia è ora nella Classifica. Condividila per ricevere voti dalla community.
        </AppText>
        <View style={{ height: spacing.xl }} />
        <Button testID="apply-see-feed" title="Vai alla Classifica" fullWidth={false} style={{ paddingHorizontal: spacing.xl }} onPress={() => { setDone(false); setStep(1); setVideo(null); setBusinessName(""); setDescription(""); setLocation(""); setCategory(null); router.push("/(tabs)/classifica"); }} />
      </View>
    );
  }

  const ensurePermission = async (kind: "camera" | "library") => {
    const perm = kind === "camera" ? camPerm : libPerm;
    const request = kind === "camera" ? requestCam : requestLib;
    if (perm?.granted) return true;
    if (perm && !perm.granted && !perm.canAskAgain) {
      setError(
        kind === "camera"
          ? "Accesso alla fotocamera negato. Abilitalo nelle impostazioni."
          : "Accesso alla galleria negato. Abilitalo nelle impostazioni."
      );
      Linking.openSettings();
      return false;
    }
    const res = await request();
    return res.granted;
  };

  const pickVideo = async (source: "camera" | "library") => {
    setError("");
    const ok = await ensurePermission(source);
    if (!ok) return;
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["videos"],
      quality: 0.8,
      videoMaxDuration: 60,
      allowsEditing: true,
    };
    const res =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets?.[0]) {
      setVideo(res.assets[0]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const submit = async () => {
    if (!video || !category) return;
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      if (Platform.OS === "web" && (video as any).file) {
        formData.append("video", (video as any).file);
      } else {
        const ext = video.uri.split(".").pop() || "mp4";
        formData.append("video", {
          uri: video.uri,
          name: `candidatura.${ext}`,
          type: video.mimeType || `video/${ext}`,
        } as any);
      }
      const up = await api.uploadVideo(formData);
      await api.createApplication({
        business_name: businessName.trim(),
        description: description.trim(),
        category,
        video_id: up.video_id,
        location: location.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Invio non riuscito");
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = step === 1 ? !!video : step === 2 ? businessName.trim() && description.trim().length > 5 : !!category;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Display size={30}>Candidati</Display>
        <AppText size={13} color={colors.muted}>
          Passo {step} di 3
        </AppText>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </View>

      {step === 2 ? (
        <KeyboardAwareScrollView
          testID="apply-form-scroll"
          bottomOffset={90}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          <Display size={26}>La tua impresa</Display>
          <AppText size={14} color={colors.muted} style={{ marginTop: 4, marginBottom: spacing.xl }}>
            Raccontaci chi sei e cosa rende unica la tua storia.
          </AppText>

          <Field label="Nome dell'impresa">
            <TextInput
              testID="input-business-name"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Es. Bottega Rossi 1920"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>

          <Field label="Città (opzionale)">
            <TextInput
              testID="input-location"
              value={location}
              onChangeText={setLocation}
              placeholder="Es. Firenze, Toscana"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>

          <Field label="La tua storia">
            <TextInput
              testID="input-description"
              value={description}
              onChangeText={setDescription}
              placeholder="Descrivi la tua eccellenza, la tradizione e la visione..."
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, styles.textarea]}
            />
          </Field>
        </KeyboardAwareScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <>
              <Display size={26}>Il tuo mini video</Display>
              <AppText size={14} color={colors.muted} style={{ marginTop: 4, marginBottom: spacing.xl }}>
                Massimo 60 secondi. Mostra la tua eccellenza in azione.
              </AppText>

              {video ? (
                <View style={styles.videoPreview}>
                  <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
                  <Pressable testID="video-change" onPress={() => setVideo(null)} style={styles.videoChange}>
                    <Ionicons name="close" size={18} color={colors.onSurface} />
                  </Pressable>
                  <View style={styles.videoReady}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <AppText size={12} weight="medium" color={colors.onSurface}>
                      Video pronto
                    </AppText>
                  </View>
                </View>
              ) : (
                <View style={{ gap: spacing.md }}>
                  <PickCard icon="videocam" title="Registra ora" subtitle="Usa la fotocamera" onPress={() => pickVideo("camera")} testID="pick-camera" />
                  <PickCard icon="images" title="Scegli dalla galleria" subtitle="Carica un video esistente" onPress={() => pickVideo("library")} testID="pick-library" />
                </View>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <Display size={26}>Il tuo pilastro</Display>
              <AppText size={14} color={colors.muted} style={{ marginTop: 4, marginBottom: spacing.xl }}>
                Scegli il mondo che rappresenta la tua eccellenza.
              </AppText>
              <View style={styles.pillarGrid}>
                {PILLARS.map((p) => {
                  const active = category === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      testID={`select-pillar-${p.id}`}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCategory(p.id);
                      }}
                      style={[styles.pillarCard, { width: (width - spacing.xl * 2 - spacing.md) / 2 }, active && styles.pillarActive]}
                    >
                      <Image source={{ uri: p.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      <LinearGradient colors={["rgba(15,26,42,0.25)", "rgba(15,26,42,0.92)"]} style={StyleSheet.absoluteFill} />
                      {active && (
                        <View style={styles.pillarCheck}>
                          <Ionicons name="checkmark" size={16} color={colors.onBrandPrimary} />
                        </View>
                      )}
                      <View style={{ padding: spacing.md }}>
                        <Display size={19}>{p.name}</Display>
                        <AppText size={11} color={colors.onSurfaceTertiary}>
                          {p.tagline}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Footer nav */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {error ? (
          <AppText size={13} color={colors.error} style={{ marginBottom: spacing.sm, textAlign: "center" }}>
            {error}
          </AppText>
        ) : null}
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          {step > 1 && (
            <Button testID="apply-back" title="Indietro" variant="outline" fullWidth={false} style={{ flex: 1 }} onPress={() => setStep(step - 1)} />
          )}
          {step < 3 ? (
            <Button testID="apply-next" title="Continua" fullWidth={false} style={{ flex: 2 }} disabled={!canNext} onPress={() => setStep(step + 1)} />
          ) : (
            <Button testID="apply-submit" title="Invia candidatura" fullWidth={false} style={{ flex: 2 }} disabled={!canNext} loading={submitting} onPress={submit} />
          )}
        </View>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <AppText size={12} weight="medium" color={colors.onSurfaceSecondary} style={{ marginBottom: spacing.sm, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

function PickCard({ icon, title, subtitle, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.pickCard, pressed && { opacity: 0.85 }]}>
      <View style={styles.pickIcon}>
        <Ionicons name={icon} size={24} color={colors.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText size={16} weight="bold" color={colors.onSurface}>
          {title}
        </AppText>
        <AppText size={13} color={colors.muted}>
          {subtitle}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  progressTrack: { height: 4, backgroundColor: colors.surfaceTertiary, borderRadius: 2, marginTop: spacing.md, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: colors.brandPrimary, borderRadius: 2 },
  pickCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPreview: {
    height: 420,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoChange: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoReady: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
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
  textarea: { height: 130, textAlignVertical: "top", paddingTop: 14 },
  pillarGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  pillarCard: {
    height: 130,
    borderRadius: radius.lg,
    overflow: "hidden",
    justifyContent: "flex-end",
    borderWidth: 2,
    borderColor: "transparent",
  },
  pillarActive: { borderColor: colors.brandPrimary },
  pillarCheck: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: "#0B1522",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
