// Dieta (protótipo do redesign Cobalto): o dia num cartão com o anel das refeições feitas, as refeições do plano
// (próxima em destaque, "Comi" registra) e o plano alimentar. Calorias, macros e água chegam na Fase R2.
import { dietDay, type DietDayEntry } from '@glife/domain/diet';
import { addDays, localNow } from '@glife/domain/time';
import { router } from 'expo-router';
import { Check, ChevronLeft, ChevronRight, ClipboardList, Plus, Utensils } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { longDay, weekdaysLabel } from '@/shared/lib/calendarInput';
import { errorText } from '@/shared/lib/errorText';
import {
  BackHeader,
  Button,
  Card,
  EmptyState,
  IconButton,
  ListGroup,
  ModuleIcon,
  NavRow,
  ProgressRing,
  Reveal,
  Screen,
  SectionHeader,
  Tag,
  Text,
  makeStyles,
  moduleColors,
  moduleHue,
  useTheme,
  useToast,
} from '@/shared/ui';

import { useDiet } from '../hooks/DietData';

export function DietScreen() {
  const s = useStyles();
  const toast = useToast();
  const { repo, data } = useDiet();
  const now = localNow();
  const [date, setDate] = useState(now.date);
  const day = useMemo(() => (data ? dietDay(data.plan, data.logs, date) : []), [data, date]);
  const plan = useMemo(() => [...(data?.plan ?? [])].sort((a, b) => (a.time < b.time ? -1 : 1)), [data]);
  const planned = day.filter((e) => e.plan);
  const done = planned.filter((e) => e.log).length;
  const next = date === now.date ? day.find((e) => e.plan && !e.log && e.time >= now.time) : undefined;

  /** "Comi": registra a refeição do plano agora (hoje) ou no horário do plano (outro dia). */
  const ate = async (e: DietDayEntry) => {
    if (!e.plan) return;
    try {
      await repo.createLog({ date, time: date === now.date ? now.time : e.plan.time, plan_id: e.plan.id });
      toast({ message: `${e.plan.name} registrado`, icon: Check });
    } catch (err) {
      toast({ message: errorText(err) });
    }
  };
  const label = date === now.date ? `Hoje, ${longDay(date).split(', ')[1]}` : longDay(date);

  return (
    <Screen
      header={<BackHeader title="Dieta" subtitle={label} backLabel="Voltar" fallback="/" />}
      footer={
        plan.length > 0 ? (
          <Button
            label="Registrar refeição"
            icon={Plus}
            fullWidth
            haptic
            onPress={() => router.push({ pathname: '/dieta/registro/novo', params: { data: date } })}
          />
        ) : undefined
      }
    >
      <View style={s.nav}>
        <IconButton icon={ChevronLeft} label="Dia anterior" onPress={() => setDate(addDays(date, -1))} />
        <Text variant="chip" align="center" style={s.grow}>
          {longDay(date)}
        </Text>
        <IconButton icon={ChevronRight} label="Próximo dia" onPress={() => setDate(addDays(date, 1))} />
      </View>

      {data && plan.length === 0 ? (
        <Reveal>
          <EmptyState
            title="Monte seu plano"
            message="Diga os horários das refeições e o que comer em cada uma. Eu aviso na hora certa, mesmo sem internet."
            actionLabel="Criar plano"
            onAction={() => router.push('/dieta/refeicao/novo')}
          />
          <Button
            label="Só registrar o que comi"
            variant="neutral"
            fullWidth
            onPress={() => router.push({ pathname: '/dieta/registro/novo', params: { data: date } })}
          />
        </Reveal>
      ) : (
        <Reveal>
          {planned.length > 0 && (
            <Card>
              <View style={s.summary}>
                <ProgressRing value={planned.length ? done / planned.length : 0} tone="success">
                  <Text variant="title2" numeric>{`${done}/${planned.length}`}</Text>
                  <Text variant="micro" tone="tertiary">
                    refeições
                  </Text>
                </ProgressRing>
                <View style={s.summaryText}>
                  <Text variant="emphasis">
                    {done === planned.length ? 'Plano do dia cumprido' : done === 0 ? 'Nenhuma refeição registrada' : 'Vai bem hoje'}
                  </Text>
                  <Text variant="small" tone="tertiary">
                    {next ? `Próxima: ${next.plan!.name} às ${next.time}` : 'Registre o que comer fora do plano também.'}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          <View style={s.section}>
            <SectionHeader title="Refeições" />
            {day.length === 0 ? (
              <EmptyState compact message="Nada planejado nem registrado neste dia." />
            ) : (
              <ListGroup>
                {day.map((e) => (
                  <MealRow key={e.plan ? `p:${e.plan.id}` : `l:${e.log!.id}`} entry={e} next={e === next} onAte={() => void ate(e)} />
                ))}
              </ListGroup>
            )}
          </View>

          <View style={s.section}>
            <SectionHeader title="Plano alimentar" actionLabel="Nova refeição" onAction={() => router.push('/dieta/refeicao/novo')} />
            <ListGroup>
              {plan.map((p) => (
                <NavRow
                  key={p.id}
                  icon={ClipboardList}
                  iconSize="md"
                  module="diet"
                  label={`${p.time} · ${p.name}`}
                  meta={[weekdaysLabel(p.weekdays), p.remind ? 'Com aviso' : 'Sem aviso'].join(' · ')}
                  onPress={() => router.push({ pathname: '/dieta/refeicao/[id]', params: { id: p.id } })}
                />
              ))}
            </ListGroup>
          </View>
        </Reveal>
      )}
    </Screen>
  );
}

function MealRow({ entry: e, next, onAte }: { entry: DietDayEntry; next: boolean; onAte: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const colors = moduleColors(moduleHue.diet, t.scheme);
  const open = e.log
    ? () => router.push({ pathname: '/dieta/registro/[id]', params: { id: e.log!.id } })
    : () => router.push({ pathname: '/dieta/refeicao/[id]', params: { id: e.plan!.id } });
  const meta = e.log
    ? `Comi às ${e.log.time}${e.log.description ? ` · ${e.log.description}` : ''}`
    : `${e.time}${e.plan?.description ? ` · ${e.plan.description}` : ''}`;
  return (
    <View style={s.meal}>
      <ModuleIcon icon={e.log ? Check : Utensils} module="diet" />
      <Pressable accessibilityRole="button" onPress={open} style={s.mealText}>
        <View style={s.mealTitle}>
          <Text variant="item" numberOfLines={1} style={s.shrink}>
            {e.plan?.name ?? 'Fora do plano'}
          </Text>
          {next && <Tag label="Próxima" tone="tonal" />}
        </View>
        <Text variant="caption" tone="tertiary" numberOfLines={2}>
          {meta}
        </Text>
      </Pressable>
      {e.log ? (
        <View style={[s.doneDot, { backgroundColor: colors.soft }]}>
          <Text variant="tag" numeric style={{ color: colors.strong }}>
            {e.log.time}
          </Text>
        </View>
      ) : (
        <Button label="Comi" size="sm" variant="secondary" selfAlign="center" onPress={onAte} />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  nav: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  grow: { flex: 1 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: t.space[5] },
  summaryText: { flex: 1, gap: t.space[1] },
  section: { gap: t.space[3] },
  meal: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.listRow, paddingVertical: t.space[2.5] },
  mealText: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  mealTitle: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
  shrink: { flexShrink: 1 },
  doneDot: { height: t.size.linkChip, paddingHorizontal: t.space[2.5], borderRadius: t.radius.full, justifyContent: 'center' },
}));
