// Tela 6 do protótipo: Recorrentes (regras ativas) e o editor de uma regra, com "Aplicar a partir de quando?" e
// "Encerrar recorrência". Mudança vale daqui em diante: meses passados e confirmados não mudam.
import {
  addDays,
  addMonths,
  isRecurrenceActive,
  lastDayOf,
  monthOf,
  nextOccurrenceOf,
  upcomingDates,
  type Frequency,
  type IsoDate,
  type Recurrence,
} from '@glife/domain/finance';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { BackHeader, Button, Input, Reveal, Screen, SegmentedControl, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { TRANSFER_ICON, categoryIcon } from '../components/categories';
import { dm, dmy, money, signed, todayIso, weekday } from '../components/format';
import { NewEntrySheet } from '../components/NewEntrySheet';
import { ChoiceSheet } from '../components/sheets';
import { Block, BlockHeader, DateRow, Disc, MoneyField, MoneyRow, Stepper } from '../components/ui';
import { useFinance } from '../hooks/FinanceData';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useOccurrences } from '../hooks/useFlows';

/** "Mensal · dia 10" · "A cada 2 meses · dia 10" · "Semanal · quinta" · "Anual · 12/03". */
export function frequencyLabel(r: Pick<Recurrence, 'frequency' | 'interval_count' | 'start_date'>): string {
  const day = Number(r.start_date.slice(8, 10));
  if (r.frequency === 'weekly')
    return `${r.interval_count > 1 ? `A cada ${r.interval_count} semanas` : 'Semanal'} · ${weekday(r.start_date)}`;
  if (r.frequency === 'yearly') return `${r.interval_count > 1 ? `A cada ${r.interval_count} anos` : 'Anual'} · ${dm(r.start_date)}`;
  return `${r.interval_count > 1 ? `A cada ${r.interval_count} meses` : 'Mensal'} · dia ${day}`;
}

const valueOf = (r: Pick<Recurrence, 'type' | 'amount_cents'>) => (r.type === 'income' ? r.amount_cents : -r.amount_cents);

export function RecurrencesScreen() {
  const s = useStyles();
  const today = todayIso();
  const { data } = useFinance();
  const occurrences = useOccurrences(addDays(today, 800));
  const [creating, setCreating] = useState(false);
  if (!data) return <Screen>{null}</Screen>;

  const accounts = new Map(data.accounts.map((a) => [a.id, a]));
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const active = data.rules.filter((r) => isRecurrenceActive(r, today));
  const groups = [
    { title: 'Entradas', rules: active.filter((r) => r.type === 'income') },
    { title: 'Saídas', rules: active.filter((r) => r.type === 'expense') },
    {
      title: 'Transferências',
      rules: active.filter((r) => r.type === 'transfer'),
    },
  ].filter((g) => g.rules.length > 0);

  return (
    <Screen>
      <View>
        <BackHeader title="Recorrentes" fallback="/financas" />
        <View style={s.newBtn}>
          <Button label="Nova" icon={Plus} variant="ghost" onPress={() => setCreating(true)} />
        </View>
        <Text variant="small" tone="tertiary" style={s.sub}>
          Regras que geram os previstos de cada mês.
        </Text>
      </View>
      <Reveal>
        {groups.length === 0 && <Text tone="tertiary">Nenhuma recorrência ainda. Use “Nova” ou ligue “Repetir” num lançamento.</Text>}
        {groups.map((g) => (
          <Block key={g.title}>
            <BlockHeader title={g.title} />
            {g.rules
              .slice()
              .sort((a, b) => b.amount_cents - a.amount_cents)
              .map((r, i) => {
                const account = accounts.get(r.account_id);
                const next = nextOccurrenceOf(r, occurrences, today, account?.kind === 'credit_card');
                return (
                  <MoneyRow
                    key={r.id}
                    divider={i > 0}
                    leading={
                      <Disc icon={r.type === 'transfer' ? TRANSFER_ICON : categoryIcon(categories.get(r.category_id ?? '')?.icon)} />
                    }
                    title={r.description || categories.get(r.category_id ?? '')?.name || 'Recorrência'}
                    meta={`${frequencyLabel(r)} · ${account?.name ?? ''}`}
                    amount={signed(valueOf(r))}
                    amountSub={
                      next
                        ? {
                            text: next.late
                              ? `atrasado · ${dm(next.date)}`
                              : `próx. ${next.date.slice(0, 4) === today.slice(0, 4) ? dm(next.date) : dmy(next.date)}`,
                            tone: next.late ? 'danger' : 'tertiary',
                          }
                        : undefined
                    }
                    onPress={() =>
                      router.push({
                        pathname: '/financas/recorrente/[id]',
                        params: { id: r.id },
                      })
                    }
                  />
                );
              })}
          </Block>
        ))}
      </Reveal>
      <NewEntrySheet visible={creating} onClose={() => setCreating(false)} today={today} preset={{ repeat: true, planned: true }} />
    </Screen>
  );
}

