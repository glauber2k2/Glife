// Histórico da dieta (protótipo "dieta-semana"): Semana/Mês, calorias por dia contra a meta, média, plano cumprido e
// dias registrados (a "água média" do protótipo fica fora: água não está na R2). Cada dia abre os registros dele.
import { history, type HistoryDay, type HistoryRange } from '@glife/domain/diet';
import { localNow, weekdayOf, type IsoDate } from '@glife/domain/time';
import { router } from 'expo-router';
import { CalendarDays, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { longDay } from '@/shared/lib/calendarInput';
import { BackHeader, Card, Icon, ListGroup, ListItem, Reveal, Screen, SegmentedControl, Text, makeStyles, useTheme } from '@/shared/ui';

import { DietBarChart } from '../components/DietBarChart';
import { kcalGoal, kcalText } from '../components/nutrition';
import { useDiet } from '../hooks/DietData';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEK_AXIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;
const RANGES = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
] as const;

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const monthOf = (iso: IsoDate) => MONTHS[Number(iso.slice(5, 7)) - 1]!;
const dayOf = (iso: IsoDate) => Number(iso.slice(8, 10));

/** "23 a 29 de novembro" · "30 de novembro a 6 de dezembro" · "Novembro de 2026". */
function periodLabel(range: HistoryRange, from: IsoDate, to: IsoDate): string {
  if (range === 'month') return `${capital(monthOf(from))} de ${from.slice(0, 4)}`;
  return monthOf(from) === monthOf(to) ? `${dayOf(from)} a ${dayOf(to)} de ${monthOf(to)}` : `${dayOf(from)} de ${monthOf(from)} a ${dayOf(to)} de ${monthOf(to)}`;
}

export function DietHistoryScreen() {
  const s = useStyles();
  const t = useTheme();
  const { data } = useDiet();
  const today = localNow().date;
  const [range, setRange] = useState<HistoryRange>('week');
  const h = useMemo(() => history(data?.logs ?? [], data?.plan ?? [], range, today), [data, range, today]);
  const goal = kcalGoal(data?.goals?.kcal_target);
  const elapsed = h.days.filter((d) => !d.future);
  const list = [...elapsed].reverse();
  const last = h.days.length - 1;
  const axis = (d: HistoryDay, i: number) => (range === 'week' ? WEEK_AXIS[weekdayOf(d.date)]! : i === 0 || i === last ? String(dayOf(d.date)) : '');

  return (
    <Screen header={<BackHeader title="Histórico" subtitle={periodLabel(range, h.from, h.to)} backLabel="Dieta" fallback="/dieta" />}>
      <SegmentedControl label="Período" shape="pill" options={RANGES} value={range} onChange={setRange} />
      <Reveal>
        <Card gap={t.space[3]}>
          <View style={s.cardHead}>
            <Text variant="emphasis">Calorias por dia</Text>
            <Text variant="caption" tone="tertiary" numeric>
              {goal ? `meta ${kcalText(goal)} kcal` : 'sem meta'}
            </Text>
          </View>
          <DietBarChart
            key={range}
            days={h.days}
            goal={goal}
            axisLabel={axis}
            accessibilityLabel={`Calorias por dia, ${periodLabel(range, h.from, h.to)}${h.averageKcal !== null ? `; média de ${kcalText(h.averageKcal)} kcal` : ''}`}
          />
        </Card>

        <Card>
          <View style={s.stats}>
            <Stat label="Média" value={h.averageKcal !== null ? `${kcalText(h.averageKcal)} kcal` : '—'} />
            <Stat label="Plano cumprido" value={h.adherence !== null ? `${Math.round(h.adherence * 100)}%` : '—'} />
            <Stat label="Dias registrados" value={`${h.loggedDays} de ${elapsed.length}`} />
          </View>
        </Card>

        <View style={s.section}>
          <Text variant="label" tone="tertiary">
            Dias
          </Text>
          <ListGroup>
            {list.map((d) => (
              <ListItem
                key={d.date}
                icon={CalendarDays}
                module="diet"
                title={`${capital(longDay(d.date).split(' de ')[0]!)}${d.today ? ' · hoje' : ''}`}
                subtitle={<DayMeta day={d} goal={goal} />}
                trailing={<Icon icon={ChevronRight} size={t.icon.small + t.space[0.5]} color="textQuaternary" />}
                onPress={() => router.push({ pathname: '/dieta', params: { data: d.date } })}
              />
            ))}
          </ListGroup>
        </View>
      </Reveal>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <View style={s.stat}>
      <Text variant="caption" tone="tertiary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="emphasis" numeric numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** "1.420 kcal · 2 de 4 refeições"; acima da meta, só o número fica em alerta. */
function DayMeta({ day: d, goal }: { day: HistoryDay; goal: number | null }) {
  const over = goal !== null && d.kcal > goal;
  const meals = d.planned > 0 ? `${d.done} de ${d.planned} refeições` : d.logged ? `${d.logged} ${d.logged === 1 ? 'registro' : 'registros'}` : 'Nada registrado';
  return (
    <Text variant="caption" tone="tertiary" numeric>
      {d.hasKcal ? (
        <>
          <Text variant="caption" tone={over ? 'warning' : 'tertiary'} numeric>
            {`${kcalText(d.kcal)} kcal`}
          </Text>
          {' · '}
        </>
      ) : null}
      {meals}
    </Text>
  );
}

const useStyles = makeStyles((t) => ({
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: t.space[3] },
  stats: { flexDirection: 'row', gap: t.space[3] },
  stat: { flex: 1, minWidth: 0, gap: t.space[1] },
  section: { gap: t.space[2.5] },
}));
