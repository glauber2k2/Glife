// Tela 5 do protótipo: Nova conta ou cartão. Tipo em chips; conta pede nome e saldo inicial; cartão pede dias de
// fechamento e vencimento, limite e conta pagadora e, depois, "Este cartão já está em uso?".
// Com `?id=` vira "Editar conta" (Contas e cartões → …): mesmo formulário, sem trocar o tipo nem o passo do cartão.
import { currentInvoiceMonth, invoiceDates, type Account } from '@glife/domain/finance';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BackHeader, Button, Chip, EmptyState, Icon, IconButton, Input, Reveal, Screen, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { failureReason as reasonOf } from '../components/errors';
import { money, dm, MONTH_NAMES, todayIso } from '../components/format';
import { Block, BlockHeader, DayField, MoneyField, RadioRow } from '../components/ui';
import { useFinance } from '../hooks/FinanceData';
import { useFinanceActions } from '../hooks/useFinanceActions';

type Kind = 'checking' | 'savings' | 'cash' | 'credit_card';
const KINDS: { value: Kind; label: string }[] = [
  { value: 'checking', label: 'Conta corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'cash', label: 'Carteira' },
  { value: 'credit_card', label: 'Cartão de crédito' },
];

const failureReason = (e: unknown) => reasonOf(e, 'confira o valor e os números das parcelas.');

interface Parcel {
  description: string;
  cents: number;
  index: number;
  count: number;
}

export function NewAccountScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useFinance();
  if (!id) return <AccountForm account={null} />;
  if (!data) return <Screen>{null}</Screen>;
  const account = data.accounts.find((a) => a.id === id && a.deleted_at === null) ?? null;
  if (!account) {
    return (
      <Screen header={<BackHeader title="Conta" fallback="/financas/contas" />}>
        <EmptyState title="Não encontrada" message="Esta conta não existe mais." mood="pensando" />
      </Screen>
    );
  }
  return <AccountForm key={account.id} account={account} />;
}

