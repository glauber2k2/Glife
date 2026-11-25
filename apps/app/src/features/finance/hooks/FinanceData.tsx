import type { LocalDb } from '@glife/domain/core';
import { accountFlows, type FinanceData, type FinanceRepositories } from '@glife/domain/finance';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DEFAULT_CATEGORIES } from '../components/categories';
import { createLocalFinance } from '../data/localFinanceStore';
import { createQuoteRefresher, type QuoteClient, type QuoteRefresher } from '../data/quoteRefresher';

/** Todas as transações: o saldo real soma desde o início. */
const ALL_TIME = { from: '0001-01-01', to: '9999-12-31' } as const;

interface FinanceState {
  repos: FinanceRepositories;
  /** null enquanto a primeira leitura não termina. */
  data: FinanceData | null;
  /** Relê contas, categorias, regras e orçamentos (as transações já chegam pelo watch). */
  refresh: () => Promise<void>;
  /** Cotações automáticas (ações, FIIs e cripto). */
  quotes: QuoteClient;
  quoteRefresher: QuoteRefresher;
}

const FinanceContext = createContext<FinanceState | null>(null);

/** Composto na raiz: o banco local, o dono da sessão e a fonte de cotações. Sem sessão, não há repositório. */
export function FinanceProvider({ db, userId, quotes, children }: { db: LocalDb; userId: string | null; quotes: QuoteClient; children: ReactNode }) {
  const repos = useMemo(() => (userId ? createLocalFinance(db, userId) : null), [db, userId]);
  const quoteRefresher = useMemo(
    () => (repos ? createQuoteRefresher({ client: quotes, apply: (q) => repos.investments.applyQuotes(q) }) : null),
    [repos, quotes],
  );
  // Os dados ficam presos ao repositório que os leu: trocou a sessão, somem até a nova leitura.
  const [loaded, setLoaded] = useState<{
    repos: FinanceRepositories;
    data: FinanceData;
  } | null>(null);
  const data = loaded && loaded.repos === repos ? loaded.data : null;
  const txs = useRef<FinanceData['transactions'] | null>(null);

  const readSmall = useCallback(async (r: FinanceRepositories) => {
    const [accounts, categories, rules, budgets, invest] = await Promise.all([
      r.accounts.list({ includeArchived: true }),
      r.categories.list({ includeArchived: true }),
      r.recurrences.listActive(ALL_TIME.from),
      r.budgets.list(),
      r.investments.snapshot(),
    ]);
    // Aportes e resgates ligados a contas mexem no saldo (não no orçamento).
    return { accounts, categories, rules, budgets, flows: accountFlows(invest.assets, invest.movements) };
  }, []);

  const refresh = useCallback(async () => {
    if (!repos) return;
    const small = await readSmall(repos);
    const transactions = txs.current ?? (await repos.transactions.listRange(ALL_TIME));
    txs.current = transactions;
    setLoaded({ repos, data: { ...small, transactions } });
  }, [repos, readSmall]);

  useEffect(() => {
    txs.current = null;
    if (!repos) return;
    let active = true;
    // Categorias padrão com id fixo: semear em dois aparelhos (ou antes do sync) não duplica.
    void repos.categories
      .ensureDefaults(DEFAULT_CATEGORIES)
      .catch((e) => console.warn('Falha ao criar as categorias padrão', e))
      .then(() => {
        if (active) void refresh();
      });
    const stop = repos.transactions.watchRange(
      ALL_TIME,
      (rows) => {
        txs.current = rows;
        // Uma mudança vinda do sync pode trazer contas e regras novas junto.
        void readSmall(repos).then((small) => {
          if (active) setLoaded({ repos, data: { ...small, transactions: rows } });
        });
      },
      (e) => console.warn('Falha ao ler as transações', e),
    );
    // Movimento de investimento com conta muda o saldo: relê o que é pequeno (inclui os fluxos).
    let first = true;
    const stopInvest = repos.investments.watch(
      () => {
        if (first) {
          first = false;
          return;
        }
        if (active) void refresh();
      },
      (e) => console.warn('Falha ao ler os investimentos', e),
    );
    return () => {
      active = false;
      stop();
      stopInvest();
    };
  }, [repos, refresh, readSmall]);

  const value = useMemo(
    () => (repos && quoteRefresher ? { repos, data, refresh, quotes, quoteRefresher } : null),
    [repos, data, refresh, quotes, quoteRefresher],
  );
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceState {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance precisa de <FinanceProvider> com sessão ativa');
  return ctx;
}

/** Como `useFinance`, mas null sem sessão (para blocos que outras telas compõem, como Hoje). */
export function useFinanceMaybe(): FinanceState | null {
  return useContext(FinanceContext);
}
