// Fábrica de provedor de dados de uma feature: cria o repositório para o banco e o dono da sessão (injetados na raiz),
// assina o `watch` e entrega repositório + retrato atual. Sem sessão, não há repositório (`useMaybe` = null).
import type { LocalDb } from '@glife/domain/core';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface Watchable<S> {
  watch(listener: (snapshot: S) => void, onError?: (e: unknown) => void): () => void;
}

export interface SnapshotState<R, S> {
  repo: R;
  /** null enquanto a primeira leitura não termina */
  data: S | null;
}

export function createSnapshotProvider<R extends Watchable<S>, S>(name: string, create: (db: LocalDb, userId: string) => R) {
  const Context = createContext<SnapshotState<R, S> | null>(null);

  function Provider({ db, userId, children }: { db: LocalDb; userId: string | null; children: ReactNode }) {
    const repo = useMemo(() => (userId ? create(db, userId) : null), [db, userId]);
    // O retrato fica preso ao repositório que o leu: trocou a sessão, some até a nova leitura.
    const [loaded, setLoaded] = useState<{ repo: R; data: S } | null>(null);
    useEffect(() => {
      if (!repo) return;
      return repo.watch(
        (data) => setLoaded({ repo, data }),
        (e) => console.warn(`Falha ao ler ${name}`, e),
      );
    }, [repo]);
    const value = useMemo(() => (repo ? { repo, data: loaded && loaded.repo === repo ? loaded.data : null } : null), [repo, loaded]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  /** Telas da feature (só existem com sessão). */
  function use(): SnapshotState<R, S> {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(`${name} precisa do provedor com sessão ativa`);
    return ctx;
  }

  /** Blocos que outras telas compõem (Hoje): null sem sessão. */
  const useMaybe = (): SnapshotState<R, S> | null => useContext(Context);

  return { Provider, use, useMaybe };
}
