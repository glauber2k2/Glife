import type { Note } from '@glife/domain/notes';
import { RotateCcw, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import Animated, { Easing, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Alert, Button, EmptyState, IconButton, ListGroup, Screen, Sheet, Text, makeStyles, useReduceMotion, useTheme, useToast } from '@/shared/ui';

import { SubHeader } from '../components/SubHeader';

import { useNotesData } from '../hooks/NotesData';
import { useTrashActions } from '../hooks/useNoteActions';

const pad = (n: number) => String(n).padStart(2, '0');

/** "Excluída hoje, 09:12" · "Excluída em 19/11". */
function deletedLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const today = d.toDateString() === now.toDateString();
  return today
    ? `Excluída hoje, ${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `Excluída em ${pad(d.getDate())}/${pad(d.getMonth() + 1)}${d.getFullYear() === now.getFullYear() ? '' : `/${d.getFullYear()}`}`;
}

/** Notas excluídas: restaurar é um toque (com "Desfazer"); esvaziar apaga de vez, com confirmação. */
export function TrashScreen() {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const { notes } = useNotesData();
  const { restore } = useTrashActions();
  const [items, setItems] = useState<Note[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [forever, setForever] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const [emptying, setEmptying] = useState(false);

  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    void notes.listTrash({ limit: 200 }).then((page) => active && setItems(page.items));
    return () => {
      active = false;
    };
  }, [notes, version]);

  const layout = reduceMotion
    ? undefined
    : Platform.OS === 'web'
      ? LinearTransition.duration(t.spring.gentle.duration).easing(Easing.out(Easing.cubic))
      : LinearTransition.springify(t.spring.gentle.duration).dampingRatio(t.spring.gentle.dampingRatio);

  const onRestore = async (id: string) => {
    setItems((list) => list?.filter((n) => n.id !== id) ?? null);
    await restore(id, load);
  };

  const empty = async () => {
    setEmptying(true);
    try {
      await notes.emptyTrash();
      setItems([]);
      setConfirm(false);
    } finally {
      setEmptying(false);
    }
  };

  return (
    <Screen header={<SubHeader title="Lixeira" />}>
      {items === null ? null : items.length === 0 ? (
        <EmptyState title="Lixeira vazia" message="O que você apagar fica aqui até você esvaziar a lixeira." mood="dormindo" />
      ) : (
        <View style={s.list}>
          <Alert tone="neutral">As notas ficam aqui até você esvaziar a lixeira. Restaurar devolve a nota ao lugar dela.</Alert>
          <ListGroup>
          {items.map((n) => (
            <Animated.View key={n.id} layout={layout} exiting={reduceMotion ? undefined : FadeOut.duration(t.motion.tap)}>
              <View style={s.row}>
                <View style={s.texts}>
                  <Text variant="item" numberOfLines={1} tone={n.title ? 'primary' : 'tertiary'}>
                    {n.title || 'Sem título'}
                  </Text>
                  <Text variant="caption" tone="tertiary" numeric>
                    {deletedLabel(n.deleted_at ?? n.updated_at)}
                  </Text>
                </View>
                <Button
                  selfAlign="center"
                  label="Restaurar"
                  variant="secondary"
                  size="sm"
                  icon={RotateCcw}
                  onPress={() => void onRestore(n.id)}
                />
                <IconButton icon={Trash2} label="Apagar de vez" variant="soft" color="danger" onPress={() => setForever(n)} />
              </View>
            </Animated.View>
          ))}
          </ListGroup>
          <Button label="Esvaziar lixeira" icon={Trash2} variant="danger" selfAlign="center" onPress={() => setConfirm(true)} />
        </View>
      )}

      <Sheet visible={!!forever} onClose={() => setForever(null)} title="Apagar de vez?">
        <Text tone="secondary">
          {`“${forever?.title || 'Sem título'}” será apagada de vez, neste e nos outros aparelhos. Não dá para desfazer.`}
        </Text>
        <Button
          label="Apagar de vez"
          variant="danger"
          fullWidth
          loading={deleting}
          onPress={async () => {
            if (!forever) return;
            setDeleting(true);
            try {
              await notes.deleteForever(forever.id);
              setItems((list) => list?.filter((x) => x.id !== forever.id) ?? null);
              setForever(null);
              toast({ message: 'Nota apagada de vez', icon: Trash2 });
            } catch (e) {
              console.warn('Falha ao apagar a nota', e);
              toast({ message: 'Não foi possível apagar a nota.' });
            } finally {
              setDeleting(false);
            }
          }}
        />
        <Button label="Cancelar" variant="neutral" fullWidth onPress={() => setForever(null)} />
      </Sheet>

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Esvaziar lixeira?">
        <Text tone="secondary">
          {items?.length === 1 ? 'A nota será apagada de vez' : `As ${items?.length ?? 0} notas serão apagadas de vez`}, neste e
          nos outros aparelhos. Não dá para desfazer.
        </Text>
        <Button label="Apagar de vez" variant="danger" fullWidth loading={emptying} onPress={() => void empty()} />
        <Button label="Cancelar" variant="neutral" fullWidth onPress={() => setConfirm(false)} />
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[2.5], minHeight: t.size.navRow, paddingVertical: t.space[3] },
  texts: { flex: 1, minWidth: 0, gap: t.space[0.5] },
}));
