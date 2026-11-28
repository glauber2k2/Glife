// "Notas vinculadas" embaixo de um campo de descrição: lista das notas ligadas (toque abre a nota, X desliga) e os
// botões "Vincular nota" (busca entre as notas) e "Nova nota" (cria e já liga). Nada é gravado aqui: quem salva o
// item chama `apply` de `useLinkedNotes`. A nota nova é criada na hora (ela existe por si, mesmo sem o item).
import { FileText, Link2, Plus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { errorText } from '@/shared/lib/errorText';
import { Button, EmptyState, Icon, IconButton, Input, ListGroup, ListItem, SearchField, Sheet, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { useNoteLinker, type LinkedNotes, type NoteChoice } from '../hooks/NoteLinker';
import { useOpenTarget } from '../hooks/Targets';

const NOTE_TITLE_MAX = 200;

export function LinkedNotesField({ state }: { state: LinkedNotes }) {
  const s = useStyles();
  const t = useTheme();
  const port = useNoteLinker();
  const openTarget = useOpenTarget();
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  if (!port) return null;

  return (
    <View style={s.block}>
      {state.notes.length > 0 && (
        <View style={s.list}>
          {state.notes.map((n) => (
            <View key={n.id} style={s.row}>
              <Pressable
                style={s.link}
                accessibilityRole="link"
                accessibilityLabel={`Abrir a nota ${n.title ?? 'indisponível'}`}
                onPress={() => void openTarget('note', n.id)}
              >
                <Icon icon={FileText} size={t.icon.small} color="accentInk" />
                <Text variant="small" tone={n.title === null ? 'tertiary' : 'accent'} numberOfLines={1} style={s.grow}>
                  {n.title === null ? 'Nota indisponível' : n.title || 'Sem título'}
                </Text>
              </Pressable>
              <IconButton icon={X} label={`Desvincular ${n.title ?? 'nota'}`} variant="ghost" size={t.size.iconButtonSmall} onPress={() => state.remove(n.id)} />
            </View>
          ))}
        </View>
      )}
      <View style={s.actions}>
        <Button label="Vincular nota" icon={Link2} variant="secondary" size="sm" onPress={() => setPicking(true)} />
        <Button label="Nova nota" icon={Plus} variant="secondary" size="sm" onPress={() => setCreating(true)} />
      </View>
      <PickNoteSheet
        visible={picking}
        onClose={() => setPicking(false)}
        exclude={state.notes.map((n) => n.id)}
        onPick={(n) => {
          state.add(n);
          setPicking(false);
        }}
      />
      <NewNoteSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={(n) => {
          state.add(n);
          setCreating(false);
        }}
      />
    </View>
  );
}

function PickNoteSheet({ visible, onClose, onPick, exclude }: { visible: boolean; onClose: () => void; onPick: (n: NoteChoice) => void; exclude: string[] }) {
  const s = useStyles();
  const port = useNoteLinker();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteChoice[] | null>(null);

  useEffect(() => {
    if (!visible || !port) return;
    let active = true;
    const timer = setTimeout(() => {
      port.search(query.trim()).then(
        (r) => active && setResults(r),
        () => active && setResults([]),
      );
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [visible, query, port]);

  const shown = (results ?? []).filter((n) => !exclude.includes(n.id));
  return (
    <Sheet visible={visible} onClose={onClose} title="Vincular nota">
      <View style={s.sheet}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Buscar nota" />
        {results !== null && shown.length === 0 ? (
          <EmptyState title="Nenhuma nota" message={query.trim() ? 'Nenhuma nota com esse texto.' : 'Você ainda não tem notas.'} mood="pensando" />
        ) : (
          <ListGroup>
            {shown.map((n) => (
              <ListItem key={n.id} icon={FileText} module="notes" title={n.title || 'Sem título'} onPress={() => onPick(n)} />
            ))}
          </ListGroup>
        )}
      </View>
    </Sheet>
  );
}

function NewNoteSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (n: NoteChoice) => void }) {
  const s = useStyles();
  const port = useNoteLinker();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!port || !title.trim()) return;
    setSaving(true);
    try {
      onCreated(await port.create(title.trim()));
      setTitle('');
    } catch (e) {
      toast({ message: `Nota não criada: ${errorText(e)}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        setTitle('');
        onClose();
      }}
      title="Nova nota" subtitle="Ela fica vinculada a este item; escreva nela depois em Notas.">
      <View style={s.sheet}>
        <Input label="Título da nota" value={title} onChangeText={setTitle} maxLength={NOTE_TITLE_MAX} autoFocus onSubmitEditing={() => void create()} />
        <Button label="Criar e vincular" fullWidth haptic disabled={!title.trim()} loading={saving} onPress={() => void create()} />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: t.space[2] },
  list: { gap: t.space[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], minHeight: t.size.listRowSmall, paddingVertical: t.space[2] },
  link: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.space[2], minWidth: 0 },
  grow: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  sheet: { gap: t.space[4] },
}));
