// Detalhe do plano de leitura (protótipo Bíblia v2): progresso, sequência e término; a leitura de hoje como checklist
// (marcar aqui ou ler pelo leitor); próximos dias; histórico pelo calendário (lido, perdido, a ler) com "Recuperar
// dia"; lembrete, pausar/retomar e excluir.
import { dayLabel, schedule } from '@glife/domain/bible';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Bell, CalendarSync, Flame, Pause, Pencil, Play, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { errorText } from '@/shared/lib/errorText';
import {
  BackHeader,
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Icon,
  IconButton,
  ListGroup,
  NavRow,
  ProgressRing,
  Screen,
  Section,
  Switch,
  Text,
  makeStyles,
  moduleColors,
  useTheme,
  useToast,
} from '@/shared/ui';

import { planChapterHref } from '../components/navigation';
import { shortDate } from '../components/planMath';
import { usePlansMaybe } from '../hooks/BibleData';
import { usePlanViews } from '../hooks/usePlanStatuses';

const HISTORY_MAX = 35;
const PLANS_HREF = '/biblia/planos' as Href;
const NEXT_DAYS = 3;
const DEFAULT_TIME = '06:30';

export function PlanDetailScreen() {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const repo = usePlansMaybe()?.repo;
  const { views, today, loading } = usePlanViews();
  const [confirm, setConfirm] = useState(false);
  const view = views.find((v) => v.plan.id === id);

  if (!view)
    return (
      <Screen header={<BackHeader title="Plano" fallback={PLANS_HREF} />}>
        {!loading && <EmptyState title="Plano não encontrado" message="Ele pode ter sido excluído." mood="pensando" />}
      </Screen>
    );

  const { plan, status } = view;
  const colors = moduleColors(plan.color_hue, t.scheme);
  const days = schedule(plan, today);
  const cur = status.current;
  const read = new Set(view.reads.map((r) => r.ref));
  const upcoming = cur ? days.filter((d) => d.n > cur.n).slice(0, NEXT_DAYS) : [];
  const shown = days.filter((d) => d.date <= today || d.n === cur?.n).slice(-HISTORY_MAX);
  const oldestMissed = status.missedDays[0];
  const fail = (what: string) => (e: unknown) => toast({ message: `Não deu para ${what}: ${errorText(e)}` });

  const toggle = (ref: string) => {
    if (!repo) return;
    const op = read.has(ref) ? repo.unmarkRead(plan.id, ref) : repo.markRead(plan.id, [ref], today);
    void op.catch(fail('marcar a leitura'));
  };
  const recover = () => {
    const day = days.find((d) => d.n === oldestMissed);
    const ref = day?.refs.find((r) => !read.has(r));
    if (ref) router.push(planChapterHref(plan.id, ref) as Href);
  };
  const remove = () => {
    setConfirm(false);
    void repo
      ?.remove(plan.id)
      .then(() => {
        toast({ message: 'Plano excluído' });
        router.back();
      })
      .catch(fail('excluir o plano'));
  };

  return (
    <Screen
      header={
        <BackHeader
          title={plan.name}
          fallback={PLANS_HREF}
          right={<IconButton icon={Pencil} label="Editar plano" onPress={() => router.push(`/biblia/planos/${plan.id}/editar` as Href)} />}
        />
      }
    >
      <View style={[s.hero, { backgroundColor: colors.soft }]}>
        <ProgressRing value={status.progress}>
          <Text variant="heading" numeric>
            {Math.round(status.progress * 100)}%
          </Text>
        </ProgressRing>
        <View style={s.grow}>
          <Text variant="caption" style={{ color: colors.strong }}>
            {view.done ? 'Concluído' : status.paused ? 'Pausado' : cur ? `Dia ${cur.n} de ${plan.days}` : `${plan.days} dias`}
          </Text>
          <Text variant="emphasis">Termina em {shortDate(status.endDate)}</Text>
          <View style={s.inline}>
            <Icon icon={Flame} size={t.icon.small} color="warning" />
            <Text variant="small" tone="secondary">
              {status.streak} {status.streak === 1 ? 'dia seguido' : 'dias seguidos'}
            </Text>
          </View>
        </View>
      </View>

      {cur && !view.done && (
        <Section title={cur.date === today ? `Hoje · dia ${cur.n}` : `Próxima leitura · ${shortDate(cur.date)}`}>
          <ListGroup>
            {cur.refs.map((ref) => {
              const done = read.has(ref);
              return (
                <View key={ref} style={s.check}>
                  <Pressable onPress={() => toggle(ref)} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={`${dayLabel([ref])}, lido`} hitSlop={t.touch.hitSlop} style={s.checkHit}>
                    <Checkbox checked={done} />
                  </Pressable>
                  <Text variant="item" tone={done ? 'tertiary' : 'primary'} style={s.grow}>
                    {dayLabel([ref])}
                  </Text>
                  <Button label={done ? 'Reler' : 'Ler'} size="sm" variant={done ? 'neutral' : 'secondary'} selfAlign="center" onPress={() => router.push(planChapterHref(plan.id, ref) as Href)} />
                </View>
              );
            })}
          </ListGroup>
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="Próximos dias">
          <ListGroup>
            {upcoming.map((d) => (
              <View key={d.n} style={s.next}>
                <Text variant="caption" tone="tertiary" numeric style={s.dayCol}>
                  Dia {d.n}
                </Text>
                <Text variant="item" style={s.grow} numberOfLines={1}>
                  {d.label}
                </Text>
                <Text variant="caption" tone="quaternary">
                  {shortDate(d.date)}
                </Text>
              </View>
            ))}
          </ListGroup>
        </Section>
      )}

      <Card>
        <View style={s.between}>
          <Text variant="emphasis">Histórico</Text>
          <Text variant="caption" tone="tertiary">
            {status.missedDays.length ? `${status.missedDays.length} ${status.missedDays.length === 1 ? 'dia perdido' : 'dias perdidos'}` : 'Tudo em dia'}
          </Text>
        </View>
        <View style={s.grid}>
          {shown.map((d) => {
            const done = status.doneDays.includes(d.n);
            const missed = status.missedDays.includes(d.n);
            return (
              <View
                key={d.n}
                accessibilityLabel={`Dia ${d.n}: ${done ? 'lido' : missed ? 'perdido' : 'a ler'}`}
                style={[s.cell, done ? { backgroundColor: colors.strong } : missed ? s.cellMissed : s.cellTodo, d.n === cur?.n && s.cellToday]}
              />
            );
          })}
        </View>
        <View style={s.legend}>
          <Legend color={colors.strong} label="Lido" />
          <Legend outline label="Perdido" />
          <Legend color={t.colors.track} label="A ler" />
        </View>
        {oldestMissed !== undefined && <Button label={`Recuperar dia ${oldestMissed}`} icon={CalendarSync} size="sm" variant="secondary" onPress={recover} />}
      </Card>

      <ListGroup>
        <NavRow
          icon={Bell}
          label="Lembrete diário"
          meta={plan.reminder_time ? `Nos dias de leitura, às ${plan.reminder_time}` : 'Desligado'}
          trailing={<Switch label="Lembrete diário" value={plan.reminder_time !== null} onChange={(on) => void repo?.update(plan.id, { reminder_time: on ? DEFAULT_TIME : null }).catch(fail('mudar o lembrete'))} />}
        />
        {!view.done && (
          <NavRow
            icon={status.paused ? Play : Pause}
            label={status.paused ? 'Retomar plano' : 'Pausar plano'}
            meta={status.paused ? 'Os próximos dias voltam a contar a partir de hoje' : 'A sequência fica guardada'}
            onPress={() => void (status.paused ? repo?.resume(plan.id, today) : repo?.pause(plan.id, today))?.catch(fail('mudar o plano'))}
          />
        )}
        <NavRow icon={Trash2} label="Excluir plano" onPress={() => setConfirm(true)} />
      </ListGroup>

      <Dialog
        visible={confirm}
        onClose={() => setConfirm(false)}
        title="Excluir plano?"
        message={`“${plan.name}” e as leituras marcadas nele vão para a lixeira.`}
        actions={
          <>
            <Button label="Cancelar" variant="neutral" grow onPress={() => setConfirm(false)} />
            <Button label="Excluir" variant="danger" grow onPress={remove} />
          </>
        }
      />
    </Screen>
  );
}

