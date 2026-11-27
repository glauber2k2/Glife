// Folha de livros (protótipo `livros`): Antigo/Novo Testamento, busca por nome ou abreviação e, ao escolher um
// livro, a grade de capítulos. Tocar no capítulo abre o leitor.
import { BIBLE_BOOKS, findBook, type BibleBook } from '@glife/domain/bible';
import { router, type Href } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { IconButton, Input, ListGroup, NavRow, SegmentedControl, Sheet, Text, makeStyles, usePress, useTheme } from '@/shared/ui';

import { chapterHref } from './navigation';

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, '');

export function BooksSheet({
  visible,
  onClose,
  current,
  testament: initial = 'AT',
}: {
  visible: boolean;
  onClose(): void;
  current?: { book: string; chapter: number } | null;
  /** testamento aberto ao mostrar a folha (o pai troca a `key` para reabrir em outro) */
  testament?: 'AT' | 'NT';
}) {
  const s = useStyles();
  const t = useTheme();
  const [testament, setTestament] = useState<'AT' | 'NT'>(initial);
  const [query, setQuery] = useState('');
  const [book, setBook] = useState<BibleBook | null>(null);

  const list = useMemo(() => {
    const q = fold(query);
    if (!q) return BIBLE_BOOKS.filter((b) => b.testament === testament);
    const exact = findBook(query);
    return BIBLE_BOOKS.filter((b) => b === exact || fold(b.name).includes(q) || fold(b.abbr).startsWith(q));
  }, [query, testament]);

  const close = () => {
    setBook(null);
    setQuery('');
    onClose();
  };
  const open = (b: BibleBook, chapter: number) => {
    close();
    router.push(chapterHref(b.code, chapter) as Href);
  };

  return (
    <Sheet visible={visible} onClose={close} title={book ? book.name : 'Livros'} subtitle={book ? `${book.chapters} capítulos` : undefined}>
      {book ? (
        <View style={s.body}>
          <View style={s.back}>
            <IconButton icon={ChevronLeft} label="Voltar aos livros" variant="soft" size={t.size.iconButtonSmall} onPress={() => setBook(null)} />
            <Text variant="small" tone="tertiary">
              Escolha o capítulo
            </Text>
          </View>
          <ScrollView style={s.scroll} contentContainerStyle={s.grid}>
            {Array.from({ length: book.chapters }, (_, i) => (
              <ChapterButton key={i} n={i + 1} current={current?.book === book.code && current.chapter === i + 1} onPress={() => open(book, i + 1)} />
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={s.body}>
          <Input placeholder="Livro, ex.: Salmos ou Jo" value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none" />
          {!query && (
            <SegmentedControl
              label="Testamento"
              value={testament}
              onChange={setTestament}
              options={[
                { value: 'AT', label: 'Antigo Testamento' },
                { value: 'NT', label: 'Novo Testamento' },
              ]}
            />
          )}
          <ScrollView style={s.scroll}>
            {list.length ? (
              <ListGroup>
                {list.map((b) => (
                  <NavRow key={b.code} label={b.name} meta={`${b.chapters} cap.`} onPress={() => (b.chapters === 1 ? open(b, 1) : setBook(b))} />
                ))}
              </ListGroup>
            ) : (
              <Text tone="tertiary">Nenhum livro com esse nome.</Text>
            )}
          </ScrollView>
        </View>
      )}
    </Sheet>
  );
}

function ChapterButton({ n, current, onPress }: { n: number; current: boolean; onPress(): void }) {
  const s = useStyles();
  const press = usePress();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`Capítulo ${n}`}
      accessibilityState={{ selected: current }}
      style={s.cell}
    >
      <Animated.View style={[s.chapter, current && s.chapterOn, press.style]}>
        <Text variant="chip" tone={current ? 'onAccent' : 'primary'} style={s.num}>
          {n}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  body: { gap: t.space[4] },
  back: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  scroll: { maxHeight: t.layout.pickerListMaxHeight, flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -t.space[1] },
  cell: { width: `${100 / t.layout.chapterGridColumns}%`, padding: t.space[1] },
  chapter: { height: t.size.chipHeight, borderRadius: t.radius.segment, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.soft },
  chapterOn: { backgroundColor: t.colors.accent },
  num: { fontVariant: ['tabular-nums'] },
}));
