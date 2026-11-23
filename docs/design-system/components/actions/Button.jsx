import React, { useState } from 'react';
import { Icon } from '../core/Icon.jsx';

/** Pill button. Primary = the single accent action per screen. */
export function Button({ variant = 'primary', size = 'md', icon, disabled = false, fullWidth = false, onClick, children, type = 'button', style }) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const sm = size === 'sm';
  const v = {
    primary: { border: 0, background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 600, padding: sm ? '0 18px' : '0 24px', filter: hover && !disabled ? 'brightness(0.94)' : 'none' },
    secondary: { border: '1px solid var(--line)', background: hover && !disabled ? 'var(--soft)' : 'transparent', color: disabled ? 'var(--ink3)' : 'var(--ink1)', fontWeight: 500, padding: sm ? '0 18px' : '0 22px' },
    ghost: { border: 0, background: hover && !disabled ? 'var(--soft)' : 'transparent', color: 'var(--accent-ink)', fontWeight: 600, padding: sm ? '0 12px' : '0 14px' }
  }[variant];
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onPointerDown={() => setPress(true)} onPointerUp={() => setPress(false)}
      style={{
        height: sm ? 40 : 48, borderRadius: 999, boxSizing: 'border-box',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'var(--font-ui)', fontSize: sm ? 14 : 15, whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        transform: press && !disabled ? 'scale(var(--press))' : 'scale(1)',
        transition: 'transform var(--d-tap) var(--e-tap), background-color var(--d-tap) var(--e-tap), filter var(--d-tap) var(--e-tap)',
        ...v, ...style
      }}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}
