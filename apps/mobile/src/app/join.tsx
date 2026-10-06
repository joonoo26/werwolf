import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { errorText, joinDisplay, joinRoom, reclaimPlayer } from '../lib/api';
import { uploadPhoto } from '../lib/photos';
import { saveSession } from '../lib/storage';
import { ensureSession } from '../lib/supabase';
import { isValidPin, normalizeCode, normalizePin } from '../logic/lock';
import { ProfileForm, emptyProfile, profileValid, type ProfileDraft } from '../ui/ProfileForm';
import { Button, Field, Screen, Text } from '../ui/primitives';
import { t } from '../ui/strings';
import { colors, space } from '../ui/theme';

export default function Join() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; display?: string }>();
  const display = params.display === '1';
  const [code, setCode] = useState(normalizeCode(params.code ?? ''));
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [reclaim, setReclaim] = useState(false);
  const [scan, setScan] = useState(false);
  const [perm, askPerm] = useCameraPermissions();
  const [profile, setProfile] = useState<ProfileDraft>(emptyProfile);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ok = code.length === 6 && (display || (name.trim().length > 0 && isValidPin(pin) && (reclaim || profileValid(profile))));

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await ensureSession();
      if (display) {
        const r = await joinDisplay(code);
        await saveSession({ roomId: r.room_id, code: r.code, display: true });
        router.replace(`/display/${r.room_id}`);
        return;
      }
      const r = reclaim ? await reclaimPlayer(code, name.trim(), pin) : await joinRoom(code, name.trim(), pin, { age: Number(profile.age), gender: profile.gender!, hair: profile.hair!, eyes: profile.eyes! });
      if ('ok' in r && !r.ok) { setErr(t.errors.wrong_pin ?? t.common.error); return; }
      if (!reclaim && profile.photoB64) await uploadPhoto(r.room_id, r.player_id, profile.photoB64);
      await saveSession({ roomId: r.room_id, code: r.code });
      router.replace(`/room/${r.room_id}`);
    } catch (e) { setErr(errorText(e, t.errors, t.common.error)); } finally { setBusy(false); }
  };

  if (scan) {
    return (
      <Screen>
        <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => { const m = /code=([A-Za-z0-9]{6})/.exec(data); if (m) { setCode(normalizeCode(m[1]!)); setScan(false); } }} />
        <Button variant="secondary" label={t.common.cancel} onPress={() => setScan(false)} style={{ margin: space.lg }} />
      </Screen>
    );
  }
  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xl }} keyboardShouldPersistTaps="handled">
          <Button variant="ghost" label={t.common.back} onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
          <Text v="display" accessibilityRole="header">{display ? t.start.display : t.join.title}</Text>
          <Field label={t.join.code} value={code} onChangeText={(v) => setCode(normalizeCode(v))} autoCapitalize="characters" maxLength={6} />
          <Button variant="secondary" label={t.join.scan} onPress={async () => { if (!perm?.granted) await askPerm(); setScan(true); }} />
          {!display && (
            <>
              <Field label={t.create.name} value={name} onChangeText={setName} maxLength={20} autoCapitalize="words" />
              <Field label={t.create.pin} value={pin} onChangeText={(v) => setPin(normalizePin(v))} secure keyboardType="number-pad" maxLength={6} hint={reclaim ? undefined : t.create.pinHint} />
              {!reclaim && <ProfileForm value={profile} onChange={setProfile} name={name} />}
              <Button variant="ghost" label={reclaim ? t.common.back : t.join.reclaim} onPress={() => setReclaim(!reclaim)} />
            </>
          )}
          {err && <Text v="small" accessibilityLiveRegion="polite" style={{ color: colors.ember400 }}>{err}</Text>}
          <View><Button label={t.join.submit} disabled={!ok} busy={busy} onPress={() => void submit()} /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
