// Editar categoria (protótipo `categoria-editar`): nome, tipo, ícone (grade de 8 por linha), cor e orçamento mensal.
// A prévia mostra o chip como vai aparecer nos lançamentos e pula com uma mola curta ao trocar ícone ou cor.
// Orçamento a partir do mês atual; zero tira a categoria do bloco de orçamento. Arquivar em vez de excluir.
import { budgetFor, monthOf, type Category, type CategoryColor, type CategoryKind } from '@glife/domain/finance';
import { router, useLocalSearchParams } from 'expo-router';
import { Archive, CreditCard } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import {
  Alert,
  BackHeader,
  Button,
  EmptyState,
  Icon,
  Input,
  ModuleIcon,
  Reveal,
  Screen,
  SegmentedControl,
  Text,
  makeStyles,
  moduleColors,
  resolveSpring,
  useReduceMotion,
  useTheme,
  useToast,
} from '@/shared/ui';

import { categoryHue, categoryIcon } from '../components/categories';
import {
  CATEGORY_COLOR_CHOICES,
  CATEGORY_ICON_CHOICES,
  CATEGORY_ICON_NAMES,
  CATEGORY_NAME_LIMIT,
  categoryFormFrom,
  emptyCategoryForm,
  readCategoryForm,
  type CategoryForm,
} from '../components/categoryForm';
import { failureReason } from '../components/errors';
import { todayIso } from '../components/format';
import { MoneyField } from '../components/ui';
import { useFinance } from '../hooks/FinanceData';
import { CategoryBudgetError, useFinanceActions } from '../hooks/useFinanceActions';

const KINDS = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Receita' },
] as const;

const COLOR_NAMES: Record<CategoryColor, string> = {
  slate: 'Ardósia',
  steel: 'Aço',
  sage: 'Sálvia',
  sand: 'Areia',
  clay: 'Argila',
  rose: 'Rosa',
  plum: 'Ameixa',
  teal: 'Azul-petróleo',
};

export function CategoryFormScreen() {
  const { id, tipo } = useLocalSearchParams<{ id: string; tipo?: string }>();
  const { data } = useFinance();
  if (!data) return <Screen>{null}</Screen>;
  const isNew = id === 'novo';
  const category = isNew ? null : (data.categories.find((c) => c.id === id && c.deleted_at === null) ?? null);
  if (!isNew && !category) {
    return (
      <Screen header={<BackHeader title="Categoria" fallback="/financas/categorias" />}>
        <EmptyState title="Não encontrada" message="Esta categoria não existe mais." mood="pensando" />
      </Screen>
    );
  }
  return <CategoryEditor key={id} category={category} initialKind={tipo === 'income' ? 'income' : 'expense'} />;
}

