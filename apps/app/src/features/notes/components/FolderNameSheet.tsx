import { isRepositoryError } from '@glife/domain/core';
import { FOLDER_NAME_MAX, type NoteFolder } from '@glife/domain/notes';
import { useState } from 'react';

import { Button, Input, Sheet } from '@/shared/ui';

import { useNotesData } from '../hooks/NotesData';

/** Folha para criar pasta (um nível só, sem árvore). */
export function FolderNameSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (folder: NoteFolder) => void;
}) {
  const { folders } = useNotesData();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const close = () => {
    setName('');
    setError(undefined);
    onClose();
  };
  const create = async () => {
    setBusy(true);
    try {
      const folder = await folders.create({ name });
      setName('');
      setError(undefined);
      onCreated(folder);
    } catch (e) {
      setError(isRepositoryError(e, 'validation') ? 'Dê um nome à pasta, numa linha só.' : 'Não foi possível criar a pasta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={close} title="Nova pasta">
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
        onSubmitEditing={() => void create()}
        maxLength={FOLDER_NAME_MAX}
      />
      <Button label="Criar pasta" fullWidth loading={busy} disabled={!name.trim()} onPress={() => void create()} />
    </Sheet>
  );
}
