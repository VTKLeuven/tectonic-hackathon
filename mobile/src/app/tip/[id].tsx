import { useLocalSearchParams, useRouter } from 'expo-router';
import { BellOff, ChevronDown, ChevronRight, Clock, Leaf, Sparkles, ThumbsDown, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { KateMark } from '../../components/Brand';
import { INSIGHT_ICON } from '../../components/Icon';
import { Header, Page } from '../../components/Screen';
import { Button, Card, Divider, T, tabular } from '../../components/ui';
import { euro, formatDate, formatMoney, formatNumber, type RankedInsight, type Scenario } from '../../engine';
import { useApp, useT } from '../../state/AppState';
import { C, F, R, S, shadow } from '../../theme';

export default function TipDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { analysis, lang, giveFeedback, showToast, openVoice } = useApp();
  const t = useT();
  const insight = analysis.insights.find((i) => i.id === decodeURIComponent(id ?? ''));
  const [scenarioId, setScenarioId] = useState<string>('base');
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showScore, setShowScore] = useState(false);

  // Opening a tip is the only "seen" signal Kate needs.
  useEffect(() => {
    if (insight && insight.status === 'new') giveFeedback(insight, 'seen');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insight?.id]);

  if (!insight) {
    return (
      <Page header={<Header title="Kate" />}>
        <Card>
          <T v="body" color={C.muted}>
            {lang === 'nl'
              ? 'Deze tip is niet meer actief. Kate toont enkel wat nu nog relevant is.'
              : 'This tip is no longer active. Kate only shows what is still relevant.'}
          </T>
        </Card>
      </Page>
    );
  }

  const Icon = INSIGHT_ICON[insight.type];
  const scenario = insight.scenarios?.find((s) => s.id === scenarioId) ?? insight.scenarios?.[0];
  const annual = scenario?.annualSaving ?? insight.annualValue;
  const upfront = scenario?.upfrontCost ?? insight.upfrontCost;
  const co2 = scenario?.co2SavedKg ?? insight.co2SavedKg;
  const payback = scenario && scenario.id !== 'base' ? (upfront && annual ? upfront / annual : undefined) : insight.paybackYears;

  function act(action: 'snooze' | 'dismiss') {
    giveFeedback(insight!, action);
    showToast(
      action === 'snooze'
        ? lang === 'nl'
          ? 'Kate brengt dit over een maand opnieuw ter sprake.'
          : 'Kate will bring this up again in a month.'
        : lang === 'nl'
          ? 'Begrepen. Kate toont het komende halfjaar geen tips van deze soort.'
          : 'Got it. Kate will not show tips like this for six months.',
    );
    router.back();
  }

  function follow(target?: string) {
    giveFeedback(insight!, 'useful');
    if (target === 'scenarios') return;
    if (target === 'subscriptions') return router.push('/abonnementen');
    router.push(`/product/${target ?? 'info'}?tip=${encodeURIComponent(insight!.id)}`);
  }

  return (
    <Page header={<Header title="Kate" />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <View style={styles.bigIcon}>
          <Icon size={24} color={C.blue} />
        </View>
        <T v="small" color={C.muted} style={{ flex: 1 }}>
          {lang === 'nl' ? 'Opgemerkt op ' : 'Noticed on '}
          {formatDate(insight.triggeredAt, lang, true)}
        </T>
      </View>
      <T v="h1" style={{ marginTop: S.lg }}>
        {t(insight.title)}
      </T>
      <T v="body" color={C.body} style={{ marginTop: S.sm }}>
        {t(insight.summary)}
      </T>

      <Pressable
        onPress={() => openVoice(insight)}
        style={({ pressed }) => [styles.voiceTipBtn, shadow, pressed && { opacity: 0.85 }]}
      >
        <Sparkles size={16} color={C.blue} />
        <T v="label" color={C.blue}>
          {lang === 'nl' ? 'Beluister toelichting van Kate' : "Listen to Kate's briefing"}
        </T>
      </Pressable>

      {annual !== undefined && (
        <Card style={{ marginTop: S.xl }}>
          <T v="small" color={C.muted}>
            {insight.type === 'pension_saving'
              ? lang === 'nl'
                ? 'Belastingvoordeel'
                : 'Tax benefit'
              : insight.type === 'price_increase' || insight.type === 'trial_converted'
                ? lang === 'nl'
                  ? 'Kost je'
                  : 'Costs you'
                : lang === 'nl'
                  ? 'Geschatte besparing'
                  : 'Estimated saving'}
          </T>
          <T v="display" color={C.positive} style={tabular}>
            {euro(annual, lang)}
            <T v="h3" color={C.positive}>
              {lang === 'nl' ? ' per jaar' : ' a year'}
            </T>
          </T>
          {(upfront || co2) && (
            <View style={styles.stats}>
              {upfront ? <Stat label={lang === 'nl' ? 'Investering' : 'Investment'} value={euro(upfront, lang)} /> : null}
              {payback && payback <= 15 ? <Stat label={lang === 'nl' ? 'Terugverdiend' : 'Pays back'} value={`${formatNumber(Math.round(payback * 10) / 10, lang, 1)} ${lang === 'nl' ? 'jaar' : 'yrs'}`} /> : null}
              {co2 ? <Stat icon={Leaf} label="CO₂" value={`-${formatNumber(co2 / 1000, lang, 1)} t`} /> : null}
            </View>
          )}
          {insight.scenarios && insight.scenarios.length > 1 && (
            <View style={{ marginTop: S.lg }}>
              <T v="label" style={{ marginBottom: S.sm }}>
                {lang === 'nl' ? 'Scenario' : 'Scenario'}
              </T>
              {insight.scenarios.map((s) => (
                <ScenarioOption key={s.id} scenario={s} selected={s.id === scenario?.id} onPress={() => setScenarioId(s.id)} />
              ))}
              {scenario?.note && (
                <T v="small" color={C.muted} style={{ marginTop: S.sm }}>
                  {t(scenario.note)}
                </T>
              )}
            </View>
          )}
        </Card>
      )}

      <View style={styles.why}>
        <KateMark size={28} />
        <View style={{ flex: 1 }}>
          <T v="label" color={C.navy}>
            {lang === 'nl' ? 'Waarom nu?' : 'Why now?'}
          </T>
          <T v="body" color={C.body}>
            {t(insight.trigger)}
          </T>
        </View>
      </View>

      <Card style={{ marginTop: S.lg }}>
        <T v="h3">{lang === 'nl' ? 'Waarom zie ik dit?' : 'Why am I seeing this?'}</T>
        <View style={{ marginTop: S.sm, gap: S.sm }}>
          {insight.reasons.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: S.sm }}>
              <View style={styles.bullet} />
              <T v="body" color={C.body} style={{ flex: 1 }}>
                {t(r)}
              </T>
            </View>
          ))}
        </View>
        {insight.evidence.length > 0 && (
          <>
            <T v="label" color={C.muted} style={{ marginTop: S.lg, marginBottom: S.xs }}>
              {lang === 'nl' ? 'Op basis van deze verrichtingen' : 'Based on these transactions'}
            </T>
            {insight.evidence.map((e, i) => (
              <Pressable
                key={i}
                disabled={!e.transactionId}
                onPress={() => e.transactionId && router.push(`/verrichting/${encodeURIComponent(e.transactionId)}`)}
                style={styles.evidence}
              >
                <T v="small" color={C.ink} style={{ flex: 1 }} numberOfLines={1}>
                  {e.transactionId ? t(e.label).split(':')[0] : t(e.label)}
                </T>
                {e.amount !== undefined && (
                  <T v="small" style={[tabular, { fontFamily: F.semibold }]}>
                    {formatMoney(e.amount, lang)}
                  </T>
                )}
                {e.transactionId && <ChevronRight size={16} color={C.faint} />}
              </Pressable>
            ))}
          </>
        )}
      </Card>

      {insight.breakdown.length > 0 && (
        <Card style={{ marginTop: S.lg }}>
          <T v="h3" style={{ marginBottom: S.sm }}>
            {lang === 'nl' ? 'Zo rekende Kate' : 'How Kate calculated this'}
          </T>
          {insight.breakdown.map((line, i) => (
            <View key={i} style={[styles.line, line.strong && styles.lineStrong]}>
              <T v="small" color={line.strong ? C.ink : C.body} style={{ flex: 1, fontFamily: line.strong ? F.semibold : F.regular }}>
                {t(line.label)}
              </T>
              <T v="small" style={[tabular, { fontFamily: line.strong ? F.bold : F.medium }]}>
                {t(line.value)}
              </T>
            </View>
          ))}
          {insight.assumptions.length > 0 && (
            <>
              <Pressable onPress={() => setShowAssumptions((v) => !v)} style={styles.toggle}>
                <T v="label" color={C.blue}>
                  {lang === 'nl' ? 'Aannames' : 'Assumptions'}
                </T>
                <ChevronDown size={16} color={C.blue} style={{ transform: [{ rotate: showAssumptions ? '180deg' : '0deg' }] }} />
              </Pressable>
              {showAssumptions &&
                insight.assumptions.map((line, i) => (
                  <View key={i} style={styles.line}>
                    <T v="small" color={C.muted} style={{ flex: 1 }}>
                      {t(line.label)}
                    </T>
                    <T v="small" color={C.muted} style={tabular}>
                      {t(line.value)}
                    </T>
                  </View>
                ))}
            </>
          )}
        </Card>
      )}

      <View style={{ marginTop: S.xl, gap: S.sm }}>
        {insight.actions
          .filter((a) => a.target !== 'scenarios' || !insight.scenarios || insight.scenarios.length < 2)
          .map((a, i) => (
            <Button key={i} label={t(a.label)} kind={i === 0 ? 'primary' : 'secondary'} onPress={() => follow(a.target)} />
          ))}
      </View>

      <View style={styles.feedback}>
        <FeedbackButton icon={Clock} label={lang === 'nl' ? 'Later' : 'Later'} onPress={() => act('snooze')} />
        <FeedbackButton icon={ThumbsDown} label={lang === 'nl' ? 'Niet voor mij' : 'Not for me'} onPress={() => act('dismiss')} />
      </View>

      {analysis.agents && analysis.agents.length > 0 && (
        <Card style={{ marginTop: S.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.xs }}>
            <Sparkles size={18} color={C.blue} />
            <T v="h3" color={C.navy}>
              {lang === 'nl' ? 'Kate Multi-Agent Swarm' : 'Kate Multi-Agent Swarm'}
            </T>
          </View>
          <T v="tiny" color={C.muted} style={{ marginBottom: S.md }}>
            {lang === 'nl'
              ? '3 gespecialiseerde agents delibereren autonoom op de achtergrond:'
              : '3 specialized agents deliberating autonomously in the background:'}
          </T>
          {analysis.agents.map((agent, idx) => (
            <View key={agent.id} style={[styles.agentBox, idx < analysis.agents!.length - 1 && styles.agentBoxDivider]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T v="label" color={C.navy}>
                  {agent.name}
                </T>
                <View style={styles.confidencePill}>
                  <T v="tiny" color={C.blue} style={{ fontFamily: F.semibold }}>
                    {Math.round(agent.confidence * 100)}% {lang === 'nl' ? 'zekerheid' : 'confidence'}
                  </T>
                </View>
              </View>
              <T v="tiny" color={C.muted} style={{ marginTop: 2 }}>
                {t(agent.role)}
              </T>
              <T v="small" color={C.body} style={{ marginTop: 4 }}>
                {t(agent.verdict)}
              </T>
              <View style={{ flexDirection: 'row', gap: S.xs, marginTop: 6, flexWrap: 'wrap' }}>
                {agent.metrics.map((m, mi) => (
                  <View key={mi} style={styles.agentMetricPill}>
                    <T v="tiny" color={C.muted}>
                      {t(m.label)}:
                    </T>
                    <T v="tiny" color={C.ink} style={{ fontFamily: F.semibold, marginLeft: 2 }}>
                      {m.value}
                    </T>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </Card>
      )}

      <Pressable onPress={() => setShowScore((v) => !v)} style={[styles.toggle, { alignSelf: 'center', marginTop: S.lg }]}>
        <T v="small" color={C.muted}>
          {lang === 'nl' ? 'Waarom deze plek in je lijst?' : 'Why this place in your list?'}
        </T>
        <ChevronDown size={14} color={C.muted} style={{ transform: [{ rotate: showScore ? '180deg' : '0deg' }] }} />
      </Pressable>
      {showScore && <ScoreCard insight={insight} />}

      <T v="tiny" color={C.faint} style={{ marginTop: S.xl, textAlign: 'center' }}>
        {lang === 'nl'
          ? 'Indicatieve schatting, geen persoonlijk advies. Kate gebruikt enkel gegevens die KBC al heeft.'
          : 'Indicative estimate, not personal advice. Kate only uses data KBC already has.'}
      </T>
    </Page>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: LucideIcon }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {Icon && <Icon size={12} color={C.muted} />}
        <T v="tiny" color={C.muted}>
          {label}
        </T>
      </View>
      <T v="h3" style={tabular}>
        {value}
      </T>
    </View>
  );
}

function ScenarioOption({ scenario, selected, onPress }: { scenario: Scenario; selected: boolean; onPress: () => void }) {
  const { lang } = useApp();
  const t = useT();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.scenario, selected && styles.scenarioOn]}>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
      <T v="body" style={{ flex: 1, fontFamily: selected ? F.semibold : F.regular }}>
        {t(scenario.label)}
      </T>
      <T v="small" color={C.positive} style={[tabular, { fontFamily: F.semibold }]}>
        {euro(scenario.annualSaving, lang)}
      </T>
    </Pressable>
  );
}

function FeedbackButton({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.fb, pressed && { backgroundColor: C.line }]}>
      <Icon size={16} color={C.body} />
      <T v="label" color={C.body}>
        {label}
      </T>
    </Pressable>
  );
}

