import { QUESTS, type PublicView } from '@dorf/engine';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { useRoom } from '../lib/room';
import { useNow } from '../lib/useNow';
import { showdownBeat } from '../logic/time';
import { Backdrop, Button, Card, Text, haptic, useReduceMotion } from '../ui/primitives';
import { Hearth } from '../ui/art';
import { roleNames, t } from '../ui/strings';
import { colors, motion, space } from '../ui/theme';
import { PhaseRing, PlayersGrid, TargetList } from './parts';
import { useAct } from './useAct';

type Props = { pub: PublicView };

function useMe() {
  const { me } = useRoom();
  return { me, alive: me?.alive ?? false };
}

const Pad = ({ children }: { children: React.ReactNode }) => (
  <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xl, alignItems: 'stretch', flexGrow: 1 }}>{children}</ScrollView>
);

function Center({ children }: { children: React.ReactNode }) {
  return <View style={{ alignItems: 'center', gap: space.md }}>{children}</View>;
}

function Err({ code }: { code: string | null }) {
  return code ? <Text v="small" accessibilityLiveRegion="polite" style={{ color: colors.ember400, textAlign: 'center' }}>{t.errors[code] ?? t.common.error}</Text> : null;
}

// ───────── Dorfsprecher-Wahl ─────────
export function SpeakerStage({ pub }: Props) {
  const { me, alive } = useMe();
  const { act, busy, error } = useAct();
  const [pick, setPick] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  return (
    <Pad>
      <Center>
        <PhaseRing pub={pub} />
        <Text v="display" style={{ textAlign: 'center' }}>{t.phase.speaker_election}</Text>
        <Text v="small" style={{ textAlign: 'center' }}>{t.phaseHint.speaker_election}</Text>
        {pub.electionProgress && <Text v="small">{t.council.waitingVotes(pub.electionProgress.cast, pub.electionProgress.total)}</Text>}
      </Center>
      {alive && !sent ? (
        <>
          <TargetList pub={pub} options={pub.players.filter((p) => p.alive).map((p) => p.id)} exclude={[me?.id ?? '']} selected={pick} onSelect={setPick} />
          <Button label={t.council.confirm} disabled={!pick} busy={busy} onPress={async () => { if (pick && (await act({ type: 'vote_speaker', target: pick }))) setSent(true); }} />
        </>
      ) : alive ? (
        <Text style={{ textAlign: 'center' }}>{t.council.locked}</Text>
      ) : null}
      <Err code={error} />
    </Pad>
  );
}

// ───────── Tag ─────────
export function DayStage({ pub }: Props) {
  const { alive } = useMe();
  const { room } = useRoom();
  const { act, busy, error } = useAct();
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const quest = pub.quest ? QUESTS.find((q) => q.id === pub.quest!.id) : null;
  useEffect(() => { setReady(false); }, [pub.day]);
  useEffect(() => { setDone(false); }, [pub.quest?.id]);
  const classic = room?.mode === 'classic';
  return (
    <Pad>
      <Center>
        <PhaseRing pub={pub} />
        <Text v="small" style={{ textAlign: 'center' }}>{t.phaseHint.day}</Text>
        <Text v="label">{t.dash.alive(pub.livingCount)}</Text>
      </Center>

      {quest && (
        <Card style={{ gap: space.sm }}>
          <Text v="label">{t.dash.quest}</Text>
          <Text v="display" style={{ fontSize: 28, lineHeight: 32 }}>{quest.title}</Text>
          <Text v="small">{quest.goal}</Text>
          <Text>{quest.task}</Text>
          <Text v="small">{quest.finish}</Text>
          {alive && <Button variant="secondary" label={done ? t.dash.questDoneSet : t.dash.questDone} disabled={done} busy={busy} onPress={async () => { if (await act({ type: 'quest_done' })) setDone(true); }} />}
        </Card>
      )}

      {pub.councilReady && <Text v="title" style={{ textAlign: 'center', color: colors.fire400 }} accessibilityLiveRegion="polite">{t.dash.councilReady}</Text>}

      {alive && (
        <View style={{ gap: space.md }}>
          {pub.councilReady && !classic && <Button label={t.dash.startCouncil} busy={busy} onPress={() => void act({ type: 'start_council' })} />}
          <Button
            variant={pub.councilReady && !classic ? 'secondary' : 'primary'}
            label={ready ? t.dash.readyWithdraw : t.dash.readyCouncil}
            busy={busy}
            onPress={async () => { if (await act({ type: 'ready', topic: 'council', value: !ready })) setReady(!ready); }}
          />
        </View>
      )}
      <PlayersGrid pub={pub} />
      <Err code={error} />
    </Pad>
  );
}

