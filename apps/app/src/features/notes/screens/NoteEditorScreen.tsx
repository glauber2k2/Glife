import { NOTE_TITLE_MAX, type Note, type NoteFolder, type NoteKind, type NotePatch } from '@glife/domain/notes';
import type { Tag as TagModel } from '@glife/domain/tags';
import { useLocalSearchParams } from 'expo-router';
import {
  Bold,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  CloudOff,
  EllipsisVertical,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  FolderX,
  KeyboardOff,
  List,
  PencilLine,
  Pin,
  PinOff,
  Plus,
  TextQuote,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type TextInputSelectionChangeEvent,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLinksData } from '@/features/links';
import { useSyncOnline } from '@/shared/lib/powersync';
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Input,
  NavRow,
  Pill,
  Sheet,
  Text,
  makeStyles,
  noFocusRing,
  useReduceMotion,
  useTheme,
} from '@/shared/ui';

import { FolderNameSheet } from '../components/FolderNameSheet';
import { KIND_LABEL, KIND_OPTIONS } from '../components/kinds';
import { MarkdownView } from '../components/MarkdownView';
import { NoteLinks } from '../components/NoteLinks';
import {
  applyWikilink,
  insertAt,
  prefixLines,
  toggleBold,
  wikilinkQuery,
  type Edit,
  type Selection,
} from '../components/textEdits';
import { syncNoteLinks } from '../data/noteLinks';
import { useNotesData } from '../hooks/NotesData';
import { goBack, openNote, useTrashActions } from '../hooks/useNoteActions';

const SAVE_DELAY_MS = 600;
const BAR_TITLE_AFTER = 70;
type SheetKind = 'tipo' | 'mais' | 'pasta' | 'tags' | null;
type Mode = 'read' | 'write';

/**
 * Editor da nota (protótipo "Glife Notas"): Ler ⇄ Escrever, pasta e tags, salvamento silencioso,
 * [[vínculos]] com sugestões e, no Android, barra de formatação acima do teclado.
 */
