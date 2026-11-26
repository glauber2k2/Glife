// Filhos estilizados do campo de escrever (markdown ao vivo): cada trecho de `liveSpans` vira um <Text> aninhado.
// As marcações ficam em cinza claro; o conteúdo já aparece em título, negrito, marca-texto etc.
// Uma raiz de texto estável e métricas explícitas também para espaços e quebras de linha.
import { useMemo } from 'react';
import { Text, type TextStyle } from 'react-native';

import { makeStyles } from '@/shared/ui';

import { liveSpans, type LiveStyle } from './liveMarkdown';

export function LiveMarkdown({ markdown }: { markdown: string }) {
  const s = useStyles();
  const spans = useMemo(() => liveSpans(markdown), [markdown]);
  return (
    <Text style={s.body}>
      {spans.map((span, i) => (
        <Text key={i} style={[s.body, ...span.styles.map((st) => s[st] as TextStyle)]}>
          {span.text}
        </Text>
      ))}
    </Text>
  );
}

const useStyles = makeStyles((t) => {
  const styles: Record<LiveStyle | 'body', TextStyle> = {
    body: { fontFamily: t.type.body.font, fontSize: t.type.body.fontSize, lineHeight: t.type.body.lineHeight, color: t.colors.text },
    h1: { fontFamily: t.type.heading.font, fontSize: t.type.heading.fontSize, lineHeight: t.type.heading.lineHeight + t.space[2] },
    h2: { fontFamily: t.type.item.font, fontSize: t.type.item.fontSize, color: t.colors.textSecondary },
    quote: { color: t.colors.textSecondary },
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
