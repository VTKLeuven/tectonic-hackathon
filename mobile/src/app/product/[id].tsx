import { useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Header, Page } from '../../components/Screen';
import { Button, Card, T, tabular } from '../../components/ui';
import { euro, formatMoney, formatNumber, type Lang } from '../../engine';
import { useApp } from '../../state/AppState';
import { C, F, R, S } from '../../theme';

/**
 * Where a tip hands over to a product. This is deliberately the second step:
 * the tip leads with the customer's benefit, the product comes after.
 */

const LOANS: Record<string, { nl: string; en: string; rate: number; fallback: number; terms: number[] }> = {
  energy_loan: { nl: 'Energielening', en: 'Energy loan', rate: 0.0349, fallback: 8_000, terms: [5, 10, 15] },
  car_loan: { nl: 'Autolening', en: 'Car loan', rate: 0.0449, fallback: 25_000, terms: [3, 5, 7] },
};

const INFO: Record<string, { title: { nl: string; en: string }; body: { nl: string; en: string }; cta?: { nl: string; en: string }; url?: string }> = {
  vtest: {
    title: { nl: 'Vergelijk je energiecontract', en: 'Compare your energy contract' },
    body: {
      nl: 'De V-test van de Vlaamse energieregulator vergelijkt alle contracten voor jouw verbruik. Veranderen van leverancier is gratis en je stroom valt nooit uit.',
      en: 'The V-test by the Flemish energy regulator compares every contract for your usage. Switching supplier is free and your power never goes out.',
    },
    cta: { nl: 'Open de V-test', en: 'Open the V-test' },
    url: 'https://www.vtest.be/',
  },
  pension: {
    title: { nl: 'Pensioensparen', en: 'Pension saving' },
    body: {
      nl: 'Stort maandelijks of in één keer vóór 31 december. Je krijgt 30% van je storting terug via je belastingaangifte, tot het maximum van dit jaar.',
      en: 'Deposit monthly or in one go before 31 December. You get 30% of your deposit back through your tax return, up to this year\'s maximum.',
    },
    cta: { nl: 'Start met € 87,50 per maand', en: 'Start with € 87.50 a month' },
  },
  savings: {
    title: { nl: 'Naar je spaarrekening', en: 'To your savings account' },
    body: {
      nl: 'Zet het bedrag dat je niet nodig hebt over naar je spaarrekening. Je kan het altijd meteen terugzetten.',
      en: 'Move what you do not need to your savings account. You can always move it back instantly.',
    },
    cta: { nl: 'Overschrijving voorbereiden', en: 'Prepare transfer' },
  },
  renovation_info: {
    title: { nl: 'De renovatieverplichting', en: 'The renovation obligation' },
    body: {
      nl: 'Koop je in Vlaanderen een woning met EPC-label E of F, dan moet je binnen vijf jaar na de aankoop minstens label D halen. Een EPC-attest vind je bij je aankoopdocumenten. Een renovatieplan per stap (dak, ramen, verwarming) spreidt de kosten.',
      en: 'If you buy a home in Flanders with EPC label E or F, you must reach at least label D within five years of purchase. The EPC certificate is in your purchase documents. A step-by-step plan (roof, windows, heating) spreads the cost.',
    },
    cta: { nl: 'Bereken je energielening', en: 'Calculate your energy loan' },
  },
  ev_info: {
    title: { nl: 'Elektrische modellen vergelijken', en: 'Compare electric models' },
    body: {
      nl: 'Tweedehands elektrische wagens met 300 km bereik zijn vandaag betaalbaar. Wie huurt, laadt vaak goedkoper op het werk dan aan een snellader.',
      en: 'Second-hand electric cars with a 300 km range are affordable today. Renters often charge cheaper at work than at a fast charger.',
    },
  },
};

function monthly(amount: number, rate: number, years: number) {
  const r = rate / 12;
  const n = years * 12;
  return (amount * r) / (1 - Math.pow(1 + r, -n));
}

export default function Product() {
  const { id, tip } = useLocalSearchParams<{ id: string; tip?: string }>();
  const { analysis, lang, showToast } = useApp();
  const insight = tip ? analysis.insights.find((i) => i.id === decodeURIComponent(tip)) : undefined;
  const loan = LOANS[id ?? ''];

  if (loan) return <LoanCalculator loanId={id!} loan={loan} lang={lang} upfront={insight?.upfrontCost} saving={insight?.annualValue} />;

  const info = INFO[id ?? ''] ?? INFO.ev_info;
  return (
    <Page header={<Header title={info.title[lang]} />}>
      <Card>
        <T v="h2">{info.title[lang]}</T>
        <T v="body" color={C.body} style={{ marginTop: S.sm }}>
          {info.body[lang]}
        </T>
      </Card>
      {info.cta && (
        <Button
          style={{ marginTop: S.xl }}
          label={info.cta[lang]}
          onPress={() => {
            if (info.url) void Linking.openURL(info.url);
            else showToast(lang === 'nl' ? 'Demo: in de echte app start hier de aanvraag.' : 'Demo: the real app would start the application here.');
          }}
        />
      )}
    </Page>
  );
}

