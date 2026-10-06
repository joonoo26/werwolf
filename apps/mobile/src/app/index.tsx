import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { backendConfigured } from '../lib/supabase';
import { loadSession, type SavedSession } from '../lib/storage';
import { Mark, VillageScene } from '../ui/art';
import { Button, Screen, Text } from '../ui/primitives';
import { t } from '../ui/strings';
import { colors, space } from '../ui/theme';

/** Startscreen: in 5 Sekunden klar – 1. Neues Spiel, 2. Beitreten, 3. Regeln/Einstellungen (STYLE_GUIDE §6). */
export default function Start() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [saved, setSaved] = useState<SavedSession | null>(null);
  useEffect(() => { void loadSession().then(setSaved); }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.night950 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <VillageScene width={width} height={height} />
      </View>
      <Screen transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: space.xl, gap: space.lg, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', gap: space.sm, marginBottom: space.lg }}>
            <Mark size={72} />
            <Text v="huge" accessibilityRole="header" style={{ letterSpacing: 2 }}>{t.appName}</Text>
            <Text v="label" style={{ textAlign: 'center' }}>{t.claim}</Text>
          </View>
          {!backendConfigured && <Text v="small" style={{ textAlign: 'center', color: colors.ember400 }}>Backend nicht konfiguriert (EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY).</Text>}
          {saved && <Button variant="secondary" label={t.start.resume} onPress={() => router.push(saved.display ? `/display/${saved.roomId}` : `/room/${saved.roomId}`)} />}
          <Button label={t.start.newGame} onPress={() => router.push('/create')} />
          <Button variant="secondary" label={t.start.join} onPress={() => router.push('/join')} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Button variant="ghost" label={t.start.rules} onPress={() => router.push('/rules')} />
            <Button variant="ghost" label={t.start.display} onPress={() => router.push('/join?display=1')} accessibilityHint="Öffentliche Anzeige für Tablet oder TV" />
          </View>
        </View>
      </Screen>
    </View>
  );
}
