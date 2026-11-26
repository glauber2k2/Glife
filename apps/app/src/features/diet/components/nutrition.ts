// Calorias e macros nos campos de texto: ler ("92,5" → 92.5; vazio → null) e mostrar ("1.420", "92,5").
// Os limites são os do domain; aqui só viram uma mensagem clara antes de salvar.
import { KCAL_MAX, MACRO_MAX } from '@glife/domain/diet';

export interface NutritionForm {
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
}

export interface NutritionValues {
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export const emptyNutrition = (): NutritionForm => ({ kcal: '', protein: '', carbs: '', fat: '' });

/** Milhar com ponto: 1420 → "1.420". */
export const kcalText = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
/** Uma casa com vírgula, sem ",0": 92.5 → "92,5"; 92 → "92". */
export const gramsText = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

export const nutritionToForm = (v: NutritionValues): NutritionForm => ({
  kcal: v.kcal === null ? '' : String(v.kcal),
  protein: v.protein_g === null ? '' : gramsText(v.protein_g),
  carbs: v.carbs_g === null ? '' : gramsText(v.carbs_g),
  fat: v.fat_g === null ? '' : gramsText(v.fat_g),
});

/** Só dígitos (kcal inteira). */
export const maskKcal = (text: string) => text.replace(/\D/g, '').slice(0, 5);
/** Dígitos e uma vírgula com uma casa (gramas). */
export function maskGrams(text: string): string {
  const [int = '', ...rest] = text.replace(/\./g, ',').replace(/[^\d,]/g, '').split(',');
  return rest.length ? `${int.slice(0, 4)},${rest.join('').slice(0, 1)}` : int.slice(0, 4);
}

type Read<T> = { ok: true; value: T } | { ok: false; error: string };

function readNumber(text: string, max: number, label: string, integer: boolean): Read<number | null> {
  const raw = text.trim().replace(',', '.');
  if (!raw) return { ok: true, value: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || (integer && !Number.isInteger(n))) return { ok: false, error: `${label}: número inválido` };
  if (n > max) return { ok: false, error: `${label}: no máximo ${kcalText(max)}` };
  return { ok: true, value: integer ? n : Math.round(n * 10) / 10 };
}

/** Campos vazios = null; fora dos limites = mensagem com o nome do campo. */
export function readNutrition(f: NutritionForm, kcalLabel = 'kcal'): Read<NutritionValues> {
  const kcal = readNumber(f.kcal, KCAL_MAX, kcalLabel, true);
  if (!kcal.ok) return kcal;
  const protein = readNumber(f.protein, MACRO_MAX, 'Proteína', false);
  if (!protein.ok) return protein;
  const carbs = readNumber(f.carbs, MACRO_MAX, 'Carboidratos', false);
  if (!carbs.ok) return carbs;
  const fat = readNumber(f.fat, MACRO_MAX, 'Gorduras', false);
  if (!fat.ok) return fat;
  return { ok: true, value: { kcal: kcal.value, protein_g: protein.value, carbs_g: carbs.value, fat_g: fat.value } };
}
