// Ações rápidas pelo toque longo numa nota da lista (abrir, mover para a lixeira) e o menu de uma pasta
// (renomear, excluir — com escolha do que fazer com as notas de dentro).
import { isRepositoryError } from '@glife/domain/core';
import { FOLDER_NAME_MAX, type Note, type NoteFolder } from '@glife/domain/notes';
import { FolderInput, FolderOpen, Pencil, Trash2 } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Button, Input, ListGroup, NavRow, Sheet, Text, makeStyles, resolveSpring, useReduceMotion, useToast } from '@/shared/ui';

import { useNotesData } from '../hooks/NotesData';
import { openNote, useTrashActions } from '../hooks/useNoteActions';
import { FolderPicker } from './FolderPicker';
import { errorText } from '@/shared/lib/errorText';

/** `open(note)` mostra as ações da nota; o elemento vai uma vez na tela. */
export function useNoteQuickActions(onChanged?: () => void): { open: (note: Note) => void; element: ReactNode } {
  const { moveToTrash } = useTrashActions();
  const [note, setNote] = useState<Note | null>(null);
  const [last, setLast] = useState<Note | null>(null);
  if (note && note !== last) setLast(note);
  const shown = note ?? last;
  const element = (
    <Sheet visible={!!note} onClose={() => setNote(null)} title={shown ? shown.title || 'Sem título' : undefined}>
      <ListGroup>
        <NavRow
          divider={false}
          icon={FolderOpen}
          label="Abrir"
          onPress={() => {
            setNote(null);
            if (shown) openNote(shown.id);
          }}
        />
        <NavRow
          danger
          icon={Trash2}
          label="Mover para a lixeira"
          onPress={() => {
            const id = shown?.id;
            setNote(null);
            if (id) void moveToTrash(id).then(onChanged);
          }}
        />
      </ListGroup>
    </Sheet>
  );
  return { open: setNote, element };
}

type Step = 'menu' | 'rename' | 'delete' | 'move' | null;

