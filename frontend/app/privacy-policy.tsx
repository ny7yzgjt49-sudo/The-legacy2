import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "@/src/theme/theme";
import { AppText, Display } from "@/src/components/ui";

const SECTIONS = [
  {
    h: "Titolare del trattamento",
    p: "The Legacy Lab (di seguito «il Titolare») è responsabile del trattamento dei dati personali raccolti attraverso questa applicazione. Per qualsiasi richiesta relativa alla privacy: info@thelegacylab.it. Il Titolare opera in conformità al Regolamento (UE) 2016/679 (GDPR) e al D.Lgs. 196/2003 e successive modifiche.",
  },
  {
    h: "Dati raccolti",
    p: "Raccogliamo: nome, indirizzo e-mail, password (in forma crittografata), informazioni sulla tua attività (nome, descrizione, categoria, location), video caricati, voti espressi, preferenze di partecipazione al tour, token per le notifiche push. Raccogliamo inoltre l'indirizzo IP per finalità di sicurezza e prevenzione degli abusi.",
  },
  {
    h: "Finalità e base giuridica",
    p: "I dati sono trattati per: (a) fornire il servizio e gestire l'account — base giuridica: esecuzione del contratto (art. 6(1)(b) GDPR); (b) inviare notifiche push relative all'attività della tua candidatura — base giuridica: consenso (art. 6(1)(a) GDPR); (c) adempiere a obblighi di legge (art. 6(1)(c) GDPR). Non utilizziamo i dati per profilazione automatizzata o per finalità di marketing senza consenso separato.",
  },
  {
    h: "Comunicazione a terzi e sub-responsabili",
    p: "I dati non sono venduti a terzi. Utilizziamo i seguenti sub-responsabili: Cloudinary Inc. (archiviazione e distribuzione video), MongoDB Atlas (database), Resend Inc. (e-mail transazionali), Expo / Expo Push Service (notifiche push), provider di hosting (Railway / Vercel). Tutti i sub-responsabili trattano i dati in conformità al GDPR.",
  },
  {
    h: "Conservazione",
    p: "I dati dell'account e le candidature vengono conservati finché l'account è attivo. Dopo la cancellazione dell'account, i dati vengono eliminati entro 30 giorni, salvo obblighi di legge. Gli indirizzi IP vengono cancellati dopo 90 giorni.",
  },
  {
    h: "I tuoi diritti",
    p: "Ai sensi degli artt. 15–22 GDPR hai diritto di: accedere ai tuoi dati, rettificarli, cancellarli («diritto all'oblio»), limitarne il trattamento, riceverne una copia portabile e opporsi al trattamento. Puoi eliminare il tuo account direttamente dalla schermata Profilo. Per qualsiasi altra richiesta scrivi a info@thelegacylab.it. Hai il diritto di proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).",
  },
  {
    h: "Contenuti caricati",
    p: "I video e le informazioni sulle attività che carichi rimarranno visibili pubblicamente nell'app fino alla cancellazione della candidatura o dell'account. I contenuti selezionati per il format televisivo sono soggetti ai Termini di Servizio accettati in fase di registrazione.",
  },
  {
    h: "Sicurezza",
    p: "Utilizziamo crittografia bcrypt per le password e HTTPS per tutte le comunicazioni. I token JWT hanno una scadenza di 7 giorni. Adottiamo misure tecniche e organizzative adeguate per proteggere i tuoi dati.",
  },
  {
    h: "Aggiornamenti",
    p: "Questa informativa può essere aggiornata. In caso di modifiche sostanziali, ti informeremo tramite notifica in-app. Ultimo aggiornamento: agosto 2026.",
  },
];

export default function PrivacyPolicy() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Display size={20}>Privacy Policy</Display>
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