function AccountForm({ account }: { account: Account | null }) {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const today = todayIso();
  const { data } = useFinance();
  const { createAccount, createCard, updateAccount } = useFinanceActions();
  const banks = (data?.accounts ?? []).filter(
    (a) => a.kind !== 'credit_card' && a.deleted_at === null && (!a.archived || a.id === account?.payment_account_id),
  );
  const editing = account !== null;

  const [step, setStep] = useState<'form' | 'inUse'>('form');
  const [kind, setKind] = useState<Kind>(account?.kind ?? 'checking');
  const [name, setName] = useState(account?.name ?? '');
  const [initial, setInitial] = useState<number | null>(account && account.kind !== 'credit_card' ? Math.abs(account.initial_balance_cents) : null);
  const [negative, setNegative] = useState((account?.initial_balance_cents ?? 0) < 0);
  const [closing, setClosing] = useState<number | null>(account?.closing_day ?? 1);
  const [due, setDue] = useState<number | null>(account?.due_day ?? 8);
  const [limit, setLimit] = useState<number | null>(account?.credit_limit_cents ?? null);
  const [payerId, setPayerId] = useState<string | null>(account?.payment_account_id ?? banks[0]?.id ?? null);
  const [inUse, setInUse] = useState<'bring' | 'zero'>('bring');
  const [openCents, setOpenCents] = useState<number | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [adding, setAdding] = useState(false);
  const [nd, setNd] = useState('');
  const [nv, setNv] = useState<number | null>(null);
  const [ni, setNi] = useState<number | null>(null);
  const [nn, setNn] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const isCard = kind === 'credit_card';
  const payer = payerId ?? banks[0]?.id ?? null;
  const cl = closing ?? 1;
  const du = due ?? 8;
  const closeHint =
    cl === 1
      ? `Fecha no dia 1: compras até o fim do mês entram na fatura que vence no dia ${du}; a partir do dia 1, na seguinte.`
      : `Compras até o dia ${cl - 1} entram na fatura do mês; a partir do dia ${cl}, na seguinte. Vence no dia ${du}.`;
  const cycle = { closing_day: cl, due_day: du };
  const openMonth = currentInvoiceMonth(today, cycle);
  const openDates = invoiceDates(openMonth, cycle);
  const monthLabel = (m: string) => MONTH_NAMES[Number(m.slice(5, 7)) - 1];
  const pending = parcels.reduce((acc, p) => acc + (p.count - p.index + 1), 0);

  const back = () => {
    if (step === 'inUse') setStep('form');
    else if (router.canGoBack()) router.back();
    else router.replace('/financas');
  };

  const saveEdit = async () => {
    if (!account || !name.trim()) return;
    if (isCard && (!payer || closing === null || due === null)) return;
    setSaving(true);
    try {
      await updateAccount(
        account.id,
        isCard
          ? { name: name.trim(), closing_day: closing, due_day: due, credit_limit_cents: limit, payment_account_id: payer }
          : { name: name.trim(), initial_balance_cents: (negative ? -1 : 1) * (initial ?? 0) },
      );
      toast({ message: isCard ? 'Cartão salvo' : 'Conta salva' });
      back();
    } catch (e) {
      console.warn('Falha ao salvar a conta', e);
      toast({ message: `Não foi possível salvar: ${reasonOf(e, 'confira os dias e a conta que paga a fatura.')}` });
    } finally {
      setSaving(false);
    }
  };

  const saveAccount = async () => {
    if (editing) return saveEdit();
    if (!name.trim() || isCard) return;
    setSaving(true);
    try {
      await createAccount({
        kind,
        name,
        initialCents: (negative ? -1 : 1) * (initial ?? 0),
      });
      toast({ message: 'Conta criada', aboveTabBar: true });
      back();
    } catch (e) {
      console.warn('Falha ao criar a conta', e);
      toast({ message: 'Não foi possível criar a conta.' });
    } finally {
      setSaving(false);
    }
  };

  const finishCard = async () => {
    if (!payer || closing === null || due === null || !name.trim()) return;
    setSaving(true);
    try {
      await createCard(
        {
          name,
          closingDay: closing,
          dueDay: due,
          limitCents: limit,
          payerId: payer,
          existing: inUse === 'bring' ? { openCents: openCents ?? 0, parcels } : null,
        },
        today,
      );
      toast({ message: 'Cartão criado', aboveTabBar: true });
      if (router.canGoBack()) router.back();
      else router.replace('/financas');
    } catch (e) {
      console.warn('Falha ao criar o cartão', e, (e as { cause?: unknown })?.cause);
      toast({ message: `Não foi possível criar o cartão: ${failureReason(e)}` });
    } finally {
      setSaving(false);
    }
  };

  const commitParcel = () => {
    if (!nd.trim() || !nv) return;
    const i = Math.max(1, ni ?? 1);
    const n = Math.max(i, nn ?? i);
    setParcels((list) => [...list, { description: nd.trim(), cents: nv, index: i, count: n }]);
    setAdding(false);
    setNd('');
    setNv(null);
    setNi(null);
    setNn(null);
  };

  const title = editing
    ? isCard
      ? 'Editar cartão'
      : 'Editar conta'
    : step === 'inUse'
      ? name || 'Novo cartão'
      : isCard
        ? 'Novo cartão'
        : 'Nova conta';
  const payerName = banks.find((b) => b.id === payer)?.name ?? '';

  return (
    <Screen>
      <View>
        <BackHeader left={<IconButton icon={X} label="Voltar" onPress={back} />} />
        <Text variant="title" accessibilityRole="header" style={s.title}>
          {title}
        </Text>
        {step === 'inUse' && (
          <Text variant="small" tone="tertiary" style={s.sub}>
            {`Fecha dia ${cl} · vence dia ${du} · paga com ${payerName}`}
          </Text>
        )}
      </View>

      {step === 'form' ? (
        <Reveal>
          {!editing && (
            <View style={s.group}>
              <Text variant="label" tone="tertiary">
                Tipo
              </Text>
              <View style={s.chips}>
                {KINDS.map((k) => (
                  <Chip key={k.value} label={k.label} selected={kind === k.value} onPress={() => setKind(k.value)} />
                ))}
              </View>
            </View>
          )}
          <View style={s.group}>
            <Input label="Nome" value={name} onChangeText={setName} placeholder={isCard ? 'Ex.: Nubank' : 'Ex.: Itaú'} maxLength={80} />
            {!isCard ? (
              <>
                <MoneyField
                  label="Saldo inicial"
                  cents={initial}
                  onChange={setInitial}
                  allowNegative
                  negative={negative}
                  onNegativeChange={setNegative}
                  hint={
                    editing
                      ? 'Saldo com que a conta começou no Glife. Para igualar ao banco hoje, use “Ajustar saldo”.'
                      : 'O saldo de hoje no banco. Pode ser negativo (digite − antes).'
                  }
                />
                <View style={s.actions}>
                  <Button label="Salvar conta" haptic disabled={!name.trim()} loading={saving} onPress={saveAccount} />
                </View>
              </>
            ) : (
              <>
                <View style={s.twoCols}>
                  <View style={s.col}>
                    <DayField label="Dia do fechamento" value={closing} onChange={setClosing} />
                  </View>
                  <View style={s.col}>
                    <DayField label="Dia do vencimento" value={due} onChange={setDue} />
                  </View>
                </View>
                <Text variant="caption" tone="tertiary" style={s.hint}>
                  {closeHint}
                </Text>
                <MoneyField label="Limite (opcional)" cents={limit} onChange={setLimit} />
                <Text variant="label" tone="tertiary" style={s.payerLabel}>
                  Conta que paga a fatura
                </Text>
                {banks.length === 0 ? (
                  <Text variant="small" tone="tertiary">
                    Cadastre antes a conta que paga a fatura (conta corrente, poupança ou carteira).
                  </Text>
                ) : (
                  <View style={s.chips}>
                    {banks.map((b) => (
                      <Chip key={b.id} label={b.name} selected={payer === b.id} onPress={() => setPayerId(b.id)} />
                    ))}
                  </View>
                )}
                <View style={s.actions}>
                  <Button
                    label={editing ? 'Salvar cartão' : 'Continuar'}
                    haptic={editing}
                    loading={editing && saving}
                    disabled={!name.trim() || !payer || closing === null || due === null}
                    onPress={editing ? () => void saveEdit() : () => setStep('inUse')}
                  />
                </View>
              </>
            )}
          </View>
        </Reveal>
      ) : (
        <Reveal>
          <View>
            <Text variant="heading" style={s.question}>
              Este cartão já está em uso?
            </Text>
            <RadioRow
              title="Trazer o que já existe"
              sub="Fatura em aberto e parcelamentos em andamento"
              selected={inUse === 'bring'}
              onPress={() => setInUse('bring')}
            />
            <RadioRow title="Começar do zero" sub="Sem lançamentos antigos" selected={inUse === 'zero'} onPress={() => setInUse('zero')} />
          </View>
          {inUse === 'bring' ? (
            <>
              <Block gap={t.space[2] + t.space[0.5]}>
                <Text variant="label" tone="tertiary">
                  Fatura em aberto
                </Text>
                <MoneyField
                  label="Valor até agora"
                  cents={openCents}
                  onChange={setOpenCents}
                  hint={`Fatura de ${monthLabel(openMonth)} · fecha ${dm(openDates.closingDate)} · vence ${dm(openDates.dueDate)}. Entra como “Saldo anterior”, sem categoria.`}
                />
              </Block>
              <Block>
                <BlockHeader title="Parcelamentos em andamento" />
                {parcels.map((p, i) => (
                  <View key={`${p.description}-${i}`} style={[s.parcel, i > 0 && s.divider]}>
                    <View style={s.flex}>
                      <Text style={s.medium}>{p.description}</Text>
                      <Text variant="caption" tone="tertiary" numeric>
                        {`${money(p.cents)} por parcela · parcela ${p.index} de ${p.count}`}
                      </Text>
                    </View>
                    <Text variant="caption" tone="tertiary" numeric>
                      {`${p.count - p.index + 1} a lançar`}
                    </Text>
                    <IconButton
                      icon={X}
                      label="Remover"
                      variant="ghost"
                      color="textTertiary"
                      onPress={() => setParcels((l) => l.filter((_, j) => j !== i))}
                    />
                  </View>
                ))}
                {adding && (
                  <View style={[s.adding, s.divider]}>
                    <Input label="Descrição" value={nd} onChangeText={setNd} placeholder="Ex.: Celular" maxLength={200} />
                    <MoneyField label="Valor da parcela" cents={nv} onChange={setNv} />
                    <View style={s.twoCols}>
                      <View style={s.col}>
                        <DayField label="Parcela" value={ni} max={120} onChange={(v) => setNi(v)} />
                      </View>
                      <View style={s.col}>
                        <DayField label="de" value={nn} max={120} onChange={(v) => setNn(v)} />
                      </View>
                    </View>
                    <Button
                      label="Incluir parcelamento"
                      variant="secondary"
                      size="sm"
                      disabled={!nd.trim() || !nv}
                      onPress={commitParcel}
                    />
                  </View>
                )}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setAdding(true)}
                  style={({ pressed }) => [s.addRow, pressed && s.pressed]}
                >
                  <Icon icon={Plus} size={t.icon.size - t.space[0.5]} color="accentInk" />
                  <Text tone="accent" style={s.medium}>
                    Adicionar outro
                  </Text>
                </Pressable>
                <Text variant="small" tone="secondary" style={s.summary}>
                  {pending
                    ? `Serão lançadas ${pending} parcelas, uma por fatura, a partir da de ${monthLabel(openMonth)}. As parcelas já pagas não entram.`
                    : 'Nenhum parcelamento informado.'}
                </Text>
              </Block>
            </>
          ) : (
            <Text variant="small" tone="secondary">
              O cartão começa sem lançamentos. Compras antigas podem ser lançadas à mão depois.
            </Text>
          )}
          <View style={s.actions}>
            <Button label="Concluir" haptic loading={saving} onPress={finishCard} />
          </View>
        </Reveal>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    height: t.size.editorBar,
    marginTop: -t.space[6],
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -(t.space[2] + t.space[0.5]),
  },
  title: { paddingTop: t.space[4] },
  sub: { marginTop: t.space[1.5] },
  group: { gap: t.space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  actions: { flexDirection: 'row', marginTop: t.space[3] },
  twoCols: { flexDirection: 'row', gap: t.space[3] },
  col: { flex: 1 },
  hint: { paddingLeft: t.field.paddingX },
  payerLabel: { marginTop: t.space[2] },
  question: { paddingBottom: t.space[3] },
  parcel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.field + t.space[0.5],
    paddingVertical: t.space[2],
  },
  divider: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  flex: { flex: 1, minWidth: 0 },
  medium: { fontFamily: t.type.chip.font },
  adding: {
    gap: t.space[2] + t.space[0.5],
    paddingVertical: t.space[3] + t.space[0.5],
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.size.navRow,
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
  pressed: { opacity: t.opacity.pressed },
  summary: { paddingTop: t.space[2] },
}));
