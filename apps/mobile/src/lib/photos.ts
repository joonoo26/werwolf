import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useEffect, useState } from 'react';
import { setPhoto } from './api';
import { supabase } from './supabase';

const BUCKET = 'profile-photos';
const cache = new Map<string, { url: string; until: number }>();

/** Wählt ein Foto (optional) und liefert es als Base64-JPEG, bereits verkleinert/komprimiert. */
export async function pickPhoto(): Promise<{ uri: string; base64: string } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
  const a = r.canceled ? null : r.assets[0];
  return a?.base64 ? { uri: a.uri, base64: a.base64 } : null;
}

/** Lädt das Foto in den privaten Bucket und trägt den Pfad ein. Fehler brechen den Spielbeitritt nie ab. */
export async function uploadPhoto(roomId: string, playerId: string, base64: string): Promise<boolean> {
  const path = `${roomId}/${playerId}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) return false;
  await setPhoto(roomId, path).catch(() => {});
  return true;
}

export async function removePhoto(roomId: string, playerId: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([`${roomId}/${playerId}.jpg`]).catch(() => {});
  await setPhoto(roomId, null).catch(() => {});
}

/** Signierte, kurzlebige URL für ein Foto (nur Raummitglieder dürfen lesen). */
export function usePhotoUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(path ? (cache.get(path)?.url ?? null) : null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    const hit = cache.get(path);
    if (hit && hit.until > Date.now()) { setUrl(hit.url); return; }
    let live = true;
    void supabase.storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => {
      if (!live || !data?.signedUrl) return;
      cache.set(path, { url: data.signedUrl, until: Date.now() + 3_000_000 });
      setUrl(data.signedUrl);
    });
    return () => { live = false; };
  }, [path]);
  return url;
}
