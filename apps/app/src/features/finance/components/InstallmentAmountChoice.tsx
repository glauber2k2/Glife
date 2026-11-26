import type { InstallmentAmountMode } from '@glife/domain/finance';

import { SegmentedControl } from '@/shared/ui';

const OPTIONS = [
  { value: 'total', label: 'Total da compra' },
  { value: 'installment', label: 'Cada parcela' },
] as const;

/** Muda a interpretação do valor digitado; a gravação continua com o total resolvido no domain. */
export function InstallmentAmountChoice({ value, onChange }: { value: InstallmentAmountMode; onChange: (value: InstallmentAmountMode) => void }) {
  return <SegmentedControl label="Informar valor" options={OPTIONS} value={value} onChange={onChange} fullWidth />;
}
