// Formulário de categoria (nome, tipo, ícone, cor e orçamento mensal) e o plano de orçamento que ele grava.
// Puro: a tela guarda o estado e as ações gravam pelo repositório.
import { CATEGORY_COLORS, CATEGORY_NAME_MAX, type Budget, type Category, type CategoryColor, type CategoryKind, type Month } from '@glife/domain/finance';

/** Grade de 16 ícones Lucide do protótipo (8 por linha). */
export const CATEGORY_ICON_CHOICES = [
  'shopping-cart',
  'utensils',
  'car',
  'house',
  'popcorn',
  'heart-pulse',
  'repeat',
  'graduation-cap',
  'gift',
  'plane',
  'shirt',
  'dog',
  'baby',
  'dumbbell',
  'smartphone',
  'church',
] as const;

export const CATEGORY_COLOR_CHOICES: readonly CategoryColor[] = CATEGORY_COLORS;

export const CATEGORY_NAME_LIMIT = CATEGORY_NAME_MAX;

export interface CategoryForm {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: CategoryColor;
  /** orçamento mensal em centavos; null/0 = sem orçamento */
  budgetCents: number | null;
}

export function emptyCategoryForm(kind: CategoryKind = 'expense'): CategoryForm {
  return { name: '', kind, icon: 'plane', color: 'teal', budgetCents: null };
}

export function categoryFormFrom(category: Category, budgetCents: number | null): CategoryForm {
  return { name: category.name, kind: category.kind, icon: category.icon, color: category.color, budgetCents };
}

export interface CategoryFormValue {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: CategoryColor;
  /** só despesa tem orçamento; 0 = tirar o orçamento */
  budgetCents: number;
}

export function readCategoryForm(f: CategoryForm): { ok: true; value: CategoryFormValue } | { ok: false; error: string } {
  const name = f.name.replace(/\s+/g, ' ').trim();
  if (!name) return { ok: false, error: 'Dê um nome à categoria' };
  if (name.length > CATEGORY_NAME_LIMIT) return { ok: false, error: `Nome com até ${CATEGORY_NAME_LIMIT} letras` };
  const cents = f.kind === 'expense' ? (f.budgetCents ?? 0) : 0;
  if (!Number.isSafeInteger(cents) || cents < 0) return { ok: false, error: 'Orçamento inválido' };
  return { ok: true, value: { name, kind: f.kind, icon: f.icon, color: f.color, budgetCents: cents } };
}

/** O que mudou no orçamento: `set` grava a partir de `month`; `remove` são os registros que saem. */
export interface BudgetPlan {
  set: number | null;
  remove: Budget[];
}

/**
 * Orçamento a partir do mês atual. Valor novo: grava em `month` e tira os registros que começariam depois (senão
 * eles mandariam nos meses seguintes). Zero: tira os registros de `month` em diante e, se um anterior ainda valeria,
 * ele também sai: o orçamento só começa por registro (não existe "zero"), então a categoria perde todos.
 */
export function budgetPlan(categoryId: string, budgets: readonly Budget[], month: Month, cents: number): BudgetPlan {
  const mine = budgets.filter((b) => b.deleted_at === null && b.category_id === categoryId);
  const current = [...mine].filter((b) => b.starts_month <= month).sort((a, b) => (a.starts_month < b.starts_month ? 1 : -1))[0] ?? null;
  const later = mine.filter((b) => b.starts_month > month);
  if (cents > 0) {
    const same = current?.amount_cents === cents;
    return { set: same ? null : cents, remove: later };
  }
  // Tirar só os de agora em diante deixaria um anterior valendo: sem "zero" no registro, saem todos.
  return { set: null, remove: mine };
}

/** Linha da lista: "Receita", "Orçamento R$ 1.500,00" ou "Sem orçamento". */
export function categoryMeta(kind: CategoryKind, budgetCents: number | null, money: (c: number) => string): string {
  if (kind === 'income') return 'Receita';
  return budgetCents ? `Orçamento ${money(budgetCents)}` : 'Sem orçamento';
}

/** Nome falado de cada ícone da grade (leitor de tela). */
export const CATEGORY_ICON_NAMES: Record<(typeof CATEGORY_ICON_CHOICES)[number], string> = {
  'shopping-cart': 'carrinho',
  utensils: 'talheres',
  car: 'carro',
  house: 'casa',
  popcorn: 'pipoca',
  'heart-pulse': 'saúde',
  repeat: 'repetir',
  'graduation-cap': 'formatura',
  gift: 'presente',
  plane: 'avião',
  shirt: 'camiseta',
  dog: 'cachorro',
  baby: 'bebê',
  dumbbell: 'haltere',
  smartphone: 'celular',
  church: 'igreja',
};
