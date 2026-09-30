import React, { useEffect, useRef, useState } from 'react';
import { Alert as RNAlert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { formatDateNL, formatEUR, PERSONA_LIST, PRESET_TRANSACTIONS, runNightly } from '../../engine';
import { Button, Card, Chip, Screen, SectionHeader, T } from '../components/ui';
import { resolveApiBase } from '../lib/api';
import { haptic } from '../lib/haptics';
import { useAlerts, useCustomerState } from '../store/derived';
import { useStore } from '../store/useStore';
import { colors, radius } from '../theme/theme';

export default function DemoScreen() {
  const state = useCustomerState();
  const personaId = useStore((s) => s.personaId);
  const switchPersona = useStore((s) => s.switchPersona);
  const addPreset = useStore((s) => s.addPreset);
  const jumpDays = useStore((s) => s.jumpDays);
  const resetAll = useStore((s) => s.resetAll);
  const setNightly = useStore((s) => s.setNightly);
  const serverStatus = useStore((s) => s.serverStatus);
  const overlay = useStore((s) => s.overlays[s.personaId]);
  const { active, more } = useAlerts();
  const [toast, setToast] = useState<string | null>(null);
  const knownIds = useRef<Set<string> | null>(null);
  const [nightlyOut, setNightlyOut] = useState<{ ms: number; titles: string[] } | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  };

  // Tell the presenter which signal a demo transaction produced, and where it landed.
  useEffect(() => {
    const ids = new Set([...active, ...more].map((a) => a.id));
    if (knownIds.current) {
      const fresh = [...active, ...more].filter((a) => !knownIds.current!.has(a.id));
      if (fresh.length) {
        const a = fresh[0];
        const where = active.some((x) => x.id === a.id) ? 'staat nu bovenaan bij de Waakhond' : 'staat bij de Waakhond onder "bewaard"';
        setToast(`Nieuw signaal: ${a.title} (${where})`);
        setTimeout(() => setToast(null), 5000);
      }
    }
    knownIds.current = ids;
  }, [active, more]);

  const onNightly = () => {
    const r = runNightly(state);
    setNightly(r.messages, r.durationMs);
    setNightlyOut({ ms: r.durationMs, titles: r.messages.map((m) => m.title) });
    haptic.success();
  };

  return (
    <Screen inStack>
      {toast ? (
        <View style={styles.toast}>
          <T variant="caption" style={{ color: colors.white, fontWeight: '600' }}>{toast}</T>
        </View>
      ) : null}
      <SectionHeader title="Persona" />
      <View style={{ gap: 8 }}>
        {PERSONA_LIST.map((p) => (
          <Card key={p.id} style={[styles.persona, personaId === p.id && styles.personaActive]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <T variant="heading">{p.emoji}</T>
              <View style={{ flex: 1 }}>
                <T variant="subheading">{p.displayName}, {p.age} · {p.city}</T>
                <T variant="caption" style={{ marginTop: 2 }}>{p.story}</T>
              </View>
            </View>
            {personaId !== p.id ? (
              <Button small label="Kies deze persona" variant="secondary" onPress={() => { switchPersona(p.id); flash(`Persona: ${p.displayName}`); }} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
            ) : (
              <T variant="caption" style={{ color: colors.accent, fontWeight: '700', marginTop: 8 }}>Actief</T>
            )}
          </Card>
        ))}
      </View>

      <SectionHeader title={`Transactie toevoegen · vandaag ${formatDateNL(state.today)}`} />
      <Card>
        <T variant="caption" style={{ marginBottom: 10 }}>Wordt meteen geboekt op de zichtrekening; de Waakhond herrekent binnen een seconde.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PRESET_TRANSACTIONS.map((p) => (
            <Chip key={p.id} label={p.label} onPress={() => { addPreset(p); flash(`Geboekt: ${p.merchant} ${formatEUR(-p.amountCents)}. Geen nieuw signaal? Dan is een bestaand signaal bijgewerkt.`); }} />
          ))}
        </View>
        {overlay.extraTransactions.length ? (
          <T variant="caption" style={{ marginTop: 10 }}>
            {overlay.extraTransactions.length} extra {overlay.extraTransactions.length === 1 ? 'transactie' : 'transacties'} sinds de reset.
          </T>
        ) : null}
      </Card>

      <SectionHeader title="Tijd" />
      <Card>
        <T variant="caption" style={{ marginBottom: 10 }}>Geplande betalingen en lonen worden automatisch geboekt wanneer je vooruit springt.</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="+ 1 dag" variant="secondary" onPress={() => { const due = jumpDays(1); flash(`Nu ${formatDateNL(state.today)} + 1 dag · ${due.length} betalingen geboekt`); }} style={{ flex: 1 }} />
          <Button label="+ 1 week" variant="secondary" onPress={() => { const due = jumpDays(7); flash(`Een week verder · ${due.length} betalingen geboekt`); }} style={{ flex: 1 }} />
        </View>
      </Card>

      <SectionHeader title="Nachtelijke run" />
      <Card>
        <T variant="caption" style={{ marginBottom: 10 }}>Herrekent de twin en maakt proactieve boodschappen (doelen, mijlpalen, kansen). Dit is de batch die 's nachts voor iedereen zou draaien.</T>
        <Button label="Run de nachtelijke batch nu" onPress={onNightly} />
        {nightlyOut ? (
          <View style={{ marginTop: 12, gap: 4 }}>
            <T variant="caption" style={{ fontWeight: '700', color: colors.navy }}>Klaar in {nightlyOut.ms} ms · {nightlyOut.titles.length} boodschappen</T>
            {nightlyOut.titles.map((t) => (
              <T key={t} variant="caption">• {t}</T>
            ))}
            <Button small variant="ghost" label="Bekijk op Vandaag" onPress={() => router.navigate('/(tabs)')} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Backend" />
      <Card>
        <T variant="caption">Adres: {resolveApiBase()}</T>
        <T variant="caption">Status: {serverStatus === 'online' ? 'online, AI actief' : serverStatus === 'no_key' ? 'bereikbaar, maar zonder API-sleutel: offline modus' : serverStatus === 'offline' ? 'niet bereikbaar: offline modus' : 'controleren…'}</T>
        <T variant="caption" style={{ marginTop: 6 }}>Zet EXPO_PUBLIC_API_URL om een ander adres te gebruiken.</T>
      </Card>

      <Button
        label="Alles resetten"
        variant="danger"
        onPress={() =>
          RNAlert.alert('Alles resetten?', 'Persona, toegevoegde transacties, gesprekken en beslissingen worden gewist.', [
            { text: 'Annuleer', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: () => { resetAll(); flash('Alles gereset'); } },
          ])
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  persona: { padding: 14 },
  personaActive: { borderWidth: 2, borderColor: colors.accent },
  toast: { backgroundColor: colors.navy, borderRadius: radius.md, padding: 12, alignItems: 'center' },
});
