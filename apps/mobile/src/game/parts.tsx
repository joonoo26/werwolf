import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { PublicView } from '@dorf/engine';
import { useNow } from '../lib/useNow';
import { formatCountdown, spokenDuration } from '../logic/time';
import { Avatar, Text } from '../ui/primitives';
import { t } from '../ui/strings';
import { colors, MIN_TOUCH, radius, space } from '../ui/theme';

export function PhaseGlyph({ phase, size = 28 }: { phase: PublicView['phase']; size?: number }) {
  const night = phase === 'night' || phase === 'dusk';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {night ? (
        <Path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" fill={colors.ivory100} />
      ) : (
        <>
          <Circle cx="12" cy="12" r="5" fill={colors.fire400} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <Path key={i} d={`M${12 + Math.cos(a) * 8} ${12 + Math.sin(a) * 8} L${12 + Math.cos(a) * 10.5} ${12 + Math.sin(a) * 10.5}`} stroke={colors.fire400} strokeWidth="1.6" strokeLinecap="round" />;
          })}
        </>
      )}
    </Svg>
  );
}

/** Phasenring mit Countdown (STYLE_GUIDE §7: Phase → Zeit → Lebende → Aktion). */
export function PhaseRing({ pub, size = 188 }: { pub: PublicView; size?: number }) {
  const now = useNow(500);
  const target = pub.phase === 'day' || pub.phase === 'dusk' ? (pub.nightAt ?? pub.phaseEndsAt) : pub.phaseEndsAt;
  const remaining = target !== null ? target - now : null;
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const label = t.phase[pub.phase];
  const heading = pub.phase === 'day' ? `${label} ${pub.day}` : label;
  const advance = pub.advance;
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`${heading}. ${remaining !== null ? spokenDuration(remaining) : ''}. ${t.dash.alive(pub.livingCount)}`}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.night700} strokeWidth="6" fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.fire400} strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={`${c * (remaining !== null ? Math.max(0.02, Math.min(1, remaining / 1_800_000)) : 1)} ${c}`} rotation="-90" origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <PhaseGlyph phase={pub.phase} />
      <Text v="label" style={{ marginTop: 4, color: colors.ivory100 }}>{heading}</Text>
      {remaining !== null ? (
        <Text v="title" style={{ fontSize: 34, lineHeight: 40, color: colors.fire400 }}>{formatCountdown(remaining)}</Text>
      ) : advance ? (
        <Text v="small">{t.dash.ready(advance.ready, advance.total)}</Text>
      ) : null}
    </View>
  );
}

export function PlayersGrid({ pub, onPick, selected, selectable, columns = 5, exclude }: {
  pub: PublicView; onPick?: (id: string) => void; selected?: string | null; selectable?: string[]; columns?: number; exclude?: string[];
}) {
  const list = pub.players.filter((p) => !exclude?.includes(p.id));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md }}>
      {list.map((p) => {
        const can = !!onPick && (selectable ? selectable.includes(p.id) : p.alive);
        const sel = selected === p.id;
        return (
          <Pressable
            key={p.id}
            disabled={!can}
            onPress={() => onPick?.(p.id)}
            accessibilityRole={onPick ? 'button' : undefined}
            accessibilityState={{ selected: sel, disabled: !can }}
            style={{ width: `${Math.floor(100 / columns) - 2}%`, minWidth: 64, minHeight: MIN_TOUCH + 28, alignItems: 'center', gap: 4, opacity: onPick && !can ? 0.35 : 1 }}
          >
            <View style={sel ? { borderRadius: 40, borderWidth: 3, borderColor: colors.ember500, padding: 2 } : { padding: 5 }}>
              <Avatar name={p.name} alive={p.alive} speaker={p.isSpeaker} />
            </View>
            <Text v="small" numberOfLines={1} style={{ color: p.alive ? colors.ivory100 : colors.ash500, textDecorationLine: p.alive ? 'none' : 'line-through' }}>{p.name}</Text>
            {p.isSpeaker && <Text v="label" style={{ fontSize: 10, color: colors.fire400 }}>{t.dash.speaker}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Auswahlliste für Ziele (Nominierung, Stimmen, Nachtaktionen). */
export function TargetList({ pub, options, selected, onSelect, exclude }: { pub: PublicView; options: string[]; selected: string | null; onSelect: (id: string) => void; exclude?: string[] }) {
  return (
    <View style={{ gap: space.sm }}>
      {options.filter((id) => !exclude?.includes(id)).map((id) => {
        const p = pub.players.find((x) => x.id === id);
        if (!p) return null;
        const sel = selected === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ selected: sel }}
            accessibilityLabel={p.name}
            onPress={() => onSelect(id)}
            style={{
              minHeight: MIN_TOUCH + 12, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md,
              borderRadius: radius.md, backgroundColor: colors.night800, borderWidth: 1.5, borderColor: sel ? colors.ember500 : colors.line,
            }}
          >
            <Avatar name={p.name} size={40} />
            <Text style={{ flex: 1 }}>{p.name}</Text>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: sel ? colors.ember500 : colors.ivory300, alignItems: 'center', justifyContent: 'center' }}>
              {sel && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ember500 }} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function useSelection(initial: string | null = null) {
  return useState<string | null>(initial);
}
