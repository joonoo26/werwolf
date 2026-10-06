/** Inaktivitäts-Sperre für den Privatbereich (neutrales Dashboard nach kurzer Inaktivität). */
export const IDLE_LOCK_MS = 45_000;
export const TOUCH_INTERVAL_MS = 30_000;

export function shouldLock(lastActivityMs: number, nowMs: number, idleMs = IDLE_LOCK_MS): boolean {
  return nowMs - lastActivityMs >= idleMs;
}

export function normalizePin(input: string): string {
  return input.replace(/\D/g, '').slice(0, 6);
}

export function isValidPin(pin: string): boolean {
  return /^[0-9]{4,6}$/.test(pin);
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
