// Linha de tarefa da agenda (Cobalto): círculo que enche e título que se risca (o feito fica na lista e se desmarca
// com outro toque); horário em pílula.
import type { AgendaItem } from '@glife/domain/agenda';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { formatDateInput } from '@/shared/lib/calendarInput';
import { Checkbox, Icon, Text, makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

export interface Row {
  key: string;
  item: Pick<AgendaItem, 'kind' | 'id' | 'date' | 'time' | 'end_time' | 'title' | 'location'> & { repeats?: boolean; done?: boolean };
  late?: boolean;
}

/**
 * Linha de tarefa: o toque no círculo marca (enche e risca) ou desmarca. O estado aparece na hora e se acerta com o
 * banco quando ele responde (`onToggle` com o novo valor diz se gravou; se não, o círculo volta).
 */
export function TaskRow({ row, onOpen, onToggle }: { row: Row; onOpen: () => void; onToggle: (done: boolean) => Promise<boolean> }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const saved = row.item.done ?? false;
  // O toque vale até o banco mudar: quando `saved` muda, ele volta a mandar.
  const [local, setLocal] = useState({ saved, done: saved });
  const done = local.saved === saved ? local.done : saved;
  const { item } = row;
  const reminder = item.kind === 'reminder';
  const time = item.time ? `${item.time}${item.end_time ? `–${item.end_time}` : ''}` : 'Dia todo';
  const meta = row.late
    ? `Atrasado · ${formatDateInput(item.date).slice(0, 5)}`
    : [reminder ? 'Lembrete' : 'Evento', item.location].filter(Boolean).join(' · ');
  return (
    <Animated.View
      exiting={reduceMotion ? undefined : FadeOut.duration(t.motion.tap)}
      layout={reduceMotion ? undefined : LinearTransition.duration(t.motion.gentle)}
      style={s.row}
    >
      {reminder ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? `Desmarcar ${item.title}` : `Concluir ${item.title}`}
          hitSlop={t.touch.hitSlop + t.space[1]}
          onPress={() => {
            setLocal({ saved, done: !done });
            void onToggle(!done).then((ok) => {
              if (!ok) setLocal({ saved, done: saved });
            });
          }}
        >
          <Checkbox checked={done} />
        </Pressable>
      ) : (
        <View style={s.eventIcon}>
          <Icon icon={CalendarDays} size={t.icon.small + t.space[0.5]} color="textTertiary" />
        </View>
      )}
      <Pressable accessibilityRole="button" onPress={onOpen} style={s.texts}>
        <Text variant="item" tone={done ? 'tertiary' : 'primary'} numberOfLines={2} style={done && s.strike}>
          {item.title}
        </Text>
        <Text variant="caption" tone={row.late && !done ? 'danger' : 'tertiary'} numberOfLines={1}>
          {meta}
        </Text>
      </Pressable>
      <View style={s.time}>
        <Text variant="tag" tone={done ? 'tertiary' : 'primary'} numeric>
          {time}
        </Text>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRow, paddingVertical: t.space[2.5] },
  eventIcon: { width: t.size.checkbox, alignItems: 'center' },
  texts: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  strike: { textDecorationLine: 'line-through' },
  time: {
    height: t.size.linkChip,
    paddingHorizontal: t.space[2.5],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.bg,
    justifyContent: 'center',
  },
}));
