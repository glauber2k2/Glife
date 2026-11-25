// Dieta (versão básica, antes do redesenho): o dia (refeições do plano com "Comi" e o que foi registrado) com
// navegação por dia, e o plano alimentar com as refeições e os dias em que valem.
import { dietDay, type DietDayEntry } from '@glife/domain/diet';
import { addDays, localNow } from '@glife/domain/time';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { longDay, weekdaysLabel } from '@/shared/lib/calendarInput';
import { errorText } from '@/shared/lib/errorText';
import { BackHeader, Button, IconButton, ListItem, Screen, Section, Text, makeStyles, useToast } from '@/shared/ui';

import { useDiet } from '../hooks/DietData';

export function DietScreen() {
  const s = useStyles();
  const toast = useToast();
  const { repo, data } = useDiet();
  const now = localNow();
  const [date, setDate] = useState(now.date);
  const day = useMemo(() => (data ? dietDay(data.plan, data.logs, date) : []), [data, date]);
  const plan = useMemo(() => [...(data?.plan ?? [])].sort((a, b) => (a.time < b.time ? -1 : 1)), [data]);

  /** "Comi": registra a refeição do plano agora (hoje) ou no horário do plano (outro dia). */
  const ate = async (e: DietDayEntry) => {
    if (!e.plan) return;
    try {
      await repo.createLog({ date, time: date === now.date ? now.time : e.plan.time, plan_id: e.plan.id });
    } catch (err) {
      toast({ message: errorText(err) });
    }
  };

  return (
    <Screen>
      <BackHeader title="Dieta" backLabel="Voltar" fallback="/" />
      <View style={s.nav}>
        <IconButton icon={ChevronLeft} label="Dia anterior" variant="ghost" onPress={() => setDate(addDays(date, -1))} />
        <Text variant="chip" align="center" style={s.grow}>
          {date === now.date ? `Hoje · ${longDay(date)}` : longDay(date)}
        </Text>
        <IconButton icon={ChevronRight} label="Próximo dia" variant="ghost" onPress={() => setDate(addDays(date, 1))} />
      </View>

      <Section
        title="Refeições do dia"
        action={<Button label="Registrar" variant="ghost" size="sm" onPress={() => router.push({ pathname: '/dieta/registro/novo', params: { data: date } })} />}
      >
        {data && day.length === 0 && <Text tone="tertiary">Nada planejado nem registrado neste dia.</Text>}
        {day.map((e) => (
          <ListItem
            key={e.plan ? `p:${e.plan.id}` : `l:${e.log!.id}`}
            title={`${e.time} · ${e.plan?.name ?? 'Fora do plano'}`}
            subtitle={e.log ? `Comi às ${e.log.time}${e.log.description ? ` · ${e.log.description}` : ''}` : (e.plan?.description ?? '')}
            onPress={
              e.log
                ? () => router.push({ pathname: '/dieta/registro/[id]', params: { id: e.log!.id } })
                : () => router.push({ pathname: '/dieta/refeicao/[id]', params: { id: e.plan!.id } })
            }
            trailing={!e.log ? <Button label="Comi" size="sm" variant="secondary" selfAlign="center" onPress={() => void ate(e)} /> : undefined}
          />
        ))}
      </Section>

      <Section title="Plano alimentar" action={<Button label="Nova refeição" variant="ghost" size="sm" onPress={() => router.push('/dieta/refeicao/novo')} />}>
        {data && plan.length === 0 && <Text tone="tertiary">Monte o plano: cada refeição com horário e os dias em que vale.</Text>}
        {plan.map((p) => (
          <ListItem
            key={p.id}
            title={`${p.time} · ${p.name}`}
            subtitle={[weekdaysLabel(p.weekdays), p.remind ? 'Com aviso' : 'Sem aviso'].join(' · ')}
            onPress={() => router.push({ pathname: '/dieta/refeicao/[id]', params: { id: p.id } })}
          />
        ))}
      </Section>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  nav: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  grow: { flex: 1 },
}));
