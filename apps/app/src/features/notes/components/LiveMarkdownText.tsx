// Filhos estilizados do campo de escrever (markdown ao vivo): cada trecho de `liveSpans` vira um <Text> aninhado.
// As marcações ficam em cinza claro; o conteúdo já aparece em título, negrito, marca-texto etc.
// Usa o Text do React Native (sem variante): o campo já define fonte, tamanho e cor do corpo.
import { useMemo } from 'react';
import { Text, type TextStyle } from 'react-native';

import { makeStyles } from '@/shared/ui';

import { liveSpans, type LiveStyle } from './liveMarkdown';

export function LiveMarkdown({ markdown }: { markdown: string }) {
  const s = useStyles();
  const spans = useMemo(() => liveSpans(markdown), [markdown]);
  return spans.map((span, i) =>
    span.styles.length === 0 ? (
      span.text
    ) : (
      <Text key={i} style={span.styles.map((st) => s[st] as TextStyle)}>
        {span.text}
      </Text>
    ),
  );
}

const useStyles = makeStyles((t) => {
  const styles: Record<LiveStyle, TextStyle> = {
    h1: { fontFamily: t.type.heading.font, fontSize: t.type.heading.fontSize, lineHeight: t.type.heading.lineHeight + t.space[2] },
    h2: { fontFamily: t.type.item.font, fontSize: t.type.item.fontSize, color: t.colors.textSecondary },
    quote: { fontFamily: t.type.reading.font, color: t.colors.textSecondary },
    bullet: { color: t.colors.textTertiary },
    bold: { fontFamily: t.type.button.font },
    italic: { fontStyle: 'italic' },
    underline: { textDecorationLine: 'underline' },
    strike: { textDecorationLine: 'line-through', color: t.colors.textSecondary },
    highlight: { backgroundColor: t.colors.highlight.yellow },
    link: { color: t.colors.accentInk },
    // Por último: a marcação apaga a cor (e o fundo do marca-texto) do trecho em que está.
    mark: { color: t.colors.textTertiary, fontStyle: 'normal', textDecorationLine: 'none', backgroundColor: 'transparent' },
  };
  return styles;
});
