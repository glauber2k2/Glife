// Bloco "Próximo compromisso" da tela Hoje (versão básica): o próximo evento e quantos mais hoje; abre a Agenda.
import { nextEvent, overdueReminders } from '@glife/domain/agenda';
import { localNow } from '@glife/domain/time';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { formatDateInput } from '@/shared/lib/calendarInput';
import { Button, Section, Text, makeStyles } from '@/shared/ui';

import { useAgendaMaybe } from '../hooks/AgendaData';

export function TodayAgendaBlock() {
  const s = useStyles();
  const agenda = useAgendaMaybe();
  if (!agenda?.data) return null;
  const now = localNow();
  const next = nextEvent(agenda.data.events, now);
  const late = overdueReminders(agenda.data.reminders, now).length;
  const when = next ? (next.item.date === now.date ? (next.item.time ?? 'Hoje, dia inteiro') : `${formatDateInput(next.item.date).slice(0, 5)}${next.item.time ? ` · ${next.item.time}` : ''}`) : '';
  return (
    <Section title="Próximo compromisso" action={<Button label="Agenda" variant="ghost" size="sm" onPress={() => router.push('/agenda')} />}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/agenda')} style={s.body}>
        {next ? (
          <>
            <Text variant="heading" numeric>
              {when}
            </Text>
            <Text variant="item">{next.item.title}</Text>
            {next.item.location ? <Text tone="secondary">{next.item.location}</Text> : null}
            {next.moreToday > 0 && <Text tone="tertiary">{`e mais ${next.moreToday} hoje`}</Text>}
          </>
        ) : (
          <Text tone="tertiary">Nada na agenda nos próximos dias.</Text>
        )}
        {late > 0 && <Text tone="danger">{late === 1 ? '1 lembrete atrasado' : `${late} lembretes atrasados`}</Text>}
      </Pressable>
    </Section>
  );
}

const useStyles = makeStyles((t) => ({ body: { gap: t.space[1] } }));
