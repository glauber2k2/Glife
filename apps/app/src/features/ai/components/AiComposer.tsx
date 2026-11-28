// Compositor rápido da Glife IA (toque no mascote): folha com o campo focado. Enviar deixa o pedido no canal
// e abre a conversa em /ia.
import { ArrowUp } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AI_MESSAGE_MAX as MESSAGE_MAX, askGlifeAi } from '@/shared/navigation/askGlifeAi';
import { IconButton, Input, Sheet, makeStyles } from '@/shared/ui';

import { AttachButton, AttachmentChips, useAttachments } from './Attachments';

export function AiComposer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const s = useStyles();
  const [text, setText] = useState('');
  const files = useAttachments();
  const ready = (text.trim() || files.items.length > 0) && !files.reading;
  const send = () => {
    if (!ready) return;
    onClose();
    askGlifeAi(text, files.items);
    setText('');
    files.clear();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Glife IA" subtitle="Peça para criar, achar ou organizar">
      <AttachmentChips items={files.items} onRemove={files.remove} />
      <View style={s.row}>
        <AttachButton onPress={() => void files.add()} reading={files.reading} disabled={files.full} />
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
        <IconButton icon={ArrowUp} label="Enviar" onPress={send} disabled={!ready} />
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  grow: { flex: 1 },
}));
