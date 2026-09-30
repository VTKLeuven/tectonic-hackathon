import React, { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { NOT_IN_SNAPSHOT, SNAPSHOT_CONTENTS } from '../../engine';
import { Button, Card, Screen, SectionHeader, T } from '../components/ui';
import { resolveApiBase } from '../lib/api';
import { useSnapshot } from '../store/derived';
import { colors } from '../theme/theme';

export default function GegevensScreen() {
  const snapshot = useSnapshot();
  const [showJson, setShowJson] = useState(false);
  const json = useMemo(() => JSON.stringify(snapshot, null, 1), [snapshot]);
  const kb = (json.length / 1024).toFixed(1).replace('.', ',');
  return (
    <Screen inStack>
      <Card tone="navy">
        <T variant="heading" style={{ color: colors.white }}>Je gegevens blijven op je toestel.</T>
        <T variant="caption" style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>
          Je transacties, saldo's, doelen en beslissingen staan lokaal in de app. De Waakhond en je twin rekenen op het toestel zelf. Er is geen login en er worden geen echte bankgegevens gebruikt.
        </T>
      </Card>

      <SectionHeader title="Wat de app gebruikt" />
      <Card style={{ gap: 6 }}>
        <T variant="caption">• Je transactiegeschiedenis van de laatste 18 maanden (synthetisch in deze demo)</T>
        <T variant="caption">• Je rekeningsaldo's, terugkerende betalingen en abonnementen</T>
        <T variant="caption">• Je doelen, budgetten en je antwoorden op signalen ("was eenmalig", snooze)</T>
        <T variant="caption">• Geen locatie, geen contacten, geen toestelidentificatie</T>
      </Card>

      <SectionHeader title="Wat naar de server gaat tijdens een gesprek" />
      <Card style={{ gap: 6 }}>
        <T variant="caption" style={{ marginBottom: 4 }}>
          Alleen tijdens "Praat met jezelf" sturen we een <T variant="caption" style={{ fontWeight: '700' }}>snapshot</T> van {kb} kB naar {resolveApiBase()}. Die bevat enkel samenvattingen:
        </T>
        {SNAPSHOT_CONTENTS.map((s) => (
          <T key={s} variant="caption">• {s}</T>
        ))}
        <T variant="caption" style={{ marginTop: 8, fontWeight: '700', color: colors.navy }}>Wat er niet in zit</T>
        {NOT_IN_SNAPSHOT.map((s) => (
          <T key={s} variant="caption">• {s}</T>
        ))}
        <T variant="caption" style={{ marginTop: 8 }}>
          De server bewaart niets: elk gesprek wordt volledig meegestuurd en na het antwoord vergeten. Het taalmodel krijgt de cijfers via tool-aanroepen op dezelfde rekenmotor en mag zelf geen cijfers verzinnen.
        </T>
      </Card>

      <SectionHeader title="In de offline modus" />
      <Card>
        <T variant="caption">Als de server niet bereikbaar is of geen API-sleutel heeft, antwoordt de app zelf met vaste regels. Dan verlaat niets je toestel.</T>
      </Card>

      <Button label={showJson ? 'Verberg de snapshot' : 'Bekijk de snapshot die verstuurd wordt'} variant="ghost" onPress={() => setShowJson((v) => !v)} />
      {showJson ? (
        <Card>
          <View>
            <T variant="caption" style={{ fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 11 }}>{json.length > 6000 ? json.slice(0, 6000) + '\n…' : json}</T>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
