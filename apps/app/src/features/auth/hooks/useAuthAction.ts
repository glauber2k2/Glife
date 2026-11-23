import type { AuthErrorCode } from '@glife/domain/auth';
import { useCallback, useRef, useState } from 'react';

import { errorCodeOf } from './messages';

/** Executa uma ação de autenticação com estado de carregamento e código de erro; ignora toques repetidos. */
export function useAuthAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const running = useRef(false);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorCodeOf(e));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, error, setError, run };
}