// ───────── Dorfrat ─────────
export function CouncilStage({ pub }: Props) {
  const c = pub.council!;
  const { me, alive } = useMe();
  const { act, busy, error } = useAct();
  const { serverNow } = useRoom();
  const now = useNow(100);
  const [pick, setPick] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const beat = c.revealAt ? showdownBeat(now, c.revealAt, 4500) : null;
  const lastBeat = useRef<number | null>(null);
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => { setPick(null); setLocked(false); }, [c.step]);
  useEffect(() => {
    if (c.step !== 'showdown' || beat === null || beat === lastBeat.current) return;
    lastBeat.current = beat;
    haptic(beat === 3 ? 'heavy' : 'light'); // synchron für alle, trägt keine Rolleninformation
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: reduce ? 0 : motion.cinematic / 2, useNativeDriver: true }).start();
  }, [beat, c.step, fade, reduce]);
  void serverNow;

  const name = (id: string | null) => pub.players.find((p) => p.id === id)?.name ?? '';
  const living = pub.players.filter((p) => p.alive).map((p) => p.id);
  const isSpeaker = !!me && pub.speakerId === me.id;

  return (
    <Backdrop tone="council">
      <Pad>
        <Center>
          <Hearth size={120} />
          <Text v="display" accessibilityRole="header">{t.phase.council}</Text>
        </Center>

        {c.step === 'nomination' && (
          <>
            <Text v="title" style={{ textAlign: 'center' }}>{t.council.nomination}</Text>
            <Text v="small" style={{ textAlign: 'center' }}>{t.council.nominationHint}</Text>
            {c.progress && <Text v="small" style={{ textAlign: 'center' }}>{t.council.waitingVotes(c.progress.cast, c.progress.total)}</Text>}
            {alive && (
              <>
                <TargetList pub={pub} options={living} exclude={[me?.id ?? '']} selected={pick} onSelect={setPick} />
                <Button label={t.council.nominate} disabled={!pick} busy={busy} onPress={async () => { if (pick && (await act({ type: 'nominate', target: pick }))) setLocked(true); }} />
                {locked && <Text v="small" style={{ textAlign: 'center' }}>{t.council.locked}</Text>}
              </>
            )}
          </>
        )}

        {c.step === 'defense' && (
          <>
            <Text v="title" style={{ textAlign: 'center' }}>{t.council.defense}</Text>
            <Text v="small" style={{ textAlign: 'center' }}>{t.council.defenseHint}</Text>
            <PlayersGrid pub={pub} selectable={c.candidates} selected={null} columns={3} exclude={pub.players.filter((p) => !c.candidates.includes(p.id)).map((p) => p.id)} />
          </>
        )}

        {c.step === 'voting' && (
          <>
            <Text v="title" style={{ textAlign: 'center' }}>{t.council.voting}</Text>
            <Text v="small" style={{ textAlign: 'center' }}>{t.council.votingHint}</Text>
            {c.progress && <Text v="small" style={{ textAlign: 'center' }}>{t.council.waitingVotes(c.progress.cast, c.progress.total)}</Text>}
            {alive && !locked && (
              <>
                <TargetList pub={pub} options={c.candidates} exclude={[me?.id ?? '']} selected={pick} onSelect={setPick} />
                <Button label={t.council.confirm} disabled={!pick} busy={busy} onPress={async () => { if (pick && (await act({ type: 'vote', target: pick }))) setLocked(true); }} />
              </>
            )}
            {alive && locked && <Text v="title" style={{ textAlign: 'center', color: colors.fire400 }}>{t.council.locked}</Text>}
          </>
        )}

        {c.step === 'showdown' && (
          <Center>
            <Animated.View style={{ opacity: reduce ? 1 : fade, alignItems: 'center', minHeight: 140, justifyContent: 'center' }} accessibilityLiveRegion="assertive">
              <Text v="huge" style={{ fontSize: beat === 3 ? 64 : 88, lineHeight: 96, color: beat === 3 ? colors.ember400 : colors.ivory100 }}>
                {beat === null ? '…' : t.council.countdown[beat]}
              </Text>
            </Animated.View>
            {beat === 3 && <Text v="title">{t.council.pointNow}</Text>}
            {beat === null && <Text v="small">{t.council.locked}</Text>}
          </Center>
        )}

        {c.step === 'tiebreak' && (
          <>
            <Text v="title" style={{ textAlign: 'center' }}>{t.council.tiebreak}</Text>
            {isSpeaker && alive ? (
              <>
                <Text v="small" style={{ textAlign: 'center' }}>{t.council.tiebreakSpeaker}</Text>
                <TargetList pub={pub} options={c.tied ?? []} selected={pick} onSelect={setPick} />
                <Button label={t.council.decide} disabled={!pick} busy={busy} onPress={() => pick && void act({ type: 'decide_tie', target: pick })} />
              </>
            ) : (
              <Text v="small" style={{ textAlign: 'center' }}>{t.council.tiebreakWait}</Text>
            )}
            <Tally pub={pub} />
          </>
        )}

        {c.step === 'result' && (
          <Center>
            <Text v="small">{t.council.result}</Text>
            <Text v="display" style={{ textAlign: 'center', fontSize: 40, lineHeight: 46, color: colors.ember400 }} accessibilityLiveRegion="polite">
              {name(c.banished)} {t.council.banished}
            </Text>
            <Tally pub={pub} />
          </Center>
        )}
        <Err code={error} />
      </Pad>
    </Backdrop>
  );
}

