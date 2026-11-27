// Tela 8 do protótipo: Extrato de uma conta. Saldo real e projetado no fim do mês; dias do mais novo ao mais
// antigo (previstos no topo, Hoje marcado), com o saldo ao fim de cada dia; busca e filtro por categoria.
import { ADJUSTMENT_DESCRIPTION, lastDayOf, monthOf, plannedItems, statement } from '@glife/domain/finance';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { MoneyFade } from '@/shared/lib/MoneyVisibility';
import { BackHeader, Button, Chip, EmptyState, Reveal, Screen, SearchField, Tag, Text, makeStyles, useTheme } from '@/shared/ui';

import { ACCOUNT_KIND_LABEL, ADJUSTMENT_ICON, TRANSFER_ICON, categoryHue, categoryIcon } from '../components/categories';
import { dm, todayIso, weekday } from '../components/format';
import { MoneyEyeButton } from '../components/MoneyEyeButton';
import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { Block, Disc, MoneyRow } from '../components/ui';
import { DeleteAccountSheet, usePlannedSheet, useTransactionSheet } from '../components/deleteSheets';
import { useFinance } from '../hooks/FinanceData';
import { useOccurrences } from '../hooks/useFlows';

const TRANSFERS = '__transfer__';

export function StatementScreen() {
  const { signed, balance, toneOf } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const today = todayIso();
  const end = lastDayOf(monthOf(today));
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useFinance();
  const occurrences = useOccurrences(end);
  const account = data?.accounts.find((a) => a.id === id && a.kind !== 'credit_card') ?? null;
  const st = useMemo(
    () => (account && data ? statement(account, data, occurrences, today, end) : null),
    [account, data, occurrences, today, end],
  );
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const txSheet = useTransactionSheet();
  const plannedSheet = usePlannedSheet(today);

  if (!data) return <Screen>{null}</Screen>;
  if (!account || !st) {
    return (
      <Screen>
        <BackHeader title="Conta" fallback="/financas" />
        <Text tone="tertiary">Conta não encontrada.</Text>
      </Screen>
    );
  }

  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const cards = new Map(data.accounts.map((a) => [a.id, a]));
  const adjustments = new Set(data.transactions.filter((tx) => tx.is_adjustment).map((tx) => tx.id));
  const invested = new Set((data.flows ?? []).map((f) => f.key));
  const used = [...new Set(st.days.flatMap((d) => d.entries.map((e) => e.category_id)).filter((c): c is string => !!c))];
  const hasTransfers = st.days.some((d) => d.entries.some((e) => e.type === 'transfer'));
  const query = q.trim().toLowerCase();
  const titleOf = (e: (typeof st.days)[number]['entries'][number]) =>
    e.invoiceCardId
      ? `Fatura ${cards.get(e.invoiceCardId)?.name ?? ''}`
      : e.description || categories.get(e.category_id ?? '')?.name || 'Lançamento';
  const days = st.days
    .map((d) => ({
      ...d,
      entries: d.entries.filter(
        (e) =>
          (!query || titleOf(e).toLowerCase().includes(query)) &&
          (filter === null || (filter === TRANSFERS ? e.type === 'transfer' : e.category_id === filter)),
      ),
    }))
    .filter((d) => d.entries.length > 0);

  return (
    <Screen>
      <BackHeader title={account.name} subtitle={ACCOUNT_KIND_LABEL[account.kind]} fallback="/financas" right={<MoneyEyeButton />} />
<MoneyFade>
      <Reveal>
        <View style={s.hero}>
          <Text variant="small" tone="tertiary">
            Saldo real
          </Text>
          <Text variant="big" numeric>
            {balance(st.balance)}
          </Text>
          <Tag large tone={toneOf(st.projected < 0 ? 'danger' : 'neutral', 'neutral')} label={`Projetado em ${dm(end)}: ${balance(st.projected)}`} />
        </View>
        <View style={s.filters}>
          <SearchField value={q} onChangeText={setQ} placeholder="Buscar no extrato" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chips}>
            <Chip size="sm" label="Todas" selected={filter === null} onPress={() => setFilter(null)} />
            {used.map((c) => (
              <Chip key={c} size="sm" label={categories.get(c)?.name ?? ''} selected={filter === c} onPress={() => setFilter(c)} />
            ))}
            {hasTransfers && <Chip size="sm" label="Transferências" selected={filter === TRANSFERS} onPress={() => setFilter(TRANSFERS)} />}
          </ScrollView>
        </View>
        {days.length === 0 && <EmptyState compact message="Nada encontrado." />}
        {days.map((d) => (
          <Block key={d.date} gap={t.space[0.5]}>
            <View style={s.dayHeader}>
              <Text variant="item" tone={d.date === today ? 'accent' : 'primary'} style={s.semibold}>
                {`${d.date === today ? 'Hoje · ' : ''}${weekday(d.date)}, ${dm(d.date)}`}
              </Text>
              <Text variant="caption" tone="tertiary" numeric>
                {`${d.projected ? 'previsto' : 'saldo'} ${balance(d.balance)}`}
              </Text>
            </View>
            {d.entries.map((e, i) => {
              const cat = categories.get(e.category_id ?? '');
              const adjustment = adjustments.has(e.key);
              const tag = e.late ? 'Atrasado · ' : e.today && e.planned ? 'A confirmar · ' : e.planned ? 'Previsto · ' : '';
              return (
                <MoneyRow
                  key={e.key}
                  divider={i > 0}
                  leading={
                    <Disc
                      icon={adjustment ? ADJUSTMENT_ICON : e.type === 'transfer' ? TRANSFER_ICON : categoryIcon(cat?.icon)}
                      hue={categoryHue(cat?.color)}
                      muted={e.planned || e.type === 'transfer' || adjustment}
                    />
                  }
                  title={titleOf(e)}
                  dim={e.planned}
                  recurring={e.recurring}
                  meta={
                    <Text variant="caption" tone="tertiary">
                      <Text variant="caption" tone={e.late ? 'danger' : 'secondary'} style={s.semibold}>
                        {tag}
                      </Text>
                      {invested.has(e.key)
                        ? 'Investimento'
                        : adjustment
                          ? ADJUSTMENT_DESCRIPTION
                          : e.type === 'transfer'
                            ? 'Transferência'
                            : (cat?.name ?? 'Sem categoria')}
                    </Text>
                  }
                  amount={signed(e.amount)}
                  onPress={
                    e.invoiceCardId
                      ? undefined
                      : () => {
                          const row = data.transactions.find((tx) => tx.id === e.key);
                          if (row) return txSheet.open(row);
                          // Previsto calculado de uma regra (ainda sem linha gravada).
                          const item = plannedItems([], occurrences).find((p) => p.key === e.key);
                          if (item) plannedSheet.open(item);
                        }
                  }
                />
              );
            })}
          </Block>
        ))}
        <View style={s.danger}>
          <Button label="Excluir conta" variant="ghostDanger" onPress={() => setDeleting(true)} />
        </View>
      </Reveal>
</MoneyFade>
      {txSheet.element}
      {plannedSheet.element}
      <DeleteAccountSheet account={account} open={deleting} onClose={() => setDeleting(false)} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  danger: { flexDirection: 'row', marginLeft: -(t.space[3] + t.space[0.5]) },
  hero: { gap: t.space[1.5] },
  filters: { gap: t.space[3] },
  chipScroll: { marginHorizontal: -t.layout.gutter },
  chips: { gap: t.space[2], paddingHorizontal: t.layout.gutter },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: t.space[1.5],
  },
  semibold: { fontFamily: t.type.label.font },
}));
