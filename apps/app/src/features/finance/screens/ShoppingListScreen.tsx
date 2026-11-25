// Compras, tela 2: os itens de uma lista. Adicionar no topo (nome e Enter); pendentes em cima e, ao marcar, o risco
// corre e o item desce para "No carrinho" depois de 650 ms. Rodapé com o total do carrinho e "Comprei" (folha).
import { SHOPPING_ITEM_NAME_MAX, cartOf, type ShoppingItem } from '@glife/domain/finance';
import { router, useLocalSearchParams } from 'expo-router';
import { CornerDownLeft, Ellipsis, Plus, Repeat, ShoppingBag } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackHeader,
  Button,
  Icon,
  IconButton,
  Input,
  Screen,
  Text,
  makeStyles,
  riseIn,
  useReduceMotion,
  useTheme,
  useToast,
} from '@/shared/ui';

import { PurchaseSheet, type PurchaseDone } from '../components/PurchaseSheet';
import { dm, money, todayIso } from '../components/format';
import { ItemRow } from '../components/shoppingRows';
import { ItemEditSheet, ItemMenuSheet, ListSettingsSheet, type ItemChanges } from '../components/shoppingSheets';
import { useFinance } from '../hooks/FinanceData';
import { useShopping } from '../hooks/useShopping';

const warn = (what: string) => (e: unknown) => console.warn(what, e);

