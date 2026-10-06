import { useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { leaveRoom, removePlayer, setReady, startGame, errorText } from '../lib/api';
import { useRoom } from '../lib/room';
import { Avatar, Backdrop, Button, Card, Text } from '../ui/primitives';
import { t } from '../ui/strings';
import { colors, space } from '../ui/theme';

export function Lobby({ onLeave }: { onLeave: () => void }) {
  const { room, players, me, roomId, userId, refresh } = useRoom();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!room || !me) return <Backdrop><Text style={{ padding: space.xl }}>{t.common.loading}</Text></Backdrop>;
  const isHost = room.host_user_id === userId;
  const allReady = players.length >= 6 && players.every((p) => p.ready);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); await refresh(); } catch (e) { setErr(errorText(e, t.errors, t.common.error)); } finally { setBusy(false); }
  };
  return (
    <Backdrop>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xl }}>
        <Text v="display" accessibilityRole="header">{t.lobby.title}</Text>
        <Card style={{ alignItems: 'center', gap: space.md }}>
          <Text v="label">{t.lobby.code}</Text>
          <Text v="huge" accessibilityLabel={`Raumcode ${room.code.split('').join(' ')}`} style={{ letterSpacing: 6 }}>{room.code}</Text>
          <View style={{ backgroundColor: colors.ivory100, padding: 10, borderRadius: 12 }}>
            <QRCode value={`dasdorf://join?code=${room.code}`} size={150} backgroundColor={colors.ivory100} color={colors.night950} />
          </View>
          <Text v="small">{t.lobby.share}</Text>
          <Button variant="ghost" label="Code teilen" onPress={() => void Share.share({ message: `Komm ins Dorf: ${room.code}` })} />
        </Card>
        <View style={{ gap: space.sm }}>
          <Text v="label">{t.lobby.players(players.length)}</Text>
          <Text v="small">{t.lobby.need}</Text>
          {players.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 }}>
              <Avatar name={p.name} size={44} />
              <Text style={{ flex: 1 }}>{p.name}{p.user_id === room.host_user_id ? ' · Host' : ''}</Text>
              <Text v="small" style={{ color: p.ready ? colors.fire400 : colors.ash500 }}>{p.ready ? `✓ ${t.lobby.ready}` : t.lobby.notReady}</Text>
              {isHost && p.id !== me.id && <Button variant="ghost" label={t.lobby.remove} onPress={() => void run(() => removePlayer(roomId, p.id))} />}
            </View>
          ))}
        </View>
        {err && <Text v="small" accessibilityLiveRegion="polite" style={{ color: colors.ember400 }}>{err}</Text>}
        <Button variant={me.ready ? 'secondary' : 'primary'} label={me.ready ? t.lobby.notReady : t.lobby.ready} busy={busy} onPress={() => void run(() => setReady(roomId, !me.ready))} />
        {isHost ? (
          <Button label={allReady ? t.lobby.start : t.lobby.waiting} disabled={!allReady} busy={busy} onPress={() => void run(() => startGame(roomId))} />
        ) : <Text v="small" style={{ textAlign: 'center' }}>{t.lobby.hostOnly}</Text>}
        <Button variant="ghost" label={t.lobby.leave} onPress={() => void run(async () => { await leaveRoom(roomId); onLeave(); })} />
      </ScrollView>
    </Backdrop>
  );
}
