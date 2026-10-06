// Vorschau-Daten aus der ECHTEN Engine (nur für Entwicklung/Screenshots).
import { applyCommand, createGame, privateView, publicView, tick, type GameState } from '@dorf/engine';
import type { PlayerRow, RoomFixture, RoomRow } from '../lib/room';

const NAMES = ['Lena', 'Tom', 'Mara', 'Jonas', 'Elif', 'David', 'Samira', 'Noah', 'Klara', 'Felix'];
const T0 = 1_800_000_000_000;

export type Scene = 'day' | 'speaker' | 'discussion' | 'voting' | 'showdown' | 'result' | 'night' | 'morning' | 'ended';

export function buildScene(scene: Scene): { fixture: RoomFixture; me: PlayerRow; priv: ReturnType<typeof privateView>; now: number } {
  const roster = NAMES.map((name, i) => ({ id: `p${i + 1}`, name }));
  let s: GameState = createGame({ roster, hostId: 'p1', mode: 'evening', targetMinutes: 180, seed: 'preview-' + 7, now: T0 });
  let now = T0;
  const step = (id: string, cmd: Parameters<typeof applyCommand>[2]) => {
    const r = applyCommand(s, id, cmd, now);
    if (r.ok) s = r.state;
  };
  if (scene !== 'speaker') {
    for (const p of roster) if (p.id !== 'p3') step(p.id, { type: 'vote_speaker', target: 'p3' });
    step('p3', { type: 'vote_speaker', target: 'p1' });
    now += 60_000;
  }
  const toCouncil = () => {
    for (const p of roster) step(p.id, { type: 'ready', topic: 'council', value: true });
    step('p2', { type: 'start_council' });
  };
  if (['discussion', 'voting', 'showdown', 'result'].includes(scene)) {
    s = tick(s, now, { force: true }); // evtl. Quest abschließen
    toCouncil();
  }
  if (['voting', 'showdown', 'result'].includes(scene)) s = tick(s, now, { force: true }); // Diskussion → Abstimmung
  if (scene === 'showdown' || scene === 'result') {
    for (const p of roster) if (s.phase.kind === 'council') step(p.id, { type: 'vote', target: p.id === 'p5' ? 'p4' : 'p5' });
  }
  if (scene === 'result') {
    s = tick(s, now + 20_000, { force: true });
    now += 20_000;
  }
  if (scene === 'night' || scene === 'morning' || scene === 'ended') {
    for (let i = 0; i < 6 && s.phase.kind !== 'night'; i++) s = tick(s, (now += 1000), { force: true });
  }
  if (scene === 'morning') s = tick(s, (now += 200_000), { force: true });
  if (scene === 'ended') {
    s = JSON.parse(JSON.stringify(s));
    for (const p of Object.values(s.players)) if (p.faction === 'pack') p.alive = false;
    s.phase = { kind: 'ended' };
    s.winner = 'village';
  }
  const room: RoomRow = { id: 'room', code: 'DORF42', status: 'running', mode: 'evening', target_minutes: 180, host_user_id: 'u1', ad_free: false };
  const players: PlayerRow[] = Object.values(s.players).map((p) => ({ id: p.id, user_id: 'u' + p.id.slice(1), name: p.name, ready: true, alive: p.alive }));
  const me = players.find((p) => p.id === 'p1')!;
  return { fixture: { room, players, pub: publicView(s), now: now + 5_000 }, me, priv: privateView(s, 'p1'), now };
}
