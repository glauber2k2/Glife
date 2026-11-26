// Tela 7 do protótipo: Orçamentos. Valor mensal editável na própria linha; barra com gasto, previsto e o traço do
// limite quando estoura; categorias sem orçamento no fim, com "Definir".
import { addMonths, lastDayOf, monthOf, monthOverview, type BudgetRow, type Month } from '@glife/domain/finance';
import { useLocalSearchParams } from 'expo-router';
import { CreditCard, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Alert, BackHeader, Button, EmptyState, ModuleIcon, ProgressBar, Reveal, Screen, Tag, Text, makeStyles, noFocusRing, useTheme, useToast } from '@/shared/ui';

import { categoryHue, categoryIcon } from '../components/categories';
import { MONEY_MASK, digitsToCents, money as rawMoney, monthName, todayIso } from '../components/format';
import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { Block, BlockHeader, BudgetBar, Disc, MonthSlide, MonthStepper } from '../components/ui';
import { useFinance } from '../hooks/FinanceData';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useOccurrences } from '../hooks/useFlows';

const monthOk = (m: unknown): m is Month => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

export function BudgetsScreen() {
  const { money, balance } = useMoneyFormat();
  const s = useStyles();
  const today = todayIso();
  const params = useLocalSearchParams<{ mes?: string }>();
  const [month, setMonth] = useState<Month>(monthOk(params.mes) ? params.mes : monthOf(today));
  const [dir, setDir] = useState(1);
  const { data } = useFinance();
  const occurrences = useOccurrences(lastDayOf(addMonths(month, 1)));
  const overview = useMemo(() => (data ? monthOverview(data, occurrences, today, month) : null), [data, occurrences, today, month]);
  const [defining, setDefining] = useState<Set<string>>(new Set());

  if (!overview) return <Screen>{null}</Screen>;
  const name = monthName(month, today);
  const withBudget = overview.budgets.filter((b) => b.budget !== null || defining.has(b.category.id));
  const without = overview.budgets.filter((b) => b.budget === null && !defining.has(b.category.id));
  const spent = overview.budgets.reduce((acc, b) => acc + b.spent, 0);
  const planned = overview.budgets.reduce((acc, b) => acc + b.planned, 0);
  const total = withBudget.reduce((acc, b) => acc + (b.budget ?? 0), 0);
  const go = (delta: number) => {
    setDir(delta);
    setMonth((m) => addMonths(m, delta));
  };

  return (
    <Screen>
      <BackHeader title="Orçamentos" fallback="/financas" />
      <View style={s.stepper}>
        <MonthStepper label={name} onPrev={() => go(-1)} onNext={() => go(1)} />
      </View>
      <MonthSlide id={month} direction={dir}>
        <Reveal>
          <View style={s.hero}>
            <Text variant="small" tone="tertiary">
              {`Gasto em ${name}`}
            </Text>
            <Text variant="big" numeric>
              {balance(spent)}
            </Text>
            <Text variant="small" tone="tertiary" numeric>
              {`mais ${money(planned)} previsto · orçamento ${money(total)}`}
            </Text>
            {total > 0 && <ProgressBar value={spent / total} planned={planned / total} tone={spent > total ? 'danger' : 'neutral'} thickness="thick" />}
            <Alert tone="neutral" icon={CreditCard}>
              Compras no cartão contam no mês em que a fatura vence. Pagamento de fatura não entra aqui.
            </Alert>
          </View>

          <Block>
            <BlockHeader title="Por categoria" right="orçamento mensal" />
            {withBudget.length === 0 && <EmptyState compact message="Nenhuma categoria com orçamento. Use “Definir” abaixo." />}
            {withBudget.map((b, i) => (
              <BudgetLine key={b.category.id} b={b} month={month} index={i} divider={i > 0} />
            ))}
          </Block>

          {without.length > 0 && (
            <Block>
              <BlockHeader title="Sem orçamento" />
              {without.map((b, i) => {
                const meta =
                  [b.spent ? `${money(b.spent)} gasto` : '', b.planned ? `${money(b.planned)} previsto` : ''].filter(Boolean).join(' · ') ||
                  'Nada no mês';
                return (
                  <View key={b.category.id} style={[s.none, i > 0 && s.divider]}>
                    <Disc icon={categoryIcon(b.category.icon)} hue={categoryHue(b.category.color)} muted />
                    <View style={s.flex}>
                      <Text variant="item">{b.category.name}</Text>
                      <Text variant="caption" tone="tertiary" numeric>
                        {meta}
                      </Text>
                    </View>
                    <Button
                      selfAlign="center"
                      label="Definir"
                      variant="secondary"
                      size="sm"
                      onPress={() => setDefining((d) => new Set(d).add(b.category.id))}
                    />
                  </View>
                );
              })}
            </Block>
          )}
        </Reveal>
      </MonthSlide>
    </Screen>
  );
}

