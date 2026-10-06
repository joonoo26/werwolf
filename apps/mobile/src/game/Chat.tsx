import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { markRead, openDm, sendMessage } from '../lib/api';
import { usePrivate } from '../lib/private';
import { useRoom } from '../lib/room';
import { supabase } from '../lib/supabase';
import { Avatar, Button, Text } from '../ui/primitives';
import { t } from '../ui/strings';
import { colors, fonts, MIN_TOUCH, radius, space } from '../ui/theme';
import { PinGate } from './PinGate';

interface Msg { id: number; channel_id: string; sender_player_id: string; body: string; created_at: string }
interface Member { channel_id: string; player_id: string; active: boolean }

/** Nachrichten: DMs und (für Berechtigte) ein gemeinsamer Kanal – optisch ununterscheidbar eingebettet. */
export function Messages() {
  return (
    <PinGate title={t.chat.title}>
      <ChatBody />
    </PinGate>
  );
}

function ChatBody() {
  const { roomId, me, players } = useRoom();
  const { unlocked } = usePrivate();
  const [members, setMembers] = useState<Member[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    const [m, c] = await Promise.all([
      supabase.from('messages').select('id,channel_id,sender_player_id,body,created_at').order('id'),
      supabase.from('channel_members').select('channel_id,player_id,active'),
    ]);
    if (m.data) setMsgs(m.data as Msg[]);
    if (c.data) setMembers(c.data as Member[]);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    void load();
    const ch = supabase
      .channel(`chat:${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_members' }, () => void load())
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [unlocked, roomId, load]);

  const channels = useMemo(() => {
    const ids = [...new Set(members.map((m) => m.channel_id))];
    return ids.map((id) => {
      const others = members.filter((m) => m.channel_id === id && m.player_id !== me?.id).map((m) => players.find((p) => p.id === m.player_id)?.name ?? '?');
      const list = msgs.filter((x) => x.channel_id === id);
      return { id, title: others.length > 1 ? others.join(', ') : (others[0] ?? t.chat.group), last: list[list.length - 1] };
    }).sort((a, b) => (b.last?.id ?? 0) - (a.last?.id ?? 0));
  }, [members, msgs, players, me]);

  if (open) {
    const ch = channels.find((c) => c.id === open);
    return <Thread channelId={open} title={ch?.title ?? ''} msgs={msgs.filter((m) => m.channel_id === open)} onBack={() => setOpen(null)} />;
  }

  if (picking) {
    return (
      <View style={{ flex: 1, padding: space.xl, gap: space.md }}>
        <Text v="display">{t.chat.newChat}</Text>
        {players.filter((p) => p.alive && p.id !== me?.id).map((p) => (
          <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={p.name} onPress={async () => { const id = await openDm(roomId, p.id); await load(); setPicking(false); setOpen(id); }}
            style={{ minHeight: MIN_TOUCH + 12, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar name={p.name} size={40} /><Text>{p.name}</Text>
          </Pressable>
        ))}
        <Button variant="ghost" label={t.common.back} onPress={() => setPicking(false)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: space.xl, gap: space.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text v="display" accessibilityRole="header">{t.chat.title}</Text>
        {me?.alive && <Button variant="secondary" label={t.chat.newChat} onPress={() => setPicking(true)} />}
      </View>
      {channels.length === 0 ? <Text v="small">{t.chat.empty}</Text> : (
        <FlatList data={channels} keyExtractor={(c) => c.id} contentContainerStyle={{ gap: space.sm }} renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.last?.body ?? ''}`} onPress={() => setOpen(item.id)}
            style={{ minHeight: MIN_TOUCH + 16, padding: space.md, borderRadius: radius.md, backgroundColor: colors.night800, gap: 2 }}>
            <Text v="title" style={{ fontSize: 17 }}>{item.title}</Text>
            <Text v="small" numberOfLines={1}>{item.last?.body ?? ''}</Text>
          </Pressable>
        )} />
      )}
    </View>
  );
}

function Thread({ channelId, title, msgs, onBack }: { channelId: string; title: string; msgs: Msg[]; onBack: () => void }) {
  const { roomId, me, players } = useRoom();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  useEffect(() => { void markRead(channelId).catch(() => {}); }, [channelId, msgs.length]);
  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true); setErr(false);
    try { await sendMessage(roomId, channelId, body); setText(''); } catch { setErr(true); } finally { setBusy(false); }
  };
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '';
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: space.md, gap: space.sm }}>
        <Button variant="ghost" label={t.common.back} onPress={onBack} />
        <Text v="title" style={{ flex: 1 }}>{title}</Text>
      </View>
      <FlatList data={[...msgs].reverse()} inverted keyExtractor={(m) => String(m.id)} contentContainerStyle={{ padding: space.lg, gap: space.sm }}
        renderItem={({ item }) => {
          const mine = item.sender_player_id === me?.id;
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: mine ? '#241C1A' : colors.night800, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: mine ? 'rgba(184,69,50,0.35)' : colors.line }}>
              {!mine && <Text v="small" style={{ color: colors.fire400 }}>{nameOf(item.sender_player_id)}</Text>}
              <Text>{item.body}</Text>
              <Text v="small" style={{ fontSize: 11, color: colors.ash500, alignSelf: 'flex-end' }}>{new Date(item.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          );
        }} />
      {err && <Text v="small" style={{ color: colors.ember400, paddingHorizontal: space.lg }}>{t.common.error}</Text>}
      <View style={{ flexDirection: 'row', gap: space.sm, padding: space.md, alignItems: 'center' }}>
        <TextInput accessibilityLabel={t.chat.placeholder} value={text} onChangeText={setText} placeholder={t.chat.placeholder} placeholderTextColor={colors.ash500} multiline maxLength={1000}
          style={{ flex: 1, minHeight: MIN_TOUCH, maxHeight: 120, borderRadius: radius.lg, backgroundColor: colors.night800, color: colors.ivory100, paddingHorizontal: space.lg, paddingVertical: space.sm, fontFamily: fonts.ui, fontSize: 16 }} />
        <Button label={t.chat.send} busy={busy} disabled={!text.trim()} onPress={() => void send()} />
      </View>
    </KeyboardAvoidingView>
  );
}
