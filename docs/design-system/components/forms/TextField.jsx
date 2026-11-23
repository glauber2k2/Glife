import React, { useState } from 'react';

/** Outlined field with floating label (54px, radius 16). */
export function TextField({ label, value, defaultValue, onChange, error, type = 'text', inputMode, numeric = false, style }) {
  const [inner, setInner] = useState(defaultValue || '');
  const [focus, setFocus] = useState(false);
  const val = value !== undefined ? value : inner;
  const up = focus || String(val).length > 0;
  const tone = error ? 'var(--err)' : focus ? 'var(--accent)' : 'var(--line)';
  const labelTone = error ? 'var(--err)' : focus ? 'var(--accent-ink)' : 'var(--ink3)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <div style={{ position: 'relative', height: 54, border: '1px solid ' + tone, borderRadius: 16, transition: 'border-color var(--d-tap) var(--e-tap)' }}>
        <label style={{ position: 'absolute', left: 18, top: 17, fontSize: 15, lineHeight: '18px', color: labelTone, transformOrigin: 'left top', transform: up ? 'translateY(-10px) scale(0.77)' : 'translateY(0) scale(1)', transition: 'transform var(--d-std) var(--e-std), color var(--d-tap) var(--e-tap)', pointerEvents: 'none' }}>{label}</label>
        <input type={type} inputMode={inputMode} value={val}
          onChange={(e) => { if (value === undefined) setInner(e.target.value); if (onChange) onChange(e.target.value); }}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', boxSizing: 'border-box', padding: '22px 18px 6px', border: 0, background: 'transparent', outline: 'none', fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--ink1)', borderRadius: 16, fontVariantNumeric: numeric ? 'tabular-nums' : 'normal' }} />
      </div>
      {error ? <span style={{ fontSize: 12.5, color: 'var(--err)', paddingLeft: 18 }}>{error}</span> : null}
    </div>
  );
}
