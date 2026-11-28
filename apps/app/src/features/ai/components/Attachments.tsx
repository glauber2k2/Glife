// Anexos no compositor da Glife IA: botão de clipe, chips com o nome (tocar remove) e os avisos de corte.
import { ATTACH } from '@glife/domain/ai';
import { FileText, Paperclip, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { errorText } from '@/shared/lib/errorText';
import type { PromptAttachment } from '@/shared/lib/aiPrompt';
import { Chip, IconButton, Spinner, Tag, makeStyles, useToast } from '@/shared/ui';

import { pickAttachments } from '../data/attachments';

const kChars = (n: number) => `${Math.max(1, Math.round(n / 1000))} mil caracteres`;

export function useAttachments() {
  const toast = useToast();
  const [items, setItems] = useState<PromptAttachment[]>([]);
  const [reading, setReading] = useState(false);
  const add = useCallback(async () => {
    setReading(true);
    try {
      const r = await pickAttachments();
      if (!r) return;
      setItems((cur) => [...cur, ...r.attachments].slice(0, ATTACH.maxFiles));
      if (r.notices.length) toast({ message: r.notices.join(' ') });
    } catch (e) {
      toast({ message: `Não deu para anexar: ${errorText(e)}` });
    } finally {
      setReading(false);
    }
  }, [toast]);
  const remove = useCallback((i: number) => setItems((cur) => cur.filter((_, j) => j !== i)), []);
  const clear = useCallback(() => setItems([]), []);
  return { items, reading, add, remove, clear, full: items.length >= ATTACH.maxFiles };
}

export function AttachButton({ onPress, reading, disabled }: { onPress: () => void; reading: boolean; disabled?: boolean }) {
  return reading ? <Spinner /> : <IconButton icon={Paperclip} label="Anexar PDF, TXT, MD ou CSV" variant="ghost" onPress={onPress} disabled={disabled} />;
}

export function AttachmentChips({ items, onRemove }: { items: readonly PromptAttachment[]; onRemove: (i: number) => void }) {
  const s = useStyles();
  if (!items.length) return null;
  return (
    <View style={s.chips}>
      {items.map((a, i) => (
        <View key={`${a.name}-${i}`} style={s.item}>
          <Chip size="sm" icon={FileText} label={`${a.name} · ${kChars(a.text.length)}${a.truncated ? ' (cortado)' : ''}`} />
          <IconButton icon={X} label={`Remover anexo ${a.name}`} variant="ghost" onPress={() => onRemove(i)} />
        </View>
      ))}
    </View>
  );
}

/** Na bolha da conversa: só o nome do anexo (o texto foi para a IA). */
export function AttachmentTag({ name, size }: { name: string; size: number }) {
  return <Tag icon={FileText} label={`${name} · ${kChars(size)}`} />;
}

const useStyles = makeStyles((t) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  item: { flexDirection: 'row', alignItems: 'center', gap: t.space[0.5] },
}));
