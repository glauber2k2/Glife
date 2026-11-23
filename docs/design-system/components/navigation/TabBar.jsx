import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { IconButton } from '../actions/IconButton.jsx';

/** 70px bottom tab bar: 4 tabs around a discreet outlined + (column 3). A --soft pill slides behind the active tab. */
export function TabBar({ items, value, onChange, onPlus, plusLabel = 'Caixa de entrada', style }) {
  const slots = [0, 1, 3, 4];
  const idx = Math.max(0, items.findIndex((t) => t.key === value));
  return (
    <div style={{ position: 'relative', zIndex: 2, flex: 'none', height: 70, borderTop: '1px solid var(--line)', background: 'var(--bg)', display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '20%', height: '100%', pointerEvents: 'none', transform: 'translateX(' + slots[idx] * 100 + '%)', transition: 'transform var(--d-std) var(--e-std)' }}>
        <div style={{ width: 56, height: 54, margin: '6px auto 0', borderRadius: 999, background: 'var(--soft)' }} />
      </div>
      {items.slice(0, 4).map((t, i) => {
        const on = i === idx;
        return (
          <button key={t.key} type="button" onClick={() => onChange && onChange(t.key)} style={{ gridColumn: slots[i] + 1, gridRow: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 13, background: 'none', border: 0, cursor: 'pointer', fontFamily: 'var(--font-ui)', color: on ? 'var(--accent-ink)' : 'var(--ink3)', transition: 'color var(--d-tap) var(--e-tap)' }}>
            <Icon name={t.icon} size={20} />
            <span style={{ fontSize: 11, fontWeight: on ? 600 : 500 }}>{t.label}</span>
          </button>
        );
      })}
      <div style={{ gridColumn: 3, gridRow: 1, justifySelf: 'center', marginTop: 12 }}>
        <IconButton icon="plus" label={plusLabel} onClick={onPlus} color="var(--ink2)" />
      </div>
    </div>
  );
}
