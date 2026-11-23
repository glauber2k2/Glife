import { router } from 'expo-router';
import { Folder, FolderPlus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, NavRow, Screen, Text, makeStyles } from '@/shared/ui';

import { FolderNameSheet } from '../components/FolderNameSheet';
import { SubHeader } from '../components/SubHeader';
import { useNotesData } from '../hooks/NotesData';
import { useFocusData } from '../hooks/useFocusData';

/** Um nível de pastas, com a contagem de notas de cada uma. */
export function FoldersScreen() {
  const s = useStyles();
  const { folders, notes } = useNotesData();
  const [creating, setCreating] = useState(false);
  const { data, reload } = useFocusData(
    async () => {
      const [all, page] = await Promise.all([folders.list(), notes.list({}, { limit: 200 })]);
      const count = new Map<string, number>();
      for (const n of page.items) if (n.folder_id) count.set(n.folder_id, (count.get(n.folder_id) ?? 0) + 1);
      return all.map((f) => ({ ...f, count: count.get(f.id) ?? 0 }));
    },
  );

  const goFolder = (id: string) => router.push({ pathname: '/pasta/[id]', params: { id } });

  return (
    <Screen>
      <SubHeader eyebrow="Notas" title="Pastas" plusLabel="Nova pasta" onPlus={() => setCreating(true)} />
      {data === null ? null : data.length === 0 ? (
        <View style={s.empty}>
          <Text tone="secondary">
            Nenhuma pasta ainda. Agrupe notas por assunto: cada nota fica em uma pasta, e as tags atravessam todas elas.
          </Text>
          <Button label="Criar pasta" icon={FolderPlus} onPress={() => setCreating(true)} />
        </View>
      ) : (
        <View>
          {data.map((f) => (
            <NavRow key={f.id} tall icon={Folder} label={f.name} meta={String(f.count)} onPress={() => goFolder(f.id)} />
          ))}
          <NavRow tall accent icon={FolderPlus} label="Nova pasta" onPress={() => setCreating(true)} />
        </View>
      )}
      <FolderNameSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          reload();
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  empty: {
    gap: t.space[5],
    alignItems: 'flex-start',
    paddingTop: t.layout.blockGap,
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
}));