export function ShoppingListScreen() {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const today = todayIso();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repos, data } = useFinance();
  const snap = useShopping();

  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  /** marcados há pouco: continuam em "Faltam" até o risco terminar */
  const [settling, setSettling] = useState<string[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [buying, setBuying] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const list = snap?.lists.find((l) => l.id === id) ?? null;
  if (!snap) return <Screen>{null}</Screen>;
  if (!list) {
    return (
      <Screen>
        <BackHeader title="Lista" fallback="/financas/compras" />
        <Text tone="tertiary">Lista não encontrada.</Text>
      </Screen>
    );
  }

  const items = snap.items.filter((i) => i.list_id === list.id);
  const pending = items.filter((i) => !i.in_cart || settling.includes(i.id));
  const inCart = items.filter((i) => i.in_cart && !settling.includes(i.id));
  const cart = cartOf(items);
  const category = data?.categories.find((c) => c.id === list.category_id) ?? null;
  const eyebrow = [
    category?.name ?? 'Sem categoria',
    list.last_purchase_date ? (list.last_purchase_date === today ? 'comprado hoje' : `última compra ${dm(list.last_purchase_date)}`) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const itemOf = (x: string | null) => (x ? (items.find((i) => i.id === x) ?? null) : null);
  const layout = reduceMotion ? undefined : LinearTransition.springify(t.spring.gentle.duration).dampingRatio(t.spring.gentle.dampingRatio);
  const entering = (i: number) => (reduceMotion ? undefined : riseIn(t.motion.enterOffset, t.motion.standard, i * t.motion.stagger));

  const add = () => {
    const name = text.trim();
    if (!name) return;
    setText('');
    repos.shopping.addItem(list.id, name.slice(0, SHOPPING_ITEM_NAME_MAX)).catch((e) => {
      warn('Falha ao adicionar o item')(e);
      setText(name);
      toast({ message: 'Não foi possível adicionar: o nome precisa ter de 1 a 120 caracteres.' });
    });
  };

  const toggle = (item: ShoppingItem) => {
    const next = !item.in_cart;
    if (next) {
      setSettling((ids) => [...ids, item.id]);
      timers.current.push(setTimeout(() => setSettling((ids) => ids.filter((x) => x !== item.id)), t.motion.collapseDelay));
    }
    repos.shopping.updateItem(item.id, { in_cart: next }).catch(warn('Falha ao marcar o item'));
  };

  const saveItem = async (item: ShoppingItem, c: ItemChanges) => {
    try {
      await repos.shopping.updateItem(item.id, c);
      setEditFor(null);
    } catch (e) {
      warn('Falha ao salvar o item')(e);
      toast({ message: 'Não foi possível salvar: confira o nome, a quantidade (1 a 999) e o preço.' });
    }
  };

  const removeItem = async (item: ShoppingItem) => {
    setMenuFor(null);
    try {
      await repos.shopping.removeItem(item.id);
      toast({
        message: 'Item excluído',
        actionLabel: 'Desfazer',
        onAction: () => void repos.shopping.restoreItem(item.id).catch(warn('Falha ao desfazer')),
      });
    } catch (e) {
      warn('Falha ao excluir o item')(e);
      toast({ message: 'Não foi possível excluir o item.' });
    }
  };

  const removeList = async () => {
    setSettings(false);
    try {
      const itemIds = await repos.shopping.removeList(list.id);
      router.back();
      toast({
        message: 'Lista excluída',
        actionLabel: 'Desfazer',
        onAction: () => void repos.shopping.restoreList(list.id, itemIds).catch(warn('Falha ao desfazer')),
      });
    } catch (e) {
      warn('Falha ao excluir a lista')(e);
      toast({ message: 'Não foi possível excluir a lista.' });
    }
  };

  const purchased = ({ receipt, cents }: PurchaseDone) => {
    setBuying(false);
    toast({
      message: `Gasto de ${money(cents)} registrado`,
      actionLabel: 'Desfazer',
      onAction: () => void repos.shopping.undoPurchase(receipt).catch(warn('Falha ao desfazer a compra')),
    });
  };

  return (
    <View style={s.root}>
      <Screen>
        <View>
          <BackHeader title={list.name} fallback="/financas/compras" />
          <View style={s.subRow}>
            <Text variant="small" tone="tertiary" style={s.flex} numberOfLines={1}>
              {eyebrow}
            </Text>
            {items.some((i) => i.always) && (
              <View style={s.inline}>
                <Icon icon={Repeat} size={t.icon.tiny} color="textTertiary" />
                <Text variant="caption" tone="tertiary">
                  Recorrente
                </Text>
              </View>
            )}
            <IconButton icon={Ellipsis} label="Ajustes da lista" variant="ghost" color="textSecondary" onPress={() => setSettings(true)} />
          </View>
        </View>

        <Input
          label="Adicionar item"
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={add}
          submitBehavior="submit"
          returnKeyType="done"
          maxLength={SHOPPING_ITEM_NAME_MAX}
          trailing={
            text.trim() ? (
              <IconButton icon={CornerDownLeft} label="Adicionar" variant="outline" size={t.size.pill} onPress={add} />
            ) : (
              <Icon icon={Plus} size={t.icon.size} color={focused ? 'accentInk' : 'textTertiary'} />
            )
          }
        />

        {items.length === 0 ? (
          <View style={s.empty}>
            <Text variant="heading" tone="secondary" style={s.light}>
              Lista vazia.
            </Text>
            <Text variant="small" tone="tertiary">
              Itens adicionados aparecem aqui.
            </Text>
          </View>
        ) : (
          <View>
            <View style={s.header}>
              <Text variant="label" tone="tertiary">
                Faltam
              </Text>
              <Text variant="label" tone="tertiary" numeric>
                {String(pending.filter((i) => !i.in_cart).length)}
              </Text>
            </View>
            {pending.length === 0 && (
              <Text variant="small" tone="tertiary" style={s.note}>
                Tudo no carrinho.
              </Text>
            )}
            {pending.map((item, i) => (
              <Animated.View key={item.id} layout={layout} entering={entering(i)}>
                <ItemRow
                  item={item}
                  checked={item.in_cart}
                  onToggle={() => toggle(item)}
                  onEdit={() => setEditFor(item.id)}
                  onMenu={() => setMenuFor(item.id)}
                />
              </Animated.View>
            ))}
            {inCart.length > 0 && (
              <Animated.View layout={layout} style={[s.header, s.cartHeader]}>
                <Text variant="label" tone="tertiary">
                  No carrinho
                </Text>
                <Text variant="label" tone="tertiary" numeric>
                  {String(inCart.length)}
                </Text>
              </Animated.View>
            )}
            {inCart.map((item, i) => (
              <Animated.View key={item.id} layout={layout} entering={entering(pending.length + i)}>
                <ItemRow
                  item={item}
                  checked
                  onToggle={() => toggle(item)}
                  onEdit={() => setEditFor(item.id)}
                  onMenu={() => setMenuFor(item.id)}
                />
              </Animated.View>
            ))}
            <Animated.View layout={layout} style={s.rule} />
          </View>
        )}
      </Screen>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, t.space[3]) + t.space[3] }]}>
        <View style={s.footerText}>
          <Text variant="caption" tone="tertiary">
            {cart.count === 0 ? 'Carrinho vazio' : cart.count === 1 ? '1 item no carrinho' : `${cart.count} itens no carrinho`}
          </Text>
          <Text variant="heading" numeric style={s.light}>
            {`${cart.approx ? '≈ ' : ''}${money(cart.totalCents)}`}
          </Text>
        </View>
        <Button label="Comprei" icon={ShoppingBag} haptic selfAlign="center" disabled={cart.count === 0} onPress={() => setBuying(true)} />
      </View>

      <PurchaseSheet list={buying ? list : null} items={items} today={today} onClose={() => setBuying(false)} onDone={purchased} />
      <ItemMenuSheet
        item={itemOf(menuFor)}
        listName={list.name}
        otherLists={snap.lists.filter((l) => l.id !== list.id)}
        countOf={(lid) => snap.items.filter((i) => i.list_id === lid).length}
        onClose={() => setMenuFor(null)}
        onEdit={(item) => {
          setMenuFor(null);
          setEditFor(item.id);
        }}
        onMove={(item, to) => {
          setMenuFor(null);
          repos.shopping
            .moveItem(item.id, to.id)
            .then(() => toast({ message: `Movido para ${to.name}` }))
            .catch((e) => {
              warn('Falha ao mover o item')(e);
              toast({ message: 'Não foi possível mover o item.' });
            });
        }}
        onToggleAlways={(item) => {
          setMenuFor(null);
          repos.shopping.updateItem(item.id, { always: !item.always }).catch(warn('Falha ao alterar o item'));
        }}
        onDelete={(item) => void removeItem(item)}
      />
      <ItemEditSheet item={itemOf(editFor)} onClose={() => setEditFor(null)} onSave={saveItem} />
      <ListSettingsSheet
        list={list}
        visible={settings}
        categories={(data?.categories ?? []).filter((c) => c.kind === 'expense' && !c.archived)}
        onClose={() => setSettings(false)}
        onSave={async (changes) => {
          try {
            await repos.shopping.updateList(list.id, changes);
            setSettings(false);
          } catch (e) {
            warn('Falha ao salvar a lista')(e);
            toast({ message: 'Não foi possível salvar: o nome precisa ter de 1 a 60 caracteres.' });
          }
        }}
        onDelete={() => void removeList()}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  flex: { flex: 1, minWidth: 0 },
  light: { fontFamily: t.type.title.font },
  inline: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], marginTop: t.space[1], marginRight: -t.space[2] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: t.space[2] + t.space[0.5],
  },
  cartHeader: { paddingTop: t.space[6] },
  note: { paddingVertical: t.space[3], borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  rule: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  empty: { gap: t.space[2], paddingVertical: t.space[8] },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[4],
    paddingTop: t.space[3] + t.space[0.5],
    paddingHorizontal: t.layout.gutter,
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
    backgroundColor: t.colors.bg,
  },
  footerText: { flex: 1, minWidth: 0, gap: t.space[0.5] },
}));
