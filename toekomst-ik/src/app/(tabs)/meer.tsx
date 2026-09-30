import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, LinkRow, Screen, T } from '../../components/ui';
import { useStore } from '../../store/useStore';
import { resolveApiBase } from '../../lib/api';
import { colors } from '../../theme/theme';

const ic = (name: React.ComponentProps<typeof Ionicons>['name']) => <Ionicons name={name} size={22} color={colors.accent} />;

export default function MeerScreen() {
  const serverStatus = useStore((s) => s.serverStatus);
  return (
    <Screen title="Meer">
      <Card style={{ paddingVertical: 4 }}>
        <LinkRow title="Demo-paneel" subtitle="Wissel van persona, voeg transacties toe, spring in de tijd" icon={ic('flask-outline')} onPress={() => router.push('/demo')} />
        <LinkRow title="Aannames" subtitle="Alle cijfers achter de twin, in gewone taal" icon={ic('calculator-outline')} onPress={() => router.push('/aannames')} />
        <LinkRow title="Welke gegevens gebruikt Toekomst-ik?" subtitle="Wat op je toestel blijft en wat naar de server gaat" icon={ic('lock-closed-outline')} onPress={() => router.push('/gegevens')} />
        <LinkRow title="Hoe schaalt dit naar 2,3 miljoen klanten?" subtitle="Van transactiestroom tot adviseur" icon={ic('git-network-outline')} onPress={() => router.push('/schaal')} />
      </Card>
      <Card tone="navy">
        <T variant="label" style={{ color: 'rgba(255,255,255,0.7)' }}>Het principe</T>
        <T variant="heading" style={{ color: colors.white, marginTop: 4 }}>De motor rekent, de AI praat.</T>
        <T variant="caption" style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8 }}>
          Elke klant krijgt een financiële digital twin: een deterministische simulatie van zijn eigen toekomst. Die rekent elke nacht voor iedereen, goedkoop en controleerbaar. Het taalmodel komt er alleen bij als de klant wil praten, en krijgt elk cijfer van de motor.
        </T>
      </Card>
      <View style={{ paddingHorizontal: 4 }}>
        <T variant="caption">Backend: {resolveApiBase()} · {serverStatus === 'online' ? 'AI actief' : serverStatus === 'no_key' ? 'bereikbaar zonder API-sleutel, offline modus' : serverStatus === 'offline' ? 'niet bereikbaar, offline modus' : 'controleren…'}</T>
        <T variant="caption" style={{ marginTop: 4 }}>Proof of concept voor de KBC-hackathon. Synthetische data, geen echte klanten, geen KBC-API's.</T>
      </View>
    </Screen>
  );
}