function Tally({ pub }: Props) {
  const c = pub.council!;
  if (!c.tally) return null;
  const rows = Object.entries(c.tally).sort((a, b) => b[1] - a[1]);
  return (
    <Card style={{ gap: space.sm }}>
      {rows.map(([id, n]) => (
        <View key={id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text>{pub.players.find((p) => p.id === id)?.name}</Text>
          <Text v="label">{t.council.votes(n)}</Text>
        </View>
      ))}
    </Card>
  );
}

// ───────── Dämmerung / Morgen (Bestätigung im Klassik-Modus) ─────────
export function DuskStage({ pub }: Props) {
  const { alive } = useMe();
  const { act, busy, error } = useAct();
  const [ready, setReady] = useState(false);
  return (
    <Backdrop tone="night">
      <Pad>
        <Center>
          <PhaseRing pub={pub} />
          <Text v="small">{t.phaseHint.dusk}</Text>
        </Center>
        <PlayersGrid pub={pub} />
        {alive && <Button label={ready ? t.dash.readyWithdraw : t.dash.readyNight} busy={busy} onPress={async () => { if (await act({ type: 'ready', topic: 'advance', value: !ready })) setReady(!ready); }} />}
        <Err code={error} />
      </Pad>
    </Backdrop>
  );
}

export function NightStage({ pub }: Props) {
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 3200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.6, duration: 3200, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, reduce]);
  return (
    <Backdrop tone="night">
      <Pad>
        <Center>
          <Animated.View style={{ opacity: reduce ? 1 : pulse }}><PhaseRing pub={pub} /></Animated.View>
          <Text v="display" style={{ textAlign: 'center' }}>{t.night.title}</Text>
          <Text v="small" style={{ textAlign: 'center' }}>{t.night.hint}</Text>
        </Center>
      </Pad>
    </Backdrop>
  );
}

export function MorningStage({ pub }: Props) {
  const { alive } = useMe();
  const { act, busy, error } = useAct();
  const [ready, setReady] = useState(false);
  const deaths = (pub.morningDeaths ?? []).map((id) => pub.players.find((p) => p.id === id)?.name ?? '');
  return (
    <Pad>
      <Center>
        <PhaseRing pub={pub} />
        <Text v="display" style={{ textAlign: 'center' }}>{t.phase.morning}</Text>
        <Text style={{ textAlign: 'center' }}>{deaths.length ? t.morning.some : t.morning.none}</Text>
        {deaths.map((n) => <Text key={n} v="title" style={{ color: colors.ember400 }}>{n}</Text>)}
      </Center>
      <PlayersGrid pub={pub} />
      {alive && pub.advance && <Button label={ready ? t.dash.readyWithdraw : t.dash.readyDay} busy={busy} onPress={async () => { if (await act({ type: 'ready', topic: 'advance', value: !ready })) setReady(!ready); }} />}
      <Err code={error} />
    </Pad>
  );
}

export function EndStage({ pub }: Props) {
  return (
    <Backdrop tone="night">
      <Pad>
        <Center>
          <Hearth size={140} />
          <Text v="display" style={{ textAlign: 'center' }}>{t.ended.title}</Text>
          <Text v="title" style={{ color: colors.fire400 }}>{pub.winner === 'village' ? t.ended.village : t.ended.pack}</Text>
        </Center>
        <Card style={{ gap: space.sm }}>
          <Text v="label">{t.ended.roles}</Text>
          {(pub.reveal ?? []).map((r) => {
            const p = pub.players.find((x) => x.id === r.id);
            return (
              <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: p?.alive ? colors.ivory100 : colors.ash500 }}>{p?.name}</Text>
                <Text v="small">{roleNames[r.role]}</Text>
              </View>
            );
          })}
        </Card>
      </Pad>
    </Backdrop>
  );
}
