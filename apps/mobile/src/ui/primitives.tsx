import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo, Pressable, StyleSheet, Text as RNText, TextInput, View,
  type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, MIN_TOUCH, radius, space } from './theme';

export function useReduceMotion(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setOn);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

type Variant = 'body' | 'small' | 'label' | 'title' | 'display' | 'huge';
const textStyles: Record<Variant, TextStyle> = {
  body: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 23, color: colors.ivory100 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: colors.ivory300 },
  label: { fontFamily: fonts.uiMedium, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.ivory300 },
  title: { fontFamily: fonts.uiSemi, fontSize: 20, lineHeight: 26, color: colors.ivory100 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.ivory100 },
  huge: { fontFamily: fonts.displayBold, fontSize: 56, lineHeight: 60, color: colors.ivory100 },
};

export function Text({ v = 'body', style, ...p }: TextProps & { v?: Variant }) {
  // Dynamic Type: allowFontScaling bleibt an (Standard), maxFontSizeMultiplier schützt Layouts.
  return <RNText maxFontSizeMultiplier={1.6} {...p} style={[textStyles[v], style]} />;
}

export function Screen({ children, style, edges, transparent }: { children: ReactNode; style?: StyleProp<ViewStyle>; edges?: ('top' | 'bottom' | 'left' | 'right')[]; transparent?: boolean }) {
  return (
    <View style={[styles.screen, transparent && { backgroundColor: 'transparent' }]}>
      <SafeAreaView style={[{ flex: 1 }, style]} edges={edges ?? ['top', 'bottom', 'left', 'right']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function haptic(kind: 'light' | 'success' | 'heavy' = 'light') {
  try {
    if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.impactAsync(kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* Haptik ist optional */
  }
}

export function Button({
  label, onPress, variant = 'primary', disabled, busy, style, accessibilityHint,
}: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; busy?: boolean;
  style?: StyleProp<ViewStyle>; accessibilityHint?: string;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={() => { haptic('light'); onPress(); }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: pressed ? colors.ember400 : colors.ember500 },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.ivory300, backgroundColor: pressed ? colors.night800 : 'transparent' },
        variant === 'ghost' && { backgroundColor: pressed ? colors.night800 : 'transparent' },
        off && { opacity: 0.45 },
        style,
      ]}
    >
      <RNText maxFontSizeMultiplier={1.4} style={[styles.buttonLabel, variant !== 'primary' && { color: colors.ivory100 }]}>
        {busy ? '…' : label}
      </RNText>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({
  label, value, onChangeText, secure, keyboardType, maxLength, autoCapitalize, placeholder, hint,
}: {
  label: string; value: string; onChangeText: (t: string) => void; secure?: boolean; keyboardType?: 'default' | 'number-pad';
  maxLength?: number; autoCapitalize?: 'none' | 'characters' | 'words'; placeholder?: string; hint?: string;
}) {
  return (
    <View style={{ gap: space.xs }}>
      <Text v="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={colors.ash500}
        style={styles.input}
      />
      {hint ? <Text v="small">{hint}</Text> : null}
    </View>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

/** Lebend: warmer Ring. Ausgeschieden: entsättigt + Kreuz-Symbol + Text-Status (nie nur Farbe). */
export function Avatar({ name, alive = true, size = 52, speaker }: { name: string; alive?: boolean; size?: number; speaker?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`${name}${speaker ? ', Dorfsprecher' : ''}${alive ? '' : ', ausgeschieden'}`}
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        borderWidth: speaker ? 3 : 2, borderColor: alive ? colors.fire400 : colors.ash500,
        backgroundColor: alive ? colors.night800 : colors.night900,
      }}
    >
      <RNText style={{ fontFamily: fonts.uiSemi, fontSize: size * 0.34, color: alive ? colors.ivory100 : colors.ash500, textDecorationLine: alive ? 'none' : 'line-through' }}>
        {initials(name)}
      </RNText>
      {!alive && (
        <View style={[styles.cross, { width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17 }]}>
          <RNText style={{ color: colors.ivory300, fontSize: size * 0.2, lineHeight: size * 0.24, fontFamily: fonts.uiSemi }}>×</RNText>
        </View>
      )}
    </View>
  );
}

export function Backdrop({ children, tone = 'day' }: { children: ReactNode; tone?: 'day' | 'night' | 'council' }) {
  const stops: [string, string] = tone === 'night' ? ['#05080A', '#0B1013'] : tone === 'council' ? ['#07090B', '#14100E'] : [colors.night950, '#13191C'];
  return <LinearGradient colors={stops} style={{ flex: 1 }}>{children}</LinearGradient>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night950 },
  button: { minHeight: MIN_TOUCH + 8, borderRadius: radius.pill, paddingHorizontal: space.xl, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { fontFamily: fonts.uiSemi, fontSize: 16, letterSpacing: 1.2, color: colors.ivory100, textTransform: 'uppercase' },
  card: { backgroundColor: colors.night800, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.line },
  input: { minHeight: MIN_TOUCH + 4, borderRadius: radius.md, backgroundColor: colors.night800, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.lg, color: colors.ivory100, fontFamily: fonts.ui, fontSize: 17 },
  cross: { position: 'absolute', right: -2, bottom: -2, backgroundColor: colors.night950, borderWidth: 1, borderColor: colors.ash500, alignItems: 'center', justifyContent: 'center' },
});
