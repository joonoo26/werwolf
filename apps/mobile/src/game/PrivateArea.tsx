import type { AbilitySpec, PrivateView, PublicView } from '@dorf/engine';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRoom } from '../lib/room';
import { usePrivate } from '../lib/private';
import { Button, Card, Text } from '../ui/primitives';
import { abilityName, roleNames, roleText, t } from '../ui/strings';
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
  return (
    <View style={{ gap: space.lg }}>
      {data.abilities.length === 0 ? (
        <Card style={{ gap: space.md }}>
          <Text v="label">{t.private.action}</Text>
          <Text v="small">{t.private.nothing}</Text>
        </Card>
      ) : (
        data.abilities.map((spec) => (
          <Card key={spec.id} style={{ gap: space.md }}>
            <Text v="label">{abilityName(spec.id, spec.kind)}</Text>
            <AbilityForm pub={pub} spec={spec} />
          </Card>
        ))
      )}
    </View>
  );
}

/** Eine Fähigkeit. Art und Parameter kommen aus der Rollen-Konfiguration, nicht aus der UI. */
function AbilityForm({ pub, spec }: { pub: PublicView; spec: AbilitySpec }) {
  const { act, busy } = useAct();
  const [single, setSingle] = useState<string | null>(spec.choice?.target ?? null);
  const [group, setGroup] = useState<string[]>(spec.choice?.targets ?? []);
  const [done, setDone] = useState(spec.kind === 'veil' && !!spec.choice);
  const send = (extra: { target?: string; targets?: string[] }) => act({ type: 'night_action', ability: spec.id, ...extra });

  if (spec.kind === 'veil') {
    return <Button label={done ? t.private.chosen : abilityName(spec.id, spec.kind)} variant={done ? 'secondary' : 'primary'} busy={busy}
      onPress={async () => { if (await send({})) setDone(true); }} />;
  }
  if (spec.kind === 'inspect_group') {
    const size = spec.groupSize ?? 3;
    return (
      <>
        <Text v="small">{`${t.private.pickTarget} (${group.length}/${size})`}</Text>
        <View style={{ gap: space.sm }}>
          {spec.targets.map((id) => (
            <Button key={id} variant={group.includes(id) ? 'primary' : 'secondary'} label={nameOf(pub, id)}
              onPress={() => setGroup((g) => (g.includes(id) ? g.filter((x) => x !== id) : g.length < size ? [...g, id] : g))} />
          ))}
        </View>
        <Button label={t.private.send} disabled={group.length !== size} busy={busy} onPress={() => void send({ targets: group })} />
      </>
    );
  }
  return (
    <>
      <Text v="small">{t.private.pickTarget}</Text>
      <TargetList pub={pub} options={spec.targets} exclude={spec.forbidden ? [spec.forbidden] : []} selected={single} onSelect={setSingle} />
      <Button label={t.private.send} disabled={!single} busy={busy} onPress={() => single && void send({ target: single })} />
    </>
  );
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
        if (n.kind === 'inspect_result') {
          line = d.unclear ? `${nameOf(pub, String(d.target))}: Das Ergebnis bleibt unklar.` : `${nameOf(pub, String(d.target))} gehört zum ${d.faction === 'pack' ? 'Rudel' : 'Dorf'}.`;
        } else if (n.kind === 'group_result') {
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
