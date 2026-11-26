// Categorias (protótipo `categorias`): Gastos e Receitas em abas, cada uma com cor, ícone e o orçamento do mês.
// A ordem aqui é a ordem dos chips no Novo lançamento ("Ordenar": subir/descer). Arquivada some das escolhas, mas
// os lançamentos antigos continuam com ela ("Reativar").
import { budgetFor, monthOf, type Category, type CategoryKind } from '@glife/domain/finance';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUpDown, Check, ChevronRight, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  BackHeader,
  Button,
  EmptyState,
  Icon,
  IconButton,
  ListGroup,
  ListItem,
  Reveal,
  Screen,
  Section,
  SegmentedControl,
  makeStyles,
  useTheme,
  useToast,
} from '@/shared/ui';

import { categoryHue, categoryIcon } from '../components/categories';
import { categoryMeta } from '../components/categoryForm';
import { failureReason } from '../components/errors';
import { money, todayIso } from '../components/format';
import { OrderArrows } from '../components/ui';
import { useFinance } from '../hooks/FinanceData';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useOrdering } from '../hooks/useOrdering';

const TABS = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Receitas' },
] as const;

export function CategoriesScreen() {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const month = monthOf(todayIso());
  const { data } = useFinance();
  const { reorderCategories, unarchiveCategory } = useFinanceActions();
  const [kind, setKind] = useState<CategoryKind>(params.tipo === 'income' ? 'income' : 'expense');
  const [ordering, setOrdering] = useState(false);
  const ofKind = useMemo(() => (data?.categories ?? []).filter((c) => c.deleted_at === null && c.kind === kind), [data, kind]);
  const kindIds = useMemo(() => ofKind.map((c) => c.id), [ofKind]);
  const order = useOrdering(kindIds, reorderCategories, (e) => {
    console.warn('Falha ao reordenar as categorias', e);
    toast({ message: `Não foi possível salvar a ordem: ${failureReason(e)}` });
  });
  const uses = useMemo(() => {
    const n = new Map<string, number>();
    for (const tx of data?.transactions ?? []) {
      if (tx.deleted_at === null && tx.category_id) n.set(tx.category_id, (n.get(tx.category_id) ?? 0) + 1);
    }
    return n;
  }, [data]);

  if (!data) return <Screen>{null}</Screen>;

  const active = order.sort(ofKind.filter((c) => !c.archived));
  const archived = ofKind.filter((c) => c.archived);
  const kindWord = kind === 'income' ? 'receita' : 'gasto';

  const changeKind = (next: CategoryKind) => {
    order.reset();
    setOrdering(false);
    setKind(next);
  };
  const toggleOrdering = () => {
    if (ordering) order.reset();
    setOrdering(!ordering);
  };
  const create = () => router.push({ pathname: '/financas/categoria/[id]', params: { id: 'novo', tipo: kind } });
  const edit = (c: Category) => router.push({ pathname: '/financas/categoria/[id]', params: { id: c.id } });

  const reactivate = async (c: Category) => {
    try {
      await unarchiveCategory(c.id);
      toast({ message: 'Categoria de volta às escolhas' });
    } catch (e) {
      console.warn('Falha ao reativar a categoria', e);
      toast({ message: `Não foi possível reativar: ${failureReason(e)}` });
    }
  };

  return (
    <Screen>
      <BackHeader title="Categorias" fallback="/financas" right={<IconButton icon={Plus} label="Nova categoria" onPress={create} />} />
      <View style={s.tools}>
        <SegmentedControl label="Tipo de categoria" options={TABS} value={kind} onChange={changeKind} />
        {active.length > 1 && (
          <Button
            selfAlign="center"
            label={ordering ? 'Pronto' : 'Ordenar'}
            icon={ordering ? Check : ArrowUpDown}
            variant="secondary"
            size="sm"
            onPress={toggleOrdering}
          />
        )}
      </View>
      <Reveal key={kind}>
        {active.length === 0 ? (
          <EmptyState
            title={`Nenhuma categoria de ${kindWord}`}
            message="Crie uma para usar nos lançamentos."
            actionLabel="Nova categoria"
            onAction={create}
          />
        ) : (
          <ListGroup>
            {active.map((c, i) => (
              <ListItem
                key={c.id}
                animated
                icon={categoryIcon(c.icon)}
                hue={categoryHue(c.color)}
                title={c.name}
                subtitle={categoryMeta(c.kind, budgetFor(c.id, month, data.budgets), money)}
                onPress={ordering ? undefined : () => edit(c)}
                trailing={
                  ordering ? (
                    <OrderArrows name={c.name} first={i === 0} last={i === active.length - 1} onMove={(d) => order.move(active, c.id, d)} />
                  ) : (
                    <Icon icon={ChevronRight} size={t.icon.small + t.space[0.5]} color="textQuaternary" />
                  )
                }
              />
            ))}
          </ListGroup>
        )}

        {archived.length > 0 && (
          <Section title="Arquivadas">
            <ListGroup>
              {archived.map((c) => {
                const n = uses.get(c.id) ?? 0;
                return (
                  <ListItem
                    key={c.id}
                    icon={categoryIcon(c.icon)}
                    title={c.name}
                    subtitle={n ? `${n} ${n === 1 ? 'lançamento' : 'lançamentos'}` : 'Sem lançamentos'}
                    onPress={() => edit(c)}
                    trailing={<Button selfAlign="center" label="Reativar" variant="secondary" size="sm" onPress={() => void reactivate(c)} />}
                  />
                );
              })}
            </ListGroup>
          </Section>
        )}
      </Reveal>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  tools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[3] },
}));
