import type { Moment, PublicView } from '@dorf/engine';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { usePrivate } from '../lib/private';
import { useNow } from '../lib/useNow';
import { Button, Card, Text, haptic, useReduceMotion } from '../ui/primitives';
import { playCue } from '../ui/sound';
import { impulseText, neutralText, roleNames, roleText, t } from '../ui/strings';
import { colors, motion, space } from '../ui/theme';
import { PinGate } from './PinGate';
import { HealPrompt, SideChoice } from './PrivateArea';

/** Öffentlicher Text eines Moments – für alle Geräte identisch. */
export function momentCopy(m: Moment): { title: string; body: string } {
  switch (m.kind) {
    case 'start': {
      const bw = m.announced?.includes('borderwalker');
      return { title: t.moment.start.title, body: bw ? `${t.moment.start.body}\n\n${t.moment.borderwalkerAnnounced.title}.\n${t.moment.borderwalkerAnnounced.body}` : t.moment.start.body };
    }
    case 'quest_unlock':
      return { title: t.moment.questUnlock.title, body: `${t.moment.questUnlock.body}${m.role ? `\n${t.moment.questUnlock.who(roleNames[m.role])}` : ''}` };
    case 'borderwalker_decided':
      return t.moment.borderwalkerDecided;
    case 'pack_decided':
      return t.moment.packDecided;
    case 'hint':
      return { title: t.moment.neutral.title, body: m.textKey ? impulseText(m.textKey) : t.moment.neutral.body };
    default:
      return t.moment.neutral;
  }
}

/**
 * Synchroner Moment: alle Geräte zeigen gleichzeitig denselben Text mit gleicher Dauer, Haptik und Klang-Cue.
 * Wer den Moment auf dem Handy sieht, öffnet denselben PIN-geschützten Bereich – auch wer nicht betroffen ist.
 * Die Dorfanzeige (`display`) zeigt nur den öffentlichen Teil.
 */
export function MomentOverlay({ moment, display = false }: { moment: PublicView['moment']; display?: boolean }) {
  const now = useNow(300);
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState<number | null>(null);
  const [closed, setClosed] = useState<number | null>(null);
  const cued = useRef<number | null>(null);
  const within = !!moment && now >= moment.at - 1500 && now < moment.showUntil;
  const panelOpen = !!moment && open === moment.id;
  const active = !!moment && closed !== moment.id && (within || panelOpen);

  useEffect(() => {
    if (!moment || !active || cued.current === moment.id) return;
    cued.current = moment.id;
    haptic('light');
    playCue('moment');
    Animated.timing(fade, { toValue: 1, duration: reduce ? 0 : motion.cinematic, useNativeDriver: true }).start();
  }, [moment, active, fade, reduce]);

  if (!moment || !active) return null;
  const copy = momentCopy(moment);
  const secret = moment.secret && !display;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: reduce ? 1 : fade, backgroundColor: colors.scrim }]} accessibilityViewIsModal accessibilityLiveRegion="polite">
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.xl }}>
        <View style={{ gap: space.md, alignItems: 'center', maxWidth: 460 }}>
          <Text v="display" style={{ textAlign: 'center' }}>{copy.title}</Text>
          <Text style={{ textAlign: 'center', color: colors.ivory300 }}>{copy.body}</Text>
        </View>
        {secret && !panelOpen && <Button label={t.moment.privateTitle} onPress={() => setOpen(moment.id)} accessibilityHint={t.moment.privateHint} />}
        {secret && panelOpen && (
          <View style={{ width: '100%', maxWidth: 460, gap: space.lg }}>
            <SecretSection moment={moment} />
            <Button variant="ghost" label={t.moment.close} onPress={() => { setClosed(moment.id); setOpen(null); }} />
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

function SecretSection({ moment }: { moment: Moment }) {
  const { relock } = usePrivate();
  useEffect(() => { relock(); }, [moment.id, relock]); // frische PIN-Eingabe bei jedem geheimen Moment
  return (
    <PinGate title={t.moment.privateTitle}>
      <SecretPanel moment={moment} />
    </PinGate>
  );
}

function SecretPanel({ moment }: { moment: Moment }) {
  const { data } = usePrivate();
  const panel = data?.panel;
  if (!data || !panel || panel.momentId !== moment.id) return <Text style={{ textAlign: 'center' }}>{t.common.loading}</Text>;
  switch (panel.kind) {
    case 'role_info':
      return (
        <Card style={{ gap: space.sm }}>
          <Text v="label">{t.private.role}</Text>
          <Text v="display" style={{ fontSize: 30 }}>{roleNames[data.role]}</Text>
          <Text>{roleText[data.role]}</Text>
          {data.packMates.length > 0 && <Text v="small">{`${t.private.packMates}: ${data.packMates.map((m) => m.name).join(', ')}`}</Text>}
          {data.sidePending && <SideChoice />}
        </Card>
      );
    case 'you_are':
      return (
        <Card style={{ gap: space.sm }}>
          <Text v="display" style={{ fontSize: 28 }}>{t.moment.youAreArticle[panel.role] ?? t.moment.youAre(roleNames[panel.role])}</Text>
          <Text>{roleText[panel.role]}</Text>
        </Card>
      );
    case 'chose':
      return <Card><Text>{t.moment.chose(panel.faction)}</Text></Card>;
    case 'heal_prompt':
      return <HealPrompt victim={panel.victim} decided={panel.decided} />;
    default:
      return <Card><Text style={{ textAlign: 'center' }}>{neutralText(moment.kind, panel.variant)}</Text></Card>;
  }
}
