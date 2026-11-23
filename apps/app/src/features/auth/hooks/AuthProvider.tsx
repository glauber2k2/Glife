import type { AuthService, AuthState } from '@glife/domain/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface AuthContextValue {
  /** null enquanto a sessão guardada ainda está sendo lida. */
  state: AuthState | null;
  service: AuthService;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** O serviço concreto é injetado na raiz (src/app/_layout.tsx). */
export function AuthProvider({ service, children }: { service: AuthService; children: ReactNode }) {
  const [state, setState] = useState<AuthState | null>(null);

  useEffect(() => service.watch(setState), [service]);

  const value = useMemo(() => ({ state, service }), [state, service]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa de <AuthProvider>.');
  return ctx;
}
