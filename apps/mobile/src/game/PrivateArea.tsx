import type { ActionSpec, PrivateView, PublicView } from '@dorf/engine';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRoom } from '../lib/room';
import { usePrivate } from '../lib/private';
import { Button, Card, Text } from '../ui/primitives';
import { roleNames, roleText, t } from '../ui/strings';
import { colors, space } from '../ui/theme';
import { PinGate } from './PinGate';
import { TargetList } from './parts';
import { useAct } from './useAct';

/**
 * Alle Rollen nutzen dieselbe äußere Struktur (STYLE_GUIDE §9): Rollenkarte, Hinweise, Aktion.
 * Keine Rollenfarbe, kein auffälliges Rudel-Layout.
 */
export function PrivateArea({ pub }: { pub: PublicView }) {
  return (
    <PinGate title={t.private.title}>
      <PrivateBody pub={pub} />
    </PinGate>
  );
}

const nameOf = (pub: PublicView, id: string) => pub.players.find((p) => p.id === id)?.name ?? '?';

function PrivateBody({ pub }: { pub: PublicView }) {
  const { data, lock } = usePrivate();
  if (!data) return <Text style={{ padding: space.xl }}>{t.common.loading}</Text>;
  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text v="display" accessibilityRole="header">{t.private.title} 🔒</Text>
        <Button variant="ghost" label={t.private.lock} onPress={lock} />
      </View>

      <Card style={{ gap: space.sm }}>
        <Text v="label">{t.private.role}</Text>
        <Text v="display" style={{ fontSize: 30 }}>{roleNames[data.role]}</Text>
        <Text>{roleText[data.role]}</Text>
      </Card>

      {data.sidePending && <SideChoice />}
      {data.packMates.length > 0 && (
        <Card style={{ gap: space.xs }}>
          <Text v="label">{t.private.packMates}</Text>
          {data.packMates.map((m) => (
            <Text key={m.id} style={{ color: m.alive ? colors.ivory100 : colors.ash500, textDecorationLine: m.alive ? 'none' : 'line-through' }}>{m.name}</Text>
          ))}
        </Card>
      )}
      {data.lastShot && <LastShot pub={pub} data={data} />}
      {data.packTarget && data.alive && <PackTarget pub={pub} data={data} />}
      <NightAction pub={pub} data={data} />
      <Notes pub={pub} data={data} />
    </ScrollView>
  );
}

function SideChoice() {
  const { act, busy } = useAct();
  return (
    <Card style={{ gap: space.md }}>
      <Text v="label">{t.private.side}</Text>
      <Button variant="secondary" label={t.private.sideVillage} busy={busy} onPress={() => void act({ type: 'choose_side', side: 'village' })} />
      <Button variant="secondary" label={t.private.sidePack} busy={busy} onPress={() => void act({ type: 'choose_side', side: 'pack' })} />
    </Card>
  );
}

function LastShot({ pub, data }: { pub: PublicView; data: PrivateView }) {
  const { act, busy } = useAct();
  const [pick, setPick] = useState<string | null>(data.lastShot?.chosen ?? null);
  if (!data.lastShot?.open) return null;
  return (
    <Card style={{ gap: space.md }}>
      <Text v="label">{t.private.lastShot}</Text>
      <Text v="small">{t.private.lastShotHint}</Text>
      <TargetList pub={pub} options={data.lastShot.targets} selected={pick} onSelect={setPick} />
      <Button label={t.private.send} disabled={!pick} busy={busy} onPress={() => pick && void act({ type: 'hunter_shoot', target: pick })} />
    </Card>
  );
}

function PackTarget({ pub, data }: { pub: PublicView; data: PrivateView }) {
  const { act, busy } = useAct();
  const [pick, setPick] = useState<string | null>(data.packTarget?.mine ?? null);
  if (pub.phase !== 'day' && pub.phase !== 'dusk' && pub.phase !== 'night') return null;
  return (
    <Card style={{ gap: space.md }}>
      <Text v="label">{t.private.packTarget}</Text>
      <TargetList pub={pub} options={data.packTarget!.candidates} selected={pick} onSelect={setPick} />
      <Button label={t.private.send} disabled={!pick} busy={busy} onPress={() => pick && void act({ type: 'pack_target', target: pick })} />
      {data.packTarget!.leading.length > 0 && <Text v="small">{data.packTarget!.leading.map((id) => nameOf(pub, id)).join(', ')}</Text>}
    </Card>
  );
}

function NightAction({ pub, data }: { pub: PublicView; data: PrivateView }) {
  if (pub.phase !== 'night' || !data.alive) return null;
  const spec = data.nightAction;
  return (
    <Card style={{ gap: space.md }}>
      <Text v="label">{t.private.action}</Text>
      {spec ? <ActionForm pub={pub} spec={spec} chosen={data.currentNightChoice} /> : <Text v="small">{t.private.nothing}</Text>}
    </Card>
  );
}

