// Bloco "Para hoje" do Início (Cobalto): compromissos e lembretes do dia, com o horário em pílula. Concluir um
// lembrete enche o círculo, risca o texto e a linha recolhe. Lembretes atrasados vêm primeiro, em vermelho.
import { agendaBetween, overdueReminders, type AgendaItem } from '@glife/domain/agenda';
import { localNow } from '@glife/domain/time';
import { router } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { formatDateInput } from '@/shared/lib/calendarInput';
import { errorText } from '@/shared/lib/errorText';
import {
  Button,
  Checkbox,
  Icon,
  ListGroup,
  SectionHeader,
  Text,
  makeStyles,
  useReduceMotion,
  useTheme,
  useToast,
} from '@/shared/ui';

import { useAgendaMaybe } from '../hooks/AgendaData';

interface Row {
  key: string;
  item: Pick<AgendaItem, 'kind' | 'id' | 'date' | 'time' | 'end_time' | 'title' | 'location'>;
  late?: boolean;
}

export function TodayAgendaBlock() {
  const s = useStyles();
  const toast = useToast();
  const agenda = useAgendaMaybe();
  if (!agenda?.data) return null;
  const now = localNow();
  const late: Row[] = overdueReminders(agenda.data.reminders, now)
    .filter((r) => r.start_date !== now.date)
    .map((r) => ({
      key: `late:${r.id}`,
      late: true,
      item: { kind: 'reminder', id: r.id, date: r.start_date, time: r.time, end_time: null, title: r.title, location: null },
    }));
  const today: Row[] = agendaBetween(agenda.data.events, agenda.data.reminders, now.date, now.date).map((i) => ({
    key: `${i.kind}:${i.id}:${i.date}`,
    item: i,
  }));
  const rows = [...late, ...today];

  const complete = async (id: string, date: string) => {
    try {
      await agenda.repo.completeReminder(id, date);
    } catch (e) {
      toast({ message: errorText(e) });
    }
  };
  const open = (i: Row['item']) =>
    router.push({ pathname: i.kind === 'event' ? '/agenda/evento/[id]' : '/agenda/lembrete/[id]', params: { id: i.id, data: i.date } });

  return (
    <View style={s.section}>
      <SectionHeader title="Para hoje" actionLabel={rows.length ? 'Ver agenda' : undefined} onAction={() => router.navigate('/agenda')} />
      <ListGroup>
        {rows.length === 0 ? (
          <View style={s.empty}>
            <Text variant="small" tone="tertiary" style={s.grow}>
              Nada marcado para hoje.
            </Text>
            <Button
              label="Adicionar"
              variant="secondary"
              size="sm"
              selfAlign="center"
              onPress={() => router.push({ pathname: '/agenda/evento/novo', params: { data: now.date } })}
            />
          </View>
        ) : (
          rows.map((r) => <TaskRow key={r.key} row={r} onOpen={() => open(r.item)} onDone={() => void complete(r.item.id, r.item.date)} />)
        )}
      </ListGroup>
    </View>
  );
}

/** Linha de tarefa: círculo que enche, título que se risca e recolhe depois de um instante. */
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
  section: { gap: t.space[3] },
  empty: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRow, paddingVertical: t.space[2] },
  grow: { flex: 1 },
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
