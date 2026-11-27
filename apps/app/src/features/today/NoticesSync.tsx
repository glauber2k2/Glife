// Junta os avisos da agenda e da dieta e entrega ao agendador do aparelho (injetado na raiz). Recalcula quando os
// dados mudam e quando o app volta ao primeiro plano (a janela de dias anda). Tocar num aviso abre a tela dele; os
// botões do aviso: "Feito" conclui o lembrete, "Registrar" abre o registro já na refeição ("Adiar" o agendador faz).
// Sem sessão (saiu da conta), todos os avisos do Glife somem, adiados inclusive, e nenhuma ação pendente é feita.
import { useAgendaNotices, useCompleteReminder, usePendingReminder } from '@/features/agenda';
import { usePlanNotices } from '@/features/bible';
import { useDietNotices, usePendingMeal } from '@/features/diet';
import { useOpenRoute } from '@/features/links';
import { localNow, upcomingNotices, type NoticeRef } from '@glife/domain/time';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { errorText } from '@/shared/lib/errorText';
import { mealLogRoute, type NoticeActionEvent, type NoticeScheduler } from '@/shared/lib/notices';
import { useToast } from '@/shared/ui';

import { freshPending, type PendingAction } from './pendingActions';

/** Janela agendada: 7 dias, no máximo 60 avisos (o Android limita alarmes por app). */
const DAYS = 7;
const MAX = 60;
const DEBOUNCE_MS = 1000;
export function NoticesSync({ scheduler, signedOut }: { scheduler: NoticeScheduler; signedOut: boolean }) {
  const toast = useToast();
  const [, setTick] = useState(0);
  const agenda = useAgendaNotices(DAYS);
  const diet = useDietNotices(DAYS);
  const plans = usePlanNotices(DAYS);
  const reminderPending = usePendingReminder();
  const mealPending = usePendingMeal();
  const completeReminder = useCompleteReminder();
  const pending = useRef<PendingAction[]>([]);
  const signedOutNow = useRef(signedOut);
  useEffect(() => {
    signedOutNow.current = signedOut;
  }, [signedOut]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setTick((n) => n + 1));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Saiu da conta: nada do Glife fica agendado nem na gaveta, e a fila de ações é esquecida.
    if (signedOut) {
      pending.current = [];
      void scheduler.clearAll();
      return;
    }
    // Sem os dados ainda (lendo ou esperando o MFA): não mexe no que está agendado.
    if (agenda === null || diet === null || plans === null || !reminderPending || !mealPending) return;
    const keepSnoozed = (ref: NoticeRef) => (ref.kind === 'reminder' ? reminderPending(ref.id, ref.date) : mealPending(ref.id, ref.date));
    const t = setTimeout(() => void scheduler.replaceAll(upcomingNotices([...agenda, ...diet, ...plans], localNow(), MAX), keepSnoozed), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [signedOut, agenda, diet, plans, reminderPending, mealPending, scheduler]);

  // Aviso tocado: abre a tela; se o item do aviso foi excluído ou ainda não chegou, mostra "Item não encontrado".
  const openRoute = useOpenRoute();
  useEffect(() => scheduler.onOpen((url) => void openRoute(url)), [scheduler, openRoute]);

  const complete = useRef<((e: NoticeActionEvent) => void) | null>(null);
  useEffect(() => {
    complete.current = completeReminder
      ? (e) => void completeReminder(e.notice.id, e.notice.date).catch((err) => toast({ message: `Lembrete não concluído: ${errorText(err)}` }))
      : null;
    if (!completeReminder) return;
    const queued = freshPending(pending.current, Date.now());
    pending.current = [];
    queued.forEach((p) => complete.current?.(p.event));
  }, [completeReminder, toast]);

  useEffect(
    () =>
      scheduler.onAction((e) => {
        if (e.action === 'log' && e.notice.kind === 'meal') {
          const url = mealLogRoute(e.notice.id);
          if (url) router.push(url as Href);
          return;
        }
        // Sem conta aberta, nada é feito (o aviso pode ser de outra conta).
        if (e.action !== 'done' || e.notice.kind !== 'reminder' || signedOutNow.current) return;
        if (complete.current) complete.current(e);
        else pending.current = [...freshPending(pending.current, Date.now()), { event: e, at: Date.now() }];
      }),
    [scheduler],
  );
  return null;
}
