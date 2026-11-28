// Cartão de uma ação feita pela IA (criou, alterou, mandou para a lixeira), com "Desfazer". Depois de desfeita,
// a linha esmaece e o botão some (a altura não muda).
import { CircleCheck, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, ModuleIcon, Text, makeStyles, useToast } from '@/shared/ui';

import type { AiActionEntry } from '../executor';

export function ActionCard({ entry, onUndo }: { entry: AiActionEntry; onUndo: (e: AiActionEntry) => Promise<{ ok: boolean; reason?: string }> }) {
  const s = useStyles();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const undone = entry.undone_at !== null;

  const undo = async () => {
    setBusy(true);
    const r = await onUndo(entry);
    setBusy(false);
    toast({ message: r.ok ? 'Ação desfeita' : (r.reason ?? 'Não deu para desfazer.') });
  };

  return (
    <Card padding="sm" style={[s.card, undone && s.undone]} accessibilityLabel={entry.summary}>
      <View style={s.row}>
        <ModuleIcon icon={CircleCheck} tone="tonal" size="sm" />
        <Text variant="small" style={s.grow}>
          {entry.summary}
        </Text>
        <View style={[s.action, undone && s.hidden]}>
          <Button label="Desfazer" icon={Undo2} variant="secondary" size="sm" selfAlign="center" disabled={busy || undone} onPress={undo} />
        </View>
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { alignSelf: 'stretch', maxWidth: t.layout.chatBubbleMaxWidth },
  undone: { opacity: t.opacity.disabled },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  grow: { flex: 1 },
  action: { flexShrink: 0 },
  hidden: { opacity: t.opacity.hidden },
}));
