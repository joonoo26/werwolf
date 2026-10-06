/** Verbleibende Zeit als mm:ss bzw. h:mm:ss. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Sprecherfreundliche Dauer für VoiceOver, z. B. „2 Minuten 17 Sekunden". */
export function spokenDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} ${h === 1 ? 'Stunde' : 'Stunden'}`);
  if (m) parts.push(`${m} ${m === 1 ? 'Minute' : 'Minuten'}`);
  if (s && !h) parts.push(`${s} ${s === 1 ? 'Sekunde' : 'Sekunden'}`);
  return parts.join(' ') || '0 Sekunden';
}

/** Schätzt den Versatz zwischen Server- und Geräteuhr aus einer Server-Zeitangabe. */
export function clockOffset(serverNowMs: number, deviceNowMs: number, roundTripMs = 0): number {
  return serverNowMs + roundTripMs / 2 - deviceNowMs;
}

/** Phase des gemeinsamen Zeigen-Countdowns: 0..2 = „3/2/1", 3 = „ZEIGT!", null = vorbei/noch nicht. */
export function showdownBeat(now: number, revealAt: number, countdownMs: number): number | null {
  const start = revealAt - countdownMs;
  if (now < start) return null;
  if (now >= revealAt) return 3;
  const beat = Math.floor(((now - start) / countdownMs) * 3);
  return Math.min(2, beat);
}
