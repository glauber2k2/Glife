import type { InvoiceStatus } from '@glife/domain/finance';
import { CircleAlert, CircleCheck, CircleDashed, Clock, Lock, type LucideIcon } from 'lucide-react-native';

import type { IconColor, TextTone } from '@/shared/ui';

/** Situação da fatura: cor de estado só onde muda o que fazer. */
export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; icon: LucideIcon; tone: TextTone; color: IconColor }> = {
  open: {
    label: 'Aberta',
    icon: Clock,
    tone: 'secondary',
    color: 'textSecondary',
  },
  closed: { label: 'Fechada', icon: Lock, tone: 'primary', color: 'text' },
  partial: {
    label: 'Parcial',
    icon: CircleDashed,
    tone: 'warning',
    color: 'warning',
  },
  paid: { label: 'Paga', icon: CircleCheck, tone: 'success', color: 'success' },
  overdue: {
    label: 'Vencida',
    icon: CircleAlert,
    tone: 'danger',
    color: 'danger',
  },
};
