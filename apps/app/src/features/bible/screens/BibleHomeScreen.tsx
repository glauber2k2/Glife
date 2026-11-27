// Início da Bíblia (protótipo `biblia`, sem a parte de planos e devocional, que vêm depois): tradução no topo,
// continuar de onde parou, livros, "ir para" uma referência, marcações recentes e o crédito da tradução.
import { formatRef, getBook, parseBibleRef, parseOsis, recentHighlights, toOsis } from '@glife/domain/bible';
import { router, type Href } from 'expo-router';
import { BookOpen, Library } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BackHeader, Button, Card, EmptyState, Input, ListGroup, ListItem, ModuleIcon, Pill, Reveal, Screen, SectionHeader, Text, makeStyles, useTheme } from '@/shared/ui';

import { BooksSheet } from '../components/BooksSheet';
import { bibleHref, chapterHref } from '../components/navigation';
import { TranslationSheet } from '../components/TranslationSheet';
import { useBibleText, useHighlightsMaybe } from '../hooks/BibleData';

const RECENT = 6;

export function BibleHomeScreen() {
  const s = useStyles();
  const { translation, last } = useBibleText();
  const highlights = useHighlightsMaybe();
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<'books' | 'translation' | null>(null);
  const ref = query.trim() ? parseBibleRef(query) : null;
  const recent = useMemo(() => recentHighlights(highlights?.data ?? [], RECENT), [highlights?.data]);
  const go = () => {
    const href = ref && bibleHref(toOsis(ref));
    if (href) router.push(href as Href);
  };
  const resume = last ?? { book: 'GEN', chapter: 1 };
  const resumeBook = getBook(resume.book)!;

  return (
    <Screen
      header={
        <BackHeader
          title="Bíblia"
          fallback="/"
          right={<Pill label={translation.abbr} onPress={() => setSheet('translation')} />}
        />
      }
    >
      <Reveal>
        <Pressable onPress={() => router.push(chapterHref(resume.book, resume.chapter) as Href)} accessibilityRole="button">
          <Card>
            <View style={s.resume}>
              <View style={s.texts}>
                <Text variant="caption" tone="tertiary">
                  {last ? 'Continuar' : 'Começar a leitura'}
                </Text>
                <Text variant="readingTitle">
                  {resumeBook.name} {resume.chapter}
                </Text>
              </View>
              <ModuleIcon icon={BookOpen} module="bible" />
            </View>
          </Card>
        </Pressable>

        <View style={s.block}>
        <View style={s.row}>
          <Input
            placeholder="Ir para… (ex.: Jo 3:16, Sl 23)"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={go}
            style={s.grow}
          />
        </View>
        {query.trim() !== '' &&
          (ref ? (
            <Button label={`Abrir ${formatRef(ref, 'name')}`} variant="secondary" onPress={go} />
          ) : (
            <EmptyState compact message="Referência não reconhecida." />
          ))}
        <Button label="Livros" icon={Library} variant="secondary" onPress={() => setSheet('books')} />
        </View>

        <View style={s.block}>
        <SectionHeader title="Marcações recentes" />
        {recent.length ? (
          <ListGroup>
            {recent.map((h) => (
              <RecentRow key={h.id} osis={h.ref} color={h.color} underline={h.style === 'underline'} translationId={translation.id} />
            ))}
          </ListGroup>
        ) : (
          <EmptyState compact message="Toque num versículo no leitor para grifar ou anotar." />
        )}
        </View>
      </Reveal>

      {translation.credit && (
        <Text variant="caption" tone="tertiary">
          {translation.credit}
        </Text>
      )}

      <BooksSheet visible={sheet === 'books'} onClose={() => setSheet(null)} current={last} />
      <TranslationSheet visible={sheet === 'translation'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

function RecentRow({ osis, color, underline, translationId }: { osis: string; color: 'yellow' | 'green' | 'blue' | 'pink'; underline: boolean; translationId: string }) {
  const s = useStyles();
  const t = useTheme();
  const { text } = useBibleText();
  const ref = parseOsis(osis);
  const [preview, setPreview] = useState('');
  useEffect(() => {
    let active = true;
    if (ref?.verse)
      void text.chapter(translationId, ref.book, ref.chapter).then((vs) => active && setPreview(vs?.[ref.verse! - 1] ?? ''), () => undefined);
    return () => {
      active = false;
    };
  }, [text, translationId, osis]); // eslint-disable-line react-hooks/exhaustive-deps -- `ref` deriva de `osis`
  if (!ref) return null;
  return (
    <ListItem
      title={formatRef(ref, 'name')}
      subtitle={preview || (underline ? 'Sublinhado' : 'Marca-texto')}
      leading={<View style={[s.swatch, underline ? { borderBottomWidth: t.size.underline, borderColor: t.colors.highlightLine[color] } : { backgroundColor: t.colors.highlight[color] }]} />}
      onPress={() => {
        const href = bibleHref(osis);
        if (href) router.push(href as Href);
      }}
    />
  );
}

const useStyles = makeStyles((t) => ({
  resume: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  texts: { flex: 1, gap: t.space[1] },
  row: { flexDirection: 'row', gap: t.space[3] },
  grow: { flex: 1 },
  block: { gap: t.space[3] },
  swatch: { width: t.size.colorDot, height: t.size.colorDot, borderRadius: t.radius.iconSmall },
}));
