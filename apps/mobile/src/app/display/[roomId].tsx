import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { DisplayView } from '../../game/DisplayView';
import { RoomProvider } from '../../lib/room';
import { ensureSession } from '../../lib/supabase';
import { Backdrop, Text } from '../../ui/primitives';
import { t } from '../../ui/strings';
import { space } from '../../ui/theme';

export default function DisplayScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { void ensureSession().then(setUserId); }, []);
  if (!userId || !roomId) return <Backdrop><Text style={{ padding: space.xl }}>{t.common.loading}</Text></Backdrop>;
  return (
    <RoomProvider roomId={roomId} userId={userId}>
      <DisplayView />
    </RoomProvider>
  );
}
