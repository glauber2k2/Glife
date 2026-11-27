// Início da Bíblia (protótipo Bíblia v2): busca no topo, Antigo/Novo Testamento logo abaixo (visíveis ao abrir),
// leitura de hoje (planos lado a lado), continuar de onde parou, últimos registros com filtro e o crédito da tradução.
import { getBook } from '@glife/domain/bible';
import { router, type Href } from 'expo-router';
import { Bookmark, BookOpen, Library, ScrollText, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BackHeader, Card, EmptyState, Icon, IconButton, ListGroup, ModuleIcon, NavRow, Pill, Screen, Section, SectionHeader, Text, makeStyles, moduleHue } from '@/shared/ui';

import { BooksSheet } from '../components/BooksSheet';
import { chapterHref } from '../components/navigation';
import { RecordFilter } from '../components/RecordFilter';
import { RecordRow } from '../components/RecordRow';
import { openRecord } from '../components/openRecord';
import { TodayPlans } from '../components/TodayPlans';
import { TranslationSheet } from '../components/TranslationSheet';
import { useBibleText } from '../hooks/BibleData';
import { useBibleRecords, type RecordFilter as Filter } from '../hooks/useBibleRecords';

const RECENT = 4;
const TODAY_LABEL = () => {
  const s = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function BibleHomeScreen() {
  const s = useStyles();
  const { translation, last, text } = useBibleText();
  const [sheet, setSheet] = useState<'books-AT' | 'books-NT' | 'translation' | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const { records, counts, loading } = useBibleRecords(filter, RECENT);
  const resume = last ?? { book: 'GEN', chapter: 1, verse: 1 };
  const resumeBook = getBook(resume.book)!;
  const [excerpt, setExcerpt] = useState('');

  useEffect(() => {
    let active = true;
    void text.chapter(translation.id, resume.book, resume.chapter).then((vs) => active && setExcerpt(vs?.[(resume.verse ?? 1) - 1] ?? ''), () => undefined);
    return () => {
      active = false;
    };
  }, [text, translation.id, resume.book, resume.chapter, resume.verse]);

  const testament = sheet === 'books-NT' ? 'NT' : 'AT';
  return (
    <Screen
      eyebrow={TODAY_LABEL()}
      title="Bíblia"
      header={
        <BackHeader
          fallback="/"
          right={
            <View style={s.right}>
              <Pill label={translation.abbr} onPress={() => setSheet('translation')} />
              <IconButton icon={Library} label="Livros" onPress={() => setSheet('books-AT')} />
            </View>
          }
        />
      }
    >
      <Pressable style={s.search} onPress={() => router.push('/biblia/busca' as Href)} accessibilityRole="search" accessibilityLabel="Buscar na Bíblia">
        <Icon icon={Search} color="textTertiary" />
        <Text variant="body" tone="tertiary" numberOfLines={1} style={s.grow}>
          Buscar versículo ou palavra
        </Text>
      </Pressable>

      <ListGroup>
        <NavRow icon={ScrollText} hue={moduleHue.bible} iconSize="sm" label="Antigo Testamento" meta="39 livros · Gênesis a Malaquias" onPress={() => setSheet('books-AT')} />
        <NavRow icon={BookOpen} hue={moduleHue.neutral} iconSize="sm" label="Novo Testamento" meta="27 livros · Mateus a Apocalipse" onPress={() => setSheet('books-NT')} />
      </ListGroup>

      <TodayPlans />

      <Section title={last ? 'Continuar lendo' : 'Começar a leitura'}>
        <Pressable
          onPress={() => router.push(`${chapterHref(resume.book, resume.chapter)}${resume.verse ? `?v=${resume.verse}` : ''}` as Href)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir ${resumeBook.name} ${resume.chapter}`}
        >
          <Card>
            <View style={s.resume}>
              <ModuleIcon icon={Bookmark} module="bible" />
              <View style={s.grow}>
                <Text variant="caption" tone="tertiary">
                  {resumeBook.name} {resume.chapter}
                  {resume.verse ? ` · versículo ${resume.verse}` : ''}
                </Text>
                {!!excerpt && (
                  <Text variant="reading" numberOfLines={2}>
                    {excerpt}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        </Pressable>
      </Section>

      <View style={s.block}>
        <SectionHeader title="Últimos registros" actionLabel="Ver todos" onAction={() => router.push('/biblia/registros' as Href)} />
        <RecordFilter value={filter} onChange={setFilter} counts={counts} />
        {records.length ? (
          <ListGroup>
            {records.map((r) => (
              <RecordRow key={`${r.kind}.${r.id}`} record={r} onPress={() => openRecord(r)} />
            ))}
          </ListGroup>
        ) : (
          !loading && <EmptyState compact message={filter === 'all' ? 'Nada aqui ainda. No leitor, toque num versículo para grifar, sublinhar ou anotar.' : 'Nenhum registro deste tipo.'} />
        )}
      </View>

      {translation.credit && (
        <Text variant="caption" tone="quaternary">
          {translation.credit}
        </Text>
      )}

      <BooksSheet key={testament} testament={testament} visible={sheet === 'books-AT' || sheet === 'books-NT'} onClose={() => setSheet(null)} current={last} />
      <TranslationSheet visible={sheet === 'translation'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  right: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2.5],
    height: t.size.field,
    paddingHorizontal: t.space[4],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.card,
  },
  grow: { flex: 1, minWidth: t.space[0], gap: t.space[1] },
  resume: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space[3] },
  block: { gap: t.space[3] },
}));
