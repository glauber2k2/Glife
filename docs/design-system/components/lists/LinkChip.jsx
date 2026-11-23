import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** "Vínculo": how one item cites another (expense, note, verse, photo). */
export function LinkChip({ icon, label, size = 'md', onClick, style }) {
  const sm = size === 'sm';
  return (
    <span onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: sm ? 22 : 26, padding: sm ? '0 9px' : '0 10px', boxSizing: 'border-box', borderRadius: 999, border: '1px solid var(--line)', fontSize: sm ? 12 : 12.5, color: 'var(--accent-ink)', whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : undefined, ...style }}>
      {icon ? <Icon name={icon} size={13} /> : null}
      {label}
    </span>
  );
}
