/** Tempo fora da aba depois do qual a cascata de entrada se repete (trocar de aba rápido não repete). */
export const ENTRANCE_REPLAY_AFTER_MS = 30 * 60_000;

export function shouldReplayEntrance(leftAt: number | null, now: number): boolean {
  return leftAt !== null && now - leftAt >= ENTRANCE_REPLAY_AFTER_MS;
}
