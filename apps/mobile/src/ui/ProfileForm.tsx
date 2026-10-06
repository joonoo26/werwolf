import type { EyeColor, Gender, HairColor } from '@dorf/engine';
import { Pressable, View } from 'react-native';
import { pickPhoto } from '../lib/photos';
import { Avatar, Button, Field, Text } from './primitives';
import { t } from './strings';
import { colors, MIN_TOUCH, radius, space } from './theme';

export interface ProfileDraft {
  age: string;
  gender: Gender | null;
  hair: HairColor | null;
  eyes: EyeColor | null;
  photoUri: string | null;
  photoB64: string | null;
}
export const emptyProfile: ProfileDraft = { age: '', gender: null, hair: null, eyes: null, photoUri: null, photoB64: null };
export const profileValid = (p: ProfileDraft) => {
  const n = Number(p.age);
  return Number.isInteger(n) && n >= 5 && n <= 120 && !!p.gender && !!p.hair && !!p.eyes;
};

function Options<T extends string>({ label, value, options, onChange }: { label: string; value: T | null; options: Record<T, string>; onChange: (v: T) => void }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text v="label">{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} accessibilityRole="radiogroup">
        {(Object.keys(options) as T[]).map((k) => (
          <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: value === k }} accessibilityLabel={options[k]} onPress={() => onChange(k)}
            style={{ minHeight: MIN_TOUCH, paddingHorizontal: space.lg, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: value === k ? colors.ember500 : colors.line, backgroundColor: colors.night800 }}>
            <Text>{options[k]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Profil für die Mitspieler (Alter exakt). Foto ist optional; ohne Foto gibt es einen automatischen Avatar. */
export function ProfileForm({ value, onChange, name }: { value: ProfileDraft; onChange: (p: ProfileDraft) => void; name: string }) {
  return (
    <View style={{ gap: space.lg }}>
      <Text v="title">{t.profile.title}</Text>
      <Text v="small">{t.profile.guestHint}</Text>
      <Field label={t.profile.ageLabel} value={value.age} onChangeText={(v) => onChange({ ...value, age: v.replace(/\D/g, '').slice(0, 3) })} keyboardType="number-pad" maxLength={3} />
      <Options label={t.profile.gender} value={value.gender} options={t.profile.genders} onChange={(gender) => onChange({ ...value, gender })} />
      <Options label={t.profile.hair} value={value.hair} options={t.profile.hairs} onChange={(hair) => onChange({ ...value, hair })} />
      <Options label={t.profile.eyes} value={value.eyes} options={t.profile.eyesOpts} onChange={(eyes) => onChange({ ...value, eyes })} />
      <View style={{ gap: space.sm }}>
        <Text v="label">{t.profile.photo}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Avatar name={name || '?'} size={64} photoUrl={value.photoUri} />
          <Button variant="secondary" label={t.profile.addPhoto} onPress={async () => { const p = await pickPhoto().catch(() => null); if (p) onChange({ ...value, photoUri: p.uri, photoB64: p.base64 }); }} />
          {value.photoUri && <Button variant="ghost" label={t.profile.removePhoto} onPress={() => onChange({ ...value, photoUri: null, photoB64: null })} />}
        </View>
      </View>
    </View>
  );
}
