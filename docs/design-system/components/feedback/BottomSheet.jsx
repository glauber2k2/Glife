import React from 'react';

/** Bottom sheet with grabber and scrim; rises on the emph spring. Place inside a position:relative screen. */
export function BottomSheet({ open = false, onClose, title, subtitle, children, style }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 4, background: 'var(--scrim)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity var(--d-std) var(--e-std)' }} />
      <div role="dialog" aria-hidden={!open} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5, boxSizing: 'border-box', background: 'var(--bg)', borderTop: '1px solid var(--line)', borderRadius: '30px 30px 0 0', padding: '10px 20px 28px', display: 'flex', flexDirection: 'column', gap: 14, transform: open ? 'translateY(0)' : 'translateY(105%)', transition: 'transform var(--d-emph) var(--e-emph)', ...style }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--line)', alignSelf: 'center', marginBottom: 4 }} />
        {title || subtitle ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {title ? <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--ink1)' }}>{title}</div> : null}
            {subtitle ? <div style={{ fontSize: 13, color: 'var(--ink3)' }}>{subtitle}</div> : null}
          </div>
        ) : null}
        {children}
      </div>
    </>
  );
}