type Apply = 'this' | 'next';
type End = 'after' | 'now';

export function RecurrenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useFinance();
  const rule = data?.rules.find((r) => r.id === id) ?? null;
  if (!data) return <Screen>{null}</Screen>;
  if (!rule) {
    return (
      <Screen>
        <BackHeader title="Recorrência" fallback="/financas/recorrentes" />
        <Text tone="tertiary">Recorrência não encontrada.</Text>
      </Screen>
    );
  }
  return <RuleEditor key={rule.id} rule={rule} />;
}

function RuleEditor({ rule }: { rule: Recurrence }) {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const today = todayIso();
  const { data } = useFinance();
  const { changeRule, endRule } = useFinanceActions();

  const [cents, setCents] = useState<number | null>(rule.amount_cents);
  const [desc, setDesc] = useState(rule.description);
  const [freq, setFreq] = useState<Frequency>(rule.frequency);
  const [every, setEvery] = useState(rule.interval_count);
  const [ends, setEnds] = useState<'never' | 'date'>(rule.end_date ? 'date' : 'never');
  const [endDate, setEndDate] = useState<IsoDate>(rule.end_date ?? `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`);
  const [sheet, setSheet] = useState<'apply' | 'end' | null>(null);
  const [apply, setApply] = useState<Apply>('this');
  const [end, setEnd] = useState<End>('after');
  const [busy, setBusy] = useState(false);

  const monthStart = `${monthOf(today)}-01`;
  const nextMonthStart = `${addMonths(monthOf(today), 1)}-01`;
  const thisDate = upcomingDates(rule, monthStart, 1)[0] ?? null;
  const nextDate = upcomingDates(rule, nextMonthStart, 1)[0] ?? null;
  const preview = upcomingDates(
    {
      frequency: freq,
      interval_count: every,
      start_date: thisDate ?? rule.start_date,
      end_date: ends === 'date' ? endDate : null,
    },
    monthStart,
    3,
  );

  const account = data?.accounts.find((a) => a.id === rule.account_id);
  const category = data?.categories.find((c) => c.id === rule.category_id);
  const title = rule.description || category?.name || 'Recorrência';
  const value = cents ?? 0;
  const changed = value !== rule.amount_cents;
  const sign = rule.type === 'income' ? 1 : -1;
  const unit = {
    weekly: every > 1 ? 'semanas' : 'semana',
    monthly: every > 1 ? 'meses' : 'mês',
    yearly: every > 1 ? 'anos' : 'ano',
  }[freq];
  const anchor = thisDate ?? rule.start_date;
  const anchorTxt = freq === 'weekly' ? weekday(anchor) : freq === 'yearly' ? dm(anchor) : `dia ${Number(anchor.slice(8, 10))}`;

  const changes = {
    amount_cents: value,
    description: desc.trim(),
    frequency: freq,
    interval_count: every,
    end_date: ends === 'date' ? endDate : null,
  };
  const applyFrom = (apply === 'this' ? thisDate : nextDate) ?? nextDate ?? thisDate ?? today;
  const applyOptions = [
    ...(thisDate
      ? [
          {
            value: 'this' as const,
            title: 'Deste mês em diante',
            sub: `A partir de ${dmy(thisDate)}`,
          },
        ]
      : []),
    ...(nextDate
      ? [
          {
            value: 'next' as const,
            title: 'Do próximo mês em diante',
            sub: `A partir de ${dmy(nextDate)}`,
          },
        ]
      : []),
  ];
  const applyNote =
    apply === 'this' && thisDate
      ? `Antes de ${dmy(thisDate)} continua ${money(rule.amount_cents)}; de ${dmy(thisDate)} em diante, ${money(value)}. Meses passados e ocorrências já confirmadas não mudam.`
      : `${nextDate ? `De ${dmy(nextDate)} em diante, ${money(value)}. ` : ''}As ocorrências anteriores não mudam.`;

  const endAfter = lastDayOf(monthOf(today));
  const endNow = thisDate ? addDays(thisDate, -1) : null;
  const canEndNow = endNow !== null && endNow >= rule.start_date;
  const endOptions = [
    {
      value: 'after' as const,
      title: `Depois deste mês`,
      sub: thisDate ? `Última ocorrência em ${dmy(thisDate)}` : `Termina em ${dmy(endAfter)}`,
    },
    ...(canEndNow
      ? [
          {
            value: 'now' as const,
            title: 'Já neste mês',
            sub: `Este mês não acontece`,
          },
        ]
      : []),
  ];

  const save = async () => {
    setBusy(true);
    try {
      await changeRule(rule, applyFrom, changes);
      setSheet(null);
      toast({ message: `${title} atualizado a partir de ${dm(applyFrom)}` });
      if (router.canGoBack()) router.back();
      else router.replace('/financas/recorrentes');
    } catch (e) {
      console.warn('Falha ao atualizar a recorrência', e);
      toast({ message: 'Não foi possível salvar a recorrência.' });
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      await endRule(rule, end === 'now' && canEndNow ? endNow! : endAfter);
      setSheet(null);
      toast({ message: 'Recorrência encerrada' });
      if (router.canGoBack()) router.back();
      else router.replace('/financas/recorrentes');
    } catch (e) {
      console.warn('Falha ao encerrar a recorrência', e);
      toast({ message: 'Não foi possível encerrar.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View>
        <BackHeader title={title} fallback="/financas/recorrentes" />
        <Text variant="small" tone="tertiary" style={s.sub}>
          {`Recorrente desde ${dmy(rule.start_date)}${category ? ` · ${category.name}` : ''} · ${account?.name ?? ''}`}
        </Text>
      </View>
      <Reveal>
        <View style={s.group}>
          <MoneyField
            label="Valor"
            cents={cents}
            onChange={setCents}
            hint={changed ? `Antes: ${money(rule.amount_cents)}. O novo valor vale só daqui em diante.` : 'Valor atual'}
          />
          <Input label="Descrição" value={desc} onChangeText={setDesc} maxLength={200} />
        </View>
        <Block gap={t.space[3] + t.space[0.5]}>
          <Text variant="label" tone="tertiary">
            Frequência
          </Text>
          <SegmentedControl
            label="Frequência"
            options={[
              { value: 'weekly', label: 'Semanal' },
              { value: 'monthly', label: 'Mensal' },
              { value: 'yearly', label: 'Anual' },
            ]}
            value={freq}
            onChange={setFreq}
          />
          <View style={s.inline}>
            <Text tone="secondary">A cada</Text>
            <Stepper label="Intervalo" value={every} onChange={setEvery} />
            <Text tone="secondary">{`${unit} · ${anchorTxt}`}</Text>
          </View>
          <Text variant="label" tone="tertiary" style={s.top}>
            Termina
          </Text>
          <SegmentedControl
            label="Quando termina"
            options={[
              { value: 'never', label: 'Nunca' },
              { value: 'date', label: 'Em data' },
            ]}
            value={ends}
            onChange={setEnds}
          />
          {ends === 'date' && <DateRow label="Última" date={endDate} display={dmy(endDate)} onChange={setEndDate} />}
        </Block>
        <Block>
          <BlockHeader title="Próximas ocorrências" />
          {preview.length === 0 && <Text tone="tertiary">Nenhuma ocorrência futura.</Text>}
          {preview.map((d, i) => (
            <View key={d} style={[s.occ, i > 0 && s.divider]}>
              <Text tone="secondary" numeric>
                {dmy(d)}
              </Text>
              <Text tone="secondary" numeric style={s.medium}>
                {signed(sign * value)}
              </Text>
            </View>
          ))}
        </Block>
        <View style={s.buttons}>
          <Button label="Salvar alterações" haptic disabled={!value || applyOptions.length === 0} onPress={() => setSheet('apply')} />
          <Button label="Encerrar recorrência" variant="ghostDanger" onPress={() => setSheet('end')} />
        </View>
      </Reveal>

      <ChoiceSheet
        open={sheet === 'apply'}
        title="Aplicar a partir de quando?"
        subtitle={`${title} · de ${money(rule.amount_cents)} para ${money(value)}`}
        options={applyOptions}
        value={applyOptions.some((o) => o.value === apply) ? apply : (applyOptions[0]?.value ?? 'next')}
        onChange={setApply}
        note={applyNote}
        cta={busy ? 'Aplicando…' : 'Aplicar'}
        onGo={() => void save()}
        onClose={() => setSheet(null)}
      />
      <ChoiceSheet
        open={sheet === 'end'}
        title="Encerrar recorrência"
        subtitle={`${title} · ${money(rule.amount_cents)} · ${frequencyLabel(rule).toLowerCase()}`}
        options={endOptions}
        value={end}
        onChange={setEnd}
        note="Lançamentos já confirmados continuam no extrato."
        cta="Encerrar"
        danger
        onGo={() => void finish()}
        onClose={() => setSheet(null)}
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  sub: { marginTop: t.space[1.5] },
  newBtn: {
    position: 'absolute',
    right: -t.space[3] - t.space[0.5],
    bottom: t.space[6] + t.space[1],
  },
  group: { gap: t.space[3] },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    flexWrap: 'wrap',
  },
  top: { marginTop: t.space[1.5] },
  occ: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: t.touch.minTarget,
  },
  divider: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  medium: { fontFamily: t.type.chip.font },
  buttons: { gap: t.space[1.5], alignItems: 'flex-start' },
}));
