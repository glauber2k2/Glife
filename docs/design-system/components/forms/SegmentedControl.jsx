import React from 'react';

/** Pill segmented control with a sliding --soft indicator. */
export function SegmentedControl({ options, value, onChange, size = 'md', fullWidth = false, style }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const sm = size === 'sm';
  const n = opts.length;
  return (
    <div style={{ position: 'relative', display: fullWidth ? 'grid' : 'inline-grid', gridTemplateColumns: 'repeat(' + n + ', 1fr)', padding: 2, borderRadius: 999, border: '1px solid var(--line)', alignSelf: 'flex-start', ...style }}>
      <div style={{ position: 'absolute', top: 2, left: 2, bottom: 2, width: 'calc((100% - 4px) / ' + n + ')', boxSizing: 'border-box', borderRadius: 999, background: 'var(--soft)', border: sm ? 0 : '1px solid var(--line)', transform: 'translateX(' + idx * 100 + '%)', transition: 'transform var(--d-std) var(--e-std)' }} />
      {opts.map((o, i) => (
        <button key={o.value} type="button" onClick={() => onChange && onChange(o.value)} style={{ position: 'relative', border: 0, background: 'transparent', padding: sm ? '4px 12px' : '5px 14px', fontFamily: 'var(--font-ui)', fontSize: sm ? 12 : 12.5, fontWeight: 600, color: i === idx ? 'var(--ink1)' : 'var(--ink3)', cursor: 'pointer', transition: 'color var(--d-tap) var(--e-tap)' }}>{o.label}</button>
      ))}
    </div>
  );
}
