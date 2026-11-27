// Criar ou editar um plano de leitura (protótipo Bíblia v2, "Criar plano"): modelo, nome, livros, duração em dias de
// leitura, dias da semana, início e lembrete, com o resumo recalculado na hora no rodapé. Na edição, livros e início
// ficam fixos (para mudar, cria-se outro plano) e o resumo avisa se dias passados vão ficar perdidos.
import { PLAN_GROUPS, PLAN_TEMPLATES, chapterCount, planStatus, schedule, type PlanGroup, type PlanRule } from '@glife/domain/bible';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { errorText } from '@/shared/lib/errorText';
import { BackHeader, Button, Card, Chip, EmptyState, Input, Screen, SegmentedControl, Slider, Switch, Text, TimeInput, WeekdayPicker, makeStyles, useToast } from '@/shared/ui';

import { maskToWeekdays, nextHue, paceLabel, shortDate, startDate, weekdaysToMask, type StartOption } from '../components/planMath';
import { usePlansMaybe } from '../hooks/BibleData';
import { usePlanViews, type PlanView } from '../hooks/usePlanStatuses';

const DAYS = { min: 7, max: 365, step: 1 };
const PLANS_HREF = '/biblia/planos' as Href;
const ALL_DAYS = 0b1111111;
const DEFAULT_TIME = '06:30';
type TemplateId = 'custom' | (typeof PLAN_TEMPLATES)[number]['id'];

export function PlanEditScreen() {
  const { modelo, id } = useLocalSearchParams<{ modelo?: string; id?: string }>();
  const { views, today, loading } = usePlanViews();
  const editing = id ? views.find((v) => v.plan.id === id) : undefined;
  if (id && !editing && loading) return <Screen header={<BackHeader title="Editar plano" fallback={PLANS_HREF} />}>{null}</Screen>;
  if (id && !editing)
    return (
      <Screen header={<BackHeader title="Plano" fallback={PLANS_HREF} />}>
        <EmptyState title="Plano não encontrado" message="Ele pode ter sido excluído." mood="pensando" />
      </Screen>
    );
  // a key recria o formulário quando o plano editado chega do banco
  return <PlanForm key={editing?.plan.id ?? 'novo'} editing={editing} template={modelo} views={views} today={today} />;
}

