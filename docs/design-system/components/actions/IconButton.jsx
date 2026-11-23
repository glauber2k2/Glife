import React, { useState } from 'react';
import { Icon } from '../core/Icon.jsx';

/** Round icon-only button. */
export function IconButton({ icon, label, variant = 'outline', size = 40, iconSize, color, onClick, disabled = false, style }) {
  const [press, setPress] = useState(false);
  const [hover, setHover] = useState(false);
  const outline = variant === 'outline';
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onPointerDown={() => setPress(true)} onPointerUp={() => setPress(false)}
      style={{
        width: size, height: size, padding: 0, flex: 'none', borderRadius: 999, boxSizing: 'border-box',
        border: outline ? '1px solid var(--line)' : 0,
        background: (press || hover) && variant !== 'inverse' && !disabled ? 'var(--soft)' : 'transparent',
        color: color || (variant === 'inverse' ? 'var(--bg)' : 'var(--ink1)'),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        transform: press && !disabled ? 'scale(var(--press-small))' : 'scale(1)',
        transition: 'transform var(--d-tap) var(--e-tap), background-color var(--d-tap) var(--e-tap)',
        ...style
      }}>
      <Icon name={icon} size={iconSize || (size >= 40 ? 20 : 18)} />
    </button>
  );
}
