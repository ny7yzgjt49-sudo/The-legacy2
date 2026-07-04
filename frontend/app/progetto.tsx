import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing } from "@/src/theme/theme";
import { AppText, Display, Button } from "@/src/components/ui";

const HERO = "https://images.unsplash.com/photo-1612101983284-c15859891526?w=1400&q=85";
const CAMPUS = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80";
const UNI = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80";

const PILLARS = [
  { icon: "hammer-outline", name: "Il Saper Fare", desc: "Artigianato & manifattura" },
  { icon: "restaurant-outline", name: "Il Gusto", desc: "Food & wine" },
  { icon: "color-palette-outline", name: "La Creatività", desc: "Moda, design & arte" },
  { icon: "storefront-outline", name: "Il Commercio", desc: "Retail & export" },
  { icon: "ribbon-outline", name: "L'Identità", desc: "Brand & heritage" },
];

export default function Progetto() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing["3xl"] }}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          <LinearGradient
            colors={["rgba(15,26,42,0.4)", "rgba(15,26,42,0.8)", colors.surface]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable testID="progetto-back" onPress={() => router.back()} style={[styles.back, { top: insets.top + spacing.sm }]}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <View style={styles.heroText}>
            <AppText size={11} weight="bold" color={colors.onBrandTertiary} style={{ letterSpacing: 1.5 }}>
              LA VISIONE NAZIONALE
            </AppText>
            <Display size={46} style={{ marginTop: spacing.xs }}>
              Il Progetto
            </Display>
          </View>
        </View>

        {/* Chi Siamo */}
        <Section title="Chi Siamo">
          <AppText size={15} color={colors.onSurfaceSecondary} style={styles.body}>
            The Legacy Lab non è un programma TV: è un'infrastruttura nazionale che connette imprese,
            istituzioni, università, capitali e media per custodire, raccontare e far crescere l'eccellenza
            del Made in Italy.
          </AppText>
          <AppText size={15} color={colors.onSurfaceSecondary} style={styles.body}>
            Un ecosistema vivo che unisce storytelling, formazione, networking e un campus operativo a Milano,
            per trasformare l'eredità italiana in futuro.
          </AppText>
        </Section>

        {/* Origine dell'idea */}
        <Section title="Da dove nasce l'idea">
          <View style={styles.quote}>
            <View style={styles.quoteBar} />
            <Display size={24} style={{ lineHeight: 30 }}>
              L'82% delle imprese italiane è familiare, ma solo il 30% sopravvive oltre il fondatore.
            </Display>
          </View>
          <AppText size={15} color={colors.onSurfaceSecondary} style={styles.body}>
            L'idea nasce dall'urgenza di non lasciare che il patrimonio di saperi, mestieri e famiglie
            imprenditoriali italiane scompaia. Da qui la scelta di girare tutta l'Italia per incontrare le
            aziende selezionate, raccontarle con riprese e interviste, e collegarle a nuove generazioni,
            università e capitali.
          </AppText>
        </Section>

        {/* Founder */}
        <View style={styles.founderCard}>
          <View style={styles.monogram}>
            <AppText size={24} weight="black" color={colors.onBrandPrimary}>
              DF
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText size={11} weight="bold" color={colors.brandSecondary} style={{ letterSpacing: 1 }}>
              FOUNDER & IDEATORE
            </AppText>
            <Display size={24} style={{ marginTop: 2 }}>
              Dario Faccendini
            </Display>
            <AppText size={13} color={colors.onSurfaceTertiary} style={{ marginTop: 4, lineHeight: 19 }}>
              Ideatore di The Legacy Lab, guida la visione nazionale per la tutela e la crescita del Made in Italy.
            </AppText>
          </View>
        </View>

        {/* Pilastri */}
        <Section title="I 5 Pilastri">
          <View style={{ gap: spacing.sm }}>
            {PILLARS.map((p) => (
              <View key={p.name} style={styles.pillarRow}>
                <View style={styles.pillarIcon}>
                  <Ionicons name={p.icon as any} size={20} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText size={16} weight="bold" color={colors.onSurface}>
                    {p.name}
                  </AppText>
                  <AppText size={12} color={colors.muted}>
                    {p.desc}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </Section>

        {/* Il Viaggio / Format TV */}
        <Section title="Il Viaggio & il Format TV">
          <Image source={{ uri: CAMPUS }} style={styles.wideImg} contentFit="cover" />
          <AppText size={15} color={colors.onSurfaceSecondary} style={styles.body}>
            Attraversiamo 20 regioni per visitare le aziende selezionate: riprese sul campo, interviste ai
            fondatori e contenuti originali che diventano un format TV per raccontare l'Italia che sa fare.
          </AppText>
        </Section>

        {/* Hub Universitario */}
        <Section title="Hub Universitario">
          <Image source={{ uri: UNI }} style={styles.wideImg} contentFit="cover" />
          <AppText size={15} color={colors.onSurfaceSecondary} style={styles.body}>
            Le università sono al centro dell'ecosistema. Studenti e atenei partecipano con project work,
            tirocini e ricerca sul campo, mentre l'Osservatorio raccoglie dati sul passaggio generazionale e
            sul futuro delle imprese familiari.
          </AppText>
          <View style={styles.uniPoints}>
            {[
              "Project work con imprese reali",
              "Tirocini e talent development",
              "Osservatorio dati & ricerca",
              "Campus operativo a Milano",
            ].map((t) => (
              <View key={t} style={styles.uniPoint}>
                <Ionicons name="checkmark-circle" size={18} color={colors.brandPrimary} />
                <AppText size={14} color={colors.onSurfaceSecondary} style={{ flex: 1 }}>
                  {t}
                </AppText>
              </View>
            ))}
          </View>
        </Section>

        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
          <Button testID="progetto-apply" title="Candida la tua storia" onPress={() => router.push("/(tabs)/candidati")} />
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing["2xl"] }}>
      <Display size={28} style={{ marginBottom: spacing.md }}>
        {title}
      </Display>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 300, justifyContent: "flex-end" },
  heroText: { padding: spacing.xl },
  back: {
    position: "absolute",
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { lineHeight: 23, marginBottom: spacing.md },
  quote: { paddingLeft: spacing.lg, marginBottom: spacing.md },
  quoteBar: { position: "absolute", left: 0, top: 4, bottom: 4, width: 3, backgroundColor: colors.brandPrimary, borderRadius: 2 },
  founderCard: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
    marginHorizontal: spacing.xl,
    marginTop: spacing["2xl"],
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monogram: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  pillarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillarIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  wideImg: { width: "100%", height: 180, borderRadius: radius.lg, marginBottom: spacing.md, backgroundColor: colors.surfaceSecondary },
  uniPoints: { gap: spacing.sm, marginTop: spacing.sm },
  uniPoint: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