function PlanForm({ editing, template, views, today }: { editing: PlanView | undefined; template: string | undefined; views: PlanView[]; today: string }) {
  const s = useStyles();
  const toast = useToast();
  const repo = usePlansMaybe()?.repo;
  const start = PLAN_TEMPLATES.find((x) => x.id === template);

  const [tpl, setTpl] = useState<TemplateId>(start?.id ?? 'custom');
  const [name, setName] = useState(editing?.plan.name ?? start?.name ?? 'Cartas de Paulo');
  const [groups, setGroups] = useState<PlanGroup[]>(editing?.plan.groups ?? start?.groups ?? ['paulo']);
  const [rawDays, setDays] = useState(editing?.plan.days ?? start?.days ?? 30);
  const [mask, setMask] = useState(editing ? weekdaysToMask(editing.plan.weekdays) : ALL_DAYS);
  const [when, setWhen] = useState<StartOption>('today');
  const [reminder, setReminder] = useState<string | null>(editing ? editing.plan.reminder_time : DEFAULT_TIME);
  const [busy, setBusy] = useState(false);

  const chapters = chapterCount(groups);
  // nunca mais dias do que capítulos (dias vazios contariam como lidos)
  const maxDays = Math.max(DAYS.min, Math.min(DAYS.max, chapters));
  const days = Math.min(rawDays, maxDays);
  const rule: PlanRule = useMemo(
    () => ({ groups, days, weekdays: maskToWeekdays(mask), start_date: editing?.plan.start_date ?? startDate(when, today), pauses: editing?.plan.pauses ?? [] }),
    [groups, days, mask, when, today, editing],
  );
  const valid = name.trim().length > 0 && groups.length > 0 && mask !== 0;
  const end = valid ? schedule(rule, today).at(-1)?.date : undefined;
  const newlyMissed = editing && valid ? planStatus(rule, editing.reads, today).missedDays.length - editing.status.missedDays.length : 0;

  const pickTemplate = (next: TemplateId) => {
    setTpl(next);
    const t = PLAN_TEMPLATES.find((x) => x.id === next);
    if (t) {
      setName(t.name);
      setGroups([...t.groups]);
      setDays(t.days);
      setMask(ALL_DAYS);
    }
  };
  const toggleGroup = (g: PlanGroup) => {
    setTpl('custom');
    setGroups((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  };

  const submit = async () => {
    if (!repo || !valid) return;
    setBusy(true);
    try {
      const weekdays = [...rule.weekdays];
      if (editing) {
        await repo.update(editing.plan.id, { name: name.trim(), days, weekdays, reminder_time: reminder });
        toast({ message: 'Plano salvo' });
        router.back();
      } else {
        const hue = nextHue(views.filter((v) => !v.done).map((v) => v.plan.color_hue));
        const p = await repo.create({ name: name.trim(), groups, days, weekdays, start_date: rule.start_date, reminder_time: reminder, color_hue: hue });
        toast({ message: `Plano “${p.name}” criado` });
        router.replace(`/biblia/planos/${p.id}` as Href);
      }
    } catch (e) {
      toast({ message: `Não deu para salvar o plano: ${errorText(e)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<BackHeader title={editing ? 'Editar plano' : 'Novo plano'} fallback={PLANS_HREF} />}
      footer={
        <View style={s.footer}>
          <Card>
            <View style={s.summary}>
              <Fact label="Capítulos" value={String(chapters)} />
              <Fact label="Ritmo" value={valid ? paceLabel(chapters, days) : '—'} />
              <Fact label="Termina em" value={end ? shortDate(end) : '—'} />
            </View>
            {newlyMissed > 0 && (
              <Text variant="caption" tone="warning">
                {newlyMissed} {newlyMissed === 1 ? 'dia passado vai ficar perdido' : 'dias passados vão ficar perdidos'} com essa mudança.
              </Text>
            )}
          </Card>
          <Button label={editing ? 'Salvar' : 'Criar plano'} fullWidth haptic loading={busy} disabled={!valid || busy || !repo} onPress={() => void submit()} />
        </View>
      }
    >
      {!editing && (
        <View style={s.block}>
          <Text variant="label" tone="tertiary">
            Começar de um modelo
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
            <Chip label="Personalizado" selected={tpl === 'custom'} onPress={() => setTpl('custom')} />
            {PLAN_TEMPLATES.map((x) => (
              <Chip key={x.id} label={x.name} selected={tpl === x.id} onPress={() => pickTemplate(x.id)} />
            ))}
          </ScrollView>
        </View>
      )}
      <Input label="Nome do plano" value={name} onChangeText={setName} maxLength={60} />
      {!editing && (
        <View style={s.block}>
          <Text variant="caption" tone="tertiary">
            O que ler
          </Text>
          <View style={s.wrap}>
            {PLAN_GROUPS.map((g) => (
              <Chip key={g.code} label={`${g.name} · ${chapterCount([g.code])}`} selected={groups.includes(g.code)} onPress={() => toggleGroup(g.code)} />
            ))}
          </View>
        </View>
      )}
      <View style={s.block}>
        <View style={s.between}>
          <Text variant="caption" tone="tertiary">
            Duração
          </Text>
          <Text variant="emphasis" numeric>
            {days} dias de leitura
          </Text>
        </View>
        <Slider label="Duração em dias de leitura" valueText={`${days} dias`} value={days} min={DAYS.min} max={maxDays} step={DAYS.step} onChange={setDays} />
        <View style={s.between}>
          <Text variant="micro" tone="quaternary">
            1 semana
          </Text>
          <Text variant="micro" tone="quaternary">
            {maxDays === DAYS.max ? '1 ano' : `${maxDays} dias`}
          </Text>
        </View>
      </View>
      <View style={s.block}>
        <Text variant="caption" tone="tertiary">
          Dias de leitura
        </Text>
        <WeekdayPicker value={mask} onChange={setMask} />
      </View>
      {!editing && (
        <View style={s.block}>
          <Text variant="caption" tone="tertiary">
            Começar
          </Text>
          <SegmentedControl
            label="Quando começar"
            value={when}
            onChange={setWhen}
            options={[
              { value: 'today', label: 'Hoje' },
              { value: 'tomorrow', label: 'Amanhã' },
              { value: 'monday', label: 'Segunda' },
            ]}
          />
        </View>
      )}
      <Card>
        <View style={s.between}>
          <View style={s.grow}>
            <Text variant="item">Lembrete diário</Text>
            <Text variant="caption" tone="tertiary">
              Notificação no aparelho nos dias de leitura
            </Text>
          </View>
          <Switch label="Lembrete diário" value={reminder !== null} onChange={(on) => setReminder(on ? DEFAULT_TIME : null)} />
        </View>
        {reminder !== null && <TimeInput label="Horário" value={reminder} onChange={setReminder} />}
      </Card>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <View style={s.fact}>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      <Text variant="amount" numeric numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: t.space[2.5] },
  summary: { flexDirection: 'row', gap: t.space[3] },
  fact: { flex: 1, minWidth: t.space[0], gap: t.space[0.5] },
  block: { gap: t.space[2.5] },
  row: { gap: t.space[2] },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[3] },
  grow: { flex: 1, minWidth: t.space[0], gap: t.space[0.5] },
}));
