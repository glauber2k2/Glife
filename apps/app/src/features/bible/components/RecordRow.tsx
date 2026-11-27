// Linha de um registro da Bíblia: bloco do tipo (grifo na cor, sublinhado com o traço na cor, anotação em tonal),
// referência, etiqueta do tipo, o trecho do versículo (ou o título da nota) e quando foi.
import { formatRef, parseOsis, type BibleRecord, type HighlightColor } from '@glife/domain/bible';
import { Highlighter, NotebookPen, Underline } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { shortStamp } from '@/shared/lib/dates';
import { Tag, Text, makeStyles, useTheme } from '@/shared/ui';

import { useBibleText } from '../hooks/BibleData';
import { rangeLabel } from './passageLabel';

const COLOR_NAMES: Record<HighlightColor, string> = { yellow: 'amarelo', green: 'verde', blue: 'azul', pink: 'rosa' };

/** Texto dos versículos na tradução escolhida (vazio enquanto carrega ou se a tradução não tem o trecho). */
function useExcerpt(book: string, chapter: number, verses: readonly number[]): string {
  const { text, translation } = useBibleText();
  const [excerpt, setExcerpt] = useState('');
  const key = verses.join(',');
  useEffect(() => {
    let active = true;
    void text.chapter(translation.id, book, chapter).then(
      (vs) => active && setExcerpt((vs ?? []).filter((_, i) => key.split(',').includes(String(i + 1))).join(' ')),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [text, translation.id, book, chapter, key]);
  return excerpt;
}

export function RecordRow({ record, onPress }: { record: BibleRecord; onPress(): void }) {
  const s = useStyles();
  const t = useTheme();
  const ref = record.kind === 'note' ? parseOsis(record.ref) : null;
  const book = record.kind === 'note' ? (ref?.book ?? '') : record.book;
  const chapter = record.kind === 'note' ? (ref?.chapter ?? 1) : record.chapter;
  const verses = record.kind === 'note' ? (ref?.verse ? [ref.verse] : []) : record.verses;
  const excerpt = useExcerpt(book, chapter, verses);
  const label = record.kind === 'note' ? (ref ? formatRef(ref, 'name') : record.ref) : rangeLabel(book, chapter, verses);
  const kindLabel = record.kind === 'note' ? 'Anotação' : `${record.kind === 'underline' ? 'Sublinhado' : 'Grifo'} · ${COLOR_NAMES[record.color]}`;

  const lead =
    record.kind === 'note' ? (
      <View style={[s.lead, { backgroundColor: t.colors.tonal }]}>
        <NotebookPen size={t.icon.blockSmall} color={t.colors.tonalInk} strokeWidth={t.icon.strokeWidth} />
      </View>
    ) : record.kind === 'underline' ? (
      <View style={[s.lead, { backgroundColor: t.colors.soft }]}>
        <Underline size={t.icon.blockSmall} color={t.colors.highlightLine[record.color]} strokeWidth={t.icon.strokeWidth} />
      </View>
    ) : (
      <View style={[s.lead, { backgroundColor: t.colors.highlight[record.color] }]}>
        <Highlighter size={t.icon.blockSmall} color={t.colors.text} strokeWidth={t.icon.strokeWidth} />
      </View>
    );

  return (
    <Pressable style={s.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${kindLabel}, ${label}`}>
      {lead}
      <View style={s.body}>
        <View style={s.top}>
          <Text variant="item" numberOfLines={1} style={s.shrink}>
            {label}
            {record.kind === 'note' && record.extra > 0 ? ` e mais ${record.extra}` : ''}
          </Text>
          <Tag label={kindLabel} />
        </View>
        {record.kind === 'note' && (
          <Text variant="small" numberOfLines={2}>
            {record.title}
          </Text>
        )}
        {!!excerpt && (
          <Text variant="caption" tone="tertiary" numberOfLines={record.kind === 'note' ? 1 : 2}>
            {record.kind === 'underline' ? (
              <Text variant="caption" tone="secondary" style={{ textDecorationLine: 'underline', textDecorationColor: t.colors.highlightLine[record.color] }}>
                {excerpt}
              </Text>
            ) : (
              excerpt
            )}
          </Text>
        )}
      </View>
      <Text variant="micro" tone="quaternary" numeric>
        {shortStamp(record.at)}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space[3], paddingVertical: t.space[3.5], minHeight: t.size.navRow },
  lead: { width: t.size.moduleIconSmall + t.space[1], height: t.size.moduleIconSmall + t.space[1], borderRadius: t.radius.icon, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: t.space[0], gap: t.space[1] },
  top: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  shrink: { flexShrink: 1 },
}));
