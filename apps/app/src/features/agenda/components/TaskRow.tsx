// Linha de tarefa da agenda (Cobalto): círculo que enche, título que se risca e recolhe; horário em pílula.
import type { AgendaItem } from '@glife/domain/agenda';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { formatDateInput } from '@/shared/lib/calendarInput';
import { Checkbox, Icon, Text, makeStyles, useReduceMotion, useTheme } from '@/shared/ui';

export interface Row {
  key: string;
  item: Pick<AgendaItem, 'kind' | 'id' | 'date' | 'time' | 'end_time' | 'title' | 'location'> & { repeats?: boolean };
  late?: boolean;
}

export /** Linha de tarefa: círculo que enche, título que se risca e recolhe depois de um instante. */
function TaskRow({ row, onOpen, onDone }: { row: Row; onOpen: () => void; onDone: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const [done, setDone] = useState(false);
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
          accessibilityLabel={`Concluir ${item.title}`}
          hitSlop={t.touch.hitSlop + t.space[1]}
          onPress={() => {
            if (done) return;
            setDone(true);
            setTimeout(onDone, reduceMotion ? 0 : t.motion.collapseDelay);
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
        <Text variant="caption" tone={row.late ? 'danger' : 'tertiary'} numberOfLines={1}>
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