function BudgetLine({ b, month, index, divider }: { b: BudgetRow; month: Month; index: number; divider: boolean }) {
  const { money, balance, hidden } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const { setBudget } = useFinanceActions();
  const [text, setText] = useState(b.budget !== null ? rawMoney(b.budget) : '');
  const [focused, setFocused] = useState(false);
  const typed = digitsToCents(text);
  const budget = focused ? typed || b.budget : b.budget;
  const over = budget !== null && b.spent > budget;
  const rest = budget !== null ? budget - b.spent - b.planned : 0;
  const commit = async () => {
    setFocused(false);
    if (!typed || typed === b.budget) {
      setText(b.budget !== null ? rawMoney(b.budget) : '');
      return;
    }
    try {
      await setBudget(b.category.id, month, typed);
      setText(rawMoney(typed));
    } catch (e) {
      console.warn('Falha ao salvar o orçamento', e);
      toast({ message: 'Não foi possível salvar o orçamento.' });
    }
  };
  return (
    <View style={[s.line, divider && s.divider]}>
      <View style={s.lineTop}>
        <ModuleIcon icon={categoryIcon(b.category.icon)} module="finance" hue={categoryHue(b.category.color)} size="sm" />
        <Text variant="item" style={s.flex}>
          {b.category.name}
        </Text>
        <TextInput
          accessibilityLabel={`Orçamento mensal de ${b.category.name}`}
          value={hidden && !focused && text ? MONEY_MASK : text}
          placeholder="R$ 0,00"
          placeholderTextColor={t.colors.textQuaternary}
          keyboardType="number-pad"
          inputMode="numeric"
          onFocus={() => setFocused(true)}
          onChangeText={(v) => setText(digitsToCents(v) ? rawMoney(digitsToCents(v)) : '')}
          onBlur={() => void commit()}
          onSubmitEditing={() => void commit()}
          style={[s.input, focused && s.inputFocused, noFocusRing]}
        />
      </View>
      <BudgetBar spent={b.spent} planned={b.planned} budget={budget} index={index} />
      <View style={s.stats}>
        <Stat label="Gasto" value={money(b.spent)} />
        <Stat label="Previsto" value={money(b.planned)} tone="secondary" />
        <Stat label="Restante" value={budget !== null ? balance(rest) : '—'} tone={rest < 0 ? 'danger' : 'primary'} end />
      </View>
      {over && budget !== null && (
        <Tag tone="danger" icon={TriangleAlert} label={`${money(b.spent - budget)} acima do orçamento`} />
      )}
    </View>
  );
}

function Stat({
  label,
  value,
  tone = 'primary',
  end,
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'secondary' | 'danger';
  end?: boolean;
}) {
  const s = useStyles();
  return (
    <View style={[s.stat, end && s.statEnd]}>
      <Text variant="micro" tone="tertiary">
        {label}
      </Text>
      <Text variant="small" tone={tone} numeric style={s.medium}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  stepper: { alignItems: 'center' },
  hero: { gap: t.space[1.5] },
  flex: { flex: 1, minWidth: 0 },
  medium: { fontFamily: t.type.chip.font },
  divider: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  line: {
    gap: t.space[2] + t.space[0.5],
    paddingVertical: t.space[3] + t.space[0.5],
  },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  input: {
    width: t.size.budgetInputWidth,
    height: t.size.budgetInputHeight,
    backgroundColor: t.colors.bg,
    borderRadius: t.radius.field - t.space[1],
    paddingHorizontal: t.space[3],
    color: t.colors.text,
    fontFamily: t.type.chip.font,
    fontSize: t.type.chip.fontSize,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  inputFocused: { boxShadow: `0px 0px 0px ${t.field.ring}px ${t.colors.accent}` },
  stats: { flexDirection: 'row' },
  stat: { flex: 1 },
  statEnd: { alignItems: 'flex-end' },
  none: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.field + t.space[0.5],
    paddingVertical: t.space[2],
  },
}));
