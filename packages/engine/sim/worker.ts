import { parentPort, workerData } from 'node:worker_threads';
import { runCell, type ConfigId } from './run';

const { n, cfg, games } = workerData as { n: number; cfg: ConfigId; games: number };
parentPort!.postMessage(runCell(n, cfg, games));
