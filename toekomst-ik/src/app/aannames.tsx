import React from 'react';
import { View } from 'react-native';
import { ASSUMPTION_GROUP_LABELS, ASSUMPTION_LIST, ASSUMPTIONS_VERSION, type Assumption } from '../../engine';
import { Card, Screen, SectionHeader, T } from '../components/ui';
import { colors } from '../theme/theme';

const GROUPS: Assumption['group'][] = ['economie', 'wonen', 'werk_gezin', 'regels'];

export default function AannamesScreen() {
  return (
    <Screen inStack>
      <Card tone="accent">
        <T variant="subheading">Vereenvoudigd, maar transparant</T>
        <T variant="caption" style={{ marginTop: 4 }}>
          Elke berekening in Toekomst-ik gebruikt deze vaste aannames. Ze zijn bewust eenvoudig gehouden voor dit proof of concept en kunnen per klant of per product verfijnd worden. Versie {ASSUMPTIONS_VERSION}.
        </T>
      </Card>
      {GROUPS.map((g) => (
        <View key={g}>
          <SectionHeader title={ASSUMPTION_GROUP_LABELS[g]} />
          <Card style={{ gap: 14, marginTop: 6 }}>
            {ASSUMPTION_LIST.filter((a) => a.group === g).map((a) => (
              <View key={a.key}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <T variant="subheading" style={{ flex: 1 }}>{a.label}</T>
                  <T variant="subheading" style={{ color: colors.accent, textAlign: 'right' }}>{a.display}</T>
                </View>
                <T variant="caption" style={{ marginTop: 2 }}>{a.note}</T>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
