import React, { useState } from 'react';
import { Icon } from '../core/Icon.jsx';

/** Filter chip. Selected = accent fill; md size reveals a check. */
export function Chip({ label, selected = false, onClick, size = 'md', showCheck, style }) {
  const [press, setPress] = useState(false);
  const sm = size === 'sm';
  const check = showCheck !== undefined ? showCheck : !sm;
  return (
    <button type="button" onClick={onClick}
      onPointerDown={() => setPress(true)} onPointerUp={() => setPress(false)} onMouseLeave={() => setPress(false)}
      style={{
        flex: 'none', display: 'inline-flex', alignItems: 'center', gap: check && selected ? 6 : 0,
        height: sm ? 32 : 34, padding: '0 14px', boxSizing: 'border-box', borderRadius: 999,
        border: '1px solid ' + (selected ? 'var(--accent)' : 'var(--line)'),
        background: selected ? 'var(--accent)' : 'transparent', color: selected ? 'var(--on-accent)' : 'var(--ink1)',
        fontFamily: 'var(--font-ui)', fontSize: sm ? 13.5 : 14, fontWeight: 500, cursor: 'pointer',
        transform: press ? 'scale(var(--press))' : 'scale(1)',
        transition: ['background-color', 'color', 'border-color', 'gap', 'transform'].map((p) => p + ' var(--d-tap) var(--e-tap)').join(', '),
        ...style
      }}>
      {check ? <span style={{ display: 'inline-flex', width: selected ? 13 : 0, overflow: 'hidden', transition: 'width var(--d-std) var(--e-std)' }}><Icon name="check" size={13} /></span> : null}
      {label}
    </button>
  );
}
