import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Screen, SectionHeader, T } from '../components/ui';
import { useStore } from '../store/useStore';
import { colors, radius } from '../theme/theme';

function Box({ title, sub, tone }: { title: string; sub?: string; tone?: 'navy' | 'accent' | 'soft' }) {
  const bg = tone === 'navy' ? colors.navy : tone === 'accent' ? colors.accent : colors.card;
  const fg = tone ? colors.white : colors.navy;
  return (
    <View style={[styles.box, { backgroundColor: bg, borderColor: tone ? bg : colors.border }]}>
      <T variant="subheading" style={{ color: fg, textAlign: 'center' }}>{title}</T>
      {sub ? <T variant="caption" style={{ color: tone ? 'rgba(255,255,255,0.85)' : colors.textSecondary, textAlign: 'center', marginTop: 2 }}>{sub}</T> : null}
    </View>
  );
}

const Arrow = () => <T variant="heading" style={{ textAlign: 'center', color: colors.textMuted, lineHeight: 26 }}>↓</T>;

export default function SchaalScreen() {
  const ms = useStore((s) => s.overlays[s.personaId].lastNightlyMs);
  const perCustomer = ms && ms > 0 ? ms : 12;
  const cpuMinutes = Math.round((perCustomer * 2_300_000) / 1000 / 60);
  return (
    <Screen inStack>
      <Card tone="accent">
        <T variant="subheading">Eén rekenmotor, vier kanalen</T>
        <T variant="caption" style={{ marginTop: 4 }}>
          Dezelfde deterministische logica voedt de app, Kate, de adviseur en het kantoor. Het taalmodel wordt alleen op vraag gebruikt.
        </T>
      </Card>

      <SectionHeader title="De stroom" />
      <Card>
        <Box title="Signalen" sub="transacties, saldo's, doelen, budgetten, antwoorden van de klant" />
        <Arrow />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Box title="Waakhond-regels" sub="op de transactiestroom, in real time" tone="accent" />
          </View>
          <View style={{ flex: 1 }}>
            <Box title="Nachtelijke batch" sub="twin per klant herrekend" tone="accent" />
          </View>
        </View>
        <Arrow />
        <Box title="Digital twin per klant" sub="projectie, doelen, impact, proactieve boodschappen" tone="navy" />
        <Arrow />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['App', 'Kate', 'Adviseur', 'Kantoor'].map((c) => (
            <View key={c} style={{ width: '48%' }}>
              <Box title={c} />
            </View>
          ))}
        </View>
        <Arrow />
        <Box title="Taalmodel, alleen op vraag" sub="praat met de cijfers van de motor via tool-aanroepen; verzint er zelf geen" tone="soft" />
      </Card>

      <SectionHeader title="Waarom dit schaalt" />
      <Card style={{ gap: 10 }}>
        <T variant="body">
          <T variant="body" style={{ fontWeight: '700' }}>Goedkoop.</T> De twin van dit toestel rekent in {perCustomer} ms. Voor 2,3 miljoen klanten is dat ongeveer {cpuMinutes} CPU-minuten per nacht: één kleine server, geen GPU.
        </T>
        <T variant="body">
          <T variant="body" style={{ fontWeight: '700' }}>Controleerbaar.</T> Dezelfde invoer geeft altijd dezelfde uitkomst. Elke regel en elke aanname staat in code en op het scherm "Aannames": auditbaar voor compliance en de toezichthouder.
        </T>
        <T variant="body">
          <T variant="body" style={{ fontWeight: '700' }}>Persoonlijk.</T> Elke drempel is relatief aan de klant zelf. Geen generieke "je gaf veel uit aan restaurants", wel "meer dan jouw normaal, en dit betekent het voor jouw huis in 2029".
        </T>
        <T variant="body">
          <T variant="body" style={{ fontWeight: '700' }}>Respectvol.</T> Maximaal drie signalen, één melding per dag, stille uren. De bank weet wanneer ze níet moet storen.
        </T>
        <T variant="body">
          <T variant="body" style={{ fontWeight: '700' }}>LLM-kost alleen waar hij waarde heeft.</T> Een gesprek kost tokens, een nachtelijke run niet. Het model krijgt een compacte snapshot en haalt cijfers uit tools, dus het kan geen cijfers verzinnen.
        </T>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, padding: 12, borderWidth: 1 },
});
