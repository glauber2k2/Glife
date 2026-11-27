import { parseBibleRef, toOsis } from '@glife/domain/bible';
import { NOTE_TITLE_MAX, folderPath, type Note, type NoteFolder, type NotePatch } from '@glife/domain/notes';
import type { Tag as TagModel } from '@glife/domain/tags';
import { useLocalSearchParams } from 'expo-router';
import {
  Bold,
  ChevronLeft,
  CloudOff,
  Ellipsis,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  KeyboardOff,
  List,
  Pin,
  PinOff,
  Plus,
  Strikethrough,
  TextQuote,
  Trash2,
  Underline,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ComponentRef } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type TextInputSelectionChangeEvent,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLinksData, useOpenAddress } from '@/features/links';
import { useSyncOnline } from '@/shared/lib/powersync';
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Input,
  ListGroup,
  NavRow,
  Pill,
  SegmentedControl,
  Sheet,
  Text,
  makeStyles,
  noFocusRing,
  useReduceMotion,
  useTheme,
} from '@/shared/ui';

import { FolderNameSheet } from '../components/FolderNameSheet';
import { FolderPicker } from '../components/FolderPicker';
import { INLINE_MARKS } from '../components/markdown';
import { editorLineHeight } from '../components/editorLineHeight';
import { LiveMarkdown } from '../components/LiveMarkdownText';
import { MarkdownView } from '../components/MarkdownView';
import { NoteLinks } from '../components/NoteLinks';
import {
  applyWikilink,
  insertAt,
  prefixLines,
  toggleHeading,
  toggleWrap,
  wikilinkQuery,
  type Edit,
  type Selection,
} from '../components/textEdits';
import { syncNoteLinks } from '../data/noteLinks';
import { cursorIn, editorSelectionReducer, initialEditorSelection } from '../hooks/editorSelection';
import { useNotesData } from '../hooks/NotesData';
import { goBack, openNote, useTrashActions } from '../hooks/useNoteActions';

const SAVE_DELAY_MS = 600;
const BAR_TITLE_AFTER = 70;
type SheetKind = 'mais' | 'pasta' | 'tags' | null;
type Mode = 'read' | 'write';
const MODES = [
  { value: 'read' as const, label: 'Ler' },
  { value: 'write' as const, label: 'Escrever' },
];

/**
 * Editor da nota (protótipo "Glife Notas"): Ler ⇄ Escrever, pasta e tags, salvamento silencioso,
 * [[vínculos]] com sugestões e, no Android, barra de formatação acima do teclado.
 */
/** Markdown ao vivo no campo de escrever (o TextInput nativo aceita filhos com estilo; o do web, não). */
const LIVE = Platform.OS !== 'web';

