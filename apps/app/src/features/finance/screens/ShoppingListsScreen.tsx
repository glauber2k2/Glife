// Compras, tela 1: as listas (nome, quantos itens faltam, total estimado e a última compra). O + abre o campo de
// lista nova no topo; criar leva direto para a lista.
import { SHOPPING_LIST_NAME_MAX, listSummary } from '@glife/domain/finance';
import { router } from 'expo-router';
import { ListPlus, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BackHeader, Button, EmptyState, Icon, IconButton, Input, ListGroup, Reveal, Screen, makeStyles, useTheme, useToast } from '@/shared/ui';

import { dm, todayIso } from '../components/format';
import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { ListRow } from '../components/shoppingRows';
import { useFinance } from '../hooks/FinanceData';
import { suggestCategory, useShopping } from '../hooks/useShopping';

export function ShoppingListsScreen() {
  const { money } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const today = todayIso();
  const { repos, data } = useFinance();
  const snap = useShopping();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () =>
      (snap?.lists ?? []).map((l) => {
        const sum = listSummary(snap!.items.filter((i) => i.list_id === l.id));
        return {
          list: l,
          total: sum.priced ? `${sum.approx ? '≈ ' : ''}${money(sum.totalCents)}` : '',
          status:
            sum.count === 0
              ? 'Vazia'
              : sum.pending === 0
                ? 'Tudo no carrinho'
                : sum.pending === 1
                  ? '1 item falta'
                  : `${sum.pending} itens faltam`,
          done: sum.count > 0 && sum.pending === 0,
          last: !l.last_purchase_date
            ? 'Nunca comprada'
            : l.last_purchase_date === today
              ? 'Comprado hoje'
              : `Última compra ${dm(l.last_purchase_date)}`,
        };
      }),
    [snap, today, money],
  );

  const create = async () => {
    const n = name.trim();
    if (!n) {
      setCreating(false);
      return;
    }
    setBusy(true);
    try {
      const list = await repos.shopping.createList({ name: n, category_id: suggestCategory(n, data?.categories ?? []) });
      setCreating(false);
      setName('');
      router.push({ pathname: '/financas/compra/[id]', params: { id: list.id } });
    } catch (e) {
      console.warn('Falha ao criar a lista', e);
      toast({ message: 'Não foi possível criar a lista: o nome precisa ter de 1 a 60 caracteres, numa linha só.' });
    } finally {
      setBusy(false);
    }
  };

  const startNew = () => {
    setName('');
    setCreating(true);
  };

  return (
    <Screen>
      <BackHeader title="Compras" fallback="/financas" right={<IconButton icon={Plus} label="Nova lista" onPress={startNew} />} />

      {creating && (
        <Reveal>
          <View style={s.newRow}>
            <View style={s.flex}>
              <Input
                label="Nome da lista"
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={SHOPPING_LIST_NAME_MAX}
                returnKeyType="done"
                onSubmitEditing={() => void create()}
                trailing={<Icon icon={ListPlus} size={t.icon.size - t.space[0.5]} color="accentInk" />}
              />
            </View>
            <Button label="Criar" size="sm" selfAlign="center" loading={busy} onPress={() => void create()} />
          </View>
        </Reveal>
      )}

      {snap && snap.lists.length === 0 && !creating ? (
        <EmptyState
          title="Nenhuma lista ainda"
          message="Monte a lista do mercado, da farmácia ou da casa. Ao comprar, vira gasto com um toque."
          actionLabel="Criar lista"
          onAction={startNew}
        />
      ) : (
        <ListGroup>
            {rows.map((r) => (
              <ListRow
                key={r.list.id}
                name={r.list.name}
                total={r.total}
                status={r.status}
                statusTone={r.done ? 'success' : 'tertiary'}
                last={r.last}
                onPress={() => router.push({ pathname: '/financas/compra/[id]', params: { id: r.list.id } })}
              />
            ))}
        </ListGroup>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, minWidth: 0 },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
}));
