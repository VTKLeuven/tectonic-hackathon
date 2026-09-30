import { BellOff, Eye, Lock, MessageCircleOff, Timer, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Header, Page } from '../components/Screen';
import { Card, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { C, S } from '../theme';

const PRINCIPLES: { icon: LucideIcon; title: { nl: string; en: string }; body: { nl: string; en: string } }[] = [
  {
    icon: MessageCircleOff,
    title: { nl: 'Geen vragen', en: 'No questions' },
    body: {
      nl: 'Kate werkt enkel met wat KBC al van je weet: je verrichtingen. Geen vragenlijst, geen profiel om in te vullen.',
      en: 'Kate only uses what KBC already knows: your transactions. No questionnaire, no profile to fill in.',
    },
  },
  {
    icon: Timer,
    title: { nl: 'Op het juiste moment', en: 'At the right moment' },
    body: {
      nl: 'Een tip over een warmtepomp komt na je mazoutfactuur, niet in een willekeurige nieuwsbrief. Elke soort tip heeft zijn eigen moment.',
      en: 'A heat pump tip comes after your oil bill, not in a random newsletter. Each kind of tip has its own moment.',
    },
  },
  {
    icon: BellOff,
    title: { nl: 'Liever stil dan storend', en: 'Quiet over pushy' },
    body: {
      nl: 'Maximaal één tip op je startscherm. Wat te klein of te onzeker is, houdt Kate voor zich. "Niet voor mij" betekent een halfjaar rust.',
      en: 'At most one tip on your home screen. What is too small or too uncertain, Kate keeps to herself. "Not for me" means six months of quiet.',
    },
  },
  {
    icon: Eye,
    title: { nl: 'Altijd uitlegbaar', en: 'Always explainable' },
    body: {
      nl: 'Bij elke tip zie je welke verrichtingen de aanleiding waren, hoe het bedrag berekend is en welke aannames Kate maakte.',
      en: 'Every tip shows which transactions triggered it, how the amount was calculated and what Kate assumed.',
    },
  },
  {
    icon: Lock,
    title: { nl: 'Je gegevens blijven bij KBC', en: 'Your data stays with KBC' },
    body: {
      nl: 'De analyse draait binnen de bank. Er gaat niets naar leveranciers of adverteerders. Jij kiest welke soorten tips je wil.',
      en: 'The analysis runs inside the bank. Nothing goes to suppliers or advertisers. You choose which kinds of tips you want.',
    },
  },
];

export default function HoeWerktKate() {
  const { lang, analysis } = useApp();
  const t = useT();
  return (
    <Page header={<Header title={lang === 'nl' ? 'Hoe werkt Kate?' : 'How Kate works'} />}>
      <Card padded={false}>
        {PRINCIPLES.map((p, i) => (
          <View key={i} style={[styles.row, i < PRINCIPLES.length - 1 && styles.line]}>
            <View style={styles.icon}>
              <p.icon size={18} color={C.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="h3">{p.title[lang]}</T>
              <T v="small" color={C.body} style={{ marginTop: 2 }}>
                {p.body[lang]}
              </T>
            </View>
          </View>
        ))}
      </Card>

      {analysis.suppressed.length > 0 && (
        <>
          <T v="h3" style={{ marginTop: S.xl, marginBottom: S.sm, paddingHorizontal: S.xs }}>
            {lang === 'nl' ? 'Wat Kate nu bewust niet toont' : 'What Kate deliberately holds back now'}
          </T>
          <Card>
            {analysis.suppressed.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: S.sm, paddingVertical: 6 }}>
                <View style={styles.bullet} />
                <T v="small" color={C.body} style={{ flex: 1 }}>
                  {t(s.reason)}
                </T>
              </View>
            ))}
          </Card>
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: S.md, padding: S.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.kateBg, alignItems: 'center', justifyContent: 'center' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.faint, marginTop: 7 },
});
