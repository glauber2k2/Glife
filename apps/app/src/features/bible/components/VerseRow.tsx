// Um versículo no leitor, um por linha: número discreto na margem (some se desligado) e o texto em Outfit com os
// ajustes de leitura. Grifo e seleção são faixas por linha com respiro entre elas (nunca encostam na linha vizinha);
// a seleção é um sobretom translúcido por cima (também sobre o grifo), sem borda. Notas ligadas: marcador no fim.
import type { BibleHighlight } from '@glife/domain/bible';
import { NotebookPen } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { Platform, Pressable, View, type TextLayoutEvent, type TextStyle } from 'react-native';

import { Icon, Text, makeStyles, useTheme } from '@/shared/ui';

import type { ReadingAdjust } from '../data/readingPrefs';
import { highlightBands, type Rect } from './highlightBands';
import { letterSpacingPx } from './readerChrome';

const WEB = Platform.OS === 'web';

export interface VerseRowProps {
  verse: number;
  text: string;
  highlight: BibleHighlight | undefined;
  selected: boolean;
  /** brilho rápido ao chegar por um link (?v=) */
  flash: boolean;
  /** quantas notas/itens citam este versículo */
  linked: number;
  reading: ReadingAdjust;
  onPress(verse: number): void;
  onLinkedPress(verse: number): void;
  onLayoutY(verse: number, y: number): void;
}

export const VerseRow = memo(function VerseRow({ verse, text, highlight, selected, flash, linked, reading, onPress, onLinkedPress, onLayoutY }: VerseRowProps) {
  const s = useStyles();
  const t = useTheme();
  const [lines, setLines] = useState<Rect[]>([]);
  const fontSize = reading.fontSize;
  const lineHeight = Math.round(fontSize * reading.lineHeight * 10) / 10;
  const textStyle: TextStyle = { fontSize, lineHeight, letterSpacing: letterSpacingPx(fontSize, reading.letterSpacing), color: t.colors.ink };

  const fill = highlight?.style === 'highlight' ? t.colors.highlight[highlight.color] : null;
  const tone = selected ? t.colors.selectionTone : flash ? t.colors.accentSoft : null;
  const underline: TextStyle | null =
    highlight?.style === 'underline'
      ? ({
          textDecorationLine: 'underline',
          textDecorationColor: t.colors.highlightLine[highlight.color],
          ...(WEB ? { textUnderlineOffset: fontSize * t.reading.underlineOffsetEm, textDecorationThickness: t.size.underline } : null),
        } as TextStyle)
      : null;

  const onTextLayout = useCallback((e: TextLayoutEvent) => setLines(e.nativeEvent.lines.map(({ x, y, width, height }) => ({ x, y, width, height }))), []);
  const bands = !WEB && (fill || tone) ? highlightBands(lines, fontSize, lineHeight) : [];

  // Web: o fundo do texto cobre só a caixa da letra; o padding vertical a estende até deixar o mesmo respiro.
  const gap = Math.max(t.reading.highlightGapEm * fontSize, t.reading.highlightGapMin);
  const webPad = Math.max(0, (lineHeight - gap - t.reading.contentBoxEm * fontSize) / 2);
  const webBand = (color: string): TextStyle =>
    ({ backgroundColor: color, paddingTop: webPad, paddingBottom: webPad, borderRadius: t.radius.bandWeb, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }) as TextStyle;

  // web: o fundo vai em spans aninhados (o Text externo é bloco dentro da View e cresceria com o padding)
  const body = WEB ? (
    <Text variant="scripture" style={[textStyle, underline]}>
      <Text style={fill ? webBand(fill) : null}>{tone ? <Text style={webBand(tone)}>{text}</Text> : text}</Text>
    </Text>
  ) : (
    <Text variant="scripture" style={[textStyle, underline]} onTextLayout={onTextLayout}>
      {text}
    </Text>
  );

  return (
    <Pressable
      onPress={() => onPress(verse)}
      onLayout={(e) => onLayoutY(verse, e.nativeEvent.layout.y)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Versículo ${verse}${highlight ? (highlight.style === 'underline' ? ', sublinhado' : ', grifado') : ''}${linked ? `, ${linked} ${linked === 1 ? 'nota' : 'notas'}` : ''}`}
      style={[s.row, { marginBottom: lineHeight * t.reading.verseGapLines }]}
    >
      {reading.verseNumbers && (
        <Text variant="micro" tone="quaternary" style={[s.number, { width: fontSize * t.reading.numberColumnEm, lineHeight }]}>
          {verse}
        </Text>
      )}
      <View style={s.text}>
        {bands.map((b, i) => (
          <View key={i} pointerEvents="none" style={[s.band, { left: b.x, top: b.y, width: b.width, height: b.height }]}>
            {fill && <View style={[s.layer, { backgroundColor: fill }]} />}
            {tone && <View style={[s.layer, { backgroundColor: tone }]} />}
          </View>
        ))}
        {body}
        {linked > 0 && (
          <Pressable
            onPress={() => onLinkedPress(verse)}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${linked === 1 ? 'a nota ligada' : `as ${linked} notas ligadas`} ao versículo ${verse}`}
            hitSlop={t.space[2]}
            style={s.marker}
          >
            <View style={s.markerInner}>
              <Icon icon={NotebookPen} size={t.icon.tiny} color="tonalInk" />
              <Text variant="tag" tone="tonal">
                {linked}
              </Text>
            </View>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
});

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  number: { textAlign: 'right', paddingRight: t.space[2] },
  text: { flex: 1, minWidth: t.space[0] },
  band: { position: 'absolute', borderRadius: t.radius.bandWeb, overflow: 'hidden' },
  layer: { position: 'absolute', top: t.space[0], left: t.space[0], right: t.space[0], bottom: t.space[0] },
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
