import React from 'react';
import { LinkChip } from './LinkChip.jsx';

/** Note list row: title + date, 2-line excerpt, tag + vínculos. */
export function NoteRow({ title, date, excerpt, tag, links = [], onClick, style }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 0', borderTop: '1px solid var(--line)', cursor: onClick ? 'pointer' : undefined, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
        <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink1)' }}>{title}</div>
        {date ? <div style={{ fontSize: 12, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>{date}</div> : null}
      </div>
      {excerpt ? <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--ink2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{excerpt}</div> : null}
      {tag || links.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tag ? <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink3)', padding: '3px 0' }}>{tag}</span> : null}
          {links.map((l, i) => <LinkChip key={i} size="sm" icon={l.icon} label={l.label} />)}
        </div>
      ) : null}
    </div>
  );
}
