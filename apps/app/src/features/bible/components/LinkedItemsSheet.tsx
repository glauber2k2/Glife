// Folha com as notas (e outros itens) ligadas a um versículo ou ao capítulo: tocar abre o item; "Anotar" cria
// outra nota ligada ao mesmo trecho.
import { NotebookPen, StickyNote } from 'lucide-react-native';
import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { Button, ListGroup, NavRow, Sheet, Text, makeStyles } from '@/shared/ui';

import type { LinkedItem } from '../hooks/useChapterLinks';

export function LinkedItemsSheet({
  visible,
  title,
  items,
  onClose,
  onAnnotate,
}: {
  visible: boolean;
  title: string;
  items: readonly LinkedItem[];
  onClose(): void;
  onAnnotate(): void;
}) {
  const s = useStyles();
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={items.length ? `${items.length} ${items.length === 1 ? 'nota ligada' : 'notas ligadas'}` : undefined}>
      <View style={s.body}>
        {items.length > 0 ? (
          <ListGroup>
            {items.map((i) => (
              <NavRow
                key={i.id}
                icon={StickyNote}
                iconSize="md"
                module="notes"
                label={i.title}
                meta={i.meta}
                onPress={() => {
                  onClose();
                  router.push(i.href as Href);
                }}
              />
            ))}
          </ListGroup>
        ) : (
          <Text tone="tertiary">Nenhuma nota ligada ainda.</Text>
        )}
        <Button label="Anotar" icon={NotebookPen} variant="secondary" onPress={onAnnotate} />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  body: { gap: t.space[4] },
}));
