import { router } from 'expo-router';
import { Folder, FolderPlus } from 'lucide-react-native';
import { useState } from 'react';

import { Button, EmptyState, ListGroup, NavRow, Reveal, Screen } from '@/shared/ui';

import { FolderNameSheet } from '../components/FolderNameSheet';
import { SubHeader } from '../components/SubHeader';
import { useNotesData } from '../hooks/NotesData';
import { useFocusData } from '../hooks/useFocusData';

/** Um nível de pastas, com a contagem de notas de cada uma. */
export function FoldersScreen() {
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
    <Screen header={<SubHeader title="Pastas" plusLabel="Nova pasta" onPlus={() => setCreating(true)} />}>
      {data === null ? null : data.length === 0 ? (
        <EmptyState
          title="Nenhuma pasta ainda"
          message="Pastas ajudam quando as notas passam de algumas dezenas. Cada nota fica em uma pasta; as tags atravessam todas."
          actionLabel="Criar pasta"
          onAction={() => setCreating(true)}
        />
      ) : (
        <Reveal>
          <ListGroup>
            {data.map((f) => (
              <NavRow
                key={f.id}
                icon={Folder}
                iconSize="md"
                module="notes"
                label={f.name}
                meta={f.count === 1 ? '1 nota' : `${f.count} notas`}
                onPress={() => goFolder(f.id)}
              />
            ))}
          </ListGroup>
          <Button label="Nova pasta" icon={FolderPlus} variant="secondary" onPress={() => setCreating(true)} />
        </Reveal>
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
