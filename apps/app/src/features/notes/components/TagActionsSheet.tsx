// Folha "…" de uma tag (protótipo `tagMais`): renomear, juntar com outra e excluir.
import { ENTITY_TYPES, isRepositoryError } from '@glife/domain/core';
import { TAG_NAME_MAX, type Tag, type TagWithCounts } from '@glife/domain/tags';
import { Hash, Merge, Tag as TagIcon, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useLinksData } from '@/features/links';
import { errorText } from '@/shared/lib/errorText';
import { Button, Input, ListGroup, NavRow, Sheet, Text, makeStyles, useToast } from '@/shared/ui';

type Step = 'edit' | 'merge';

export function TagActionsSheet({
  row,
  all,
  onClose,
  onChanged,
}: {
  /** tag aberta (null fecha a folha) */
  row: TagWithCounts | null;
  /** todas as tags, para escolher com qual juntar */
  all: readonly TagWithCounts[];
  onClose: () => void;
  /** depois de renomear, juntar ou excluir (a lista recarrega); `absorbed` é a tag que sumiu ao juntar */
  onChanged: (absorbed?: string) => void;
}) {
  const s = useStyles();
  const toast = useToast();
  const { tags } = useLinksData();
  const [prev, setPrev] = useState<TagWithCounts | null>(null);
  const [shown, setShown] = useState<TagWithCounts | null>(null);
  const [step, setStep] = useState<Step>('edit');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  // Abriu (ou trocou de tag): recomeça do passo de edição com o nome atual; ao fechar, mantém o conteúdo até a folha sair.
  if (row !== prev) {
    setPrev(row);
    if (row) {
      setShown(row);
      setStep('edit');
      setName(row.tag.name);
      setError(undefined);
    }
  }
  const tag = shown?.tag;

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };

  const rename = (current: Tag) =>
    run(async () => {
      try {
        const renamed = await tags.rename(current.id, name);
        onClose();
        onChanged();
        if (renamed.name !== current.name) toast({ message: 'Tag renomeada', icon: TagIcon, aboveTabBar: true });
      } catch (e) {
        if (isRepositoryError(e, 'conflict')) {
          setError(`Já existe #${name.trim().replace(/^#+/, '')}. Para unir as duas, use “Juntar com outra tag”.`);
        } else setError(isRepositoryError(e, 'validation') ? 'Dê um nome à tag, numa linha só.' : errorText(e));
      }
    });

  const undoFailed = (e: unknown) => {
    console.warn('Falha ao desfazer na tag', e);
    toast({
      message: isRepositoryError(e, 'conflict')
        ? 'Não deu para desfazer: já existe outra tag com esse nome.'
        : `Não deu para desfazer: ${errorText(e)}`,
      aboveTabBar: true,
    });
    onChanged();
  };

  const merge = (from: Tag, into: Tag) =>
    run(async () => {
      try {
        const receipt = await tags.merge(from.id, into.id);
        onClose();
        onChanged(from.id);
        toast({
          message: `#${from.name} juntou-se a #${into.name}`,
          icon: Merge,
          aboveTabBar: true,
          actionLabel: 'Desfazer',
          onAction: () => void tags.unmerge(receipt).then(() => onChanged(), (e: unknown) => undoFailed(e)),
        });
      } catch (e) {
        toast({ message: `Não foi possível juntar: ${errorText(e)}`, aboveTabBar: true });
      }
    });

  const remove = (current: TagWithCounts) =>
    run(async () => {
      try {
        // Guarda quem tinha a tag (de todos os tipos, inclusive itens na lixeira) para o "Desfazer":
        // aplica o mesmo nome de novo aos mesmos itens, numa transação.
        const owners = (
          await Promise.all(ENTITY_TYPES.map(async (type) => (await tags.entitiesWithTag(current.tag.id, type)).map((id) => ({ type, id }))))
        ).flat();
        await tags.delete(current.tag.id);
        onClose();
        onChanged(current.tag.id);
        const undo = () =>
          owners.length ? tags.applyMany(owners, { add: [current.tag.name], remove: [] }) : tags.create(current.tag.name).then(() => undefined);
        toast({
          message: 'Tag excluída · os itens ficaram',
          icon: Trash2,
          aboveTabBar: true,
          actionLabel: 'Desfazer',
          onAction: () => void undo().then(() => onChanged(), (e: unknown) => undoFailed(e)),
        });
      } catch (e) {
        toast({ message: `Não foi possível excluir: ${errorText(e)}`, aboveTabBar: true });
      }
    });

  const others = all.filter((r) => r.tag.id !== tag?.id);
  const unchanged = !!tag && name.trim().replace(/^#+/, '').trim() === tag.name;

  return (
    <Sheet visible={!!row} onClose={onClose} title={tag ? (step === 'merge' ? `Juntar #${tag.name} com…` : `#${tag.name}`) : undefined}>
      {tag && shown && step === 'edit' && (
        <>
          <Input
            label="Nome"
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError(undefined);
            }}
            error={error}
            maxLength={TAG_NAME_MAX + 1}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={() => void rename(tag)}
          />
          <ListGroup>
            <NavRow
              icon={Merge}
              label="Juntar com outra tag"
              meta={others.length ? 'Os itens passam para a escolhida' : 'Não há outra tag ainda'}
              onPress={others.length ? () => setStep('merge') : undefined}
            />
          </ListGroup>
          <View style={s.buttons}>
            <Button
              label="Salvar"
              fullWidth
              loading={busy}
              disabled={!name.trim() || unchanged}
              onPress={() => void rename(tag)}
            />
            <Button label="Excluir tag" icon={Trash2} variant="danger" fullWidth haptic disabled={busy} onPress={() => void remove(shown)} />
          </View>
        </>
      )}
      {tag && step === 'merge' && (
        <>
          <Text variant="small" tone="secondary">
            {`Os itens de #${tag.name} passam para a tag escolhida e #${tag.name} deixa de existir.`}
          </Text>
          <ListGroup>
            {others.map((r) => (
              <NavRow key={r.tag.id} icon={Hash} module="notes" label={`#${r.tag.name}`} onPress={busy ? undefined : () => void merge(tag, r.tag)} />
            ))}
          </ListGroup>
          <Button label="Voltar" variant="neutral" fullWidth onPress={() => setStep('edit')} />
        </>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  buttons: { gap: t.space[2] },
}));
