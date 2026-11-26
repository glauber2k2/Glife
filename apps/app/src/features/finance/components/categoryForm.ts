// Formulário de categoria (nome, tipo, ícone, cor e orçamento mensal). Puro: a tela guarda o estado e as ações
// gravam pelo repositório (o plano do orçamento é `planBudgetChange`, no domínio).
import { CATEGORY_COLORS, CATEGORY_NAME_MAX, type Category, type CategoryColor, type CategoryKind } from '@glife/domain/finance';

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
