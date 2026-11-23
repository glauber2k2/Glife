import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Subscribe = (listener: (connected: boolean) => void) => () => void;

const OnlineContext = createContext(false);

/** Expõe se o aparelho está conectado à sincronização (para "Salvo" × "Salvo no aparelho"). */
export function SyncStatusProvider({ subscribe, children }: { subscribe: Subscribe; children: ReactNode }) {
  const [online, setOnline] = useState(false);
  useEffect(() => subscribe(setOnline), [subscribe]);
  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>;
}

export function useSyncOnline(): boolean {
  return useContext(OnlineContext);
}
