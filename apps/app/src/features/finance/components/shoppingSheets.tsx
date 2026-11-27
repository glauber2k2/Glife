// Folhas de Compras: editar item, ações do item (editar, mover, sempre, excluir) e ajustes da lista.
import {
  SHOPPING_ITEM_NAME_MAX,
  SHOPPING_LIST_NAME_MAX,
  SHOPPING_QUANTITY_MAX,
  type Category,
  type ShoppingItem,
  type ShoppingList,
} from '@glife/domain/finance';
import { ChevronRight, FolderInput, Pencil, Repeat, Trash2, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Chip, Icon, Input, Reveal, Sheet, Switch, Text, makeStyles, useTheme, type IconColor, type TextTone } from '@/shared/ui';

import { categoryIcon } from './categories';

import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { itemMeta } from './shoppingRows';
import { MoneyField, SwitchRow } from './ui';

// ---------- Editar item ----------

export interface ItemChanges {
  name: string;
  quantity: number;
  unit_price_cents: number | null;
  always: boolean;
}

/** Nome, quantidade e preço por unidade (opcional). Remonta a cada item aberto. */
export function ItemEditSheet({
  item,
  onClose,
  onSave,
}: {
  item: ShoppingItem | null;
  onClose: () => void;
  onSave: (item: ShoppingItem, changes: ItemChanges) => Promise<void>;
}) {
  return (
    <Sheet visible={!!item} onClose={onClose} title="Editar item">
      {item && <ItemForm key={item.id} item={item} onSave={(c) => onSave(item, c)} />}
    </Sheet>
  );
}

function ItemForm({ item, onSave }: { item: ShoppingItem; onSave: (c: ItemChanges) => Promise<void> }) {
  const { money } = useMoneyFormat();
  const s = useStyles();
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState<number | null>(item.quantity);
  const [price, setPrice] = useState<number | null>(item.unit_price_cents);
  const [always, setAlways] = useState(item.always);
  const [saving, setSaving] = useState(false);
  const quantity = qty ?? 1;
  const ok = name.trim().length > 0 && !saving;
  const total = price !== null ? price * quantity : null;
  const save = async () => {
    if (!ok) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), quantity, unit_price_cents: price, always });
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={s.form}>
      <Input label="Item" value={name} onChangeText={setName} maxLength={SHOPPING_ITEM_NAME_MAX} returnKeyType="done" />
      <Input
        label="Quantidade"
        value={qty === null ? '' : String(qty)}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={String(SHOPPING_QUANTITY_MAX).length}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, '');
          setQty(digits === '' ? null : Math.min(SHOPPING_QUANTITY_MAX, Math.max(1, Number(digits))));
        }}
      />
      <MoneyField
        label="Preço por unidade (opcional)"
        cents={price}
        onChange={(c) => setPrice(c === 0 ? null : c)}
        hint={total !== null && quantity > 1 ? `Total ${money(total)}` : undefined}
      />
      <SwitchRow
        title="Sempre na lista"
        sub="Volta aos pendentes depois de cada compra."
        control={<Switch label="Sempre na lista" value={always} onChange={setAlways} />}
      />
      <Button label="Salvar" fullWidth haptic disabled={!ok} loading={saving} onPress={save} />
    </View>
  );
}

// ---------- Ações do item ----------

