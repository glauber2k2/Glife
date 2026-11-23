import React from 'react';

/** Bible verse in Crimson Pro. Highlight paints left→right with the gentle spring. */
export function Verse({ number, text, highlight = null, active = false, onClick, size = 20, style }) {
  const on = highlight !== null && highlight !== undefined;
  const c = 'var(--hl' + ((on ? highlight : 0) + 1) + ')';
  return (
    <div onClick={onClick} style={{ padding: '5px 0', cursor: onClick ? 'pointer' : undefined, ...style }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--accent-ink)' : 'var(--ink3)', marginRight: 6, verticalAlign: 'super', transition: 'color var(--d-tap) var(--e-tap)' }}>{number}</span>
      <span style={{ fontFamily: 'var(--font-read)', fontSize: size, lineHeight: 1.55, color: 'var(--ink1)', backgroundImage: 'linear-gradient(' + c + ', ' + c + ')', backgroundRepeat: 'no-repeat', backgroundPosition: '0 0', backgroundSize: on ? '100% 100%' : '0% 100%', transition: 'background-size var(--d-emph) var(--e-gentle)', padding: '1px 0', WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}>{text}</span>
    </div>
  );
}