export function NoteEditorScreen() {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const { id, nova } = useLocalSearchParams<{ id: string; nova?: string }>();
  const { notes, folders } = useNotesData();
  const { links, tags } = useLinksData();
  const { moveToTrash } = useTrashActions();
  const online = useSyncOnline();

  const [note, setNote] = useState<Note | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<Mode>(nova ? 'write' : 'read');
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [folderList, setFolderList] = useState<NoteFolder[]>([]);
  const [noteTags, setNoteTags] = useState<TagModel[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [forcedSelection, setForcedSelection] = useState<Selection | undefined>();
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
    setForcedSelection(edit.selection);
    setSelection(edit.selection);
  };

  const pickSuggestion = async (titleToLink: string, create = false) => {
    if (!query) return;
    if (create) await notes.create({ title: titleToLink });
    applyEdit(applyWikilink(body, query.start, selection.start, titleToLink));
    bodyRef.current?.focus();
  };

  const onSelectionChange = (e: TextInputSelectionChangeEvent) => {
    setSelection(e.nativeEvent.selection);
    if (forcedSelection) setForcedSelection(undefined);
  };

  const openWikilink = async (target: string) => {
    const found = await notes.findIdByTitle(target);
    if (found) openNote(found);
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

  const folderName = folderList.find((f) => f.id === note.folder_id)?.name ?? 'Sem pasta';
  const showFormatBar = Platform.OS === 'android' && keyboard && bodyFocused && mode === 'write';
  const fadeIn = reduceMotion ? undefined : FadeIn.duration(t.motion.standard);
  const fadeOut = reduceMotion ? undefined : FadeOut.duration(t.motion.tap);
  const trimmedQuery = query?.query.trim() ?? '';
  const shown = query ? suggestions : [];
  const canCreate = trimmedQuery !== '' && !shown.some((n) => n.title.toLowerCase() === trimmedQuery.toLowerCase());

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Barra: voltar, tipo (ou título ao rolar), Ler/Escrever, fixar, mais ações */}
        <View style={[s.barWrap, scrolled && s.barLine]}>
          <View style={[s.column, s.bar]}>
            <View style={s.edgeLeft}>
              <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onPress={() => goBack()} />
            </View>
            <View style={s.barMiddle}>
              {scrolled ? (
                <Animated.View key="title" entering={fadeIn} exiting={fadeOut} style={s.barTitle}>
                  <Text variant="button" numberOfLines={1} style={s.barTitleText}>
                    {title || 'Sem título'}
                  </Text>
                </Animated.View>
              ) : (
                <Animated.View key="kind" entering={fadeIn} exiting={fadeOut}>
                  <Pill
                    label={KIND_LABEL[note.kind]}
                    trailingIcon={ChevronDown}
                    onPress={() => openSheet('tipo')}
                    accessibilityLabel={`Tipo: ${KIND_LABEL[note.kind]}. Trocar`}
                  />
                </Animated.View>
              )}
            </View>
            <Pill label={mode === 'write' ? 'Ler' : 'Escrever'} icon={mode === 'write' ? BookOpen : PencilLine} onPress={toggleMode} />
            <IconButton
              icon={note.pinned ? Pin : PinOff}
              label={note.pinned ? 'Desafixar' : 'Fixar'}
              variant="ghost"
              color={note.pinned ? 'accentInk' : 'textSecondary'}
              onPress={() => void saveNow({ pinned: !note.pinned })}
            />
            <View style={s.edgeRight}>
              <IconButton icon={EllipsisVertical} label="Mais ações" variant="ghost" onPress={() => openSheet('mais')} />
            </View>
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
              <Pill size="sm" bare icon={Plus} label="Tag" tone="tertiary" onPress={() => openSheet('tags')} />
              <View style={s.metaSpacer} />
              <SaveStatus saving={saving} online={online} />
            </View>

            <View style={s.divider} />

            {mode === 'write' ? (
              <Animated.View key="write" entering={fadeIn}>
                <TextInput
                  ref={bodyRef}
                  value={body}
                  onChangeText={(v) => {
                    setBody(v);
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
              </Animated.View>
            ) : (
              <Animated.View key="read" entering={fadeIn}>
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
                  <Text variant="caption" tone="tertiary">
                    {KIND_LABEL[n.kind]}
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
            <IconButton icon={Bold} label="Negrito" variant="ghost" size={t.touch.minTarget} onPress={() => applyEdit(toggleBold(body, selection))} />
            <IconButton icon={List} label="Lista" variant="ghost" size={t.touch.minTarget} onPress={() => applyEdit(prefixLines(body, selection, '- '))} />
            <IconButton
              icon={TextQuote}
              label="Citação"
              variant="ghost"
              size={t.touch.minTarget}
              onPress={() => applyEdit(prefixLines(body, selection, '> '))}
            />
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
            <View style={s.flex} />
            <IconButton icon={KeyboardOff} label="Fechar teclado" variant="ghost" size={t.touch.minTarget} onPress={() => Keyboard.dismiss()} />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Folhas */}
      <Sheet visible={sheet === 'tipo'} onClose={() => setSheet(null)} title="Tipo da nota">
        <View>
          {KIND_OPTIONS.map((o) => (
            <OptionRow
              key={o.kind}
              label={o.label}
              description={o.description}
              selected={note.kind === o.kind}
              onPress={() => {
                setSheet(null);
                void saveNow({ kind: o.kind as NoteKind });
              }}
            />
          ))}
        </View>
      </Sheet>

      <Sheet visible={sheet === 'mais'} onClose={() => setSheet(null)}>
        <View>
          <NavRow divider={false} icon={FolderInput} label="Mover para pasta" meta={folderName} onPress={() => setSheet('pasta')} />
          <NavRow danger icon={Trash2} label="Mover para a lixeira" onPress={() => void trash()} />
        </View>
      </Sheet>

      <Sheet visible={sheet === 'pasta'} onClose={() => setSheet(null)} title="Mover para pasta">
        <View>
          <OptionRow
            icon={FolderX}
            label="Sem pasta"
            selected={!note.folder_id}
            onPress={() => {
              setSheet(null);
              void saveNow({ folder_id: null });
            }}
          />
          {folderList.map((f) => (
            <OptionRow
              key={f.id}
              icon={Folder}
              label={f.name}
              selected={note.folder_id === f.id}
              onPress={() => {
                setSheet(null);
                void saveNow({ folder_id: f.id });
              }}
            />
          ))}
          <NavRow
            accent
            icon={FolderPlus}
            label="Nova pasta"
            onPress={() => {
              setSheet(null);
              setNewFolder(true);
            }}
          />
        </View>
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
          <Button label="Adicionar" variant="secondary" disabled={!tagDraft.replace(/#/g, '').trim()} onPress={() => void addTag()} />
        </View>
        <View>
          {noteTags.map((tag) => (
            <View key={tag.id} style={s.tagRow}>
              <Text variant="body" style={s.flex}>
                {`#${tag.name}`}
              </Text>
              <IconButton icon={X} label={`Tirar #${tag.name}`} variant="ghost" onPress={() => void tags.remove({ type: 'note', id }, tag.id)} />
            </View>
          ))}
        </View>
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

/** "Salvando…" sem ícone → "Salvo" com check; sem conexão, "Salvo no aparelho" com nuvem riscada. */
function SaveStatus({ saving, online }: { saving: boolean; online: boolean }) {
  const s = useStyles();
  const t = useTheme();
  const label = saving ? 'Salvando…' : online ? 'Salvo' : 'Salvo no aparelho';
  return (
    <View style={s.save} accessibilityLiveRegion="polite" accessibilityLabel={label}>
      {!saving && <Icon icon={online ? Check : CloudOff} size={t.icon.tiny} color="textTertiary" />}
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

function OptionRow({
  label,
  description,
  icon,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  icon?: LucideIcon;
  selected: boolean;
  onPress: () => void;
}) {
  const s = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [s.option, pressed && s.soft]}
    >
      {icon && <Icon icon={icon} size={t.icon.small + t.space[0.5]} color="textSecondary" />}
      <View style={s.optionTexts}>
        <Text variant="body" style={s.optionLabel}>
          {label}
        </Text>
        {description && (
          <Text variant="caption" tone="tertiary">
            {description}
          </Text>
        )}
      </View>
      {selected && <Icon icon={Check} color="accentInk" />}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => {
  const bodyLine = Math.round(t.type.body.fontSize * 1.6);
  return {
    root: { flex: 1, backgroundColor: t.colors.bg },
    flex: { flex: 1 },
    soft: { backgroundColor: t.colors.soft },
    column: {
      width: '100%',
      maxWidth: t.layout.contentMaxWidth + 2 * t.layout.gutter,
      alignSelf: 'center',
      paddingHorizontal: t.layout.gutter,
    },
    barWrap: { borderBottomWidth: t.hairline, borderBottomColor: 'transparent' },
    barLine: { borderBottomColor: t.colors.hairline },
    bar: { height: t.size.editorBar, flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
    edgeLeft: { marginLeft: -(t.space[2] + t.space[0.5]) },
    edgeRight: { marginRight: -(t.space[2] + t.space[0.5]) },
    barMiddle: { flex: 1, minWidth: 0, justifyContent: 'center' },
    barTitle: { paddingLeft: t.space[1] },
    barTitleText: { fontFamily: t.type.item.font },
    scroll: { paddingTop: t.space[3] + t.space[0.5], paddingBottom: t.space[12] },
    title: {
      fontFamily: t.type.title2.font,
      fontSize: t.type.title2.fontSize,
      lineHeight: t.type.title2.lineHeight,
      letterSpacing: t.type.title2.letterSpacing,
      color: t.colors.text,
      padding: t.space[0],
    },
    meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space[1.5], marginTop: t.space[2] + t.space[0.5] },
    metaSpacer: { flex: 1 },
    save: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
    divider: { height: t.hairline, backgroundColor: t.colors.hairline, marginVertical: t.layout.blockGap },
    body: {
      minHeight: t.size.captureFieldMinHeight * 2,
      fontFamily: t.type.body.font,
      fontSize: t.type.body.fontSize,
      lineHeight: bodyLine,
      color: t.colors.text,
      padding: t.space[0],
    },
    suggestWrap: { paddingHorizontal: t.layout.gutter, paddingBottom: t.space[2] },
    suggest: {
      width: '100%',
      maxWidth: t.layout.contentMaxWidth,
      alignSelf: 'center',
      borderWidth: t.hairline,
      borderColor: t.colors.hairline,
      borderRadius: t.radius.field,
      backgroundColor: t.colors.bg,
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
      paddingHorizontal: t.space[3],
      borderTopWidth: t.hairline,
      borderTopColor: t.colors.hairline,
      backgroundColor: t.colors.bg,
    },
    linkButton: {
      height: t.size.pill + t.space[1],
      justifyContent: 'center',
      paddingHorizontal: t.space[3],
      marginLeft: t.space[1],
      borderRadius: t.radius.full,
      borderWidth: t.hairline,
      borderColor: t.colors.hairline,
    },
    linkButtonActive: { borderColor: t.colors.accent },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[3],
      minHeight: t.size.navRow,
      paddingVertical: t.space[3],
      borderTopWidth: t.hairline,
      borderTopColor: t.colors.hairline,
    },
    optionTexts: { flex: 1, gap: t.space[0.5] },
    optionLabel: { fontFamily: t.type.item.font },
    tagForm: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
    tagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: t.size.navRow,
      borderTopWidth: t.hairline,
      borderTopColor: t.colors.hairline,
    },
  };
});