function CategoryEditor({ category, initialKind }: { category: Category | null; initialKind: CategoryKind }) {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const month = monthOf(todayIso());
  const { data } = useFinance();
  const { saveCategory, archiveCategory } = useFinanceActions();
  const currentBudget = category ? budgetFor(category.id, month, data?.budgets ?? []) : null;
  const [form, setForm] = useState<CategoryForm>(() => (category ? categoryFormFrom(category, currentBudget) : emptyCategoryForm(initialKind)));
  const [saving, setSaving] = useState(false);
  // Tentativa anterior criou a categoria, mas não o orçamento: a próxima edita em vez de duplicar.
  const createdId = useRef<string | null>(null);
  const set = (patch: Partial<CategoryForm>) => setForm((f) => ({ ...f, ...patch }));

  // Tipo fixo quando já há lançamentos ou recorrências: mudar deixaria o histórico incoerente.
  const used =
    !!category &&
    ((data?.transactions ?? []).some((tx) => tx.deleted_at === null && tx.category_id === category.id) ||
      (data?.rules ?? []).some((r) => r.deleted_at === null && r.category_id === category.id));

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/financas/categorias');
  };

  const save = async () => {
    const read = readCategoryForm(form);
    if (!read.ok) {
      toast({ message: read.error });
      return;
    }
    setSaving(true);
    try {
      await saveCategory(category?.id ?? createdId.current, read.value, month);
      toast({ message: 'Categoria salva' });
      back();
    } catch (e) {
      if (e instanceof CategoryBudgetError) {
        createdId.current = e.createdId;
        console.warn('Falha ao salvar o orçamento da categoria', e.reason);
        toast({ message: `A categoria foi criada, mas o orçamento não: ${failureReason(e.reason, 'confira o valor.')} Toque em Salvar de novo.` });
      } else {
        console.warn('Falha ao salvar a categoria', e);
        toast({ message: `Não foi possível salvar: ${failureReason(e, 'confira o nome e o valor.')}` });
      }
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!category) return;
    try {
      const undo = await archiveCategory(category.id);
      toast({
        message: 'Categoria arquivada · o histórico continua',
        icon: Archive,
        actionLabel: 'Desfazer',
        onAction: () => void undo().catch((e) => console.warn('Falha ao desfazer', e)),
      });
      back();
    } catch (e) {
      console.warn('Falha ao arquivar a categoria', e);
      toast({ message: `Não foi possível arquivar: ${failureReason(e)}` });
    }
  };

  return (
    <Screen
      header={<BackHeader title={category ? 'Categoria' : 'Nova categoria'} fallback="/financas/categorias" />}
      footer={<Button label="Salvar" fullWidth haptic loading={saving} disabled={!form.name.trim()} onPress={() => void save()} />}
    >
      <Reveal>
        <Preview name={form.name.trim() || 'Viagens'} icon={form.icon} color={form.color} />
        <Input label="Nome" value={form.name} onChangeText={(name) => set({ name })} placeholder="Ex.: Viagens" maxLength={CATEGORY_NAME_LIMIT} />

        <View style={s.field}>
          <Text variant="label" tone="tertiary">
            Tipo
          </Text>
          {used ? (
            <Text variant="small" tone="secondary">
              {`${form.kind === 'income' ? 'Receita' : 'Gasto'} · já tem lançamentos, o tipo não muda.`}
            </Text>
          ) : (
            <SegmentedControl label="Tipo" options={KINDS} value={form.kind} onChange={(kind) => set({ kind })} fullWidth shape="block" />
          )}
        </View>

        <View style={s.field}>
          <Text variant="label" tone="tertiary">
            Ícone
          </Text>
          <View style={s.grid}>
            {[CATEGORY_ICON_CHOICES.slice(0, 8), CATEGORY_ICON_CHOICES.slice(8)].map((row, r) => (
              <View key={r} style={s.gridRow}>
                {row.map((name) => {
                  const on = form.icon === name;
                  return (
                    <Pressable
                      key={name}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`Ícone ${CATEGORY_ICON_NAMES[name]}`}
                      onPress={() => set({ icon: name })}
                      style={({ pressed }) => [s.iconCell, on && s.iconOn, pressed && s.pressed]}
                    >
                      <Icon icon={categoryIcon(name)} size={t.icon.small + t.space[0.5]} color={on ? 'tonalInk' : 'textSecondary'} />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={s.field}>
          <Text variant="label" tone="tertiary">
            Cor
          </Text>
          <View style={s.swatches}>
            {CATEGORY_COLOR_CHOICES.map((color) => {
              const on = form.color === color;
              const c = moduleColors(categoryHue(color)!, t.scheme);
              return (
                <Pressable
                  key={color}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`Cor ${COLOR_NAMES[color]}`}
                  onPress={() => set({ color })}
                  style={({ pressed }) => [
                    s.swatch,
                    { backgroundColor: c.soft, boxShadow: on ? `inset 0px 0px 0px ${t.field.ring}px ${c.strong}` : undefined },
                    pressed && s.pressed,
                  ]}
                />
              );
            })}
          </View>
        </View>

        {form.kind === 'expense' && (
          <View style={s.field}>
            <MoneyField
              label="Orçamento mensal"
              cents={form.budgetCents}
              onChange={(budgetCents) => set({ budgetCents })}
              hint="Opcional, vale a partir deste mês. Zero tira a categoria do orçamento."
            />
            <Alert tone="neutral" icon={CreditCard}>
              Compra no cartão conta no mês em que a fatura vence.
            </Alert>
          </View>
        )}

        {category && !category.archived && (
          <View style={s.archive}>
            <Button label="Arquivar categoria" icon={Archive} variant="ghost" onPress={() => void archive()} />
          </View>
        )}
      </Reveal>
    </Screen>
  );
}

/** Chip de prévia: ícone e cor pulam com uma mola curta ao mudar. */
function Preview({ name, icon, color }: { name: string; icon: string; color: CategoryColor }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue<number>(t.pressScale.rest);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const spring = resolveSpring('tap', reduceMotion);
    if (!spring) return;
    scale.set(withSequence(withTiming(t.pressScale.pop, { duration: t.motion.press }), withSpring(t.pressScale.rest, spring)));
  }, [icon, color, reduceMotion, scale, t.pressScale.pop, t.pressScale.rest, t.motion.press]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <View style={s.previewWrap} accessibilityLabel={`Prévia: ${name}`}>
      <View style={s.preview}>
        <Animated.View style={style}>
          <ModuleIcon icon={categoryIcon(icon)} module="finance" hue={categoryHue(color)} size="sm" />
        </Animated.View>
        <Text variant="emphasis" numberOfLines={1} style={s.previewName}>
          {name}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  field: { gap: t.space[2.5] },
  grid: { gap: t.space[1.5] },
  gridRow: { flexDirection: 'row', gap: t.space[1.5] },
  iconCell: {
    flex: 1,
    height: t.size.iconButtonSmall,
    borderRadius: t.radius.icon,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.card,
  },
  iconOn: { backgroundColor: t.colors.tonal },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  swatch: { width: t.size.iconButtonSmall, height: t.size.iconButtonSmall, borderRadius: t.radius.icon },
  pressed: { opacity: t.opacity.pressed },
  previewWrap: { alignItems: 'center' },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2.5],
    maxWidth: '100%',
    minHeight: t.size.buttonMedium,
    paddingLeft: t.space[1.5],
    paddingRight: t.space[4],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.card,
  },
  previewName: { flexShrink: 1 },
  archive: { flexDirection: 'row', marginLeft: -(t.space[3] + t.space[0.5]) },
}));
