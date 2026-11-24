import { runSearch, type SearchSection } from '@glife/domain/search';
import { useEffect, useState } from 'react';

import { useSearchConfig } from './SearchContext';

const DEBOUNCE_MS = 120;

/** Resultados da consulta, com espera curta entre teclas; respostas atrasadas de consultas antigas são descartadas. */
export function useSearchResults(query: string): SearchSection[] | null {
  const { sources, actions } = useSearchConfig();
  const [sections, setSections] = useState<SearchSection[] | null>(null);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(
      () => void runSearch(sources, actions, query).then((s) => active && setSections(s)),
      query.trim() ? DEBOUNCE_MS : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [sources, actions, query]);
  return sections;
}
