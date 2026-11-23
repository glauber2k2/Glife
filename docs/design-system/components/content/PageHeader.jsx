import React from 'react';

/** Screen title: small caption above, 34/300 title, optional serif italic subtitle. */
export function PageHeader({ eyebrow, title, subtitle, style }) {
  return (
    <div style={style}>
      {eyebrow ? <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink3)' }}>{eyebrow}</div> : null}
      <div style={{ fontSize: 34, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.05, marginTop: eyebrow ? 6 : 0, color: 'var(--ink1)' }}>{title}</div>
      {subtitle ? <div style={{ fontFamily: 'var(--font-read)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink3)', marginTop: 4 }}>{subtitle}</div> : null}
    </div>
  );
}
