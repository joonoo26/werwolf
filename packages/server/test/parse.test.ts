import { describe, expect, it } from 'vitest';
import { parseCommand } from '../src/parse';

describe('parseCommand', () => {
  it('akzeptiert gültige Befehle', () => {
    expect(parseCommand({ type: 'vote', target: 'abc' })).toEqual({ type: 'vote', target: 'abc' });
    expect(parseCommand({ type: 'night_action', action: { kind: 'track', targets: ['a', 'b', 'c'] } })).not.toBeNull();
    expect(parseCommand({ type: 'ready', topic: 'council', value: true })).not.toBeNull();
  });
  it('lehnt Müll ab', () => {
    for (const bad of [null, 1, 'x', [], {}, { type: 'vote' }, { type: 'vote', target: {} }, { type: 'vote', target: '' },
      { type: 'night_action', action: { kind: 'track', targets: 'a' } }, { type: 'ready', topic: 'x', value: true },
      { type: 'night_action', action: { kind: 'alchemist', protect: 5 } }, { type: 'choose_side', side: 'x' },
      { type: '__proto__' }, { type: 'tick', force: 'yes' } as never]) {
      const r = parseCommand(bad);
      if (typeof bad === 'object' && bad && (bad as { type?: string }).type === 'tick') expect(r).toEqual({ type: 'tick', force: false });
      else expect(r).toBeNull();
    }
  });
  it('lässt keine Extra-Felder durch', () => {
    expect(parseCommand({ type: 'vote', target: 'a', actor: 'boss' })).toEqual({ type: 'vote', target: 'a' });
  });
});
