/** Simple modal to set or change a monthly budget for a category. */
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { CATEGORY_LABELS, formatEUR, type Category } from '../../engine';
import { colors, radius, spacing } from '../theme/theme';
import { Button, Chip, T } from './ui';

export interface BudgetTarget {
  category: Category;
  suggestedCents: number;
  currentCents: number | null;
}

export function BudgetSheet({ target, onClose, onSave }: { target: BudgetTarget | null; onClose: () => void; onSave: (category: Category, cents: number | null) => void }) {
  if (!target) return null;
  return <BudgetSheetInner key={target.category} target={target} onClose={onClose} onSave={onSave} />;
}

function BudgetSheetInner({ target, onClose, onSave }: { target: BudgetTarget; onClose: () => void; onSave: (category: Category, cents: number | null) => void }) {
  const [value, setValue] = useState(() => String(Math.round((target.currentCents ?? target.suggestedCents) / 100)));
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  const valid = Number.isFinite(cents) && cents > 0;
  const options = [target.suggestedCents, Math.round(target.suggestedCents * 1.25 / 1000) * 1000, Math.round(target.suggestedCents * 1.5 / 1000) * 1000].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <T variant="heading">Budget voor {CATEGORY_LABELS[target.category].toLowerCase()}</T>
        <T variant="caption" style={{ marginTop: 4 }}>Per maand. De Waakhond verwittigt je als je erover dreigt te gaan.</T>
        <View style={styles.inputRow}>
          <T variant="amountSmall">€</T>
          <TextInput value={value} onChangeText={setValue} keyboardType="numeric" style={styles.input} placeholder="0" autoFocus />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {options.map((o) => (
            <Chip key={o} label={formatEUR(o, { decimals: 0 })} onPress={() => setValue(String(Math.round(o / 100)))} selected={cents === o} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.lg }}>
          {target.currentCents ? <Button label="Verwijder" variant="danger" onPress={() => { onSave(target.category, null); onClose(); }} style={{ flex: 1 }} /> : null}
          <Button label="Bewaar budget" disabled={!valid} onPress={() => { onSave(target.category, cents); onClose(); }} style={{ flex: 2 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,42,74,0.35)' },
  sheet: { backgroundColor: colors.card, padding: spacing.xl, paddingBottom: 40, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 2, borderBottomColor: colors.accent, paddingVertical: 6, marginTop: 8 },
  input: { flex: 1, fontSize: 28, fontWeight: '700', color: colors.navy, paddingVertical: 4 },
});
