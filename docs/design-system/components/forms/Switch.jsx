import React from 'react';

/** 46×28 switch; track goes accent, knob slides 18px. */
export function Switch({ checked = false, onChange, label, disabled = false, style }) {
  const track = (
    <span role="switch" aria-checked={checked} style={{ position: 'relative', width: 46, height: 28, flex: 'none', borderRadius: 999, background: checked ? 'var(--accent)' : 'var(--line)', transition: 'background-color var(--d-tap) var(--e-tap)' }}>
      <span style={{ position: 'absolute', top: 3, left: 3, width: 22, height: 22, borderRadius: 999, background: checked ? 'var(--on-accent)' : 'var(--bg)', transform: 'translateX(' + (checked ? 18 : 0) + 'px)', transition: 'transform var(--d-std) var(--e-std), background-color var(--d-tap) var(--e-tap)' }} />
    </span>
  );
  return (
    <div onClick={() => { if (!disabled && onChange) onChange(!checked); }} style={{ display: 'flex', justifyContent: label ? 'space-between' : 'flex-start', alignItems: 'center', gap: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, ...style }}>
      {label ? <span style={{ fontSize: 15, color: 'var(--ink1)' }}>{label}</span> : null}
      {track}
    </div>
  );
}
