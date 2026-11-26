import { describe, expect, it } from 'vitest';

import { pickerDate, pickerResult, pickerWebValue, pickerWebResult } from '../src/shared/lib/calendarPicker';

describe('calendar picker local boundary', () => {
  it('keeps the local calendar day, including midnight and leap years', () => {
    const day = new Date(2026, 11, 31, 0, 0);
    expect(pickerResult('date', 'set', day)).toBe('31/12/2026');
    const leap = pickerDate('date', '29/02/2028', day);
    expect([leap.getFullYear(), leap.getMonth(), leap.getDate()]).toEqual([2028, 1, 29]);
    expect(pickerResult('date', 'set', leap)).toBe('29/02/2028');
  });

  it('uses local hours and minutes', () => {
    const date = pickerDate('time', '09:05', new Date(2026, 11, 31));
    expect([date.getHours(), date.getMinutes()]).toEqual([9, 5]);
    expect(pickerResult('time', 'set', date)).toBe('09:05');
  });

  it('does not commit dismissals or invalid native results', () => {
    expect(pickerResult('date', 'dismissed', new Date())).toBeNull();
    expect(pickerResult('date', 'set', new Date(NaN))).toBeNull();
    expect(pickerResult('time', 'set', undefined)).toBeNull();
  });

  it('uses a copy of the fallback when the field is empty or invalid', () => {
    const fallback = new Date(2026, 11, 31, 9, 5);
    for (const value of ['', '31/02/2026']) {
      const result = pickerDate('date', value, fallback);
      expect(result.getTime()).toBe(fallback.getTime());
      expect(result).not.toBe(fallback);
    }
  });

  it('adapts browser values without converting through UTC', () => {
    expect(pickerWebValue('date', '31/12/2026')).toBe('2026-12-31');
    expect(pickerWebResult('date', '2028-02-29')).toBe('29/02/2028');
    expect(pickerWebResult('date', '2026-02-31')).toBeNull();
    expect(pickerWebResult('date', '')).toBe('');
    expect(pickerWebValue('time', '9:05')).toBe('09:05');
    expect(pickerWebResult('time', '25:00')).toBeNull();
  });
});
