import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { usePrivate } from '../lib/private';
import { PinPad } from '../ui/PinPad';
import { Text } from '../ui/primitives';
import { t } from '../ui/strings';
import { space } from '../ui/theme';

/** Zeigt Kinder nur im entsperrten Zustand; sonst eine neutrale PIN-Abfrage. */
export function PinGate({ title, children }: { title: string; children: ReactNode }) {
  const { unlocked, unlock } = usePrivate();
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  if (unlocked) return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg }}>
      <Text v="display" accessibilityRole="header">{title} 🔒</Text>
      <Text v="small">{wait > 0 ? t.private.wait(wait) : t.private.locked}</Text>
      <PinPad
        busy={busy || wait > 0}
        error={error}
        onSubmit={async (pin) => {
          setBusy(true);
          const r = await unlock(pin).catch(() => -1);
          setBusy(false);
          if (r === 0) setError(null);
          else if (r > 0) { setWait(r); setError(null); }
          else setError(t.private.wrong);
        }}
      />
    </View>
  );
}
