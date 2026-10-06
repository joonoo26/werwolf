import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { GameShell } from '../../game/GameShell';
import { Lobby } from '../../game/Lobby';
import { registerForPush } from '../../lib/push';
import { PrivateProvider } from '../../lib/private';
import { RoomProvider, useRoom } from '../../lib/room';
import { clearSession } from '../../lib/storage';
import { ensureSession } from '../../lib/supabase';
import { Backdrop, Text } from '../../ui/primitives';
import { t } from '../../ui/strings';
import { space } from '../../ui/theme';

export default function RoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { void ensureSession().then(setUserId); }, []);
  if (!userId || !roomId) return <Backdrop><Text style={{ padding: space.xl }}>{t.common.loading}</Text></Backdrop>;
  return (
    <RoomProvider roomId={roomId} userId={userId}>
      <PrivateProvider>
        <Switch />
      </PrivateProvider>
    </RoomProvider>
  );
}

function Switch() {
  const router = useRouter();
  const { room, loaded } = useRoom();
  useEffect(() => { void registerForPush(); }, []);
  const leave = async () => { await clearSession(); router.replace('/'); };
  if (!loaded) return <Backdrop><Text style={{ padding: space.xl }}>{t.common.loading}</Text></Backdrop>;
  if (!room) {
    void clearSession();
    return <Backdrop><Text style={{ padding: space.xl }}>{t.errors.room_not_found}</Text></Backdrop>;
  }
  return room.status === 'lobby' ? <Lobby onLeave={leave} /> : <GameShell onLeave={leave} />;
}