export function NoteEditorScreen() {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const { id, nova } = useLocalSearchParams<{ id: string; nova?: string }>();
  const { notes, folders } = useNotesData();
  const openAddress = useOpenAddress();
  const { links, tags } = useLinksData();
  const { moveToTrash } = useTrashActions();
  const online = useSyncOnline();

  const [note, setNote] = useState<Note | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // Escrever mostra a formatação ao vivo (Android/iOS) com as marcações apagadas; Ler mostra a nota limpa, sem elas.
  const [mode, setMode] = useState<Mode>(nova ? 'write' : 'read');
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [folderList, setFolderList] = useState<NoteFolder[]>([]);
  const [noteTags, setNoteTags] = useState<TagModel[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [scrolled, setScrolled] = useState(false);
  // Seleção crua do campo (o evento nativo pode chegar antes do texto novo); só é limitada ao texto ao usar.
  const [cursor, dispatchCursor] = useReducer(editorSelectionReducer, initialEditorSelection);
  const [bodyFocused, setBodyFocused] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [linkVersion, setLinkVersion] = useState(0);
  const [suggestions, setSuggestions] = useState<Note[]>([]);

  const bodyRef = useRef<ComponentRef<typeof TextInput>>(null);
  const pending = useRef<NotePatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removed = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title, body });
  useEffect(() => {
    latest.current = { title, body };
  }, [title, body]);

  // ---------- carregar ----------
  useEffect(() => {
    let active = true;
    void notes.get(id).then((n) => {
      if (!active) return;
      setNote(n);
      setTitle(n?.title ?? '');
      setBody(n?.body_md ?? '');
      // Nota sem texto abre para escrever.
      if (n && !n.body_md.trim()) setMode('write');
    });
    return () => {
      active = false;
    };
  }, [notes, id]);

  useEffect(() => tags.watchForEntity({ type: 'note', id }, setNoteTags), [tags, id]);
  useEffect(() => {
    void folders.list().then(setFolderList);
  }, [folders, sheet]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // ---------- salvar ----------
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (removed.current || Object.keys(patch).length === 0) {
      setSaving(false);
      return;
    }
    try {
      setNote(await notes.update(id, patch));
      if (patch.body_md !== undefined) {
        await syncNoteLinks({ notes, links }, id, patch.body_md);
        setLinkVersion((v) => v + 1);
      }
    } finally {
      setSaving(false);
    }
  }, [notes, links, id]);

  const schedule = (patch: NotePatch) => {
    pending.current = { ...pending.current, ...patch };
    setSaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  const saveNow = async (patch: NotePatch) => {
    await flush();
    setNote(await notes.update(id, patch));
  };

  // Ao sair: grava o que falta; nota que ficou vazia não vira lixo na lista.
  useEffect(
    () => () => {
      const empty = !latest.current.title.trim() && !latest.current.body.trim();
      if (empty && !removed.current) {
        removed.current = true;
        void notes.remove(id).catch(() => {});
      } else void flush();
    },
    [notes, id, flush],
  );

  const selection = useMemo(() => cursorIn(body, cursor), [body, cursor]);
  const forcedSelection = useMemo(() => cursor.forced && cursorIn(body, { raw: cursor.forced }), [body, cursor.forced]);

  // ---------- [[ sugestões ----------
  const query = mode === 'write' && bodyFocused ? wikilinkQuery(body, selection.start) : null;
  const q = query?.query ?? null;
  useEffect(() => {
    let active = true;
    if (q === null) return;
    void notes.list({ search: q.trim() || undefined }, { limit: 6 }).then((page) => {
      if (active) setSuggestions(page.items.filter((n) => n.id !== id && n.title.trim()).slice(0, 5));
    });
    return () => {
      active = false;
    };
  }, [notes, q, id]);

  // ---------- edições ----------
  const applyEdit = (edit: Edit) => {
    setBody(edit.text);
    schedule({ body_md: edit.text });
    dispatchCursor({ type: 'edit', edit });
  };

  const pickSuggestion = async (titleToLink: string, create = false) => {
    if (!query) return;
    if (create) await notes.create({ title: titleToLink });
    applyEdit(applyWikilink(body, query.start, selection.start, titleToLink));
    bodyRef.current?.focus();
  };

  const onSelectionChange = (e: TextInputSelectionChangeEvent) => {
    dispatchCursor({ type: 'native', selection: e.nativeEvent.selection });
  };

  const openWikilink = async (target: string) => {
    const found = await notes.findIdByTitle(target);
    if (found) return openNote(found);
    // Sem nota com esse título: "[[Jo 3:16]]" abre o versículo no leitor.
    const verse = parseBibleRef(target);
    if (verse) openAddress('bible', toOsis(verse));
  };

  const toggleMode = () => {
    if (mode === 'write') {
      Keyboard.dismiss();
      void flush();
    }
    setMode(mode === 'write' ? 'read' : 'write');
  };

  const openSheet = (kind: SheetKind) => {
    Keyboard.dismiss();
    setSheet(kind);
  };

  const addTag = async () => {
    if (!tagDraft.replace(/#/g, '').trim()) return;
    await tags.add({ type: 'note', id }, tagDraft);
    setTagDraft('');
  };

  const trash = async () => {
    removed.current = true;
    if (timer.current) clearTimeout(timer.current);
    setSheet(null);
    goBack();
    await moveToTrash(id);
  };

  // ---------- render ----------
  if (note === undefined) return <SafeAreaView style={s.root} />;
  if (note === null) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.column}>
          <EmptyState message="Esta nota não existe mais neste aparelho." actionLabel="Voltar" onAction={() => goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const folderName = note.folder_id ? folderPath(folderList, note.folder_id) || 'Sem pasta' : 'Sem pasta';
  const showFormatBar = Platform.OS === 'android' && keyboard && bodyFocused && mode === 'write';
  const fadeIn = reduceMotion ? undefined : FadeIn.duration(t.motion.standard);
  const fadeOut = reduceMotion ? undefined : FadeOut.duration(t.motion.tap);
  const trimmedQuery = query?.query.trim() ?? '';
  const shown = query ? suggestions : [];
  const canCreate = trimmedQuery !== '' && !shown.some((n) => n.title.toLowerCase() === trimmedQuery.toLowerCase());

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior="padding">
        {/* Barra (TopBar do Cobalto): voltar, estado de salvamento (ou o título ao rolar), fixar e mais ações */}
        <View style={[s.barWrap, scrolled && s.barLine]}>
          <View style={[s.column, s.bar]}>
            <IconButton icon={ChevronLeft} label="Voltar" onPress={() => goBack()} />
            <View style={s.barMiddle}>
              {scrolled ? (
                <Animated.View key="title" entering={fadeIn} exiting={fadeOut} style={s.barTitle}>
                  <Text variant="emphasis" align="center" numberOfLines={1}>
                    {title || 'Sem título'}
                  </Text>
                </Animated.View>
              ) : (
                <Animated.View key="save" entering={fadeIn} exiting={fadeOut}>
                  <SaveStatus saving={saving} online={online} />
                </Animated.View>
              )}
            </View>
            <IconButton
              icon={note.pinned ? Pin : PinOff}
              label={note.pinned ? 'Desafixar' : 'Fixar'}
              variant={note.pinned ? 'tonal' : 'card'}
              onPress={() => void saveNow({ pinned: !note.pinned })}
            />
            <IconButton icon={Ellipsis} label="Mais ações" onPress={() => openSheet('mais')} />
          </View>
        </View>

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(e) => {
            const past = e.nativeEvent.contentOffset.y > BAR_TITLE_AFTER;
            if (past !== scrolled) setScrolled(past);
          }}
        >
          <View style={s.column}>
            <View style={s.modeRow}>
              <SegmentedControl
                label="Modo"
                options={MODES}
                value={mode}
                onChange={(m) => {
                  if (m !== mode) toggleMode();
                }}
              />
            </View>
            <TextInput
              value={title}
              editable={mode === 'write'}
              onChangeText={(v) => {
                const clean = v.replace(/[\r\n]+/g, ' ');
                setTitle(clean);
                schedule({ title: clean });
              }}
              placeholder="Título"
              placeholderTextColor={t.colors.textTertiary}
              selectionColor={t.colors.accent}
              accessibilityLabel="Título"
              autoFocus={!!nova}
              multiline
              submitBehavior="blurAndSubmit"
              returnKeyType="next"
              onSubmitEditing={() => bodyRef.current?.focus()}
              maxLength={NOTE_TITLE_MAX}
              style={[s.title, noFocusRing]}
            />

            {/* Pasta, tags e estado de salvamento numa só linha */}
            <View style={s.meta}>
              <Pill size="sm" icon={Folder} label={folderName} tone="secondary" onPress={() => openSheet('pasta')} />
              {noteTags.map((tag) => (
                <Pill key={tag.id} size="sm" label={`#${tag.name}`} tone="secondary" onPress={() => openSheet('tags')} />
              ))}
              <Pill size="sm" icon={Plus} label="Tag" tone="tertiary" onPress={() => openSheet('tags')} />
            </View>

            {mode === 'write' ? (
              <Animated.View key="write" entering={fadeIn} style={s.pane}>
                <View style={s.bodyCard}>
                <TextInput
                  ref={bodyRef}
                  // Ao vivo: o texto vem como filhos estilizados (o mesmo markdown, com as marcações apagadas).
                  {...(LIVE ? { children: <LiveMarkdown markdown={body} /> } : { value: body })}
                  onChangeText={(v) => {
                    setBody(v);
                    dispatchCursor({ type: 'text' });
                    schedule({ body_md: v });
                  }}
                  onSelectionChange={onSelectionChange}
                  selection={forcedSelection}
                  onFocus={() => {
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    setBodyFocused(true);
                  }}
                  // O toque numa sugestão tira o foco antes do clique: fecha só um instante depois.
                  onBlur={() => {
                    blurTimer.current = setTimeout(() => setBodyFocused(false), t.motion.standard);
                  }}
                  placeholder="Comece a escrever. Use [[ para ligar a outra nota."
                  placeholderTextColor={t.colors.textTertiary}
                  selectionColor={t.colors.accent}
                  accessibilityLabel="Texto da nota"
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  style={[s.body, noFocusRing]}
                />
                </View>
                {LIVE && <NoteLinks noteId={id} version={linkVersion} />}
              </Animated.View>
            ) : (
              <Animated.View key="read" entering={fadeIn} style={s.pane}>
                {body.trim() ? (
                  <MarkdownView markdown={body} onWikilink={(target) => void openWikilink(target)} />
                ) : (
                  <Text tone="tertiary">Nota vazia. Toque em Escrever para começar.</Text>
                )}
                <NoteLinks noteId={id} version={linkVersion} />
              </Animated.View>
            )}
          </View>
        </ScrollView>

        {query && (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(t.motion.tap)} style={s.suggestWrap}>
            <View style={s.suggest}>
              <Text variant="label" tone="tertiary" style={s.suggestLabel}>
                Ligar a
              </Text>
              {shown.map((n, i) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  onPress={() => void pickSuggestion(n.title)}
                  style={({ pressed }) => [s.suggestRow, (i === 0 || pressed) && s.soft]}
                >
                  <Icon icon={FileText} size={t.icon.small} color="textSecondary" />
                  <Text variant="body" numberOfLines={1} style={s.suggestTitle}>
                    {n.title}
                  </Text>
                </Pressable>
              ))}
              {canCreate && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void pickSuggestion(trimmedQuery, true)}
                  style={({ pressed }) => [s.suggestRow, s.suggestCreate, pressed && s.soft]}
                >
                  <Icon icon={Plus} size={t.icon.small} color="accentInk" />
                  <Text variant="body" tone="accent" numberOfLines={1} style={s.suggestTitle}>
                    {`Nova nota: “${trimmedQuery}”`}
                  </Text>
                </Pressable>
              )}
              {!shown.length && !canCreate && (
                <Text variant="small" tone="tertiary" style={s.suggestLabel}>
                  Digite o título de uma nota.
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {showFormatBar && (
          <View style={s.formatBar}>
            {/* Rola na horizontal: em 360 dp os botões não cabem todos; "fechar teclado" fica sempre à vista. */}
            <ScrollView horizontal style={s.flex} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={s.formatScroll}>
              {formatActions(body, selection).map((a) => (
                <IconButton key={a.label} icon={a.icon} label={a.label} variant="ghost" size={t.touch.minTarget} onPress={() => applyEdit(a.edit())} />
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ligar a outra nota"
                onPress={() => applyEdit(insertAt(body, selection, '[['))}
                style={({ pressed }) => [s.linkButton, query && s.linkButtonActive, pressed && s.soft]}
              >
                <Text variant="chip" tone={query ? 'accent' : 'primary'}>
                  {'[[ ]]'}
                </Text>
              </Pressable>
            </ScrollView>
            <IconButton icon={KeyboardOff} label="Fechar teclado" variant="ghost" size={t.touch.minTarget} onPress={() => Keyboard.dismiss()} />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Folhas */}
      <Sheet visible={sheet === 'mais'} onClose={() => setSheet(null)}>
        <ListGroup>
          <NavRow icon={FolderInput} label="Mover para pasta" meta={folderName} onPress={() => setSheet('pasta')} />
          <NavRow danger icon={Trash2} label="Mover para a lixeira" onPress={() => void trash()} />
        </ListGroup>
      </Sheet>

      <Sheet visible={sheet === 'pasta'} onClose={() => setSheet(null)} title="Mover para pasta">
        <FolderPicker folders={folderList} selectedId={note.folder_id} onPick={(f) => {
          setSheet(null);
          void saveNow({ folder_id: f?.id ?? null });
        }} footer={<NavRow
            accent
            icon={FolderPlus}
            label="Nova pasta"
            onPress={() => {
              setSheet(null);
              setNewFolder(true);
            }}
          />} />
      </Sheet>

      <Sheet visible={sheet === 'tags'} onClose={() => setSheet(null)} title="Tags">
        <View style={s.tagForm}>
          <View style={s.flex}>
            <Input
              label="Nova tag"
              value={tagDraft}
              onChangeText={setTagDraft}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => void addTag()}
            />
          </View>
          <Button
            selfAlign="center"
            label="Adicionar"
            variant="secondary"
            disabled={!tagDraft.replace(/#/g, '').trim()}
            onPress={() => void addTag()}
          />
        </View>
        <ListGroup>
          {noteTags.map((tag) => (
            <View key={tag.id} style={s.tagRow}>
              <Text variant="body" style={s.flex}>
                {`#${tag.name}`}
              </Text>
              <IconButton icon={X} label={`Tirar #${tag.name}`} variant="ghost" onPress={() => void tags.remove({ type: 'note', id }, tag.id)} />
            </View>
          ))}
        </ListGroup>
      </Sheet>

      <FolderNameSheet
        visible={newFolder}
        onClose={() => setNewFolder(false)}
        onCreated={(f) => {
          setNewFolder(false);
          void saveNow({ folder_id: f.id });
        }}
      />
    </SafeAreaView>
  );
}

/** "Salvando…" com ponto cinza → "Salvo" com ponto verde; sem conexão, "Salvo no aparelho" com nuvem riscada. */
function SaveStatus({ saving, online }: { saving: boolean; online: boolean }) {
  const s = useStyles();
  const t = useTheme();
  const label = saving ? 'Salvando…' : online ? 'Salvo' : 'Salvo no aparelho';
  return (
    <View style={s.save} accessibilityLiveRegion="polite" accessibilityLabel={label}>
      {online || saving ? <View style={[s.saveDot, saving ? s.saveDotBusy : s.saveDotOk]} /> : <Icon icon={CloudOff} size={t.icon.tiny} color="textTertiary" />}
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

/** Botões da barra de formatação, na ordem: título, subtítulo, estilos de trecho, lista e citação. */
function formatActions(body: string, selection: Selection): { label: string; icon: LucideIcon; edit: () => Edit }[] {
  const wrap = (mark: string) => () => toggleWrap(body, selection, mark);
  return [
    { label: 'Título', icon: Heading1, edit: () => toggleHeading(body, selection, 1) },
    { label: 'Subtítulo', icon: Heading2, edit: () => toggleHeading(body, selection, 2) },
    { label: 'Negrito', icon: Bold, edit: wrap(INLINE_MARKS.bold) },
    { label: 'Itálico', icon: Italic, edit: wrap(INLINE_MARKS.italic) },
    { label: 'Sublinhado', icon: Underline, edit: wrap(INLINE_MARKS.underline) },
    { label: 'Tachado', icon: Strikethrough, edit: wrap(INLINE_MARKS.strike) },
    { label: 'Marca-texto', icon: Highlighter, edit: wrap(INLINE_MARKS.highlight) },
    { label: 'Lista', icon: List, edit: () => prefixLines(body, selection, '- ') },
    { label: 'Citação', icon: TextQuote, edit: () => prefixLines(body, selection, '> ') },
  ];
}

const useStyles = makeStyles((t) => {
  return {
    root: { flex: 1, backgroundColor: t.colors.bg },
    flex: { flex: 1 },
    soft: { backgroundColor: t.colors.bg },
    column: {
      width: '100%',
      maxWidth: t.layout.contentMaxWidth + 2 * t.layout.gutter,
      alignSelf: 'center',
      paddingHorizontal: t.layout.gutter,
    },
    barWrap: { borderBottomWidth: t.hairline, borderBottomColor: 'transparent' },
    barLine: { borderBottomColor: t.colors.hairline },
    bar: { height: t.size.editorBar, flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
    // alignItems flex-start: a pílula do tipo fica do tamanho do texto (não estica na coluna).
    barMiddle: { flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'center' },
    barTitle: { alignSelf: 'stretch' },
    modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[2.5], marginBottom: t.space[5] },
    pane: { marginTop: t.space[5] },
    scroll: { paddingTop: t.space[2], paddingBottom: t.space[12] },
    title: {
      fontFamily: t.type.title.font,
      fontSize: t.type.title.fontSize - t.space[1],
      lineHeight: t.type.title.lineHeight - t.space[0.5],
      letterSpacing: t.type.title.letterSpacing,
      color: t.colors.text,
      padding: t.space[0],
    },
    meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space[1.5], marginTop: t.space[2] + t.space[0.5] },
    save: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
    saveDot: { width: t.size.badge - t.space[0.5], height: t.size.badge - t.space[0.5], borderRadius: t.radius.full },
    saveDotBusy: { backgroundColor: t.colors.textQuaternary },
    saveDotOk: { backgroundColor: t.colors.success },
    bodyCard: { backgroundColor: t.colors.card, borderRadius: t.radius.fieldLarge, paddingHorizontal: t.space[4], paddingVertical: t.space[3.5] },
    body: {
      minHeight: t.size.captureFieldMinHeight * 2,
      fontFamily: t.type.body.font,
      fontSize: t.type.body.fontSize,
      ...editorLineHeight(t.type.body.lineHeight),
      color: t.colors.text,
      padding: t.space[0],
    },
    suggestWrap: { paddingHorizontal: t.layout.gutter, paddingBottom: t.space[2] },
    suggest: {
      width: '100%',
      maxWidth: t.layout.contentMaxWidth,
      alignSelf: 'center',
      borderRadius: t.radius.tile,
      backgroundColor: t.colors.card,
      boxShadow: t.colors.shadow.level2,
      paddingVertical: t.space[1.5],
    },
    suggestLabel: { paddingHorizontal: t.space[4], paddingTop: t.space[2], paddingBottom: t.space[1.5] },
    suggestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[3],
      minHeight: t.size.navRow,
      marginHorizontal: t.space[1.5],
      paddingHorizontal: t.space[2] + t.space[0.5],
      borderRadius: t.space[3],
    },
    suggestCreate: { marginTop: t.space[1], borderTopWidth: t.hairline, borderTopColor: t.colors.hairline, borderRadius: t.space[0] },
    suggestTitle: { flex: 1, minWidth: 0, fontFamily: t.type.item.font },
    formatBar: {
      height: t.size.formatBar,
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[0.5],
      paddingRight: t.space[3],
      borderTopWidth: t.hairline,
      borderTopColor: t.colors.hairline,
      backgroundColor: t.colors.card,
    },
    formatScroll: { flexDirection: 'row', alignItems: 'center', gap: t.space[0.5], paddingLeft: t.space[3], paddingRight: t.space[2] },
    linkButton: {
      height: t.size.pill + t.space[1],
      justifyContent: 'center',
      paddingHorizontal: t.space[3],
      marginLeft: t.space[1],
      borderRadius: t.radius.full,
      backgroundColor: t.colors.bg,
    },
    linkButtonActive: { backgroundColor: t.colors.tonal },
    hidden: { opacity: t.opacity.hidden },
    tagForm: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
    tagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: t.size.navRow,
      paddingVertical: t.space[2],
    },
  };
});