export function ActionRow({
  icon,
  label,
  aside,
  tone = 'primary',
  color = 'text',
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  aside?: string;
  tone?: TextTone;
  color?: IconColor;
  onPress: () => void;
}) {
  const s = useStyles();
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.action, pressed && s.pressed]}>
      <Icon icon={icon} size={t.icon.size - t.hairline} color={color} />
      <Text tone={tone} style={[s.flex, s.medium]}>
        {label}
      </Text>
      {aside ? (
        <Text variant="caption" tone="tertiary">
          {aside}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ItemMenuSheet({
  item,
  listName,
  otherLists,
  countOf,
  onClose,
  onEdit,
  onMove,
  onToggleAlways,
  onDelete,
}: {
  item: ShoppingItem | null;
  listName: string;
  otherLists: readonly ShoppingList[];
  countOf: (listId: string) => number;
  onClose: () => void;
  onEdit: (item: ShoppingItem) => void;
  onMove: (item: ShoppingItem, to: ShoppingList) => void;
  onToggleAlways: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
}) {
  const { money } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const [moving, setMoving] = useState<string | null>(null);
  const mode = item && moving === item.id ? 'move' : 'main';
  const meta = item ? `${item.unit_price_cents !== null ? `${item.quantity} × ${money(item.unit_price_cents)}` : itemMeta(item, money).invite ? 'Sem preço' : itemMeta(item, money).text} · ${listName}` : '';
  return (
    <Sheet
      visible={!!item}
      onClose={() => {
        setMoving(null);
        onClose();
      }}
      title={item?.name}
      subtitle={meta}
    >
      {item && mode === 'main' && (
        <View>
          <Reveal>
            <ActionRow icon={Pencil} label="Editar" onPress={() => onEdit(item)} />
            {otherLists.length > 0 && <ActionRow icon={FolderInput} label="Mover para outra lista" onPress={() => setMoving(item.id)} />}
            <ActionRow
              icon={Repeat}
              label="Sempre na lista"
              aside={item.always ? 'Ligado' : 'Desligado'}
              onPress={() => onToggleAlways(item)}
            />
            <ActionRow icon={Trash2} label="Excluir" tone="danger" color="danger" onPress={() => onDelete(item)} />
          </Reveal>
          <View style={s.rule} />
        </View>
      )}
      {item && mode === 'move' && (
        <View>
          <Text variant="label" tone="tertiary" style={s.moveLabel}>
            Mover para
          </Text>
          <Reveal>
            {otherLists.map((l) => (
              <Pressable
                key={l.id}
                accessibilityRole="button"
                onPress={() => {
                  setMoving(null);
                  onMove(item, l);
                }}
                style={({ pressed }) => [s.action, pressed && s.pressed]}
              >
                <Text style={[s.flex, s.medium]}>{l.name}</Text>
                <Text variant="caption" tone="tertiary" numeric>
                  {`${countOf(l.id)} ${countOf(l.id) === 1 ? 'item' : 'itens'}`}
                </Text>
                <Icon icon={ChevronRight} size={t.icon.small} color="textTertiary" />
              </Pressable>
            ))}
          </Reveal>
          <View style={s.rule} />
        </View>
      )}
    </Sheet>
  );
}

// ---------- Ajustes da lista ----------

export function ListSettingsSheet({
  list,
  visible,
  categories,
  onClose,
  onSave,
  onDelete,
}: {
  list: ShoppingList;
  visible: boolean;
  categories: readonly Category[];
  onClose: () => void;
  onSave: (changes: { name: string; category_id: string | null }) => Promise<void>;
  onDelete: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Lista">
      {visible && <ListForm list={list} categories={categories} onSave={onSave} onDelete={onDelete} />}
    </Sheet>
  );
}

function ListForm({
  list,
  categories,
  onSave,
  onDelete,
}: {
  list: ShoppingList;
  categories: readonly Category[];
  onSave: (changes: { name: string; category_id: string | null }) => Promise<void>;
  onDelete: () => void;
}) {
  const s = useStyles();
  const [name, setName] = useState(list.name);
  const [cat, setCat] = useState(list.category_id);
  const [saving, setSaving] = useState(false);
  const ok = name.trim().length > 0 && !saving;
  return (
    <View style={s.form}>
      <Input label="Nome da lista" value={name} onChangeText={setName} maxLength={SHOPPING_LIST_NAME_MAX} />
      <Text variant="label" tone="tertiary">
        Categoria do gasto
      </Text>
      <View style={s.chips}>
        {categories.map((c) => (
          <Chip
            key={c.id}
            size="sm"
            label={c.name}
            icon={categoryIcon(c.icon)}
            selected={cat === c.id}
            onPress={() => setCat(cat === c.id ? null : c.id)}
          />
        ))}
      </View>
      <Button
        label="Salvar"
        fullWidth
        disabled={!ok}
        loading={saving}
        onPress={async () => {
          setSaving(true);
          try {
            await onSave({ name: name.trim(), category_id: cat });
          } finally {
            setSaving(false);
          }
        }}
      />
      <Button label="Excluir lista" variant="ghostDanger" icon={Trash2} selfAlign="center" onPress={onDelete} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: t.space[3] + t.space[0.5] },
  flex: { flex: 1, minWidth: 0 },
  medium: { fontFamily: t.type.chip.font },
  pressed: { opacity: t.opacity.pressed },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3] + t.space[0.5],
    minHeight: t.size.navRowTall,
    paddingVertical: t.space[2],
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
  rule: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  moveLabel: { paddingBottom: t.space[2] + t.space[0.5] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2], marginTop: -t.space[1] },
}));
