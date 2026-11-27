// Ações embutidas do menu do trecho: anotar (cria uma nota comum já ligada ao trecho) e copiar.
import { annotationDraft, copyText, getBook, groupVerses, type PassageBlock } from '@glife/domain/bible';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Copy, NotebookPen } from 'lucide-react-native';

import { registerPassageAction, type PassageContext } from './actions';

/** Blocos contíguos da seleção com o texto de cada um; seleção vazia = o capítulo inteiro (sem citar o texto). */
export function passageBlocks(ctx: Pick<PassageContext, 'book' | 'chapter' | 'verses' | 'texts'>): PassageBlock[] {
  if (!ctx.verses.length) return [{ ref: { book: ctx.book, chapter: ctx.chapter }, text: '' }];
  return groupVerses(ctx.book, ctx.chapter, ctx.verses).map((ref) => {
    const end = ref.verseEnd ?? ref.verse!;
    const text = ctx.texts.slice(ref.verse! - 1, end).join(' ').trim();
    return { ref, text };
  });
}

let registered = false;

export function registerBuiltinActions(): void {
  if (registered) return;
  registered = true;
  registerPassageAction({
    id: 'annotate',
    label: 'Anotar',
    icon: NotebookPen,
    appliesTo: 'both',
    run(ctx) {
      const { title, body } = annotationDraft(passageBlocks(ctx));
      ctx.close();
      router.push({ pathname: '/nota/nova', params: { titulo: title, corpo: body } });
    },
  });
  registerPassageAction({
    id: 'copy',
    label: 'Copiar',
    icon: Copy,
    appliesTo: 'verse',
    async run(ctx) {
      await Clipboard.setStringAsync(copyText(passageBlocks(ctx), ctx.translation.abbr));
      ctx.close();
      ctx.notify(`Copiado · ${getBook(ctx.book)?.name ?? ctx.book} ${ctx.chapter}`);
    },
  });
}