/** The ranking, laid bare. Mostly for the curious (and for the jury). */
function ScoreCard({ insight }: { insight: RankedInsight }) {
  const { lang } = useApp();
  const rows: [string, string, number][] = [
    [lang === 'nl' ? 'Waarde' : 'Value', lang === 'nl' ? 'hoeveel het je oplevert' : 'what it is worth to you', insight.score.value],
    [lang === 'nl' ? 'Zekerheid' : 'Confidence', lang === 'nl' ? 'hoe zeker Kate is van de situatie' : 'how sure Kate is about the situation', insight.score.confidence],
    [lang === 'nl' ? 'Timing' : 'Timing', lang === 'nl' ? 'hoe goed nu past' : 'how well now fits', insight.score.timeliness],
    [lang === 'nl' ? 'Jouw voorkeur' : 'Your preference', lang === 'nl' ? 'wat jij en anderen eerder nuttig vonden' : 'what you and others found useful', insight.score.affinity / 1.4],
  ];
  return (
    <Card style={{ marginTop: S.sm }}>
      {rows.map(([label, hint, v]) => (
        <View key={label} style={{ marginBottom: S.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="label">{label}</T>
            <T v="small" color={C.muted} style={tabular}>
              {Math.round(Math.min(1, v) * 100)}%
            </T>
          </View>
          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${Math.round(Math.min(1, v) * 100)}%` }]} />
          </View>
          <T v="tiny" color={C.muted} style={{ marginTop: 2 }}>
            {hint}
          </T>
        </View>
      ))}
      <Divider />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: S.md }}>
        <T v="label">{lang === 'nl' ? 'Score' : 'Score'}</T>
        <T v="label" style={tabular}>
          {Math.round(insight.score.total * 100)}
        </T>
      </View>
      <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'center', marginTop: S.sm }}>
        <BellOff size={14} color={C.muted} />
        <T v="tiny" color={C.muted} style={{ flex: 1 }}>
          {lang === 'nl'
            ? 'Onder 12 blijft een tip stil. Op Home komt er maximaal één tegelijk.'
            : 'Below 12 a tip stays silent. The home screen shows at most one at a time.'}
        </T>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  bigIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.kateBg, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: S.md, marginTop: S.lg, paddingTop: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  why: {
    flexDirection: 'row',
    gap: S.md,
    marginTop: S.lg,
    padding: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.kateBg,
    borderWidth: 1,
    borderColor: C.kateLine,
  },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.cyan, marginTop: 8 },
  evidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingVertical: S.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  line: { flexDirection: 'row', gap: S.md, paddingVertical: 6 },
  lineStrong: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.lineStrong, marginTop: 4, paddingTop: S.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: S.md },
  scenario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: S.sm,
  },
  scenarioOn: { borderColor: C.blue, backgroundColor: C.kateBg },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue },
  feedback: { flexDirection: 'row', gap: S.sm, marginTop: S.md },
  fb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: R.pill,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
  },
  meter: { height: 6, borderRadius: 3, backgroundColor: C.kateBg, marginTop: 4, overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: C.blue },
  voiceTipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: S.md,
    paddingVertical: 10,
    paddingHorizontal: S.md,
    backgroundColor: C.card,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.kateBg,
  },
  agentBox: { paddingVertical: S.sm },
  agentBoxDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
    paddingBottom: S.md,
    marginBottom: S.sm,
  },
  confidencePill: {
    backgroundColor: C.kateBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: R.pill,
  },
  agentMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
});

