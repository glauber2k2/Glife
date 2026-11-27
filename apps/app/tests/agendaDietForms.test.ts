import { describe, expect, it } from 'vitest';

import { emptyEventForm, readEventForm, readReminderForm, emptyReminderForm } from '../src/features/agenda/components/forms';
import { emptyLogForm, readLogForm, readPlanForm, emptyPlanForm } from '../src/features/diet/components/forms';
import { maskDate, maskTime, parseDateInput, parseTimeInput, weekdaysLabel } from '../src/shared/lib/calendarInput';

describe('campos de calendário', () => {
  it('máscaras e leitura de data e hora', () => {
    expect(maskDate('25112026')).toBe('25/11/2026');
    expect(maskTime('0905')).toBe('09:05');
    expect(parseDateInput('25/11/2026')).toBe('2026-11-25');
    expect(parseDateInput('31/02/2026')).toBeNull();
    expect(parseTimeInput('9:05')).toBe('09:05');
    expect(parseTimeInput('24:00')).toBeNull();
    expect(weekdaysLabel(0b0111110)).toBe('Dias úteis');
    expect(weekdaysLabel(0b0001010)).toBe('Seg e Qua');
  });
});

describe('formulários da agenda e da dieta', () => {
  it('evento: hora obrigatória fora do dia inteiro; fim vazio = mesmo dia', () => {
    const f = { ...emptyEventForm('2026-11-25'), title: 'Reunião' };
    expect(readEventForm(f)).toEqual({ ok: false, error: 'Hora de início inválida (hh:mm)' });
    const ok = readEventForm({ ...f, startTime: '14:30' });
    expect(ok.ok && ok.value).toMatchObject({ start_date: '2026-11-25', end_date: '2026-11-25', start_time: '14:30', end_time: null, remind_before: 15 });
    const allDay = readEventForm({ ...f, allDay: true, startTime: 'xx' });
    expect(allDay.ok && allDay.value.start_time).toBeNull();
  });

  it('repetição semanal sem dias usa o dia do início; fim inválido é avisado', () => {
    const f = { ...emptyReminderForm('2026-11-25'), title: 'Remédio', repeat: { frequency: 'weekly' as const, interval: '1', weekdays: 0, until: '' } };
    const r = readReminderForm(f);
    expect(r.ok && r.value.weekdays).toBe(1 << 3);
    expect(readReminderForm({ ...f, repeat: { ...f.repeat, until: '99/99/2026' } }).ok).toBe(false);
  });

  it('dieta: hora inválida no plano e no registro', () => {
    expect(readPlanForm({ ...emptyPlanForm(), name: 'Almoço', time: '25:00' }).ok).toBe(false);
    const log = readLogForm(emptyLogForm('2026-11-25', '12:40', null));
    expect(log.ok && log.value).toMatchObject({ date: '2026-11-25', time: '12:40', plan_id: null });
  });
});
