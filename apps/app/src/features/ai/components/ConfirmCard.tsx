// "Confirmar?" antes de a IA mandar algo para a lixeira, mexer com dinheiro ou alterar vários itens. Nada é
// gravado até o usuário escolher.
import { ShieldQuestion } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Card, ModuleIcon, Text, makeStyles } from '@/shared/ui';

import type { PendingConfirm } from '../hooks/useAgentChat';

export function ConfirmCard({ pending }: { pending: PendingConfirm }) {
  const s = useStyles();
  return (
    <Card tone="tonal" padding="sm" gap={0} style={s.card}>
      <View style={s.row}>
        <ModuleIcon icon={ShieldQuestion} tone="accent" size="sm" />
        <View style={s.grow}>
          <Text variant="label" tone="tonal">
            Confirmar?
          </Text>
          <Text variant="small">{pending.summary}</Text>
        </View>
      </View>
      <View style={s.actions}>
        <Button label="Cancelar" variant="neutral" size="sm" selfAlign="center" onPress={() => pending.answer(false)} />
        <Button label="Confirmar" size="sm" selfAlign="center" haptic onPress={() => pending.answer(true)} />
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { alignSelf: 'stretch', maxWidth: t.layout.chatBubbleMaxWidth, gap: t.space[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  grow: { flex: 1, gap: t.space[0.5] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: t.space[2] },
}));
