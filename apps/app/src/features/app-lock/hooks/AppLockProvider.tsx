// Estado do bloqueio para as telas: registro (status), portão (travado ou não) e biometria do aparelho.
// As implementações concretas entram pela raiz (src/app/_layout.tsx).
import type { AppLock, AppLockStatus, DeviceBiometrics, LockGate } from '@glife/domain/applock';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useLockGate } from './useLockGate';

interface AppLockContextValue {
  lock: AppLock;
  bio: DeviceBiometrics;
  gate: LockGate;
  locked: boolean;
  /** null enquanto o registro é lido */
  status: AppLockStatus | null;
  /** registro ilegível: só o login da conta resolve (nunca vira "sem senha") */
  broken: boolean;
  /** há biometria forte cadastrada no aparelho */
  bioAvailable: boolean;
  refresh(): Promise<void>;
  /** Abre um diálogo do sistema sem que a ida ao segundo plano trave o app. */
  withSystemPrompt<T>(fn: () => Promise<T>): Promise<T>;
  /** "Esqueci a senha" / "Entrar com a conta": sai da conta; o login completo cria outra senha. */
  enterWithAccount(): Promise<void>;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

interface AppLockProviderProps {
  lock: AppLock;
  bio: DeviceBiometrics;
  /** sem sessão: o registro é apagado (o bloqueio protege uma sessão) */
  signedOut: boolean;
  signOut: () => Promise<void>;
  children: ReactNode;
}

export function AppLockProvider({ lock, bio, signedOut, signOut, children }: AppLockProviderProps) {
  const [status, setStatus] = useState<AppLockStatus | null>(null);
  const [broken, setBroken] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const { gate, locked } = useLockGate(status?.timeoutMs ?? 0);

  // Registro e biometria chegam juntos: com o status em mãos, a tela já sabe se pede a digital.
  const refresh = useCallback(
    () =>
      Promise.all([
        lock.status().then(
          (st) => ({ st, broken: false }),
          () => ({ st: null, broken: true }),
        ),
        bio.available(),
      ]).then(([{ st, broken: isBroken }, available]) => {
        setBioAvailable(available);
        setBroken(isBroken);
        if (st) setStatus(st);
      }),
    [lock, bio],
  );

  // Ao travar (e ao abrir), relê: esperas e biometria podem ter mudado fora do app.
  useEffect(() => {
    void refresh();
  }, [refresh, locked]);

  // Só depois que a sessão já acabou: apagar antes deixaria um app logado sem senha.
  useEffect(() => {
    if (!signedOut) return;
    gate.lock();
    void (async () => {
      await lock.forget();
      await bio.disarm();
      await refresh();
    })();
  }, [signedOut, gate, lock, bio, refresh]);

  const withSystemPrompt = useCallback(
    async <T,>(fn: () => Promise<T>) => {
      const done = gate.beginSystemPrompt();
      try {
        return await fn();
      } finally {
        done();
      }
    },
    [gate],
  );

  const value = useMemo<AppLockContextValue>(
    () => ({
      lock,
      bio,
      gate,
      locked,
      status,
      broken,
      bioAvailable,
      refresh,
      withSystemPrompt,
      enterWithAccount: signOut,
    }),
    [lock, bio, gate, locked, status, broken, bioAvailable, refresh, withSystemPrompt, signOut],
  );
  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockContextValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock precisa de <AppLockProvider>.');
  return ctx;
}
