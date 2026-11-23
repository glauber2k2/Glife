import { isAuthError, type AuthErrorCode } from '@glife/domain/auth';
import { useCallback, useRef, useState } from 'react';

const MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  invalid_code: 'Código inválido ou expirado. Confira se o relógio do celular está certo e tente de novo.',
  rate_limited: 'Muitas tentativas seguidas. Espere um pouco antes de tentar de novo.',
  network: 'Sem conexão com o servidor. Verifique a internet.',
  unknown: 'Algo deu errado. Tente de novo.',
};

export function authErrorMessage(e: unknown): string {
  return MESSAGES[isAuthError(e) ? e.code : 'unknown'];
}

/** Executa uma ação de autenticação com estado de carregamento e mensagem de erro; ignora toques repetidos. */
export function useAuthAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, error, setError, run };
}
