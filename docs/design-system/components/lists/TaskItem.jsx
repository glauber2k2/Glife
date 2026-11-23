import React, { useEffect, useState } from 'react';
import { Checkbox } from '../forms/Checkbox.jsx';

/** To-do row: tick draws, text strikes left→right, row collapses after 650ms. */
export function TaskItem({ title, meta, done = false, onToggle, collapsed, autoCollapse = true, divider = false, style }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!done) { setGone(false); return; }
    if (!autoCollapse) return;
    const t = setTimeout(() => setGone(true), 650);
    return () => clearTimeout(t);
  }, [done, autoCollapse]);
  const hidden = collapsed !== undefined ? collapsed : gone;
  return (
    <div style={{ display: 'grid', gridTemplateRows: hidden ? '0fr' : '1fr', opacity: hidden ? 0 : 1, transition: 'grid-template-rows var(--d-gentle) var(--e-gentle), opacity var(--d-tap) var(--e-tap)', ...style }}>
      <div style={{ overflow: 'hidden', minHeight: 0 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: meta ? 'flex-start' : 'center', padding: divider ? '12px 0' : '10px 0', borderBottom: divider ? '1px solid var(--line)' : 0 }}>
          <Checkbox checked={done} onChange={() => onToggle && onToggle(!done)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 15, lineHeight: 1.45, position: 'relative', alignSelf: 'flex-start', color: done ? 'var(--ink3)' : 'var(--ink1)', transition: 'color var(--d-std) var(--e-std)' }}>
              {title}
              <span style={{ position: 'absolute', left: 0, right: 0, top: '53%', height: 1.5, background: 'var(--ink2)', transform: done ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left center', transition: 'transform var(--d-std) var(--e-std) ' + (done ? '80ms' : '0ms') }} />
            </span>
            {meta ? <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{meta}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