function ActionForm({ pub, spec, chosen }: { pub: PublicView; spec: ActionSpec; chosen: PrivateView['currentNightChoice'] }) {
  const { act, busy } = useAct();
  const [single, setSingle] = useState<string | null>(chosen && 'target' in chosen ? (chosen.target ?? null) : null);
  const [group, setGroup] = useState<string[]>(chosen?.kind === 'track' ? chosen.targets : []);
  const [protect, setProtect] = useState<string | null>(chosen?.kind === 'alchemist' ? (chosen.protect ?? null) : null);
  const [strike, setStrike] = useState<string | null>(chosen?.kind === 'alchemist' ? (chosen.strike ?? null) : null);
  const [veil, setVeil] = useState(chosen?.kind === 'veil');

  switch (spec.kind) {
    case 'scout':
      return (
        <>
          <Text v="small">{t.private.pickTarget}</Text>
          <TargetList pub={pub} options={spec.targets} selected={single} onSelect={setSingle} />
          <Button label={t.private.send} disabled={!single} busy={busy} onPress={() => single && void act({ type: 'night_action', action: { kind: 'scout', target: single } })} />
        </>
      );
    case 'protect':
      return (
        <>
          <Text v="small">{t.private.pickTarget}</Text>
          <TargetList pub={pub} options={spec.targets} exclude={spec.forbidden ? [spec.forbidden] : []} selected={single} onSelect={setSingle} />
          <Button label={t.private.send} disabled={!single} busy={busy} onPress={() => single && void act({ type: 'night_action', action: { kind: 'protect', target: single } })} />
        </>
      );
    case 'track':
      return (
        <>
          <Text v="small">{`${t.private.pickTarget} (${group.length}/${spec.groupSize})`}</Text>
          <View style={{ gap: space.sm }}>
            {spec.targets.map((id) => (
              <Button key={id} variant={group.includes(id) ? 'primary' : 'secondary'} label={nameOf(pub, id)}
                onPress={() => setGroup((g) => (g.includes(id) ? g.filter((x) => x !== id) : g.length < spec.groupSize ? [...g, id] : g))} />
            ))}
          </View>
          <Button label={t.private.send} disabled={group.length !== spec.groupSize} busy={busy} onPress={() => void act({ type: 'night_action', action: { kind: 'track', targets: group } })} />
        </>
      );
    case 'alchemist':
      return (
        <>
          {spec.protectLeft > 0 && (<><Text v="small">Schutztrank</Text><TargetList pub={pub} options={spec.targets} selected={protect} onSelect={setProtect} /></>)}
          {spec.strikeLeft > 0 && (<><Text v="small">Offensiver Trank</Text><TargetList pub={pub} options={spec.targets} selected={strike} onSelect={setStrike} /></>)}
          <Button label={t.private.send} disabled={!protect && !strike} busy={busy}
            onPress={() => void act({ type: 'night_action', action: { kind: 'alchemist', protect: protect ?? undefined, strike: strike ?? undefined } })} />
        </>
      );
    case 'veil':
      return (
        <Button label={veil ? t.private.chosen : 'Schleier legen'} variant={veil ? 'secondary' : 'primary'} busy={busy}
          onPress={async () => { if (await act({ type: 'night_action', action: { kind: 'veil' } })) setVeil(true); }} />
      );
  }
}

function Notes({ pub, data }: { pub: PublicView; data: PrivateView }) {
  const items = data.notes.filter((n) => n.kind !== 'role').slice().reverse();
  if (items.length === 0) return null;
  return (
    <Card style={{ gap: space.md }}>
      <Text v="label">{t.private.notes}</Text>
      {items.map((n) => {
        const d = n.data as Record<string, unknown>;
        let line = '';
        if (n.kind === 'scout_result') {
          line = d.unclear ? `${nameOf(pub, String(d.target))}: Das Ergebnis bleibt unklar.` : `${nameOf(pub, String(d.target))} gehört zum ${d.faction === 'pack' ? 'Rudel' : 'Dorf'}.`;
        } else if (n.kind === 'track_result') {
          const names = (d.targets as string[]).map((id) => nameOf(pub, id)).join(', ');
          line = d.unclear ? `${names}: Das Ergebnis bleibt unklar.` : `${names}: ${d.packPresent ? 'Mindestens ein Rudelmitglied ist dabei.' : 'Hier ist kein Rudelmitglied.'}`;
        } else if (n.kind === 'role_gained') {
          line = `Du hast eine neue Rolle erhalten: ${roleNames[d.role as keyof typeof roleNames]}.`;
        }
        return line ? <Text key={n.id}>{`Tag ${n.day} · ${line}`}</Text> : null;
      })}
    </Card>
  );
}

export const usePrivateData = () => usePrivate().data;
export { useRoom };
