import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chronicle, stageFor } from '../logic/phase';
import { usePrivate } from '../lib/private';
import { useRoom } from '../lib/room';
import { Backdrop, Card, Text } from '../ui/primitives';
import { t } from '../ui/strings';
import { colors, fonts, MIN_TOUCH, space } from '../ui/theme';
import { Text as RNText } from 'react-native';
import { Messages } from './Chat';
import { MomentOverlay } from './MomentOverlay';
import { PlayersTab } from './Players';
import { PrivateArea } from './PrivateArea';
import { CouncilStage, DayStage, DuskStage, EndStage, MorningStage, NightStage, SpeakerStage } from './stages';
import { useAct } from './useAct';
import { RulesText } from '../ui/Rules';
import { Button } from '../ui/primitives';

type Tab = 'village' | 'messages' | 'players' | 'more';

export function GameShell({ onLeave }: { onLeave: () => void }) {
  const { pub, loaded } = useRoom();
  const { unread } = usePrivate();
  const [tab, setTab] = useState<Tab>('village');
  const [privateOpen, setPrivateOpen] = useState(false);
  if (!loaded || !pub) return <Backdrop><Text style={{ padding: space.xl }}>{t.common.loading}</Text></Backdrop>;
  const stage = stageFor(pub);
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'village', label: t.tabs.village },
    { id: 'messages', label: t.tabs.messages, badge: unread },
    { id: 'players', label: t.tabs.players },
    { id: 'more', label: t.tabs.more },
  ];
  return (
    <Backdrop>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.lg }}>
          <Text v="label">{t.appName}</Text>
          <Button variant="ghost" label={`${t.private.title} 🔒`} onPress={() => setPrivateOpen(true)} accessibilityHint="Öffnet deinen PIN-geschützten Bereich" />
        </View>
        <View style={{ flex: 1 }}>
          {privateOpen && <PrivateWrap onBack={() => setPrivateOpen(false)} pub={pub} />}
          {!privateOpen && tab === 'village' && (
            <>
              {stage === 'speaker' && <SpeakerStage pub={pub} />}
              {stage === 'day' && <DayStage pub={pub} />}
              {stage === 'council' && pub.council && <CouncilStage pub={pub} />}
              {stage === 'dusk' && <DuskStage pub={pub} />}
              {stage === 'night' && <NightStage pub={pub} />}
              {stage === 'morning' && <MorningStage pub={pub} />}
              {stage === 'ended' && <EndStage pub={pub} />}
            </>
          )}
          {!privateOpen && tab === 'messages' && <Messages />}
          {!privateOpen && tab === 'players' && <PlayersTab pub={pub} />}
          {!privateOpen && tab === 'more' && <More onLeave={onLeave} />}
          {!privateOpen && null}
          <MomentOverlay moment={pub.moment} />
        </View>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.night900 }}>
          {tabs.map((x) => (
            <Pressable key={x.id} accessibilityRole="tab" accessibilityState={{ selected: tab === x.id }} accessibilityLabel={x.badge ? `${x.label}, ${t.chat.unread(x.badge)}` : x.label}
              onPress={() => setTab(x.id)} style={{ flex: 1, minHeight: MIN_TOUCH + 14, alignItems: 'center', justifyContent: 'center' }}>
              <RNText style={{ fontFamily: tab === x.id ? fonts.uiSemi : fonts.ui, fontSize: 13, letterSpacing: 0.6, color: tab === x.id ? colors.fire400 : colors.ivory300 }}>{x.label}</RNText>
              {!!x.badge && <View style={{ position: 'absolute', top: 6, right: '24%', minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.ember500, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><RNText style={{ color: colors.ivory100, fontSize: 11, fontFamily: fonts.uiSemi }}>{x.badge}</RNText></View>}
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </Backdrop>
  );
}

function More({ onLeave }: { onLeave: () => void }) {
  const { pub, me, room } = useRoom();
  const { act, busy } = useAct();
  const [view, setView] = useState<'menu' | 'private' | 'rules' | 'chronicle'>('menu');
  if (!pub) return null;
  if (view === 'private') return <PrivateWrap onBack={() => setView('menu')} pub={pub} />;
  const Row = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: MIN_TOUCH + 12, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Text v="title" style={{ fontSize: 18 }}>{label}</Text>
    </Pressable>
  );
  if (view === 'rules') return <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.md }}><Button variant="ghost" label={t.common.back} onPress={() => setView('menu')} /><RulesText /></ScrollView>;
  if (view === 'chronicle') return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.md }}>
      <Button variant="ghost" label={t.common.back} onPress={() => setView('menu')} />
      <Text v="display">{t.more.chronicle}</Text>
      {chronicle(pub).slice().reverse().map((l) => <Text key={l.id}>{`Tag ${l.day} · ${l.text}`}</Text>)}
    </ScrollView>
  );
  const isHost = !!me && room?.host_user_id === me.user_id;
  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.md }}>
      <Text v="display" accessibilityRole="header">{t.more.title}</Text>
      <Row label={`${t.private.title} 🔒`} onPress={() => setView('private')} />
      <Row label={t.more.chronicle} onPress={() => setView('chronicle')} />
      <Row label={t.more.rules} onPress={() => setView('rules')} />
      <Row label={t.more.leave} onPress={onLeave} />
      {isHost && pub.phase !== 'ended' && (
        <Card style={{ gap: space.sm, marginTop: space.lg }}>
          <Text v="label">{t.more.emergency}</Text>
          <Text v="small">{t.more.emergencyHint}</Text>
          <Button variant="secondary" label={t.more.emergencyDo} busy={busy} onPress={() => void act({ type: 'tick', force: true })} />
        </Card>
      )}
    </ScrollView>
  );
}

function PrivateWrap({ onBack, pub }: { onBack: () => void; pub: NonNullable<ReturnType<typeof useRoom>['pub']> }) {
  return (
    <View style={{ flex: 1 }}>
      <Button variant="ghost" label={t.common.back} onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <PrivateArea pub={pub} />
    </View>
  );
}
