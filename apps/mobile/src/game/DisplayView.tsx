import { QUESTS, type PublicView } from '@dorf/engine';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef } from 'react';
import { Animated, View, useWindowDimensions } from 'react-native';
import { useRoom } from '../lib/room';
import { useNow } from '../lib/useNow';
import { formatCountdown, showdownBeat } from '../logic/time';
import { Hearth } from '../ui/art';
import { Avatar, Backdrop, Text, useReduceMotion } from '../ui/primitives';
import { roleNames, t } from '../ui/strings';
import { colors, motion, space } from '../ui/theme';
import { MomentOverlay } from './MomentOverlay';
import { PhaseGlyph, VillageSummary } from './parts';

/**
 * iPad-Dorfanzeige: Bühne, nicht vergrößertes Handy. Nur öffentliche Daten, keine Interaktion,
 * keine Werbung (GAME_DESIGN §6).
 */
export function DisplayView() {
  const { pub, loaded } = useRoom();
  const now = useNow(250);
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const tone = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    void activateKeepAwakeAsync('dorf-display');
    return () => void deactivateKeepAwake('dorf-display');
  }, []);
  const night = pub?.phase === 'night';
  useEffect(() => {
    Animated.timing(tone, { toValue: night ? 1 : 0, duration: reduce ? 0 : motion.cinematic * 1.5, useNativeDriver: true }).start();
  }, [night, tone, reduce]);
  if (!loaded || !pub) return <Backdrop><Text style={{ padding: space.xl }}>{t.common.loading}</Text></Backdrop>;

  const size = Math.min(width, height) * 0.78;
  const target = pub.phase === 'day' || pub.phase === 'dusk' ? (pub.nightAt ?? pub.phaseEndsAt) : pub.phaseEndsAt;
  const remaining = target !== null ? target - now : null;
  const c = pub.council;
  const beat = c?.step === 'showdown' && c.revealAt ? showdownBeat(now, c.revealAt, 4500) : null;
  const quest = pub.quest ? QUESTS.find((q) => q.id === pub.quest!.id) : null;
  const heading = pub.phase === 'day' ? `${t.phase.day} ${pub.day}` : t.phase[pub.phase];
  const nameOf = (id: string | null) => pub.players.find((p) => p.id === id)?.name ?? '';

  // Zentraler Text je Zustand
  let center: React.ReactNode;
  if (pub.phase === 'ended') {
    center = (<><Text v="display" style={{ fontSize: 48, textAlign: 'center' }}>{pub.winner === 'village' ? t.ended.village : t.ended.pack}</Text></>);
  } else if (c?.step === 'showdown') {
    center = <Text v="huge" style={{ fontSize: 120, lineHeight: 130, color: beat === 3 ? colors.ember400 : colors.ivory100 }}>{beat === null ? '…' : t.council.countdown[beat]}</Text>;
  } else if (c?.step === 'result') {
    center = (<><Text v="label">{t.council.result}</Text><Text v="display" style={{ fontSize: 48, textAlign: 'center', color: colors.ember400 }}>{nameOf(c.banished)} {t.council.banished}</Text>{revealLine(pub, c.banished)}</>);
  } else if (c?.step === 'tiebreak') {
    center = <Text v="display" style={{ textAlign: 'center' }}>{t.council.tiebreak}</Text>;
  } else if (pub.phase === 'morning') {
    const names = (pub.morningDeaths ?? []).map(nameOf);
    center = (<><Text v="display" style={{ textAlign: 'center' }}>{names.length ? t.morning.some : t.morning.none}</Text>{(pub.morningDeaths ?? []).map((id) => <View key={id} style={{ alignItems: 'center' }}><Text v="display" style={{ color: colors.ember400 }}>{nameOf(id)}</Text>{revealLine(pub, id)}</View>)}</>);
  } else {
    center = (
      <>
        <PhaseGlyph phase={pub.phase} size={56} />
        <Text v="display" style={{ fontSize: 52 }} accessibilityRole="header">{heading}</Text>
        {remaining !== null && <Text v="huge" style={{ color: colors.fire400 }}>{formatCountdown(remaining)}</Text>}
        <Text style={{ color: colors.ivory300 }}>{c ? (c.step === 'discussion' ? t.council.discussionHint : t.council.votingHint) : pub.nightStage === 'heal' ? t.night.healTitle : t.phaseHint[pub.phase]}</Text>
        {c?.voteReady && <Text v="title" style={{ color: colors.fire400 }}>{t.council.voteReady}</Text>}
        {pub.councilReady && <Text v="title" style={{ color: colors.fire400 }}>{t.dash.councilReady}</Text>}
        {c?.progress && <Text v="small">{t.council.waitingVotes(c.progress.cast, c.progress.total)}</Text>}
        {quest && <View style={{ maxWidth: size * 0.6, alignItems: 'center', gap: 6 }}><Text v="label">{t.dash.quest}</Text><Text v="title" style={{ textAlign: 'center' }}>{quest.title}</Text><Text v="small" style={{ textAlign: 'center' }}>{quest.goal}</Text></View>}
      </>
    );
  }

  return (
    <Backdrop tone={night ? 'night' : c ? 'council' : 'day'}>
      <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: reduce ? 1 : tone.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] }) }}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', opacity: night ? 0.35 : 1 }}><Hearth size={size} flame={false} /></View>
          {pub.players.map((p, i) => {
            const a = (i / pub.players.length) * 2 * Math.PI - Math.PI / 2;
            const r = size / 2 - 40;
            const cand = false;
            return (
              <View key={p.id} style={{ position: 'absolute', left: size / 2 + Math.cos(a) * r - 42, top: size / 2 + Math.sin(a) * r - 42, width: 84, alignItems: 'center', gap: 2 }}>
                <View style={cand ? { borderWidth: 3, borderColor: colors.ember500, borderRadius: 40, padding: 2 } : { padding: 5 }}>
                  <Avatar name={p.name} alive={p.alive} speaker={p.isSpeaker} size={56} />
                </View>
                <Text v="small" numberOfLines={1} style={{ color: p.alive ? colors.ivory100 : colors.ash500, textDecorationLine: p.alive ? 'none' : 'line-through' }}>{p.name}</Text>
              </View>
            );
          })}
          <View style={{ alignItems: 'center', gap: space.sm, maxWidth: size * 0.55 }}>{center}</View>
        </View>
        {pub.phase !== 'ended' && <View style={{ position: 'absolute', bottom: space.xl }}><VillageSummary pub={pub} /></View>}
        {pub.phase === 'ended' && pub.reveal && (
          <View style={{ position: 'absolute', bottom: space.xl, flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, justifyContent: 'center' }}>
            {pub.reveal.map((r) => <Text key={r.id} v="small">{nameOf(r.id)} · {roleNames[r.role]}</Text>)}
          </View>
        )}
      </Animated.View>
      <MomentOverlay moment={pub.moment} display />
    </Backdrop>
  );
}

function revealLine(pub: PublicView, id: string | null) {
  const r = pub.players.find((p) => p.id === id)?.revealed;
  return r ? <Text v="title" style={{ color: colors.ivory300 }}>{`${t.reveal.faction[r.faction]} · ${roleNames[r.role]}`}</Text> : null;
}

export type { PublicView };
