import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Inverted pill notice: rises 16px, fades; auto-hide is the caller's job (2.2s). */
export function Toast({ visible = false, message, icon = 'check', floating = true, bottom = 18, style }) {
  const pos = floating ? { position: 'absolute', left: '50%', bottom: bottom, zIndex: 6 } : { position: 'relative' };
  const tx = (floating ? 'translateX(-50%) ' : '') + 'translateY(' + (visible ? 0 : 16) + 'px)';
  return (
    <div role="status" style={{ ...pos, display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px', boxSizing: 'border-box', borderRadius: 999, background: 'var(--ink1)', color: 'var(--bg)', fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', pointerEvents: 'none', opacity: visible ? 1 : 0, transform: tx, transition: 'opacity var(--d-tap) var(--e-tap), transform var(--d-std) var(--e-std)', ...style }}>
      {icon ? <Icon name={icon} size={16} /> : null}
      <span>{message}</span>
    </div>
  );
}
