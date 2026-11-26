// Tela 2 do protótipo: Novo lançamento (folha). Ordem: tipo, valor (teclado do aparelho), conta ou cartão, parcelas
// (só no cartão), categoria, descrição, data, "É previsto" e "Repetir" (com dia da cobrança nas repetições por mês).
import {
  addMonths,
  cycleOf,
  invoiceDates,
  invoiceMonthFor,
  nextDayOfMonth,
  installmentAmount,
  type Account,
  type Frequency,
  type IsoDate,
  type TxType,
  type InstallmentAmountMode,
} from '@glife/domain/finance';
import { router } from 'expo-router';
import { ArrowLeftRight, CreditCard, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';

import { Button, Chip, Icon, IconButton, Input, SegmentedControl, Sheet, Switch, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { useFinance } from '../hooks/FinanceData';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { InstallmentAmountChoice } from './InstallmentAmountChoice';
import { accountIcon, categoryIcon } from './categories';
import { MONTH_NAMES, dm, dmy, relativeDay, tinyInstallmentsHint, weekday } from './format';
import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { DateRow, DayField, MoneyField, NoCategoriesNote, Stepper, SwitchRow } from './ui';

type Freq = 'weekly' | 'monthly' | 'yearly' | 'every';
const PARCS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24] as const;
const TYPES = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Receita' },
  { value: 'transfer', label: 'Transferência' },
] as const;

export interface NewEntryPreset {
  repeat?: boolean;
  planned?: boolean;
}

const monthLabel = (m: string) => MONTH_NAMES[Number(m.slice(5, 7)) - 1]!;
const monthYear = (m: string, today: IsoDate) =>
  m.slice(0, 4) === today.slice(0, 4) ? monthLabel(m) : `${monthLabel(m)} de ${m.slice(0, 4)}`;

type Props = {
  visible: boolean;
  onClose: () => void;
  today: IsoDate;
  preset?: NewEntryPreset;
  /** o toast sobe acima da barra de abas (lançado do Início) */
  aboveTabBar?: boolean;
};

/** Cada abertura começa do zero: o formulário remonta com uma chave nova. */
export function NewEntrySheet(props: Props) {
  const [session, setSession] = useState(0);
  const [wasVisible, setWasVisible] = useState(props.visible);
  if (props.visible !== wasVisible) {
    setWasVisible(props.visible);
    if (props.visible) setSession((n) => n + 1);
  }
  return (
    <Sheet visible={props.visible} onClose={props.onClose}>
      <EntryForm key={session} {...props} />
    </Sheet>
  );
}