function LoanCalculator({
  loanId,
  loan,
  lang,
  upfront,
  saving,
}: {
  loanId: string;
  loan: (typeof LOANS)[string];
  lang: Lang;
  upfront?: number;
  saving?: number;
}) {
  const { showToast } = useApp();
  const [amount, setAmount] = useState(Math.round((upfront ?? loan.fallback) / 500) * 500);
  const [years, setYears] = useState(loan.terms[1]);
  const pay = monthly(amount, loan.rate, years);
  const perMonth = saving ? saving / 12 : undefined;
  const covered = perMonth ? Math.min(1, perMonth / pay) : undefined;

  return (
    <Page header={<Header title={loan[lang]} />}>
      <Card>
        <T v="small" color={C.muted}>
          {lang === 'nl' ? 'Bedrag' : 'Amount'}
        </T>
        <View style={styles.stepper}>
          <StepButton icon="minus" onPress={() => setAmount((a) => Math.max(1_000, a - 500))} />
          <T v="display" style={[tabular, { flex: 1, textAlign: 'center' }]}>
            {euro(amount, lang)}
          </T>
          <StepButton icon="plus" onPress={() => setAmount((a) => Math.min(75_000, a + 500))} />
        </View>
        <T v="small" color={C.muted} style={{ marginTop: S.lg }}>
          {lang === 'nl' ? 'Looptijd' : 'Term'}
        </T>
        <View style={styles.terms}>
          {loan.terms.map((y) => (
            <Pressable key={y} onPress={() => setYears(y)} style={[styles.term, years === y && styles.termOn]}>
              <T v="label" color={years === y ? '#FFFFFF' : C.navy}>
                {y} {lang === 'nl' ? 'jaar' : 'years'}
              </T>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: S.lg }}>
        <Row label={lang === 'nl' ? 'Maandlast' : 'Monthly payment'} value={formatMoney(pay, lang)} strong />
        <Row label={lang === 'nl' ? 'Rentevoet (voorbeeld)' : 'Interest rate (example)'} value={`${formatNumber(loan.rate * 100, lang, 2)}%`} />
        {perMonth !== undefined && (
          <>
            <Row label={lang === 'nl' ? 'Je besparing per maand' : 'Your saving per month'} value={formatMoney(perMonth, lang)} positive />
            <Row
              label={lang === 'nl' ? 'Netto per maand' : 'Net per month'}
              value={formatMoney(perMonth - pay, lang, { signed: true })}
              positive={perMonth - pay >= 0}
            />
            <View style={styles.meter}>
              <View style={[styles.meterFill, { width: `${Math.round((covered ?? 0) * 100)}%` }]} />
            </View>
            <T v="small" color={C.muted} style={{ marginTop: S.xs }}>
              {lang === 'nl'
                ? `Je besparing betaalt ${Math.round((covered ?? 0) * 100)}% van de maandlast. Na ${years} jaar hou je ze volledig.`
                : `Your saving pays ${Math.round((covered ?? 0) * 100)}% of the monthly payment. After ${years} years you keep all of it.`}
            </T>
          </>
        )}
      </Card>

      <Button
        style={{ marginTop: S.xl }}
        label={lang === 'nl' ? 'Vraag je lening aan' : 'Apply for your loan'}
        onPress={() => showToast(lang === 'nl' ? 'Demo: in de echte app start hier de aanvraag.' : 'Demo: the real app would start the application here.')}
      />
      <T v="tiny" color={C.faint} style={{ marginTop: S.md, textAlign: 'center' }}>
        {lang === 'nl'
          ? `Voorbeeldberekening ${loanId === 'energy_loan' ? 'voor een energielening' : 'voor een autolening'}, geen aanbod. Let op, geld lenen kost ook geld.`
          : `Example calculation, not an offer. Borrowing money also costs money.`}
      </T>
    </Page>
  );
}

function StepButton({ icon, onPress }: { icon: 'minus' | 'plus'; onPress: () => void }) {
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={icon} onPress={onPress} style={styles.step}>
      <Icon size={20} color={C.navy} />
    </Pressable>
  );
}

function Row({ label, value, strong, positive }: { label: string; value: string; strong?: boolean; positive?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <T v={strong ? 'h3' : 'body'} color={strong ? C.ink : C.body}>
        {label}
      </T>
      <T v={strong ? 'h3' : 'body'} color={positive ? C.positive : C.ink} style={[tabular, { fontFamily: strong ? F.bold : F.semibold }]}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.sm },
  step: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  terms: { flexDirection: 'row', gap: S.sm, marginTop: S.sm },
  term: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: R.pill, borderWidth: 1, borderColor: C.lineStrong },
  termOn: { backgroundColor: C.navy, borderColor: C.navy },
  meter: { height: 8, borderRadius: 4, backgroundColor: C.positiveBg, marginTop: S.md, overflow: 'hidden' },
  meterFill: { height: 8, borderRadius: 4, backgroundColor: C.positive },
});
