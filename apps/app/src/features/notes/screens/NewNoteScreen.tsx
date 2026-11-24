import { NOTE_TITLE_MAX } from '@glife/domain/notes';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

import { Screen, Spinner } from '@/shared/ui';

import { useNotesData } from '../hooks/NotesData';

/** `/nota/nova?titulo=…`: cria a nota (ex.: "Nova nota: …" da busca) e troca pela tela do editor. */
export function NewNoteScreen() {
  const { notes } = useNotesData();
  const { titulo } = useLocalSearchParams<{ titulo?: string }>();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const title = (typeof titulo === 'string' ? titulo : '').trim().slice(0, NOTE_TITLE_MAX);
    void notes
      .create({ title })
      .then((n) => router.replace({ pathname: '/nota/[id]', params: { id: n.id, nova: '1' } }))
      .catch(() => router.replace('/notas'));
  }, [notes, titulo]);
  return (
    <Screen scroll={false}>
      <Spinner />
    </Screen>
  );
}
