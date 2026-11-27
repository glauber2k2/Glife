// Cabeçalho do capítulo no leitor: nome do livro em caixa-alta, o número grande em peso leve, a medida do capítulo e
// um traço curto na cor do módulo Bíblia.
import { View } from 'react-native';

import { Text, makeStyles, moduleColors, moduleHue, useTheme } from '@/shared/ui';

export function ChapterHeader({ book, chapter, verses, minutes }: { book: string; chapter: number; verses: number | null; minutes: number | null }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.root} accessibilityRole="header" accessibilityLabel={`${book} ${chapter}`}>
      <Text variant="chapterBook" tone="tertiary">
        {book}
      </Text>
      <Text variant="chapterNumber">{chapter}</Text>
      {verses !== null && minutes !== null && (
        <Text variant="caption" tone="tertiary" style={s.meta}>
          {verses} versículos · {minutes} min de leitura
        </Text>
      )}
      <View style={[s.rule, { backgroundColor: moduleColors(moduleHue.bible, t.scheme).strong }]} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { alignItems: 'flex-start', gap: t.space[0.5], marginBottom: t.space[7] },
  meta: { marginTop: t.space[1.5] },
  rule: { width: t.space[8], height: t.size.underline, borderRadius: t.radius.full, marginTop: t.space[4] },
}));
