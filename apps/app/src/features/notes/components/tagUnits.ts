import type { EntityType } from '@glife/domain/core';

/** Singular e plural de cada tipo de item nas contagens das tags ("5 notas · 6 gastos"). */
export const TAG_UNITS: Partial<Record<EntityType, readonly [string, string]>> = {
  note: ['nota', 'notas'],
  tx: ['gasto', 'gastos'],
  event: ['evento', 'eventos'],
  reminder: ['lembrete', 'lembretes'],
  meal: ['refeição', 'refeições'],
  media: ['foto', 'fotos'],
  shopping_item: ['item de compra', 'itens de compra'],
  bible_annotation: ['marcação', 'marcações'],
};
