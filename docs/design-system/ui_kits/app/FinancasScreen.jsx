function FinancasScreen() {
  const { PageHeader, Section, AnimatedAmount, ProgressTrack, ExpandableItem, Icon } = GL;
  const [tx, setTx] = React.useState(null);
  const [grown, setGrown] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setGrown(true), 40); return () => clearTimeout(t); }, []);
  return (
    <div style={{ padding: '4px 22px 32px', display: 'flex', flexDirection: 'column' }}>
      <Enter i={0}><PageHeader eyebrow="Novembro de 2026" title="Finanças" /></Enter>
      <Enter i={1}>
        <Section label="Gasto no mês" style={{ marginTop: 16 }}>
          <AnimatedAmount value={3184.2} style={{ marginTop: 10 }} />
          <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 6 }}>de R$ 4.500,00 · restam R$ 1.315,80</div>
          <ProgressTrack value={grown ? 71 : 0} style={{ marginTop: 14 }} />
        </Section>
      </Enter>
      <Enter i={2}>
        <Section label="Por categoria">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {KIT.CATS.map(([n, v], i) => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>{n}</span><span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink2)' }}>{fmtBRL(v)}</span></div>
                <ProgressTrack value={grown ? v : 0} max={1012.4} height={2} warnAt={101} color={i === 0 ? 'var(--accent)' : 'var(--ink3)'} delay={120 + i * 40} />
              </div>
            ))}
          </div>
        </Section>
      </Enter>
      <Enter i={3}>
        <Section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink3)' }}>Investimentos</div>
            <div style={{ fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>R$ 48.230,15</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--ok)' }}><Icon name="trending-up" size={16} />+1,2% no mês</div>
        </Section>
      </Enter>
      <Enter i={4}>
        <Section label="Recentes" padding="18px 0 0">
          {KIT.TX.map(x => <ExpandableItem key={x.id} icon={x.icon} title={x.n} meta={x.m} amount={x.v} positive={!!x.inc} links={x.links.map(([icon, label]) => ({ icon, label }))} expanded={tx === x.id} onToggle={(o) => setTx(o ? x.id : null)} />)}
        </Section>
      </Enter>
    </div>
  );
}

function BibliaScreen({ hl, setHl, active, setActive }) {
  const { PageHeader, Verse } = GL;
  return (
    <div style={{ padding: '4px 22px 150px' }}>
      <Enter i={0}><PageHeader eyebrow="Almeida · Plano de leitura, dia 12" title="Salmo 23" subtitle="Salmo de Davi" /></Enter>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16 }}>
        {KIT.VERSES.map((t, i) => (
          <Enter key={i} i={i} base={60}>
            <Verse number={i + 1} text={t} highlight={hl[i] && hl[i].on ? hl[i].c : null} active={active === i} onClick={() => setActive(i)} />
          </Enter>
        ))}
      </div>
    </div>
  );
}

function InboxSheet({ open, onClose, onCreate }) {
  const { BottomSheet, Button, Icon } = GL;
  const [text, setText] = React.useState('almoço 38,90 no Tempero da Vila e lembrar de pagar a luz dia 28');
  const [parsed, setParsed] = React.useState(false);
  React.useEffect(() => { if (!open) { const t = setTimeout(() => setParsed(false), 360); return () => clearTimeout(t); } }, [open]);
  const items = [{ icon: 'receipt', t: 'Gasto · R$ 38,90', m: 'Mercado · hoje, 12:40' }, { icon: 'calendar', t: 'Lembrete · Pagar a conta de luz', m: '28/11 às 09:00' }];
  return (
    <BottomSheet open={open} onClose={onClose} title="Caixa de entrada" subtitle="Escreva solto. A IA separa e cria os itens.">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} style={{ resize: 'none', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 14px', background: 'transparent', fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: 1.45, color: 'var(--ink1)', outline: 'none' }}></textarea>
      {!parsed ? <Button variant="secondary" icon="sparkles" fullWidth onClick={() => setParsed(true)}>Organizar</Button> : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((it, i) => (
              <Enter key={i} i={i} base={40} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                <span style={{ width: 34, height: 34, flex: 'none', boxSizing: 'border-box', borderRadius: 999, border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink2)' }}><Icon name={it.icon} size={16} /></span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}><span style={{ fontSize: 15 }}>{it.t}</span><span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{it.m}</span></div>
              </Enter>
            ))}
          </div>
          <Button fullWidth onClick={onCreate}>Criar 2 itens</Button>
        </>
      )}
    </BottomSheet>
  );
}
Object.assign(window, { FinancasScreen, BibliaScreen, InboxSheet });
