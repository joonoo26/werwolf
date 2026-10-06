import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius, space } from './theme';
import { Text, haptic } from './primitives';
import { Text as RNText } from 'react-native';

/** Eigener Ziffernblock: kein System-Keyboard, keine Autokorrektur, kein PIN im Klartext. */
export function PinPad({ onSubmit, error, busy }: { onSubmit: (pin: string) => Promise<void> | void; error?: string | null; busy?: boolean }) {
  const [pin, setPin] = useState('');
  const press = (d: string) => {
    haptic('light');
    if (pin.length < 6) setPin(pin + d);
  };
  const submit = async () => {
    const p = pin;
    setPin('');
    await onSubmit(p);
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '↵'];
  return (
    <View style={{ alignItems: 'center', gap: space.lg }}>
      <View style={{ flexDirection: 'row', gap: space.md, height: 20 }} accessible accessibilityLabel={`${pin.length} Ziffern eingegeben`}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && { backgroundColor: colors.fire400, borderColor: colors.fire400 }]} />
        ))}
      </View>
      {error ? <Text v="small" accessibilityLiveRegion="polite" style={{ color: colors.ember400 }}>{error}</Text> : <Text v="small"> </Text>}
      <View style={styles.grid}>
        {keys.map((k) => {
          const isBack = k === '⌫';
          const isOk = k === '↵';
          const label = isBack ? 'Löschen' : isOk ? 'Bestätigen' : k;
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={label}
              disabled={busy || (isOk && pin.length < 4)}
              onPress={() => (isBack ? setPin(pin.slice(0, -1)) : isOk ? void submit() : press(k))}
              style={({ pressed }) => [styles.key, pressed && { backgroundColor: colors.night700 }, isOk && pin.length >= 4 && { backgroundColor: colors.ember500 }, (busy || (isOk && pin.length < 4)) && { opacity: 0.4 }]}
            >
              <RNText style={{ fontFamily: fonts.uiMedium, fontSize: 24, color: colors.ivory100 }}>{k}</RNText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.ivory300 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 84 + 2 * space.md, gap: space.md, justifyContent: 'center' },
  key: { width: 84, height: 64, borderRadius: radius.lg, backgroundColor: colors.night800, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
});
