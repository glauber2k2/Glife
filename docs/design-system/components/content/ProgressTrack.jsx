import React from 'react';

/** Thin progress track. Fill switches to --warn above the threshold. */
export function ProgressTrack({ value, max = 100, warnAt = 90, height = 3, color, delay = 80, style }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = color || (pct > warnAt ? 'var(--warn)' : 'var(--accent)');
  return (
    <div style={{ height: height, background: 'var(--line)', borderRadius: 999, overflow: 'hidden', ...style }}>
      <div style={{ height: '100%', width: pct + '%', background: fill, borderRadius: 999, transition: 'width var(--d-emph) var(--e-emph) ' + delay + 'ms, background-color var(--d-std) var(--e-std)' }} />
    </div>
  );
}
