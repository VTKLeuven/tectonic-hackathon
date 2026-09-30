import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { euro, shortMonth, type EnergyMonth, type Lang } from '../engine';
import { C, F, S } from '../theme';
import { T, tabular } from './ui';

type Key = 'electricity' | 'heating' | 'mobility';
const KEYS: Key[] = ['electricity', 'heating', 'mobility'];

export const SERIES_LABEL: Record<Key, { nl: string; en: string }> = {
  electricity: { nl: 'Elektriciteit', en: 'Electricity' },
  heating: { nl: 'Verwarming', en: 'Heating' },
  mobility: { nl: 'Mobiliteit', en: 'Mobility' },
};

/** Column with a 4px rounded data-end and a square base. */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

function niceMax(v: number) {
  if (v <= 0) return 100;
  const step = v > 1500 ? 500 : v > 600 ? 250 : 100;
  return Math.ceil(v / step) * step;
}

/**
 * Twelve months of energy spending, stacked by what it went to. Tap a month
 * for its breakdown; the legend carries the yearly totals as text.
 */
export function EnergyChart({ months, lang, annual }: { months: EnergyMonth[]; lang: Lang; annual: Record<Key, number> }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const height = 160;
  const axisW = 40;
  const plotW = Math.max(0, width - axisW);
  const totals = months.map((m) => m.electricity + m.heating + m.mobility);
  const max = niceMax(Math.max(...totals));
  const slot = plotW / months.length;
  const barW = Math.min(18, slot * 0.62);
  const gap = 2;
  const scale = (v: number) => (v / max) * (height - 8);
  const sel = selected !== null ? months[selected] : null;

  return (
    <View>
      <View style={styles.readout}>
        {sel ? (
          <>
            <T v="label">{shortMonth(sel.month, lang)} {sel.month.slice(0, 4)}</T>
            <T v="label" style={tabular}>{euro(sel.electricity + sel.heating + sel.mobility, lang)}</T>
          </>
        ) : (
          <T v="small" color={C.muted}>
            {lang === 'nl' ? 'Tik op een maand voor details' : 'Tap a month for details'}
          </T>
        )}
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: height + 22 }}>
        {width > 0 && (
          <Svg width={width} height={height + 22}>
            {[0, 0.5, 1].map((f) => {
              const y = height - scale(max * f);
              return <Line key={f} x1={axisW} x2={width} y1={y} y2={y} stroke={C.line} strokeWidth={1} />;
            })}
            {months.map((m, i) => {
              const x = axisW + i * slot + (slot - barW) / 2;
              let y = height;
              const parts = KEYS.filter((k) => m[k] > 0);
              const dim = selected !== null && selected !== i;
              return parts.map((k, j) => {
                const h = Math.max(1.5, scale(m[k]) - (j > 0 ? gap : 0));
                y -= h + (j > 0 ? gap : 0);
                const isTop = j === parts.length - 1;
                return isTop ? (
                  <Path key={`${m.month}-${k}`} d={topRounded(x, y, barW, h, 4)} fill={C.series[k]} opacity={dim ? 0.3 : 1} />
                ) : (
                  <Rect key={`${m.month}-${k}`} x={x} y={y} width={barW} height={h} fill={C.series[k]} opacity={dim ? 0.3 : 1} />
                );
              });
            })}
          </Svg>
        )}
        {width > 0 && (
          <>
            {[0, 0.5, 1].map((f) => (
              <T key={f} v="tiny" color={C.muted} style={[styles.axisLabel, tabular, { top: height - scale(max * f) - 7 }]}>
                {euro(max * f, lang).replace('€ ', '€')}
              </T>
            ))}
            <View style={[styles.months, { left: axisW }]}>
              {months.map((m, i) => (
                <Pressable
                  key={m.month}
                  accessibilityRole="button"
                  accessibilityLabel={`${shortMonth(m.month, lang)}: ${euro(totals[i], lang)}`}
                  onPress={() => setSelected(selected === i ? null : i)}
                  style={{ width: slot, height: height + 22, justifyContent: 'flex-end', alignItems: 'center' }}
                >
                  <T v="tiny" color={selected === i ? C.ink : C.muted} style={{ fontSize: 10 }}>
                    {shortMonth(m.month, lang).slice(0, 3)}
                  </T>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>
      <View style={styles.legend}>
        {KEYS.map((k) => (
          <View key={k} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: C.series[k] }]} />
            <T v="small" color={C.body} style={{ flex: 1 }}>
              {SERIES_LABEL[k][lang]}
            </T>
            <T v="small" style={[tabular, { fontFamily: F.semibold }]}>
              {sel ? euro(sel[k], lang) : `${euro(annual[k], lang)}${lang === 'nl' ? '/jaar' : '/yr'}`}
            </T>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 20, marginBottom: S.sm },
  axisLabel: { position: 'absolute', left: 0, width: 36 },
  months: { position: 'absolute', top: 0, right: 0, flexDirection: 'row' },
  legend: { marginTop: S.md, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
