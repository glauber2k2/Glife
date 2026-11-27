import { localInstant, type AppNotification } from '@glife/domain/notifications';
import { localNow } from '@glife/domain/time';
import { AlarmClock, CalendarClock } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { formatDateInput, parseDateInput, parseTimeInput } from '@/shared/lib/calendarInput';
import { errorText } from '@/shared/lib/errorText';
import { Button, DateInput, ListItem, Sheet, Text, TimeInput, useToast } from '@/shared/ui';

import { snoozeUntil, type SnoozeOption } from '../notifications/snooze';

const OPTIONS: { label: string; value: SnoozeOption }[] = [
  { label: 'Daqui a 10 minutos', value: '10min' },
  { label: 'Daqui a 1 hora', value: '1h' },
  { label: 'Amanhã às 9:00', value: 'tomorrow' },
];

export function SnoozeSheet({ notification, onClose, onSnooze }: {
  notification: AppNotification | null;
  onClose: () => void;
  onSnooze: (n: AppNotification, at: Date) => Promise<boolean>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState(false);
  const now = localNow();
  const [date, setDate] = useState(() => formatDateInput(now.date));
  const [time, setTime] = useState(now.time);
  const submit = useCallback(async (at: Date) => {
    if (!notification || busy) return;
    if (at.getTime() <= Date.now()) return toast({ message: 'Escolha um horário futuro.' });
    setBusy(true);
    try {
      const scheduled = await onSnooze(notification, at);
      if (!scheduled) return toast({ message: Platform.OS === 'web'
        ? 'Este navegador não agenda avisos com o app fechado. Adie pelo Glife no Android.'
        : 'Permita as notificações do Glife nos ajustes do aparelho para adiar o aviso.' });
      toast({ message: 'Aviso adiado', icon: AlarmClock });
      onClose();
    } catch (e) {
      toast({ message: `Não consegui adiar o aviso: ${errorText(e)}` });
    } finally {
      setBusy(false);
    }
  }, [notification, busy, onSnooze, toast, onClose]);
  const submitCustom = () => {
    const day = parseDateInput(date);
    const clock = parseTimeInput(time);
    if (!day || !clock) return toast({ message: 'Confira a data e a hora.' });
    void submit(localInstant(day, clock));
  };
  return (
    <Sheet visible={notification !== null} onClose={busy ? () => {} : onClose} title="Adiar para">
      {custom ? (
        <>
          <DateInput label="Data" value={date} onChange={setDate} />
          <TimeInput label="Hora" value={time} onChange={setTime} />
          <Button label="Adiar aviso" fullWidth loading={busy} onPress={submitCustom} />
          <Button label="Outras opções" variant="subtle" fullWidth disabled={busy} onPress={() => setCustom(false)} />
        </>
      ) : (
        <>
          {OPTIONS.map((o) => <ListItem key={o.value} icon={AlarmClock} title={o.label} onPress={busy ? undefined : () => void submit(snoozeUntil(o.value, new Date()))} />)}
          <ListItem icon={CalendarClock} title="Escolher horário" separator={false} onPress={busy ? undefined : () => setCustom(true)} />
          {busy && <Text tone="tertiary">Adiando…</Text>}
        </>
      )}
    </Sheet>
  );
}
