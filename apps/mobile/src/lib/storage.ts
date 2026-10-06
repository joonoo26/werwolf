import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedSession {
  roomId: string;
  code: string;
  display?: boolean;
}

const KEY = 'dorf.session.v1';

export async function saveSession(s: SavedSession) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}
export async function loadSession(): Promise<SavedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}
export async function clearSession() {
  await AsyncStorage.removeItem(KEY);
}
