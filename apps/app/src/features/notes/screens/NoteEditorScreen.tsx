import { NOTE_TITLE_MAX, type Note, type NotePatch } from '@glife/domain/notes';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Pin, PinOff, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { shortStamp } from '@/shared/lib/dates';
import { EmptyState, IconButton, Screen, Text, makeStyles, noFocusRing, useTheme } from '@/shared/ui';

import { useNotesData } from '../hooks/NotesData';

const SAVE_DELAY_MS = 600;

/** "Editada às 14:30", "Editada ontem", "Editada em 22/11". */
const editedLabel = (stamp: string) =>
  stamp === 'ontem' ? 'Editada ontem' : stamp.includes(':') ? `Editada às ${stamp}` : `Editada em ${stamp}`;
const KIND_LABEL: Record<Note['kind'], string> = { note: 'Nota', devotional: 'Devocional', journal: 'Diário' };

/**
 * Editor básico: título e corpo em markdown, salvando sozinho no banco local.
 * Prototipagem pendente: modo leitura com pré-visualização, pastas, vínculos ([[…]]) e lixeira.
 */
export function NoteEditorScreen() {
  const s = useStyles();
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notes } = useNotesData();
  const [note, setNote] = useState<Note | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const pending = useRef<NotePatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removed = useRef(false);

  useEffect(() => {
    let active = true;
    void notes.get(id).then((n) => {
      if (!active) return;
      setNote(n);
      setTitle(n?.title ?? '');
      setBody(n?.body_md ?? '');
    });
    return () => {
      active = false;
    };
  }, [notes, id]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (removed.current || Object.keys(patch).length === 0) return;
    setNote(await notes.update(id, patch));
  }, [notes, id]);

  const schedule = (patch: NotePatch) => {
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  // Ao sair: grava o que falta; nota que ficou vazia não vira lixo na lista.
  const latest = useRef({ title, body });
  useEffect(() => {
    latest.current = { title, body };
  }, [title, body]);
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

  if (note === undefined) return <Screen>{null}</Screen>;
  if (note === null) {
    return (
      <Screen title="Nota">
        <EmptyState message="Esta nota não existe mais neste aparelho." actionLabel="Voltar" onAction={() => router.back()} />
      </Screen>
    );
  }

  const togglePin = async () => {
    await flush();
    setNote(await notes.update(id, { pinned: !note.pinned }));
  };
  const remove = async () => {
    removed.current = true;
    if (timer.current) clearTimeout(timer.current);
    await notes.remove(id);
    router.back();
  };

  return (
    <Screen>
      <View style={s.bar}>
        <View style={s.back}>
          <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" size={t.touch.minTarget} onPress={() => router.back()} />
        </View>
        <View style={s.actions}>
          <Text variant="label" tone="tertiary">
            {KIND_LABEL[note.kind]}
          </Text>
          <IconButton
            icon={note.pinned ? PinOff : Pin}
            label={note.pinned ? 'Desafixar' : 'Fixar'}
            variant="ghost"
            color={note.pinned ? 'accentInk' : 'text'}
            onPress={() => void togglePin()}
          />
          <IconButton icon={Trash2} label="Mover para a lixeira" variant="ghost" onPress={() => void remove()} />
        </View>
      </View>

      <View style={s.head}>
        <TextInput
          value={title}
          onChangeText={(v) => {
            const clean = v.replace(/[\r\n]+/g, ' ');
            setTitle(clean);
            schedule({ title: clean });
          }}
          placeholder="Título"
          placeholderTextColor={t.colors.textTertiary}
          selectionColor={t.colors.accent}
          accessibilityLabel="Título"
          style={[s.title, noFocusRing]}
          maxLength={NOTE_TITLE_MAX}
          returnKeyType="next"
        />
        <Text variant="caption" tone="tertiary" numeric>
          {editedLabel(shortStamp(note.updated_at))}
        </Text>
      </View>

      <TextInput
        value={body}
        onChangeText={(v) => {
          setBody(v);
          schedule({ body_md: v });
        }}
        placeholder="Escreva em markdown. [[Título]] liga a outra nota."
        placeholderTextColor={t.colors.textTertiary}
        selectionColor={t.colors.accent}
        accessibilityLabel="Texto da nota"
        multiline
        textAlignVertical="top"
        scrollEnabled={false}
        style={[s.body, noFocusRing]}
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -t.space[3] },
  back: { marginLeft: -(t.space[2] + t.space[0.5]) },
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
  head: { gap: t.space[1.5] },
  title: {
    fontFamily: t.type.title2.font,
    fontSize: t.type.title2.fontSize,
    lineHeight: t.type.title2.lineHeight,
    letterSpacing: t.type.title2.letterSpacing,
    color: t.colors.text,
    padding: t.space[0],
  },
  body: {
    minHeight: t.size.captureFieldMinHeight * 2,
    fontFamily: t.type.body.font,
    fontSize: t.type.body.fontSize,
    lineHeight: t.type.body.lineHeight + t.space[0.5],
    color: t.colors.text,
    padding: t.space[0],
  },
}));
