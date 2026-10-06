import { describe, expect, it } from 'vitest';
import { clockOffset, formatCountdown, showdownBeat, spokenDuration } from './time';
import { isValidPin, normalizeCode, normalizePin, shouldLock } from './lock';

describe('time', () => {
  it('formatiert Countdowns', () => {
    expect(formatCountdown(137_000)).toBe('02:17');
    expect(formatCountdown(3_725_000)).toBe('1:02:05');
    expect(formatCountdown(-5)).toBe('00:00');
  });
  it('spricht Dauern aus', () => {
    expect(spokenDuration(137_000)).toBe('2 Minuten 17 Sekunden');
    expect(spokenDuration(3_600_000)).toBe('1 Stunde');
  });
  it('gleicht Uhren ab', () => {
    expect(clockOffset(10_000, 9_000, 200)).toBe(1_100);
  });
  it('zählt 3-2-1-ZEIGT synchron zur Serverzeit', () => {
    const reveal = 10_000;
    expect(showdownBeat(5_000, reveal, 4_500)).toBeNull();
    expect(showdownBeat(5_600, reveal, 4_500)).toBe(0);
    expect(showdownBeat(7_100, reveal, 4_500)).toBe(1);
    expect(showdownBeat(8_900, reveal, 4_500)).toBe(2);
    expect(showdownBeat(10_000, reveal, 4_500)).toBe(3);
  });
});

describe('lock', () => {
  it('sperrt nach Inaktivität', () => {
    expect(shouldLock(0, 44_999)).toBe(false);
    expect(shouldLock(0, 45_000)).toBe(true);
  });
  it('validiert PIN und Code', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(normalizePin('12-3456789')).toBe('123456');
    expect(normalizeCode(' ab-c d12e ')).toBe('ABCD12');
  });
});

import { mayShowAd } from './ads';
import type { PublicView } from '@dorf/engine';

const view = (over: Partial<PublicView>): PublicView => ({ phase: 'day', quest: null, councilReady: false, ...over } as PublicView);

describe('Werbung', () => {
  it('nie bei Werbefreiheit', () => {
    expect(mayShowAd({ adFree: true, surface: 'phone', view: null })).toBe(false);
  });
  it('in der Lobby und nach Spielende auf dem Handy erlaubt', () => {
    expect(mayShowAd({ adFree: false, surface: 'phone', view: null })).toBe(true);
    expect(mayShowAd({ adFree: false, surface: 'phone', view: view({ phase: 'ended' }) })).toBe(true);
  });
  it('nie während einer aktiven Spielhandlung und nie auf der Dorfanzeige während der Partie', () => {
    for (const phase of ['speaker_election', 'day', 'council', 'dusk', 'night', 'morning'] as const) {
      expect(mayShowAd({ adFree: false, surface: 'phone', view: view({ phase }) })).toBe(false);
      expect(mayShowAd({ adFree: false, surface: 'display', view: view({ phase }) })).toBe(false);
    }
    expect(mayShowAd({ adFree: false, surface: 'display', view: view({ phase: 'ended' }) })).toBe(false);
    expect(mayShowAd({ adFree: false, surface: 'display', view: null })).toBe(false);
  });
});
