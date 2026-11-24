// Liga o portão do bloqueio ao AppState. Ainda não usado no _layout: entra junto com a tela de bloqueio (T24).
import { createLockGate, type LockGate } from '@glife/domain/applock';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

/** Um portão por app aberto; começa travado. `timeoutMs` vem do registro do bloqueio. */
export function useLockGate(timeoutMs: number): { gate: LockGate; locked: boolean } {
  const [gate] = useState(createLockGate);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') gate.background();
      else if (state === 'active') gate.foreground(timeoutMs);
    });
    return () => sub.remove();
  }, [gate, timeoutMs]);
  const locked = useSyncExternalStore(gate.subscribe, gate.isLocked, gate.isLocked);
  return { gate, locked };
}
