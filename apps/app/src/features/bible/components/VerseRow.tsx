// Um versículo no leitor: número discreto, texto em Outfit com a marcação do usuário (marca-texto ou sublinhado)
// e, se houver notas ligadas, um marcador tocável no fim. Selecionado = fundo tonal leve. Tocar seleciona.
import type { BibleHighlight } from '@glife/domain/bible';
import { NotebookPen } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, Text, makeStyles, useTheme } from '@/shared/ui';

export interface VerseRowProps {
  verse: number;
  text: string;
  highlight: BibleHighlight | undefined;
  selected: boolean;
  /** quantas notas/itens citam este versículo */
  linked: number;
  onPress(verse: number): void;
  onLinkedPress(verse: number): void;
  onLayoutY(verse: number, y: number): void;
}

export const VerseRow = memo(function VerseRow({ verse, text, highlight, selected, linked, onPress, onLinkedPress, onLayoutY }: VerseRowProps) {
  const s = useStyles();
  const t = useTheme();
  const mark =
    highlight?.style === 'highlight'
      ? { backgroundColor: t.colors.highlight[highlight.color] }
      : highlight?.style === 'underline'
        ? { textDecorationLine: 'underline' as const, textDecorationColor: t.colors.highlightLine[highlight.color] }
        : null;
  return (
    <Pressable
      onPress={() => onPress(verse)}
      onLayout={(e) => onLayoutY(verse, e.nativeEvent.layout.y)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Versículo ${verse}${highlight ? ', marcado' : ''}${linked ? `, ${linked} ${linked === 1 ? 'nota' : 'notas'}` : ''}`}
      style={[s.row, selected && s.selected]}
    >
      <Text variant="scripture">
        <Text variant="micro" tone="tertiary">
          {verse}
          {'  '}
        </Text>
        <Text variant="scripture" style={mark}>
          {text}
        </Text>
      </Text>
      {linked > 0 && (
        <Pressable
          onPress={() => onLinkedPress(verse)}
          accessibilityRole="button"
          accessibilityLabel={`Ver ${linked === 1 ? 'a nota ligada' : `as ${linked} notas ligadas`} ao versículo ${verse}`}
          hitSlop={t.space[2]}
          style={s.marker}
        >
          <View style={s.markerInner}>
            <Icon icon={NotebookPen} size={t.icon.tiny} color="accentInk" />
            <Text variant="tag" tone="accent">
              {linked}
            </Text>
          </View>
        </Pressable>
      )}
    </Pressable>
  );
});

const useStyles = makeStyles((t) => ({
  row: {
    paddingVertical: t.space[1],
    paddingHorizontal: t.space[2],
    marginHorizontal: -t.space[2],
    borderRadius: t.radius.iconSmall,
  },
  selected: { backgroundColor: t.colors.highlightSoft },
  marker: { alignSelf: 'flex-start', marginTop: t.space[1] },
  markerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    paddingHorizontal: t.space[2],
    minHeight: t.size.tag,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.tonal,
  },
}));
