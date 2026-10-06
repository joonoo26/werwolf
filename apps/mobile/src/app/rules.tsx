import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Button, Screen } from '../ui/primitives';
import { RulesText } from '../ui/Rules';
import { t } from '../ui/strings';
import { space } from '../ui/theme';

export default function Rules() {
  const router = useRouter();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
        <Button variant="ghost" label={t.common.back} onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
        <RulesText />
      </ScrollView>
    </Screen>
  );
}
