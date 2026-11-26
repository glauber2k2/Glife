import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ open: vi.fn(), dismiss: vi.fn(), toast: vi.fn(), press: undefined as (() => void) | undefined }));
vi.mock('@react-native-community/datetimepicker', () => ({ default: () => null, DateTimePickerAndroid: { open: native.open, dismiss: native.dismiss } }));
vi.mock('react-native', () => ({ Platform: { OS: 'android' }, View: 'div' }));
vi.mock('../src/shared/ui/CalendarPickerField', () => ({ CalendarPickerField: ({ onOpen }: { onOpen: () => void }) => { native.press = onOpen; return null; } }));
vi.mock('../src/shared/ui/Button', () => ({ Button: () => null }));
vi.mock('../src/shared/ui/Sheet', () => ({ Sheet: () => null }));
vi.mock('../src/shared/ui/Toast', () => ({ useToast: () => native.toast }));
vi.mock('../src/shared/ui/theme', () => ({ useTheme: () => ({ scheme: 'light' }), makeStyles: () => () => ({ actions: {} }) }));

import { CalendarPicker } from '../src/shared/ui/CalendarPicker';

describe('Android picker lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prevents duplicate dialogs, preserves cancel and allows another selection', () => {
    const onChange = vi.fn();
    renderToStaticMarkup(createElement(CalendarPicker, { mode: 'date', label: 'Data', value: '31/12/2026', onChange }));
    native.press!();
    native.press!();
    expect(native.open).toHaveBeenCalledTimes(1);
    native.open.mock.calls[0]![0].onDismiss();
    expect(onChange).not.toHaveBeenCalled();
    native.press!();
    native.open.mock.calls[1]![0].onValueChange({}, new Date(2028, 1, 29));
    expect(onChange).toHaveBeenCalledWith('29/02/2028');
    native.press!();
    expect(native.open).toHaveBeenCalledTimes(3);
  });

  it('reports a native error and permits retry instead of permanently locking the field', () => {
    renderToStaticMarkup(createElement(CalendarPicker, { mode: 'time', label: 'Hora', value: '09:05', onChange: vi.fn() }));
    native.press!();
    const options = native.open.mock.calls[0]![0];
    expect(options.onError).toBeTypeOf('function');
    options.onError(new Error('Native dialog failure'));
    expect(native.toast).toHaveBeenCalled();
    native.press!();
    expect(native.open).toHaveBeenCalledTimes(2);
  });
});