/** Menu de uma pasta: renomear e excluir. `notesInside` decide se a exclusão pergunta o que fazer com as notas. */
export function FolderMenu({
  folder,
  open,
  notesInside,
  onClose,
  onRenamed,
  onDeleted,
  allFolders,
  onMoved,
}: {
  folder: NoteFolder;
  open: boolean;
  notesInside: number;
  onClose: () => void;
  onRenamed: (folder: NoteFolder) => void;
  onDeleted: () => void;
  allFolders: readonly NoteFolder[];
  onMoved: (folder: NoteFolder) => void;
}) {
  const s = useStyles();
  const toast = useToast();
  const { folders } = useNotesData();
  const [step, setStep] = useState<Step>(null);
  const [wasOpen, setWasOpen] = useState(open);
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState<string | undefined>();
  const [mode, setMode] = useState<'keep' | 'trash'>('keep');
  const [busy, setBusy] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep('menu');
      setName(folder.name);
      setError(undefined);
      setMode('keep');
    }
  }
  const close = () => {
    setStep(null);
    onClose();
  };

  const rename = async () => {
    setBusy(true);
    try {
      const f = await folders.rename(folder.id, name);
      close();
      onRenamed(f);
    } catch (e) {
      setError(isRepositoryError(e, 'validation') ? 'Dê um nome à pasta, numa linha só.' : 'Não foi possível renomear.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await folders.removeWithContents(folder.id, mode);
      close();
      toast({
        message: mode === 'trash' && notesInside > 0 ? 'Pasta excluída; notas na lixeira' : 'Pasta excluída',
        icon: Trash2,
        aboveTabBar: true,
      });
      onDeleted();
    } catch (e) {
      console.warn('Falha ao excluir a pasta', e);
      toast({ message: 'Não foi possível excluir a pasta.' });
    } finally {
      setBusy(false);
    }
  };

  const move = async (parent: NoteFolder | null) => {
    if (busy) return;
    setBusy(true);
    try {
      const moved = await folders.move(folder.id, parent?.id ?? null);
      close();
      onMoved(moved);
      toast({ message: 'Pasta movida', icon: FolderInput });
    } catch (e) {
      toast({ message: `Não foi possível mover: ${errorText(e)}` });
    } finally {
      setBusy(false);
    }
  };
  const title = step === 'rename' ? 'Renomear pasta' : step === 'move' ? 'Mover pasta' : step === 'delete' ? `Excluir “${folder.name}”?` : folder.name;
  return (
    <Sheet visible={open} onClose={close} title={title}>
      {step === 'menu' && (
        <ListGroup>
          <NavRow icon={Pencil} label="Renomear pasta" onPress={() => setStep('rename')} />
          <NavRow icon={FolderInput} label="Mover pasta" onPress={() => setStep('move')} />
          <NavRow danger icon={Trash2} label="Excluir pasta" onPress={() => setStep('delete')} />
        </ListGroup>
      )}
      {step === 'move' && <FolderPicker folders={allFolders} movingId={folder.id} selectedId={folder.parent_id} rootLabel="Raiz" disabled={busy} onPick={(parent) => void move(parent)} />}
      {step === 'rename' && (
        <>
          <Input
            label="Nome da pasta"
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError(undefined);
            }}
            error={error}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void rename()}
            maxLength={FOLDER_NAME_MAX}
          />
          <Button label="Salvar nome" fullWidth loading={busy} disabled={!name.trim()} onPress={() => void rename()} />
        </>
      )}
      {step === 'delete' && (
        <>
          {notesInside > 0 ? (
            <>
              <Text variant="small" tone="secondary">
                {`Há ${notesInside} ${notesInside === 1 ? 'nota' : 'notas'} nesta pasta. O que fazer com ${notesInside === 1 ? 'ela' : 'elas'}?`}
              </Text>
              <ListGroup>
                <Option
                  title="Manter as notas"
                  sub="Saem da pasta e continuam nas suas notas"
                  selected={mode === 'keep'}
                  onPress={() => setMode('keep')}
                />
                <Option title="Mover as notas para a lixeira" sub="Dá para restaurar pela Lixeira" selected={mode === 'trash'} onPress={() => setMode('trash')} />
              </ListGroup>
            </>
          ) : (
            <Text variant="small" tone="secondary">
              A pasta está vazia. Subpastas, se houver, sobem um nível.
            </Text>
          )}
          <View style={s.buttons}>
            <Button label="Excluir pasta" icon={Trash2} variant="danger" fullWidth haptic loading={busy} onPress={() => void remove()} />
            <Button label="Cancelar" variant="neutral" fullWidth onPress={close} />
          </View>
        </>
      )}
      <View style={s.spacer} />
    </Sheet>
  );
}

function Option({ title, sub, selected, onPress }: { title: string; sub: string; selected: boolean; onPress: () => void }) {
  const s = useStyles();
  const reduceMotion = useReduceMotion();
  const spring = resolveSpring('tap', reduceMotion);
  const dot = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    dot.set(spring ? withSpring(selected ? 1 : 0, spring) : selected ? 1 : 0);
  }, [selected, spring, dot]);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dot.get() }] }));
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [s.option, pressed && s.pressed]}
    >
      <View style={[s.radio, selected && s.radioOn]}>
        <Animated.View style={[s.dot, dotStyle]} />
      </View>
      <View style={s.optionText}>
        <Text style={s.medium}>{title}</Text>
        <Text variant="small" tone="tertiary">
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  spacer: { height: t.space[0] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3] + t.space[0.5],
    minHeight: t.size.button + t.space[3],
    paddingVertical: t.space[2],
  },
  buttons: { gap: t.space[2] },
  pressed: { opacity: t.opacity.pressed },
  radio: {
    width: t.size.radio,
    height: t.size.radio,
    borderRadius: t.radius.full,
    borderWidth: t.size.radioBorder,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: t.colors.accent },
  dot: { width: t.size.radioDot, height: t.size.radioDot, borderRadius: t.radius.full, backgroundColor: t.colors.accent },
  optionText: { flex: 1, gap: t.space[0.5] },
  medium: { fontFamily: t.type.chip.font },
}));
