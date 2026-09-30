/** Line chart drawn with react-native-svg: baseline versus scenario, 2035 marker, retirement marker. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { formatEURCompact, yearOf, type ISODate } from '../../engine';
import { colors } from '../theme/theme';
import { T } from './ui';

export interface ChartPoint {
  date: ISODate;
  value: number;
}

interface Props {
  baseline: ChartPoint[];
  scenario?: ChartPoint[] | null;
  height?: number;
  markers?: { date: ISODate; label: string }[];
  baselineLabel?: string;
  scenarioLabel?: string;
  compact?: boolean;
}

export function ProjectionChart({ baseline, scenario, height = 200, markers = [], baselineLabel = 'Huidige koers', scenarioLabel = 'Scenario', compact }: Props) {
  const [width, setWidth] = useState(0);
  const padL = compact ? 40 : 52;
  const padR = 12;
  const padT = 12;
  const padB = compact ? 22 : 28;
  const all = [...baseline, ...(scenario ?? [])];
  if (all.length < 2) return null;
  const minX = Math.min(...all.map((p) => Date.parse(p.date)));
  const maxX = Math.max(...all.map((p) => Date.parse(p.date)));
  let minY = Math.min(0, ...all.map((p) => p.value));
  let maxY = Math.max(...all.map((p) => p.value));
  if (maxY === minY) maxY = minY + 1;
  const span = maxY - minY;
  minY -= span * 0.05;
  maxY += span * 0.08;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = height - padT - padB;
  const sx = (d: ISODate) => padL + ((Date.parse(d) - minX) / (maxX - minX || 1)) * innerW;
  const sy = (v: number) => padT + (1 - (v - minY) / (maxY - minY)) * innerH;
  const path = (pts: ChartPoint[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.date).toFixed(1)},${sy(p.value).toFixed(1)}`).join(' ');
  const area = (pts: ChartPoint[]) => `${path(pts)} L${sx(pts[pts.length - 1].date).toFixed(1)},${sy(minY).toFixed(1)} L${sx(pts[0].date).toFixed(1)},${sy(minY).toFixed(1)} Z`;

  const yTicks = [minY + span * 0.1, minY + span * 0.5, minY + span * 0.9].map((v) => Math.round(v));
  const startYear = yearOf(baseline[0].date);
  const endYear = yearOf(all[all.length - 1].date);
  const yearStep = endYear - startYear > 20 ? 5 : endYear - startYear > 10 ? 3 : 2;
  const years: number[] = [];
  for (let y = startYear + 1; y <= endYear; y++) if ((y - startYear) % yearStep === 0) years.push(y);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%' }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {yTicks.map((v, i) => (
            <React.Fragment key={`${v}-${i}`}>
              <Line x1={padL} x2={width - padR} y1={sy(v)} y2={sy(v)} stroke={colors.border} strokeWidth={1} />
              <SvgText x={padL - 6} y={sy(v) + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">
                {formatEURCompact(v)}
              </SvgText>
            </React.Fragment>
          ))}
          {years.map((y) => (
            <SvgText key={y} x={sx(`${y}-01-01`)} y={height - 8} fontSize={10} fill={colors.textMuted} textAnchor="middle">
              {y}
            </SvgText>
          ))}
          {minY < 0 ? <Line x1={padL} x2={width - padR} y1={sy(0)} y2={sy(0)} stroke={colors.textMuted} strokeWidth={1} strokeDasharray="3,3" /> : null}
          <Path d={area(baseline)} fill={colors.accent} opacity={0.08} />
          <Path d={path(baseline)} stroke={colors.navy} strokeWidth={2.5} fill="none" />
          {scenario && scenario.length > 1 ? <Path d={path(scenario)} stroke={colors.accent} strokeWidth={2.5} fill="none" strokeDasharray="6,4" /> : null}
          {markers.map((m) => {
            if (Date.parse(m.date) < minX || Date.parse(m.date) > maxX) return null;
            const x = sx(m.date);
            return (
              <React.Fragment key={m.label}>
                <Line x1={x} x2={x} y1={padT} y2={height - padB} stroke={colors.textMuted} strokeWidth={1} strokeDasharray="2,3" />
                <Rect x={x - 22} y={padT - 2} width={44} height={14} rx={7} fill={colors.background} />
                <SvgText x={x} y={padT + 8} fontSize={9} fill={colors.textSecondary} textAnchor="middle" fontWeight="600">
                  {m.label}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Circle cx={sx(baseline[baseline.length - 1].date)} cy={sy(baseline[baseline.length - 1].value)} r={3.5} fill={colors.navy} />
          {scenario && scenario.length > 1 ? <Circle cx={sx(scenario[scenario.length - 1].date)} cy={sy(scenario[scenario.length - 1].value)} r={3.5} fill={colors.accent} /> : null}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
      {!compact ? (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors.navy }]} />
            <T variant="caption">{baselineLabel}</T>
          </View>
          {scenario && scenario.length > 1 ? (
            <View style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: colors.accent }]} />
              <T variant="caption">{scenarioLabel}</T>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, marginTop: 4, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 4, borderRadius: 2 },
});
