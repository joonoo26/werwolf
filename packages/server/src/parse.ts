// Validiert untrusted JSON vom Client zu einem Engine-Command. Alles Unbekannte wird abgelehnt.
import type { Command, NightAction } from '@dorf/engine';

const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function parseNightAction(a: unknown): NightAction | null {
  if (!isObj(a)) return null;
  switch (a.kind) {
    case 'scout':
      return isId(a.target) ? { kind: 'scout', target: a.target } : null;
    case 'track':
      return Array.isArray(a.targets) && a.targets.length <= 14 && a.targets.every(isId)
        ? { kind: 'track', targets: a.targets as string[] }
        : null;
    case 'protect':
      return isId(a.target) ? { kind: 'protect', target: a.target } : null;
    case 'alchemist': {
      if (a.protect !== undefined && !isId(a.protect)) return null;
      if (a.strike !== undefined && !isId(a.strike)) return null;
      return { kind: 'alchemist', protect: a.protect as string | undefined, strike: a.strike as string | undefined };
    }
    case 'veil':
      return { kind: 'veil' };
    default:
      return null;
  }
}

export function parseCommand(raw: unknown): Command | null {
  if (!isObj(raw) || typeof raw.type !== 'string') return null;
  switch (raw.type) {
    case 'tick':
      return { type: 'tick', force: raw.force === true };
    case 'ready':
      return (raw.topic === 'council' || raw.topic === 'advance') && typeof raw.value === 'boolean'
        ? { type: 'ready', topic: raw.topic, value: raw.value }
        : null;
    case 'start_council':
      return { type: 'start_council' };
    case 'quest_done':
      return { type: 'quest_done' };
    case 'vote_speaker':
    case 'nominate':
    case 'vote':
    case 'decide_tie':
    case 'pack_target':
    case 'hunter_shoot':
      return isId(raw.target) ? ({ type: raw.type, target: raw.target } as Command) : null;
    case 'night_action': {
      const action = parseNightAction(raw.action);
      return action ? { type: 'night_action', action } : null;
    }
    case 'choose_side':
      return raw.side === 'village' || raw.side === 'pack' ? { type: 'choose_side', side: raw.side } : null;
    default:
      return null;
  }
}
