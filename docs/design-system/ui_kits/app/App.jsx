function GlifeApp({ theme = 'claro', startTab = 'hoje', startHl = false }) {
  const { TabBar, SelectionToolbar, Toast } = GL;
  const [tab, setTab] = React.useState(startTab);
  const [sheet, setSheet] = React.useState(false);
  const [toast, setToast] = React.useState({ on: false, msg: '' });
  const [detail, setDetail] = React.useState(null);
  const [hl, setHl] = React.useState(startHl ? { 3: { c: 0, on: true } } : {});
  const [active, setActive] = React.useState(null);
  const [color, setColor] = React.useState(0);
  const screenRef = React.useRef(null);
  const tt = React.useRef();
  const say = (msg) => { clearTimeout(tt.current); setToast({ on: true, msg }); tt.current = setTimeout(() => setToast(t => ({ ...t, on: false })), 2200); };
  const go = (k) => { if (k === tab) return; setTab(k); setActive(null); setDetail(null); };
  const openNote = (id, el) => {
    const r = el.getBoundingClientRect(), p = screenRef.current.getBoundingClientRect(), sc = p.width / screenRef.current.offsetWidth || 1;
    setDetail({ id, open: false, rect: { top: (r.top - p.top) / sc, left: (r.left - p.left) / sc, width: r.width / sc, height: r.height / sc } });
    setTimeout(() => setDetail(d => d ? { ...d, open: true } : d), 30);
  };
  const closeNote = () => { setDetail(d => d ? { ...d, open: false } : d); setTimeout(() => setDetail(null), 380); };
  const tapVerse = (i) => { const h = { ...hl }; if (!h[i] || !h[i].on) h[i] = { c: color, on: true }; setHl(h); setActive(i); setColor(h[i].c); };
  const pickColor = (c) => { setColor(c); if (active != null) setHl({ ...hl, [active]: { c, on: true } }); };
  const Screen = { hoje: HojeScreen, notas: NotasScreen, fin: FinancasScreen, biblia: BibliaScreen }[tab];
  return (
    <Phone theme={theme}>
      <div ref={screenRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
          <Screen key={tab} onOpen={openNote} openId={detail && detail.id} hl={hl} setHl={setHl} active={active} setActive={tapVerse} />
        </div>
        {detail ? <NoteDetail detail={detail} onClose={closeNote} /> : null}
      </div>
      <SelectionToolbar open={tab === 'biblia' && active != null} color={color} onColor={pickColor} style={{ bottom: 82 }} actions={[
        { icon: 'pencil-line', label: 'Anotar', onClick: () => { setActive(null); say(`Nota criada · Sl 23:${active + 1}`); } },
        { icon: 'copy', label: 'Copiar', onClick: () => say('Versículo copiado') },
        { icon: 'trash-2', label: 'Remover marca', onClick: () => { if (active != null && hl[active]) setHl({ ...hl, [active]: { ...hl[active], on: false } }); setActive(null); } },
        { icon: 'check', label: 'Pronto', onClick: () => setActive(null) }
      ]} />
      <Toast visible={toast.on} message={toast.msg} bottom={86} />
      <TabBar value={tab} onChange={go} onPlus={() => setSheet(true)} items={[{ key: 'hoje', label: 'Hoje', icon: 'sun' }, { key: 'notas', label: 'Notas', icon: 'notebook-text' }, { key: 'fin', label: 'Finanças', icon: 'wallet' }, { key: 'biblia', label: 'Bíblia', icon: 'book-open' }]} />
      <InboxSheet open={sheet} onClose={() => setSheet(false)} onCreate={() => { setSheet(false); say('2 itens criados'); }} />
    </Phone>
  );
}
window.GlifeApp = GlifeApp;
