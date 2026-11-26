import { folderChildren } from '@glife/domain/notes';
import { router } from 'expo-router';
import { Folder, FolderPlus } from 'lucide-react-native';
import { useState } from 'react';

import { Button, EmptyState, ListGroup, NavRow, Reveal, Screen } from '@/shared/ui';

import { FolderNameSheet } from '../components/FolderNameSheet';
import { SubHeader } from '../components/SubHeader';
import { useNotesData } from '../hooks/NotesData';
import { useFocusData } from '../hooks/useFocusData';

/** Raiz da árvore; as contagens são agregadas no banco, sem carregar as notas. */
export function FoldersScreen() {
  const { folders } = useNotesData();
  const [creating, setCreating] = useState(false);
  const { data, reload } = useFocusData(
    async () => {
      const summaries = await folders.listSummaries();
      const roots = new Set(folderChildren(summaries.map((s) => s.folder), null).map((f) => f.id));
      return summaries.filter((s) => roots.has(s.folder.id));
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
            {data.map(({ folder: f, notes: count, children }) => (
              <NavRow
                key={f.id}
                icon={Folder}
                iconSize="md"
                module="notes"
                label={f.name}
                meta={`${count === 1 ? '1 nota' : `${count} notas`}${children ? ` · ${children} ${children === 1 ? 'subpasta' : 'subpastas'}` : ''}`}
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
