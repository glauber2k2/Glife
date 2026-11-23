import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { LinkChip } from './LinkChip.jsx';

/** List row (e.g. transaction) that expands to show its vínculos. */
export function ExpandableItem({ icon, title, meta, amount, positive = false, links = [], expanded = false, onToggle, style }) {
  return (
    <div onClick={() => onToggle && onToggle(!expanded)} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer', ...style }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {icon ? <span style={{ width: 34, height: 34, flex: 'none', boxSizing: 'border-box', borderRadius: 999, border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink2)' }}><Icon name={icon} size={16} /></span> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15, color: 'var(--ink1)' }}>{title}</span>
          {meta ? <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{meta}</span> : null}
        </div>
        {amount ? <span style={{ fontSize: 15, fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: positive ? 'var(--ok)' : 'var(--ink1)' }}>{amount}</span> : null}
      </div>
      {links.length ? (
        <div style={{ display: 'grid', gridTemplateRows: expanded ? '1fr' : '0fr', opacity: expanded ? 1 : 0, transition: 'grid-template-rows var(--d-emph) var(--e-emph), opacity var(--d-std) var(--e-std)' }}>
          <div style={{ overflow: 'hidden', minHeight: 0 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: icon ? '12px 0 2px 46px' : '12px 0 2px' }}>
              {links.map((l, i) => <LinkChip key={i} icon={l.icon} label={l.label} />)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
