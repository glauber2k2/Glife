import React, { useState } from 'react';
import { Icon } from '../core/Icon.jsx';

/** Pill search input with leading icon. */
export function SearchField({ value, defaultValue, onChange, placeholder = 'Buscar', style }) {
  const [inner, setInner] = useState(defaultValue || '');
  const [focus, setFocus] = useState(false);
  const val = value !== undefined ? value : inner;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 16px', boxSizing: 'border-box', borderRadius: 999, border: '1px solid ' + (focus ? 'var(--accent)' : 'var(--line)'), color: focus ? 'var(--accent-ink)' : 'var(--ink3)', transition: 'border-color var(--d-tap) var(--e-tap), color var(--d-tap) var(--e-tap)', ...style }}>
      <Icon name="search" size={16} />
      <input value={val} placeholder={placeholder}
        onChange={(e) => { if (value === undefined) setInner(e.target.value); if (onChange) onChange(e.target.value); }}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--ink1)' }} />
    </div>
  );
}
