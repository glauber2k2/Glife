import React from 'react';

/** Round 24px check. The tick draws itself after the fill. */
export function Checkbox({ checked = false, onChange, label, disabled = false, style }) {
  const toggle = () => { if (!disabled && onChange) onChange(!checked); };
  const box = (
    <span role="checkbox" aria-checked={checked} style={{
      width: 24, height: 24, flex: 'none', boxSizing: 'border-box', borderRadius: 999,
      border: '1.5px solid ' + (checked ? 'var(--accent)' : 'var(--ink3)'),
      background: checked ? 'var(--accent)' : 'transparent', color: 'var(--on-accent)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background-color var(--d-tap) var(--e-tap), border-color var(--d-tap) var(--e-tap)'
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        <path d="M20 6 9 17l-5-5" style={{ strokeDasharray: 24, strokeDashoffset: checked ? 0 : 24, transition: 'stroke-dashoffset var(--d-std) var(--e-std) ' + (checked ? '60ms' : '0ms') }} />
      </svg>
    </span>
  );
  return (
    <div onClick={toggle} style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, ...style }}>
      {box}
      {label ? <span style={{ fontSize: 15, color: 'var(--ink1)' }}>{label}</span> : null}
    </div>
  );
}
