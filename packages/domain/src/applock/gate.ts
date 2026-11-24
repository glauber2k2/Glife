// Portão do bloqueio: decide se o conteúdo pode aparecer. Puro; o app liga os eventos do AppState.
import { shouldLockOnReturn } from './model.ts';

export interface LockGate {
  isLocked(): boolean;
  lock(): void;
  unlock(): void;
  /** O app foi para o segundo plano. */
  background(): void;
  /** O app voltou; trava se ficou fora pelo menos `timeoutMs`. */
  foreground(timeoutMs: number): void;
  /**
   * Um diálogo do sistema (biometria) vai abrir e pode mandar o app ao segundo plano; até chamar a função
   * devolvida, sair e voltar não contam.
   */
  beginSystemPrompt(): () => void;
  subscribe(listener: () => void): () => void;
}

export function createLockGate({ now = Date.now }: { now?: () => number } = {}): LockGate {
  let locked = true;
  let backgroundAt: number | null = null;
  let prompts = 0;
  const listeners = new Set<() => void>();

  const set = (next: boolean) => {
    if (next === locked) return;
    locked = next;
    for (const l of [...listeners]) l();
  };

  return {
    isLocked: () => locked,
    lock: () => set(true),
    unlock: () => set(false),
    background() {
      if (prompts === 0 && backgroundAt === null) backgroundAt = now();
    },
    foreground(timeoutMs) {
      const leftAt = backgroundAt;
      backgroundAt = null;
      if (prompts === 0 && shouldLockOnReturn(leftAt, now(), timeoutMs)) set(true);
    },
    beginSystemPrompt() {
      prompts += 1;
      let done = false;
      return () => {
        if (done) return;
        done = true;
        prompts -= 1;
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
