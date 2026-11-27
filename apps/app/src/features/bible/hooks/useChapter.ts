// Versículos de um capítulo na tradução escolhida (lidos sob demanda do texto embutido ou importado).
import { useEffect, useState } from 'react';

import { useBibleText } from './BibleData';

export type ChapterState = { status: 'loading' } | { status: 'ready'; verses: string[] } | { status: 'missing' } | { status: 'error' };

export function useChapter(translationId: string, book: string, chapter: number): ChapterState {
  const { text } = useBibleText();
  const [state, setState] = useState<{ key: string; value: ChapterState }>({ key: '', value: { status: 'loading' } });
  const key = `${translationId}/${book}/${chapter}`;
  useEffect(() => {
    let active = true;
    text.chapter(translationId, book, chapter).then(
      (verses) => active && setState({ key, value: verses ? { status: 'ready', verses } : { status: 'missing' } }),
      () => active && setState({ key, value: { status: 'error' } }),
    );
    return () => {
      active = false;
    };
  }, [text, translationId, book, chapter, key]);
  return state.key === key ? state.value : { status: 'loading' };
}
