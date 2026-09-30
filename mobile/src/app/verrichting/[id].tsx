import { useLocalSearchParams, useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { CATEGORY_ICON, INSIGHT_ICON } from '../../components/Icon';
import { tipHref } from '../../components/InsightCard';
import { Header, Page } from '../../components/Screen';
import { prettyName } from '../../components/TxRow';
import { Card, ListRow, Pill, T, tabular } from '../../components/ui';
import { CATEGORIES, formatDate, formatMoney } from '../../engine';
import { useApp, useT } from '../../state/AppState';
import { C, S } from '../../theme';

const CHANNEL = {
  card: { nl: 'Betaling met debetkaart', en: 'Debit card payment' },
  transfer: { nl: 'Overschrijving', en: 'Transfer' },
  direct_debit: { nl: 'Domiciliëring', en: 'Direct debit' },
  instant: { nl: 'Instantoverschrijving', en: 'Instant transfer' },
};

export default function Verrichting() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { analysis, data, lang } = useApp();
  const t = useT();
  const tx = analysis.transactions.find((x) => x.id === decodeURIComponent(id ?? ''));

  if (!tx) {
    return (
      <Page header={<Header title={lang === 'nl' ? 'Verrichting' : 'Transaction'} />}>
        <T v="body" color={C.muted}>
          {lang === 'nl' ? 'Deze verrichting vonden we niet terug.' : 'We could not find this transaction.'}
        </T>
      </Page>
    );
  }

  const Icon = CATEGORY_ICON[tx.category];
  const usedBy = analysis.insights.filter((i) => i.evidence.some((e) => e.transactionId === tx.id));
  const signals = analysis.signals.filter((s) => s.evidence.includes(tx.id));

  return (
    <Page header={<Header title={lang === 'nl' ? 'Verrichting' : 'Transaction'} />}>
      <Card style={{ alignItems: 'center', paddingVertical: S.xl }}>
        <View style={styles.icon}>
          <Icon size={26} color={C.navy} />
        </View>
        <T v="h2" style={{ marginTop: S.md, textAlign: 'center' }}>
          {prettyName(tx)}
        </T>
        <T v="display" color={tx.amount > 0 ? C.positive : C.ink} style={[tabular, { marginTop: S.sm }]}>
          {formatMoney(tx.amount, lang, { signed: true })}
        </T>
        <T v="small" color={C.muted}>
          {formatDate(tx.date, lang, true)}
        </T>
        <View style={{ marginTop: S.md }}>
          <Pill text={`${lang === 'nl' ? 'Herkend als' : 'Recognised as'} ${t(CATEGORIES[tx.category].label).toLowerCase()}`} color={C.blue} bg={C.kateBg} />
        </View>
      </Card>

      <Card style={{ marginTop: S.lg, gap: S.md }}>
        <Field label={lang === 'nl' ? 'Tegenpartij' : 'Counterparty'} value={tx.counterparty} />
        <Field label={lang === 'nl' ? 'Mededeling' : 'Message'} value={tx.description} />
        <Field label={lang === 'nl' ? 'Soort' : 'Type'} value={CHANNEL[tx.channel][lang]} />
        <Field label={lang === 'nl' ? 'Rekening' : 'Account'} value={`${data.persona.accountName} ${data.persona.iban}`} />
      </Card>

      {(usedBy.length > 0 || signals.length > 0) && (
        <>
          <View style={styles.kateHead}>
            <Sparkles size={16} color={C.blue} />
            <T v="h3">{lang === 'nl' ? 'Wat Kate hieruit leerde' : 'What Kate learned from this'}</T>
          </View>
          <Card padded={false}>
            {signals.map((s) => (
              <ListRow key={s.id} title={t(s.label)} subtitle={`${lang === 'nl' ? 'Zekerheid' : 'Confidence'} ${Math.round(s.confidence * 100)}%`} />
            ))}
            {usedBy.map((i, idx) => (
              <ListRow
                key={i.id}
                icon={INSIGHT_ICON[i.type]}
                iconBg={C.kateBg}
                iconColor={C.blue}
                title={t(i.title)}
                subtitle={lang === 'nl' ? 'Tip op basis van deze verrichting' : 'Tip based on this transaction'}
                onPress={() => router.push(tipHref(i.id))}
                last={idx === usedBy.length - 1}
              />
            ))}
          </Card>
        </>
      )}
    </Page>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <T v="tiny" color={C.muted}>
        {label}
      </T>
      <T v="body">{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  kateHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.xl, marginBottom: S.sm, paddingHorizontal: S.xs },
});
