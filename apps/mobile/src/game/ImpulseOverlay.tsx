import type { PublicView } from '@dorf/engine';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useNow } from '../lib/useNow';
import { Text, haptic, useReduceMotion } from '../ui/primitives';
import { impulseText, t } from '../ui/strings';
import { colors, motion, space } from '../ui/theme';

/**
 * Dorfimpuls: alle Geräte zeigen gleichzeitig denselben Text (gleiche Dauer, gleiche Haptik).
 * Nur der private Bereich enthält zusätzliche geheime Informationen.
 */
export function ImpulseOverlay({ impulse }: { impulse: PublicView['impulse'] }) {
  const now = useNow(300);
  const [seen, setSeen] = useState<number | null>(null);
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(0)).current;
  const active = !!impulse && impulse.id !== seen && now < impulse.showUntil && now >= impulse.at - 1500;
  const shownId = useRef<number | null>(null);

  useEffect(() => {
    if (!impulse || !active || shownId.current === impulse.id) return;
    shownId.current = impulse.id;
    haptic('light');
    Animated.timing(fade, { toValue: 1, duration: reduce ? 0 : motion.cinematic, useNativeDriver: true }).start();
  }, [impulse, active, fade, reduce]);

  useEffect(() => {
    if (!impulse || active || shownId.current !== impulse.id) return;
    Animated.timing(fade, { toValue: 0, duration: reduce ? 0 : motion.ui, useNativeDriver: true }).start(() => setSeen(impulse.id));
  }, [active, impulse, fade, reduce]);

  if (!impulse || (!active && fade && seen === impulse.id)) return null;
  if (!active && shownId.current !== impulse.id) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: space.xl }]} accessibilityViewIsModal accessibilityLiveRegion="polite">
      <View style={{ gap: space.md, alignItems: 'center', maxWidth: 420 }}>
        <Text v="display" style={{ textAlign: 'center' }}>{impulse.kind === 'change' ? t.impulse.change : impulseText(impulse.textKey)}</Text>
        {impulse.kind === 'change' && <Text style={{ textAlign: 'center', color: colors.ivory300 }}>{t.impulse.changeHint}</Text>}
      </View>
    </Animated.View>
  );
}
