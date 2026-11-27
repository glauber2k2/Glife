import { NOTE_BODY_MAX, NOTE_TITLE_MAX } from '@glife/domain/notes';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useLinksData } from '@/features/links';
import { errorText } from '@/shared/lib/errorText';
import { Screen, Spinner, useToast } from '@/shared/ui';

import { createNoteWithBody } from '../data/noteLinks';
import { useNotesData } from '../hooks/NotesData';

/**
 * `/nota/nova?titulo=…&corpo=…`: cria a nota (ex.: "Nova nota: …" da busca, "Anotar" no leitor da Bíblia) com os
 * vínculos dos `[[…]]` do corpo e troca pela tela do editor.
 */
export function NewNoteScreen() {
  const { notes } = useNotesData();
  const { links } = useLinksData();
  const toast = useToast();
  const { titulo, corpo } = useLocalSearchParams<{ titulo?: string; corpo?: string }>();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const title = (typeof titulo === 'string' ? titulo : '').trim().slice(0, NOTE_TITLE_MAX);
    const body = (typeof corpo === 'string' ? corpo : '').slice(0, NOTE_BODY_MAX);
    void createNoteWithBody({ notes, links }, { title, body })
      .then((n) => router.replace({ pathname: '/nota/[id]', params: { id: n.id, nova: '1' } }))
      .catch((e: unknown) => {
        if (body) toast({ message: `Não deu para criar a nota ligada ao trecho: ${errorText(e)}` });
        if (router.canGoBack()) router.back();
        else router.replace('/notas');
      });
  }, [notes, links, titulo, corpo, toast]);
  return (
    <Screen scroll={false}>
      <Spinner />
    </Screen>
  );
}
