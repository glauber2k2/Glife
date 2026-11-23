import React from 'react';
import { IconButton } from '../actions/IconButton.jsx';

/** Inverse pill toolbar (ink1 bg) that slides up when a verse is selected. */
export function SelectionToolbar({ open = false, color = 0, onColor, actions = [], swatchCount = 4, style }) {
  return (
    <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, zIndex: 1, height: 54, boxSizing: 'border-box', background: 'var(--ink1)', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 0 18px', transform: open ? 'translateY(0)' : 'translateY(160px)', transition: 'transform var(--d-emph) var(--e-emph)', ...style }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {Array.from({ length: swatchCount }).map((_, i) => (
          <button key={i} type="button" aria-label={'Cor ' + (i + 1)} onClick={() => onColor && onColor(i)} style={{ width: 22, height: 22, padding: 0, border: 0, borderRadius: 999, background: 'var(--hl' + (i + 1) + ')', outline: '2px solid ' + (color === i ? 'var(--bg)' : 'transparent'), outlineOffset: 2, transform: color === i ? 'scale(1)' : 'scale(0.82)', transition: 'transform var(--d-tap) var(--e-tap), outline-color var(--d-tap) var(--e-tap)', cursor: 'pointer' }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {actions.map((a, i) => <IconButton key={i} icon={a.icon} label={a.label} onClick={a.onClick} variant="inverse" size={36} iconSize={18} />)}
      </div>
    </div>
  );
}
