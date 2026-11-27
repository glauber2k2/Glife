// Bloco "Para hoje" do Início (Cobalto): compromissos e lembretes do dia, com o horário em pílula. Concluir um
// lembrete enche o círculo e risca o texto (a linha fica e se desmarca). Lembretes atrasados vêm primeiro, em vermelho.
import { agendaBetween, lateReminders } from '@glife/domain/agenda';
import { localNow } from '@glife/domain/time';
import { router } from 'expo-router';
import { View } from 'react-native';

import { errorText } from '@/shared/lib/errorText';
import { Button, ListGroup, SectionHeader, Text, makeStyles, useToast } from '@/shared/ui';

import { useAgendaMaybe } from '../hooks/AgendaData';
import { TaskRow, type Row } from './TaskRow';

export function TodayAgendaBlock() {
  const s = useStyles();
  const toast = useToast();
  const agenda = useAgendaMaybe();
  if (!agenda?.data) return null;
  const now = localNow();
  const late: Row[] = lateReminders(agenda.data.reminders, now)
    .filter(({ r }) => r.start_date !== now.date)
    .map(({ r, done }) => ({
      key: `late:${r.id}`,
      late: true,
      item: { kind: 'reminder', id: r.id, date: r.start_date, time: r.time, end_time: null, title: r.title, location: null, done },
    }));
  const today: Row[] = agendaBetween(agenda.data.events, agenda.data.reminders, now.date, now.date).map((i) => ({
    key: `${i.kind}:${i.id}:${i.date}:${i.time ?? ''}`,
    item: i,
  }));
  const rows = [...late, ...today];

  /** Marca ou desmarca o lembrete nesta data/horário; diz se gravou. */
  const toggle = async (id: string, date: string, time: string | undefined, done: boolean) => {
    try {
      await (done ? agenda.repo.completeReminder(id, date, time) : agenda.repo.uncompleteReminder(id, date, time));
      return true;
    } catch (e) {
      toast({ message: errorText(e) });
      return false;
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
          rows.map((r) => <TaskRow key={r.key} row={r} onOpen={() => open(r.item)} onToggle={(done) => toggle(r.item.id, r.item.date, r.item.time ?? undefined, done)} />)
        )}
      </ListGroup>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.space[3] },
  empty: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRow, paddingVertical: t.space[2] },
  grow: { flex: 1 },
}));
