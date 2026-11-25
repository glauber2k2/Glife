// Tela 7 do protótipo: Orçamentos. Valor mensal editável na própria linha; barra com gasto, previsto e o traço do
// limite quando estoura; categorias sem orçamento no fim, com "Definir".
import { addMonths, lastDayOf, monthOf, monthOverview, type BudgetRow, type Month } from '@glife/domain/finance';
import { useLocalSearchParams } from 'expo-router';
import { CreditCard } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';

import { BackHeader, Button, Icon, Reveal, Screen, Text, makeStyles, noFocusRing, useTheme, useToast } from '@/shared/ui';

import { categoryIcon } from '../components/categories';
import { balance, digitsToCents, money, monthName, todayIso } from '../components/format';
import { Block, BlockHeader, BudgetBar, MonthSlide, MonthStepper } from '../components/ui';
import { useFinance } from '../hooks/FinanceData';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useOccurrences } from '../hooks/useFlows';

const monthOk = (m: unknown): m is Month => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

export function BudgetsScreen() {
  const s = useStyles();
  const t = useTheme();
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
      <View>
        <BackHeader title="Orçamentos" fallback="/financas" />
        <View style={s.stepper}>
          <MonthStepper label={name} onPrev={() => go(-1)} onNext={() => go(1)} />
        </View>
      </View>
      <MonthSlide id={month} direction={dir}>
        <Reveal>
          <View style={s.hero}>
            <Text variant="label" tone="tertiary">
              {`Gasto em ${name}`}
            </Text>
            <Text variant="display" numeric style={s.heroValue}>
              {balance(spent)}
            </Text>
            <Text tone="tertiary" numeric>
              {`mais ${money(planned)} previsto · orçamento ${money(total)}`}
            </Text>
            <View style={s.note}>
              <Icon icon={CreditCard} size={t.icon.tiny} color="textTertiary" />
              <Text variant="caption" tone="tertiary" style={s.flex}>
                Compras no cartão contam no mês em que a fatura vence. Pagamento de fatura não entra aqui.
              </Text>
            </View>
          </View>

          <Block>
            <BlockHeader title="Por categoria" right="orçamento mensal" />
            {withBudget.length === 0 && <Text tone="tertiary">Nenhuma categoria com orçamento. Use “Definir” abaixo.</Text>}
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
                    <Icon icon={categoryIcon(b.category.icon)} size={t.icon.small} color="textTertiary" />
                    <View style={s.flex}>
                      <Text style={s.medium}>{b.category.name}</Text>
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
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const { setBudget } = useFinanceActions();
  const [text, setText] = useState(b.budget !== null ? money(b.budget) : '');
  const [focused, setFocused] = useState(false);
  const typed = digitsToCents(text);
  const budget = focused ? typed || b.budget : b.budget;
  const over = budget !== null && b.spent > budget;
  const rest = budget !== null ? budget - b.spent - b.planned : 0;
  const commit = async () => {
    setFocused(false);
    if (!typed || typed === b.budget) {
      setText(b.budget !== null ? money(b.budget) : '');
      return;
    }
    try {
      await setBudget(b.category.id, month, typed);
      setText(money(typed));
    } catch (e) {
      console.warn('Falha ao salvar o orçamento', e);
      toast({ message: 'Não foi possível salvar o orçamento.' });
    }
  };
  return (
    <View style={[s.line, divider && s.divider]}>
      <View style={s.lineTop}>
        <Icon icon={categoryIcon(b.category.icon)} size={t.icon.small} color="textSecondary" />
        <Text style={[s.flex, s.medium]}>{b.category.name}</Text>
        <TextInput
          accessibilityLabel={`Orçamento mensal de ${b.category.name}`}
          value={text}
          placeholder="R$ 0,00"
          placeholderTextColor={t.colors.textTertiary}
          keyboardType="number-pad"
          inputMode="numeric"
          onFocus={() => setFocused(true)}
          onChangeText={(v) => setText(digitsToCents(v) ? money(digitsToCents(v)) : '')}
          onBlur={() => void commit()}
          onSubmitEditing={() => void commit()}
          style={[s.input, focused && s.inputFocused, noFocusRing]}
        />
      </View>
      <BudgetBar spent={b.spent} planned={b.planned} budget={budget} index={index} />
      <View style={s.stats}>
        <Stat label="Gasto" value={money(b.spent)} />
        <Stat label="Previsto" value={money(b.planned)} tone="secondary" />
        <Stat label="Restante" value={budget !== null ? balance(rest) : '—'} tone={rest < 0 ? 'accent' : 'primary'} end />
      </View>
      {over && budget !== null && (
        <Text variant="caption" tone="accent" style={s.medium}>
          {`${money(b.spent - budget)} acima do orçamento`}
        </Text>
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
  tone?: 'primary' | 'secondary' | 'accent';
  end?: boolean;
}) {
  const s = useStyles();
  return (
    <View style={[s.stat, end && s.statEnd]}>
      <Text variant="label" tone="tertiary">
        {label}
      </Text>
      <Text variant="small" tone={tone} numeric style={s.medium}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  stepper: { position: 'absolute', right: t.space[0], bottom: t.space[0] },
  hero: { gap: t.space[1.5] },
  heroValue: { lineHeight: t.type.display.fontSize + t.space[1] },
  note: {
    flexDirection: 'row',
    gap: t.space[2],
    alignItems: 'flex-start',
    marginTop: t.space[1.5],
  },
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
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
    borderRadius: t.radius.field,
    paddingHorizontal: t.space[3],
    color: t.colors.text,
    fontFamily: t.type.chip.font,
    fontSize: t.type.chip.fontSize,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  inputFocused: { borderColor: t.colors.accent },
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
