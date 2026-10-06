// Validiert untrusted JSON vom Client zu einem Engine-Command. Alles Unbekannte wird abgelehnt.
import type { Command } from '@dorf/engine';

const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

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
    case 'vote':
    case 'decide_tie':
    case 'pack_target':
    case 'hunter_shoot':
      return isId(raw.target) ? ({ type: raw.type, target: raw.target } as Command) : null;
    case 'night_action': {
      if (typeof raw.ability !== 'string' || !/^[a-z_]{1,32}$/.test(raw.ability)) return null;
      if (raw.target !== undefined && !isId(raw.target)) return null;
      if (raw.targets !== undefined && !(Array.isArray(raw.targets) && raw.targets.length <= 14 && raw.targets.every(isId))) return null;
      return { type: 'night_action', ability: raw.ability, target: raw.target as string | undefined, targets: raw.targets as string[] | undefined };
    }
    case 'choose_side':
      return raw.side === 'village' || raw.side === 'pack' ? { type: 'choose_side', side: raw.side } : null;
    default:
      return null;
  }
}
