import type { EntityType } from '@glife/domain/core';
import { router, type Href } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { createTargetResolver, notFoundHref, targetOfRoute, type ResolveTarget, type TargetSource } from '../data/targets';
import { useLinksDataMaybe } from './LinksData';

/** Alvo sem UUID (ex.: a Bíblia, endereçada pela referência OSIS): o módulo dono diz a rota de cada endereço. */
export interface AddressRoute {
  type: EntityType;
  /** rota da tela para o ref (null: ref que essa tela não abre) */
  href(ref: string): string | null;
}

const TargetsContext = createContext<readonly TargetSource[]>([]);
const AddressContext = createContext<readonly AddressRoute[]>([]);
const NO_ADDRESSES: readonly AddressRoute[] = [];

/**
 * Registro aberto dos alvos de vínculos e avisos: cada módulo diz a tabela, a tela e como restaurar os seus itens
 * (composto na raiz). Quem abre um alvo não conhece os módulos.
 */
export function TargetsProvider({
  sources,
  addresses = NO_ADDRESSES,
  children,
}: {
  sources: readonly TargetSource[];
  addresses?: readonly AddressRoute[];
  children: ReactNode;
}) {
  return (
    <TargetsContext.Provider value={sources}>
      <AddressContext.Provider value={addresses}>{children}</AddressContext.Provider>
    </TargetsContext.Provider>
  );
}

/** Rota de um endereço sem UUID (ex.: `bible` + `JHN.3.16`); null se nenhum módulo abre esse endereço. */
export function useAddressHref(): (type: EntityType, ref: string) => string | null {
  const addresses = useContext(AddressContext);
  return useCallback((type, ref) => addresses.find((a) => a.type === type)?.href(ref) ?? null, [addresses]);
}

/** Abre um endereço sem UUID; não faz nada se nenhum módulo o abre. */
export function useOpenAddress(): (type: EntityType, ref: string) => void {
  const hrefOf = useAddressHref();
  return useCallback(
    (type, ref) => {
      const href = hrefOf(type, ref);
      if (href) router.push(href as Href);
    },
    [hrefOf],
  );
}

export function useTargetSources(): readonly TargetSource[] {
  return useContext(TargetsContext);
}

/** Se o tipo tem fonte registrada (dá para abrir ou explicar por que não abre). */
export function useHasTargetSource(): (type: EntityType) => boolean {
  const sources = useTargetSources();
  return useCallback((type) => sources.some((s) => s.type === type), [sources]);
}

/** `resolveTarget(tipo, id)`: vivo, na lixeira ou ausente neste aparelho. */
export function useResolveTarget(): ResolveTarget {
  const sources = useTargetSources();
  const rowStatus = useLinksDataMaybe()?.rowStatus ?? null;
  return useMemo(() => (rowStatus ? createTargetResolver(rowStatus, sources) : async () => 'missing' as const), [rowStatus, sources]);
}

/** Abre o item; se não estiver vivo, mostra "Item não encontrado" em vez de uma tela vazia. */
export function useOpenTarget(): (type: EntityType, id: string) => Promise<void> {
  const sources = useTargetSources();
  const resolve = useResolveTarget();
  return useCallback(
    async (type, id) => {
      const source = sources.find((s) => s.type === type);
      if (!source) return;
      const status = await resolve(type, id).catch(() => 'missing' as const);
      const href = status === 'alive' ? await source.href(id.toLowerCase()).catch(() => null) : null;
      router.push((href ?? notFoundHref({ type, id: id.toLowerCase() })) as Href);
    },
    [sources, resolve],
  );
}

/** Abre a rota de um aviso; se ela aponta para um item registrado que não está vivo, vai para "Item não encontrado". */
export function useOpenRoute(): (route: string) => Promise<void> {
  const sources = useTargetSources();
  const resolve = useResolveTarget();
  return useCallback(
    async (route) => {
      const target = targetOfRoute(route, sources);
      if (target && (await resolve(target.type, target.id).catch(() => 'missing' as const)) !== 'alive') {
        router.push(notFoundHref(target) as Href);
        return;
      }
      router.push(route as Href);
    },
    [sources, resolve],
  );
}