function Legend({ color, outline, label }: { color?: string; outline?: boolean; label: string }) {
  const s = useStyles();
  return (
    <View style={s.inline}>
      <View style={[s.swatch, outline ? s.cellMissed : { backgroundColor: color }]} />
      <Text variant="micro" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { flexDirection: 'row', alignItems: 'center', gap: t.space[4], padding: t.space[4.5], borderRadius: t.radius.card },
  grow: { flex: 1, minWidth: t.space[0], gap: t.space[1] },
  inline: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
  check: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRow, paddingVertical: t.space[2] },
  checkHit: { minWidth: t.touch.minTarget, minHeight: t.touch.minTarget, alignItems: 'flex-start', justifyContent: 'center' },
  next: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.listRowSmall, paddingVertical: t.space[2] },
  dayCol: { width: t.size.budgetInputWidth / 2 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[3] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[1], marginVertical: t.space[3] },
  cell: { width: t.space[6], height: t.space[6], borderRadius: t.radius.checkbox - t.space[0.5] },
  cellTodo: { backgroundColor: t.colors.track },
  cellMissed: { borderWidth: t.size.radioBorder, borderColor: t.colors.border },
  cellToday: { borderWidth: t.size.radioBorder + t.hairline / 2, borderColor: t.colors.text },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[4], marginBottom: t.space[3] },
  swatch: { width: t.size.legendSwatch, height: t.size.legendSwatch, borderRadius: t.radius.checkbox / 2 },
}));
