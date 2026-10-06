import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { createRoom, errorText } from '../lib/api';
import { uploadPhoto } from '../lib/photos';
import { saveSession } from '../lib/storage';
import { ensureSession } from '../lib/supabase';
import { isValidPin, normalizePin } from '../logic/lock';
import { ProfileForm, emptyProfile, profileValid, type ProfileDraft } from '../ui/ProfileForm';
import { Button, Field, Screen, Text } from '../ui/primitives';
import { t } from '../ui/strings';
import { colors, MIN_TOUCH, radius, space } from '../ui/theme';

export default function Create() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'classic' | 'evening'>('classic');
  const [hours, setHours] = useState(3);
  const [profile, setProfile] = useState<ProfileDraft>(emptyProfile);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ok = name.trim().length > 0 && isValidPin(pin) && profileValid(profile);
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await ensureSession();
      const r = await createRoom(name.trim(), pin, { age: Number(profile.age), gender: profile.gender!, hair: profile.hair!, eyes: profile.eyes! }, mode, hours * 60);
      if (profile.photoB64) await uploadPhoto(r.room_id, r.player_id, profile.photoB64);
      await saveSession({ roomId: r.room_id, code: r.code });
      router.replace(`/room/${r.room_id}`);
    } catch (e) { setErr(errorText(e, t.errors, t.common.error)); } finally { setBusy(false); }
  };
  const Choice = ({ id, label, hint }: { id: 'classic' | 'evening'; label: string; hint: string }) => (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: mode === id }} onPress={() => setMode(id)}
      style={{ padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: mode === id ? colors.ember500 : colors.line, backgroundColor: colors.night800, gap: 4, minHeight: MIN_TOUCH + 20 }}>
      <Text v="title">{label}</Text><Text v="small">{hint}</Text>
    </Pressable>
  );
  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xl }} keyboardShouldPersistTaps="handled">
          <Button variant="ghost" label={t.common.back} onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
          <Text v="display" accessibilityRole="header">{t.create.title}</Text>
          <Field label={t.create.name} value={name} onChangeText={setName} maxLength={20} autoCapitalize="words" />
          <Field label={t.create.pin} value={pin} onChangeText={(v) => setPin(normalizePin(v))} secure keyboardType="number-pad" maxLength={6} hint={t.create.pinHint} />
          <ProfileForm value={profile} onChange={setProfile} name={name} />
          <View style={{ gap: space.md }}>
            <Choice id="classic" label={t.create.classic} hint={t.create.classicHint} />
            <Choice id="evening" label={t.create.evening} hint={t.create.eveningHint} />
          </View>
          {mode === 'evening' && (
            <View style={{ gap: space.sm }}>
              <Text v="label">{t.create.duration}</Text>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {[2, 3, 4, 5].map((h) => (
                  <Button key={h} style={{ flex: 1, paddingHorizontal: 0 }} variant={hours === h ? 'primary' : 'secondary'} label={t.create.hours(h)} onPress={() => setHours(h)} />
                ))}
              </View>
            </View>
          )}
          {err && <Text v="small" accessibilityLiveRegion="polite" style={{ color: colors.ember400 }}>{err}</Text>}
          <Button label={t.create.submit} disabled={!ok} busy={busy} onPress={() => void submit()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
