// Agenda (versão básica, antes do redesenho): navegação por dia, os próximos 7 dias a partir dele, lembretes
// atrasados e os botões de novo evento e novo lembrete.
import { agendaBetween, overdueReminders, type AgendaItem } from '@glife/domain/agenda';
import { addDays, localNow } from '@glife/domain/time';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { formatDateInput, longDay } from '@/shared/lib/calendarInput';
import { errorText } from '@/shared/lib/errorText';
import { BackHeader, Button, IconButton, ListItem, Screen, Section, Text, makeStyles, useToast } from '@/shared/ui';

import { useAgenda } from '../hooks/AgendaData';

const DAYS_SHOWN = 7;

export function AgendaScreen() {
  const s = useStyles();
  const toast = useToast();
  const { repo, data } = useAgenda();
  const now = localNow();
  const [from, setFrom] = useState(now.date);
  const to = addDays(from, DAYS_SHOWN - 1);

  const days = useMemo(() => {
    const items = data ? agendaBetween(data.events, data.reminders, from, to) : [];
    const byDay = new Map<string, AgendaItem[]>();
    for (const i of items) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);
    return [...byDay];
  }, [data, from, to]);
  const overdue = data && from === now.date ? overdueReminders(data.reminders, now) : [];

  const complete = async (id: string, date: string) => {
    try {
      await repo.completeReminder(id, date);
    } catch (e) {
      toast({ message: errorText(e) });
    }
  };
  const open = (i: AgendaItem) =>
    router.push({ pathname: i.kind === 'event' ? '/agenda/evento/[id]' : '/agenda/lembrete/[id]', params: { id: i.id, data: i.date } });

  return (
    <Screen>
      <BackHeader title="Agenda" backLabel="Voltar" fallback="/" />
      <View style={s.nav}>
        <IconButton icon={ChevronLeft} label="Semana anterior" variant="ghost" onPress={() => setFrom(addDays(from, -DAYS_SHOWN))} />
        <Text variant="chip" align="center" style={s.grow}>{`${formatDateInput(from).slice(0, 5)} a ${formatDateInput(to).slice(0, 5)}`}</Text>
        <IconButton icon={ChevronRight} label="Próxima semana" variant="ghost" onPress={() => setFrom(addDays(from, DAYS_SHOWN))} />
      </View>
      <View style={s.actions}>
        <Button label="Novo evento" size="sm" onPress={() => router.push({ pathname: '/agenda/evento/novo', params: { data: from } })} />
        <Button label="Novo lembrete" size="sm" variant="secondary" onPress={() => router.push({ pathname: '/agenda/lembrete/novo', params: { data: from } })} />
        {from !== now.date && <Button label="Hoje" size="sm" variant="ghost" onPress={() => setFrom(now.date)} />}
      </View>

      {overdue.length > 0 && (
        <Section title="Lembretes atrasados">
          {overdue.map((r) => (
            <ListItem
              key={r.id}
              title={r.title}
              subtitle={`${formatDateInput(r.start_date)} · ${r.time}`}
              onPress={() => router.push({ pathname: '/agenda/lembrete/[id]', params: { id: r.id } })}
              trailing={<Button label="Feito" size="sm" variant="ghost" selfAlign="center" onPress={() => void complete(r.id, r.start_date)} />}
            />
          ))}
        </Section>
      )}

      {data && days.length === 0 && <Text tone="tertiary">Nada na agenda nestes dias.</Text>}
      {days.map(([date, items]) => (
        <Section key={date} title={longDay(date)}>
          {items.map((i) => (
            <ListItem
              key={`${i.kind}:${i.id}:${i.date}`}
              title={i.title}
              subtitle={[
                i.time ? `${i.time}${i.end_time ? `–${i.end_time}` : ''}` : 'Dia inteiro',
                i.end_date !== i.date ? `até ${formatDateInput(i.end_date).slice(0, 5)}` : null,
                i.location,
                i.kind === 'reminder' ? 'Lembrete' : null,
                i.repeats ? 'Repete' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => open(i)}
              trailing={
                i.kind === 'reminder' ? <Button label="Feito" size="sm" variant="ghost" selfAlign="center" onPress={() => void complete(i.id, i.date)} /> : undefined
              }
            />
          ))}
        </Section>
      ))}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  nav: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  grow: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
}));
