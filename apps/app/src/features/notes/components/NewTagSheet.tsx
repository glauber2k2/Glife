// "+" da tela de Tags: cria uma tag pelo nome (se já existe, sem diferenciar maiúsculas, reaproveita a existente).
import { isRepositoryError } from '@glife/domain/core';
import { TAG_NAME_MAX } from '@glife/domain/tags';
import { Tag as TagIcon } from 'lucide-react-native';
import { useState } from 'react';

import { useLinksData } from '@/features/links';
import { errorText } from '@/shared/lib/errorText';
import { Button, Input, Sheet, useToast } from '@/shared/ui';

export function NewTagSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const { tags } = useLinksData();
  const toast = useToast();
  const [wasVisible, setWasVisible] = useState(visible);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setName('');
      setError(undefined);
    }
  }

  const save = async () => {
    setBusy(true);
    try {
      const { tag, created } = await tags.create(name);
      onClose();
      onCreated();
      toast({ message: created ? `#${tag.name} criada` : `#${tag.name} já existia`, icon: TagIcon, aboveTabBar: true });
    } catch (e) {
      setError(isRepositoryError(e, 'validation') ? 'Dê um nome à tag, numa linha só.' : errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nova tag">
      <Input
        label="Nome"
        placeholder="Ex.: viagem"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(undefined);
        }}
        error={error}
        maxLength={TAG_NAME_MAX + 1}
        autoCapitalize="none"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void save()}
      />
      <Button label="Criar tag" fullWidth loading={busy} disabled={!name.trim().replace(/^#+/, '').trim()} onPress={() => void save()} />
    </Sheet>
  );
}
