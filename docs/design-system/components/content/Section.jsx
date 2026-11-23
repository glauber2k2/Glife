import React from 'react';

/** A screen block: 11px uppercase label, 1px top line, 18px vertical breathing. Never a box. */
export function Section({ label, action, divider = true, padding = '18px 0', children, onClick, style }) {
  return (
    <div onClick={onClick} style={{ padding: padding, borderTop: divider ? '1px solid var(--line)' : 0, cursor: onClick ? 'pointer' : undefined, ...style }}>
      {label || action ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          {label ? <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink3)' }}>{label}</div> : <span />}
          {action || null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
