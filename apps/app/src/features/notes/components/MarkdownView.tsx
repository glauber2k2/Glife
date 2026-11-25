import { useMemo } from 'react';
import { Linking, View } from 'react-native';

import { Text, makeStyles } from '@/shared/ui';

import { parseMarkdown, type Inline } from './markdown';

/**
 * Modo Ler: seção 20/500, lista com • em ink3, citação em Crimson Pro com fio de 1 px no destaque,
 * [[vínculos]] e links sublinhados no destaque. Nada vira HTML.
 */
export function MarkdownView({ markdown, onWikilink }: { markdown: string; onWikilink: (title: string) => void }) {
  const s = useStyles();
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  const inline = (parts: Inline[]) =>
    parts.map((p, i) => {
      if (p.type === 'bold' || p.type === 'italic' || p.type === 'underline' || p.type === 'strike' || p.type === 'highlight') {
        return (
          <Text key={i} style={s[p.type]}>
            {p.text}
          </Text>
        );
      }
      if (p.type === 'wikilink') {
        return (
          <Text key={i} tone="accent" style={s.link} accessibilityRole="link" onPress={() => onWikilink(p.target)}>
            {p.text}
          </Text>
        );
      }
      if (p.type === 'link') {
        return (
          <Text key={i} tone="accent" style={s.link} accessibilityRole="link" onPress={() => void Linking.openURL(p.url)}>
            {p.text}
          </Text>
        );
      }
      return p.text;
    });

  return (
    <View style={s.root}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading':
            return (
              // # título (20/500) · ## subtítulo e abaixo (17/500, um tom mais baixo).
              <Text
                key={i}
                variant={b.level === 1 ? 'heading' : 'item'}
                tone={b.level === 1 ? 'primary' : 'secondary'}
                accessibilityRole="header"
                style={i > 0 && s.headingGap}
              >
                {inline(b.inline)}
              </Text>
            );
          case 'list':
            return (
              <View key={i} style={s.list}>
                {b.items.map((item, j) => (
                  <View key={j} style={s.item}>
                    <Text tone="tertiary" style={s.body} numeric>
                      {b.ordered ? `${j + 1}.` : '•'}
                    </Text>
                    <Text style={[s.body, s.itemText]}>{inline(item)}</Text>
                  </View>
                ))}
              </View>
            );
          case 'quote':
            return (
              <View key={i} style={s.quote}>
                <Text variant="scripture" style={s.quoteText}>
                  {inline(b.inline)}
                </Text>
                {b.cite && (
                  <Text variant="eyebrow" tone="accent">
                    {b.cite}
                  </Text>
                )}
              </View>
            );
          default:
            return (
              <Text key={i} style={s.body}>
                {inline(b.inline)}
              </Text>
            );
        }
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => {
  // Corpo 15 com entrelinha 1,6 (editor), um pouco mais aberta que o texto de interface.
  const bodyLine = Math.round(t.type.body.fontSize * 1.6);
  return {
    root: { gap: t.space[3] },
    body: { lineHeight: bodyLine },
    bold: { fontFamily: t.type.button.font },
    italic: { fontStyle: 'italic' },
    underline: { textDecorationLine: 'underline' },
    strike: { textDecorationLine: 'line-through', color: t.colors.textSecondary },
    /** marca-texto só na leitura: o mel da paleta de marcação */
    highlight: { backgroundColor: t.colors.highlight.honey },
    link: { textDecorationLine: 'underline', textDecorationColor: t.colors.hairline },
    headingGap: { marginTop: t.space[1.5] },
    list: { gap: t.space[1] },
    item: { flexDirection: 'row', gap: t.space[2] + t.space[0.5] },
    itemText: { flex: 1 },
    quote: {
      marginVertical: t.space[1.5],
      paddingVertical: t.space[1],
      paddingLeft: t.space[4],
      borderLeftWidth: t.hairline,
      borderLeftColor: t.colors.accent,
      gap: t.space[1.5],
    },
    quoteText: { fontSize: t.type.scripture.fontSize - 1, lineHeight: Math.round((t.type.scripture.fontSize - 1) * 1.5) },
  };
});
