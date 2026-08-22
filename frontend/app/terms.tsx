import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/src/theme/theme";
import { AppText, Display } from "@/src/components/ui";

const SECTIONS = [
  {
    h: "Accettazione dei termini",
    p: "Registrandoti su The Legacy Lab accetti i presenti Termini di Servizio (di seguito «Termini»). Se non li accetti, non puoi utilizzare il servizio. Il servizio è destinato a imprese e professionisti italiani maggiorenni.",
  },
  {
    h: "Descrizione del servizio",
    p: "The Legacy Lab è una piattaforma che consente alle eccellenze italiane di candidarsi a un programma televisivo nazionale attraverso la presentazione di un video. Gli utenti registrati possono votare le candidature. Le imprese più votate e selezionate dalla redazione potranno essere featured nel format televisivo.",
  },
  {
    h: "Idoneità e registrazione",
    p: "Per registrarti devi avere almeno 18 anni e rappresentare un'attività legittimamente operante in Italia. Sei responsabile di mantenere riservate le credenziali del tuo account. Ci riserviamo il diritto di sospendere account che violino questi Termini.",
  },
  {
    h: "Contenuti caricati — licenza e diritti",
    p: "Caricando un video su The Legacy Lab, concedi a The Legacy Lab una licenza non esclusiva, mondiale, gratuita, per tutta la durata dei diritti d'autore, per utilizzare, riprodurre, distribuire, modificare e mostrare il contenuto nell'ambito del servizio e del format televisivo associato. Dichiari e garantisci di possedere o di avere tutti i diritti necessari sui contenuti caricati. Non caricare materiale di terzi senza autorizzazione.",
  },
  {
    h: "Partecipazione al format televisivo",
    p: "La selezione delle imprese per il format televisivo è a discrezione esclusiva della redazione di The Legacy Lab. La partecipazione al voto non garantisce la selezione. Le imprese selezionate saranno contattate direttamente per definire i dettagli della partecipazione televisiva, che potrà essere regolata da accordi separati.",
  },
  {
    h: "Regole di utilizzo",
    p: "È vietato: caricare contenuti falsi, diffamatori, illegali, osceni o che violino diritti di terzi; manipolare il sistema di voto con account multipli o bot; impersonare altre persone o aziende; caricare malware o contenuti dannosi. The Legacy Lab si riserva di rimuovere contenuti e sospendere account che violino queste regole.",
  },
  {
    h: "Voti e classifica",
    p: "Ogni utente può esprimere un voto per candidatura. I voti sono pubblici e contribuiscono alla classifica visibile nell'app. The Legacy Lab si riserva il diritto di annullare voti considerati non autentici.",
  },
  {
    h: "Limitazione di responsabilità",
    p: "The Legacy Lab fornisce il servizio «così com'è» senza garanzie di continuità o idoneità a uno scopo specifico. Non siamo responsabili per danni indiretti, perdita di dati o mancata selezione al format televisivo. La nostra responsabilità massima è limitata all'importo eventualmente pagato per l'utilizzo del servizio negli ultimi 12 mesi.",
  },
  {
    h: "Cancellazione dell'account",
    p: "Puoi eliminare il tuo account in qualsiasi momento dalla schermata Profilo. La cancellazione comporta l'eliminazione permanente di tutti i tuoi dati, candidature e video entro 30 giorni. The Legacy Lab può sospendere o terminare il tuo account in caso di violazione dei presenti Termini.",
  },
  {
    h: "Legge applicabile e foro competente",
    p: "I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente in via esclusiva il Tribunale di Milano.",
  },
  {
    h: "Contatti e aggiornamenti",
    p: "Per qualsiasi domanda: info@thelegacylab.it. Questi Termini possono essere aggiornati; in caso di modifiche sostanziali ti informeremo tramite notifica in-app. Ultimo aggiornamento: agosto 2026.",
  },
];

export default function Terms() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Display size={20}>Termini di servizio</Display>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing["3xl"] }}
        showsVerticalScrollIndicator={false}
      >
        <AppText size={12} color={colors.muted} style={{ marginBottom: spacing.xl }}>
          The Legacy Lab · Ultimo aggiornamento: agosto 2026
        </AppText>

        {SECTIONS.map((s) => (
          <View key={s.h} style={styles.section}>
            <AppText size={15} weight="bold" color={colors.onSurface} style={{ marginBottom: spacing.sm }}>
              {s.h}
            </AppText>
            <AppText size={13} color={colors.onSurfaceSecondary} style={styles.body}>
              {s.p}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  section: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: { lineHeight: 20 },
});
