import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const backendConfigured = url.length > 0 && anon.length > 0;

export const supabase = createClient(url || 'http://localhost:54321', anon || 'anon', {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 10 } },
});

/** Stellt sicher, dass es eine (anonyme) Sitzung gibt; sie identifiziert dieses Gerät dauerhaft. */
export async function ensureSession(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: created, error } = await supabase.auth.signInAnonymously();
  if (error || !created.user) throw error ?? new Error('Anmeldung fehlgeschlagen');
  return created.user.id;
}
