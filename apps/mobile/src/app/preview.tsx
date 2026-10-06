// Nur Entwicklung: rendert Spielzustände aus der echten Engine ohne Backend (EXPO_PUBLIC_PREVIEW=1).
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { DisplayView } from '../game/DisplayView';
import { GameShell } from '../game/GameShell';
import { buildScene, type Scene } from '../dev/fixtures';
import { PrivateProvider } from '../lib/private';
import { RoomProvider } from '../lib/room';
import { Text } from '../ui/primitives';

export default function Preview() {
  const { scene = 'day', display } = useLocalSearchParams<{ scene?: Scene; display?: string }>();
  const built = useMemo(() => buildScene(scene), [scene]);
  if (process.env.EXPO_PUBLIC_PREVIEW !== '1') return <Text>Vorschau deaktiviert.</Text>;
  return (
    <RoomProvider roomId="room" userId={built.me.user_id} fixture={built.fixture}>
      <PrivateProvider fixture={built.priv ?? undefined}>
        {display ? <DisplayView /> : <GameShell onLeave={() => {}} />}
      </PrivateProvider>
    </RoomProvider>
  );
}