function EntryForm({ onClose, today, preset, aboveTabBar }: Props) {
  const { money } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const { height } = useWindowDimensions();
  const { data } = useFinance();
  const { createEntry } = useFinanceActions();

  const accounts = useMemo(() => (data?.accounts ?? []).filter((a) => !a.archived), [data]);
  const banks = accounts.filter((a) => a.kind !== 'credit_card');
  const cards = accounts.filter((a) => a.kind === 'credit_card');
  const categories = (data?.categories ?? []).filter((c) => !c.archived);

  const [type, setType] = useState<TxType>('expense');
  const [cents, setCents] = useState(0);
  const [desc, setDesc] = useState('');
  const [catId, setCatId] = useState<string | null>(() => categories.find((c) => c.kind === 'expense')?.id ?? null);
  const [acctId, setAcctId] = useState<string | null>(() => banks[0]?.id ?? null);
  const [toId, setToId] = useState<string | null>(null);
  const [parc, setParc] = useState(1);
  const [amountMode, setAmountMode] = useState<InstallmentAmountMode>('total');
  const [planned, setPlanned] = useState(!!preset?.planned);
  const [repeat, setRepeat] = useState(!!preset?.repeat);
  const [freq, setFreq] = useState<Freq>('monthly');
  const [every, setEvery] = useState(2);
  /** dia da cobrança nas repetições por mês; acompanha a data até ser editado; null = campo vazio */
  const [chargeDay, setChargeDay] = useState<number | null>(() => Number(today.slice(8, 10)));
  const [chargeEdited, setChargeEdited] = useState(false);
  const [ends, setEnds] = useState<'never' | 'date'>('never');
  const [endDate, setEndDate] = useState<IsoDate>(`${Number(today.slice(0, 4)) + 1}${today.slice(4)}`);
  const [date, setDateState] = useState<IsoDate>(today);
  const setDate = (d: IsoDate) => {
    setDateState(d);
    if (!chargeEdited) setChargeDay(Number(d.slice(8, 10)));
  };
  const [saving, setSaving] = useState(false);

  const account: Account | undefined = accounts.find((a) => a.id === acctId);
  const isCard = type === 'expense' && account?.kind === 'credit_card';
  const sources = type === 'expense' ? [...banks, ...cards] : banks;
  const targets = accounts.filter((a) => a.id !== acctId);
  const target = accounts.find((a) => a.id === toId);
  const catsForType = categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'));

  const changeType = (next: TxType) => {
    setType(next);
    setParc(1);
    setCatId(categories.find((c) => c.kind === (next === 'income' ? 'income' : 'expense'))?.id ?? null);
    if (next !== 'expense' && account?.kind === 'credit_card') setAcctId(banks[0]?.id ?? null);
    if (next === 'transfer') setToId(accounts.find((a) => a.id !== (acctId ?? banks[0]?.id))?.id ?? null);
  };

  const monthly = repeat && (freq === 'monthly' || freq === 'every');
  const day = chargeDay ?? Number(date.slice(8, 10));
  // Com dia da cobrança, a 1ª ocorrência é o próximo dia escolhido a partir da data; no futuro, fica prevista.
  const firstDate: IsoDate = monthly ? nextDayOfMonth(date, day) : date;
  const firstPlanned = planned || firstDate > today;
  const repSub = !repeat
    ? 'Não se repete'
    : {
        weekly: `Toda semana, às ${weekday(date)}s`,
        monthly: `Todo mês, no dia ${day}`,
        yearly: `Todo ano, em ${dm(date)}`,
        every: `A cada ${every} meses, no dia ${day}`,
      }[freq];

  let invoiceTxt = '';
  if (isCard && account) {
    const cycle = cycleOf(account);
    const first = invoiceMonthFor(firstDate, cycle);
    invoiceTxt =
      parc > 1 && !repeat
        ? `1ª parcela na fatura de ${monthYear(first, today)} · última na de ${monthYear(addMonths(first, parc - 1), today)}`
        : `Cai na fatura de ${monthYear(first, today)} · vence ${dm(invoiceDates(first, cycle).dueDate)}`;
  }

  const hasInstallments = isCard && parc > 1 && !repeat;
  let amount: ReturnType<typeof installmentAmount> | null = null;
  try {
    amount = installmentAmount(cents, hasInstallments ? parc : 1, hasInstallments ? amountMode : 'total');
  } catch { /* O formulário mantém o valor e impede salvar fora do limite. */ }
  // Cada parcela precisa de pelo menos 1 centavo: total menor que o número de parcelas não salva.
  const tiny = hasInstallments ? tinyInstallmentsHint(amount?.amounts, parc) : null;
  const amountSub =
    !amount ? 'O valor total excede o limite permitido.' : tiny ? tiny : hasInstallments && cents > 0
      ? `${parc} parcelas · total ${money(amount.totalCents)}`
      : planned
        ? 'Previsto · confirma no dia'
        : ' ';

  const transferNote =
    target?.kind === 'credit_card' ? 'Pagamento de fatura: é transferência, não é gasto.' : 'Transferência não conta no orçamento.';
  const canSave = cents > 0 && !!amount && !tiny && !!acctId && (type !== 'transfer' || !!toId) && (!monthly || chargeDay !== null) && !saving;
  const saveLabel =
    firstPlanned || repeat ? 'Agendar' : type === 'expense' ? 'Salvar gasto' : type === 'income' ? 'Salvar receita' : 'Salvar transferência';

  const save = async () => {
    if (!canSave || !acctId || !amount) return;
    setSaving(true);
    try {
      await createEntry({
        type,
        cents: amount.totalCents,
        description: desc,
        categoryId: type === 'transfer' ? null : catId,
        accountId: acctId,
        toAccountId: type === 'transfer' ? toId : null,
        installments: isCard ? parc : 1,
        date: firstDate,
        planned: firstPlanned,
        repeat: repeat
          ? {
              frequency: (freq === 'every' ? 'monthly' : freq) as Frequency,
              interval: freq === 'every' ? every : 1,
              endDate: ends === 'date' ? endDate : null,
            }
          : null,
      });
      onClose();
      toast({
        aboveTabBar,
        message:
          firstPlanned || repeat
            ? 'Previsto agendado'
            : type === 'expense'
              ? 'Gasto salvo'
              : type === 'income'
                ? 'Receita salva'
                : 'Transferência salva',
      });
    } catch (e) {
      console.warn('Falha ao salvar o lançamento', e);
      toast({ message: 'Não foi possível salvar. Confira os campos.', aboveTabBar });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[s.root, { height: height - t.space[12] - t.space[8] }]}>
      <View style={s.header}>
        <Text variant="heading">Novo lançamento</Text>
        <IconButton icon={X} label="Fechar" variant="soft" onPress={onClose} />
      </View>
      <SegmentedControl label="Tipo de lançamento" shape="block" options={TYPES} value={type} onChange={changeType} />
      {hasInstallments && <InstallmentAmountChoice value={amountMode} onChange={setAmountMode} />}
      <MoneyField
        large
        autoFocus
        label={hasInstallments ? amountMode === 'installment' ? 'Valor da parcela' : 'Valor total' : 'Valor'}
        cents={cents || null}
        onChange={(c) => setCents(c ?? 0)}
        hint={amountSub.trim() || undefined}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="label" tone="tertiary">
          {type === 'transfer' ? 'De' : type === 'income' ? 'Conta' : 'Conta ou cartão'}
        </Text>
        <View style={s.chips}>
          {sources.map((a) => (
            <Chip
              key={a.id}
              size="sm"
              label={a.name}
              icon={accountIcon(a.kind)}
              selected={acctId === a.id}
              onPress={() => {
                setAcctId(a.id);
                if (a.kind !== 'credit_card') setParc(1);
                if (toId === a.id) setToId(null);
              }}
            />
          ))}
        </View>

        {type === 'transfer' && (
          <>
            <Text variant="label" tone="tertiary">
              Para
            </Text>
            <View style={s.chips}>
              {targets.map((a) => (
                <Chip
                  key={a.id}
                  size="sm"
                  label={a.name}
                  icon={accountIcon(a.kind)}
                  selected={toId === a.id}
                  onPress={() => setToId(a.id)}
                />
              ))}
            </View>
            <View style={s.note}>
              <Icon icon={ArrowLeftRight} size={t.icon.tiny} color="textTertiary" />
              <Text variant="caption" tone="tertiary">
                {transferNote}
              </Text>
            </View>
          </>
        )}

        {isCard && !repeat && (
          <>
            <Text variant="label" tone="tertiary">
              Parcelar
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.parcs}>
              {PARCS.map((n) => (
                <Chip key={n} size="sm" numeric label={`${n}×`} selected={parc === n} onPress={() => setParc(n)} />
              ))}
            </ScrollView>
          </>
        )}
        {isCard && (
          <View style={s.note}>
            <Icon icon={CreditCard} size={t.icon.small - t.space[0.5]} color="textSecondary" />
            <Text variant="small" tone="secondary" numeric style={s.flex}>
              {invoiceTxt}
            </Text>
          </View>
        )}

        {type !== 'transfer' && (
          <>
            <Text variant="label" tone="tertiary">
              Categoria
            </Text>
            {catsForType.length === 0 && (
              <NoCategoriesNote
                kind={type === 'income' ? 'income' : 'expense'}
                onCreate={() => {
                  onClose();
                  router.push({ pathname: '/financas/categoria/[id]', params: { id: 'novo', tipo: type === 'income' ? 'income' : 'expense' } });
                }}
              />
            )}
            <View style={s.chips}>
              {catsForType.map((c) => (
                <Chip
                  key={c.id}
                  size="sm"
                  label={c.name}
                  icon={categoryIcon(c.icon)}
                  selected={catId === c.id}
                  onPress={() => setCatId(c.id)}
                />
              ))}
            </View>
          </>
        )}

        <Input label="Descrição" value={desc} onChangeText={setDesc} placeholder="Ex.: Mercado" maxLength={200} />

        <DateRow
          label={monthly ? 'A partir de' : 'Data'}
          date={date}
          hint={relativeDay(date, today)}
          onChange={setDate}
        />
        <SwitchRow
          title="É previsto"
          sub="Fica agendado e só muda o saldo quando confirmado."
          control={<Switch label="É previsto" value={planned} onChange={setPlanned} />}
        />
        <SwitchRow title="Repetir" sub={repSub} control={<Switch label="Repetir" value={repeat} onChange={setRepeat} />} />
        {repeat && (
          <View style={s.repeat}>
            <View style={s.chips}>
              {(
                [
                  ['weekly', 'Semanal'],
                  ['monthly', 'Mensal'],
                  ['yearly', 'Anual'],
                  ['every', 'A cada N meses'],
                ] as const
              ).map(([v, l]) => (
                <Chip key={v} size="sm" label={l} selected={freq === v} onPress={() => setFreq(v)} />
              ))}
            </View>
            {monthly && (
              <DayField
                label="Dia da cobrança"
                value={chargeDay}
                onChange={(v) => {
                  setChargeEdited(true);
                  setChargeDay(v);
                }}
                hint={`1ª cobrança em ${dmy(firstDate)}${day > 28 ? ' · em mês mais curto, cai no último dia' : ''}`}
              />
            )}
            {freq === 'every' && (
              <View style={s.inline}>
                <Text variant="chip" tone="secondary">
                  A cada
                </Text>
                <Stepper label="Intervalo em meses" value={every} min={2} onChange={setEvery} />
                <Text variant="chip" tone="secondary">
                  meses
                </Text>
              </View>
            )}
            <View style={s.inline}>
              <Text variant="chip" tone="secondary">
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
            </View>
            {ends === 'date' && <DateRow label="Última" date={endDate} onChange={setEndDate} />}
          </View>
        )}
      </ScrollView>

      <Button label={saveLabel} fullWidth haptic disabled={!canSave} loading={saving} onPress={save} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.space[3] + t.space[0.5], maxHeight: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -t.space[1.5],
    marginRight: -t.space[2],
  },
  scroll: { flex: 1, marginHorizontal: -t.space[5] },
  scrollContent: {
    gap: t.space[3] + t.space[0.5],
    paddingHorizontal: t.space[5],
    paddingBottom: t.space[2],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.space[2],
    marginTop: -t.space[1],
  },
  parcs: { gap: t.space[1.5] },
  note: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  flex: { flex: 1 },
  repeat: { gap: t.space[3] },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2] + t.space[0.5],
    flexWrap: 'wrap',
  },
}));
