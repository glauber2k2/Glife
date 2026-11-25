// Ativos e movimentos de investimento, ao vivo; e a atualização das cotações ao abrir as telas que mostram valor.
import type { InvestmentsSnapshot } from '@glife/domain/finance';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSyncOnline } from '@/shared/lib/powersync';

import { useFinance } from './FinanceData';

/** null enquanto a primeira leitura não termina. */
export function useInvestments(): InvestmentsSnapshot | null {
  const { repos } = useFinance();
  const [snap, setSnap] = useState<{ repos: typeof repos; data: InvestmentsSnapshot } | null>(null);
  useEffect(
    () =>
      repos.investments.watch(
        (data) => setSnap({ repos, data }),
        (e) => console.warn('Falha ao ler os investimentos', e),
      ),
    [repos],
  );
  return snap && snap.repos === repos ? snap.data : null;
}

/**
 * Ao focar a tela (e ao reconectar com ela aberta), pede as cotações vencidas (> 30 min).
 * `refresh(true)` força (puxar para atualizar). Falha é silenciosa: a tela mostra o último preço com a data.
 */
export function useRefreshQuotes(snapshot: InvestmentsSnapshot | null) {
  const { quoteRefresher } = useFinance();
  const online = useSyncOnline();
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(snapshot);
  // Antes do efeito de foco (mesma ordem de declaração): ele lê a versão mais nova.
  useEffect(() => {
    latest.current = snapshot;
  }, [snapshot]);
  const ready = snapshot !== null;

  useFocusEffect(
    useCallback(() => {
      if (ready && online && latest.current) void quoteRefresher.refresh(latest.current);
    }, [ready, online, quoteRefresher]),
  );

  const refresh = useCallback(
    async (force = true) => {
      if (!latest.current) return;
      setRefreshing(true);
      try {
        await quoteRefresher.refresh(latest.current, force);
      } finally {
        setRefreshing(false);
      }
    },
    [quoteRefresher],
  );
  return { refreshing, refresh };
}
