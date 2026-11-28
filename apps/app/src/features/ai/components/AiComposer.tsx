// Compositor rápido da Glife IA (toque no mascote): folha com o campo focado. Enviar deixa o pedido no canal
// e abre a conversa em /ia.
import { router } from 'expo-router';
import { ArrowUp } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { aiPrompts } from '@/shared/lib/aiPrompt';
import { IconButton, Input, Sheet, makeStyles } from '@/shared/ui';

export const MESSAGE_MAX = 2000;

/** Envia um pedido à Glife IA e mostra a conversa. */
export function askGlifeAi(text: string) {
  aiPrompts.ask({ text: text.trim().slice(0, MESSAGE_MAX) });
  router.navigate('/ia');
}

export function AiComposer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const s = useStyles();
  const [text, setText] = useState('');
  const send = () => {
    if (!text.trim()) return;
    onClose();
    askGlifeAi(text);
    setText('');
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Glife IA" subtitle="Peça para criar, achar ou organizar">
      <View style={s.row}>
        <Input
          autoFocus
          placeholder="Peça qualquer coisa…"
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          returnKeyType="send"
          maxLength={MESSAGE_MAX}
          accessibilityLabel="Pedido para a Glife IA"
          style={s.grow}
        />
        <IconButton icon={ArrowUp} label="Enviar" onPress={send} disabled={!text.trim()} />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  grow: { flex: 1 },
}));
