import type { PublicPlayer, PublicView } from '@dorf/engine';
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { saveNote } from '../lib/api';
import { usePrivate } from '../lib/private';
import { useRoom } from '../lib/room';
import { supabase } from '../lib/supabase';
import { Button, Card, Text } from '../ui/primitives';
import { roleNames, t } from '../ui/strings';
import { colors, radius, space } from '../ui/theme';
import { PlayerAvatar, PlayersGrid, VillageSummary } from './parts';

/** Spieler-Tab: Raster; Tipp auf eine Person öffnet das Profil mit privaten Notizen (nur nach PIN-Entsperrung). */
export function PlayersTab({ pub }: { pub: PublicView }) {
  const [sel, setSel] = useState<string | null>(null);
  const player = pub.players.find((p) => p.id === sel);
  if (player) return <ProfileSheet player={player} onBack={() => setSel(null)} />;
  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <Text v="display" accessibilityRole="header">{t.players.title}</Text>
      <VillageSummary pub={pub} />
      <PlayersGrid pub={pub} columns={4} onPick={setSel} selectable={pub.players.map((p) => p.id)} />
    </ScrollView>
  );
}

function ProfileSheet({ player, onBack }: { player: PublicPlayer; onBack: () => void }) {
  const { pub } = useRoom();
  const p = player.profile;
  const status = player.alive ? t.profile.alive : t.profile.out;
  const rows: [string, string][] = [
    [t.profile.ageLabel, t.profile.age(p.age)],
    [t.profile.gender, t.profile.genders[p.gender]],
    [t.profile.hair, t.profile.hairs[p.hair]],
    [t.profile.eyes, t.profile.eyesOpts[p.eyes]],
    [t.profile.status, player.revealed ? `${status} · ${t.reveal.faction[player.revealed.faction]} · ${roleNames[player.revealed.role]}` : status],
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <Button variant="ghost" label={t.common.back} onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <PlayerAvatar id={player.id} name={player.name} alive={player.alive} speaker={player.isSpeaker} size={112} />
        <Text v="display" accessibilityRole="header">{player.name}</Text>
      </View>
      <Card style={{ gap: space.sm }}>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text v="small">{k}</Text>
            <Text>{v}</Text>
          </View>
        ))}
      </Card>
      {pub && <Notes about={player.id} />}
    </ScrollView>
  );
}

/** Private Notizen: serverseitig nur für den Verfasser und nur bei entsperrter PIN lesbar. */
function Notes({ about }: { about: string }) {
  const { unlocked } = usePrivate();
  const { roomId, me } = useRoom();
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!unlocked || !me) { setBody(''); return; }
    void supabase.from('player_notes').select('body').eq('owner_player_id', me.id).eq('about_player_id', about).maybeSingle()
      .then(({ data }) => setBody((data as { body?: string } | null)?.body ?? ''));
  }, [unlocked, me, about]);
  if (me?.id === about) return null;
  return (
    <Card style={{ gap: space.sm }}>
      <Text v="label">{t.profile.notes}</Text>
      <Text v="small">{t.profile.notesHint}</Text>
      {!unlocked ? (
        <Text v="small">{t.profile.notesLocked}</Text>
      ) : (
        <>
          <TextInput accessibilityLabel={t.profile.notes} multiline maxLength={2000} value={body} onChangeText={(v) => { setBody(v); setSaved(false); }}
            style={{ minHeight: 96, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.night800, color: colors.ivory100, padding: space.md, textAlignVertical: 'top' }} />
          <Button variant="secondary" label={saved ? t.profile.noteSaved : t.profile.noteSave} onPress={async () => { await saveNote(roomId, about, body).catch(() => {}); setSaved(true); }} />
        </>
      )}
    </Card>
  );
}
