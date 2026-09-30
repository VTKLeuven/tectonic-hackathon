import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { A } from '../../../engine';
import { AlertCard } from '../../components/AlertCard';
import { BudgetSheet } from '../../components/BudgetSheet';
import { Button, Card, Screen, SectionHeader, T } from '../../components/ui';
import { useAlertActions } from '../../lib/alertActions';
import { useAlerts } from '../../store/derived';
import { useStore } from '../../store/useStore';
import { colors } from '../../theme/theme';

export default function WaakhondScreen() {
  const { active, more, suppressed } = useAlerts();
  const { onAction, budgetTarget, closeBudget, saveBudget } = useAlertActions();
  const [showMore, setShowMore] = useState(false);
  const lastNotification = useStore((s) => s.lastNotificationInfo);

  return (
    <Screen title="De Waakhond" subtitle="Kijkt naar jouw eigen normaal, niet naar een generieke drempel.">
      <Card tone="accent">
        <T variant="body" style={{ color: colors.navy }}>
          <T variant="body" style={{ fontWeight: '700', color: colors.navy }}>{active.length} actief</T>
          {more.length ? ` · ${more.length} bewaard voor later` : ''}
          {suppressed.length ? ` · ${suppressed.length} gerust gelaten` : ''}
        </T>
        <T variant="caption" style={{ marginTop: 4 }}>
          Maximaal {A.maxActiveAlerts} signalen tegelijk, gerangschikt op relevantie. Eén pushmelding per dag, nooit tussen 21:00 en 08:00.
        </T>
      </Card>

      {active.length === 0 ? (
        <Card>
          <T variant="subheading">Niets dat je aandacht vraagt</T>
          <T variant="caption" style={{ marginTop: 4 }}>Voeg in het demo-paneel een transactie toe om de Waakhond aan het werk te zien.</T>
        </Card>
      ) : (
        active.map((a) => <AlertCard key={a.id} alert={a} onAction={onAction} />)
      )}

      {more.length ? (
        <View>
          <SectionHeader title={`Nog ${more.length} ${more.length === 1 ? 'signaal' : 'signalen'} bewaard`} action={showMore ? 'Verberg' : 'Toon'} onAction={() => setShowMore((v) => !v)} />
          {showMore ? more.map((a) => <View key={a.id} style={{ marginTop: 10 }}><AlertCard alert={a} onAction={onAction} /></View>) : null}
        </View>
      ) : null}

      {lastNotification ? (
        <Card>
          <T variant="label">Laatste melding</T>
          <T variant="caption" style={{ marginTop: 4 }}>{lastNotification}</T>
        </Card>
      ) : null}

      <Card style={{ gap: 8 }}>
        <T variant="subheading">Hoe de Waakhond werkt</T>
        <T variant="caption">• <T variant="caption" style={{ fontWeight: '600' }}>Jouw normaal</T> is de mediaan van je eigen laatste zes volledige maanden, per categorie.</T>
        <T variant="caption">• Variabele uitgaven rekenen we aan je huidige tempo door tot het einde van de maand.</T>
        <T variant="caption">• Elk signaal toont de cijfers erachter en wat het betekent voor je toekomst, berekend door je twin.</T>
        <T variant="caption">• "Klopt, was eenmalig" haalt de uitgave uit je normaal. Snoozen geeft {A.snoozeDays} dagen rust.</T>
        <T variant="caption">• Alles gebeurt lokaal en deterministisch: dezelfde regels kunnen elke nacht voor 2,3 miljoen klanten draaien.</T>
        <Button label="Bekijk alle aannames" variant="ghost" small onPress={() => router.push('/aannames')} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
      </Card>
      <BudgetSheet target={budgetTarget} onClose={closeBudget} onSave={saveBudget} />
    </Screen>
  );
}
