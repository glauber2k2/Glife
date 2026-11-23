function NotasScreen({ onOpen, openId }) {
  const { PageHeader, SearchField, Chip, NoteRow } = GL;
  const [filter, setFilter] = React.useState('Todas');
  const [q, setQ] = React.useState('');
  const [listOn, setListOn] = React.useState(true);
  const pick = (f) => { setFilter(f); setListOn(false); setTimeout(() => setListOn(true), 40); };
  const ql = q.trim().toLowerCase();
  const notes = KIT.NOTES.filter(n => (filter === 'Todas' || n.tag === filter) && (!ql || (n.title + ' ' + n.ex).toLowerCase().includes(ql)));
  return (
    <div style={{ padding: '4px 22px 32px', display: 'flex', flexDirection: 'column' }}>
      <Enter i={0}><PageHeader eyebrow="24 notas" title="Notas" /></Enter>
      <Enter i={1}>
        <SearchField placeholder="Buscar notas" value={q} onChange={setQ} style={{ marginTop: 16 }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {['Todas', 'Diário', 'Estudos', 'Finanças', 'Casa'].map(f => <Chip key={f} size="sm" label={f} selected={filter === f} onClick={() => pick(f)} />)}
        </div>
      </Enter>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
        {notes.map((n, i) => (
          <Enter key={n.id + filter} i={i} base={80} on={listOn} style={{ visibility: openId === n.id ? 'hidden' : 'visible' }}>
            <NoteRow title={n.title} date={n.date} excerpt={n.ex} tag={n.tag} links={n.links.map(([icon, label]) => ({ icon, label }))} onClick={(e) => onOpen(n.id, e.currentTarget)} />
          </Enter>
        ))}
        {notes.length === 0 ? <div style={{ padding: '24px 0', fontSize: 13.5, color: 'var(--ink3)' }}>Nenhuma nota encontrada.</div> : null}
      </div>
    </div>
  );
}

function NoteDetail({ detail, onClose }) {
  const { IconButton, Icon } = GL;
  const n = KIT.NOTES.find(x => x.id === detail.id);
  const o = detail.open, r = detail.rect;
  return (
    <div style={{ position: 'absolute', zIndex: 3, background: 'var(--bg)', overflow: 'hidden', border: '1px solid', borderColor: o ? 'transparent' : 'var(--line)', top: o ? 0 : r.top, left: o ? 0 : r.left, width: o ? '100%' : r.width, height: o ? '100%' : r.height, borderRadius: o ? 0 : 20, transition: ['top', 'left', 'width', 'height', 'border-radius', 'border-color'].map(p => `${p} var(--d-emph) var(--e-emph)`).join(', ') }}>
      <div style={{ width: 328, padding: '4px 22px 32px', boxSizing: 'border-box', opacity: o ? 1 : 0, transform: o ? 'translateY(0)' : 'translateY(8px)', transition: `opacity var(--d-std) var(--e-std) ${o ? 90 : 0}ms, transform var(--d-std) var(--e-std) ${o ? 90 : 0}ms`, overflowY: 'auto', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <IconButton icon="chevron-left" variant="plain" label="Voltar" onClick={onClose} style={{ marginLeft: -10 }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink3)' }}>{n.tag}</span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: '-0.035em', lineHeight: 1.08, marginTop: 10 }}>{n.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 6 }}>{n.date} · editada há 2 min</div>
        <div style={{ fontSize: 15, lineHeight: 1.6, marginTop: 18 }}>{n.body}</div>
        {n.verse ? (
          <div style={{ marginTop: 18, padding: '4px 0 4px 16px', borderLeft: '1px solid var(--accent)' }}>
            <div style={{ fontFamily: 'var(--font-read)', fontSize: 19, lineHeight: 1.5 }}>{n.verse}</div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--accent-ink)', marginTop: 6 }}>{n.verseRef}</div>
          </div>
        ) : null}
        {n.links.length ? (
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink3)', paddingBottom: 8 }}>Vínculos</div>
            {n.links.map(([ic, l], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid var(--line)', fontSize: 14.5 }}>
                <Icon name={ic} size={18} color="var(--accent-ink)" /><span style={{ flex: 1 }}>{l}</span><Icon name="chevron-right" size={16} color="var(--ink3)" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
Object.assign(window, { NotasScreen, NoteDetail });
