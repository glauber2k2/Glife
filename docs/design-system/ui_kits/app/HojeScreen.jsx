function HojeScreen() {
  const { PageHeader, Section, Checkbox, TaskItem, SegmentedControl, AnimatedAmount, ProgressTrack, Icon } = GL;
  const [meal, setMeal] = React.useState(false);
  const [done, setDone] = React.useState({});
  const [gone, setGone] = React.useState({});
  const [month, setMonth] = React.useState('nov');
  const [devo, setDevo] = React.useState(false);
  const [grown, setGrown] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setGrown(true), 40); return () => clearTimeout(t); }, []);
  const mo = KIT.MONTHS[month], pct = Math.round(mo.spent / mo.budget * 100);
  const goneN = Object.keys(gone).length;
  const check = (i) => { if (done[i]) return; setDone(d => ({ ...d, [i]: true })); setTimeout(() => setGone(g => ({ ...g, [i]: true })), 650); };
  const strike = (on) => ({ position: 'absolute', left: 0, right: 0, top: '53%', height: 1.5, background: 'var(--ink2)', transform: on ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left center', transition: `transform var(--d-std) var(--e-std) ${on ? 80 : 0}ms` });
  return (
    <div style={{ padding: '4px 22px 32px', display: 'flex', flexDirection: 'column' }}>
      <Enter i={0}><PageHeader eyebrow="Domingo, 22 de novembro" title="Hoje" /></Enter>
      <Enter i={1}>
        <Section label="Próximo compromisso" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', marginTop: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums' }}>14:30</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div style={{ fontSize: 15, lineHeight: 1.45 }}>Dentista · Dra. Helena Prado</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>Vila Mariana · em 1 h 20 min</div>
            </div>
          </div>
        </Section>
      </Enter>
      <Enter i={2}>
        <Section label="Próxima refeição">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums' }}>16:00</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, lineHeight: 1.45, position: 'relative', alignSelf: 'flex-start', color: meal ? 'var(--ink3)' : 'var(--ink1)', transition: 'color var(--d-std) var(--e-std)' }}>Lanche da tarde<span style={strike(meal)}></span></span>
              <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>Iogurte natural e 30 g de castanhas</div>
            </div>
            <Checkbox checked={meal} onChange={setMeal} />
          </div>
        </Section>
      </Enter>
      <Enter i={3}>
        <Section label="Lembretes" padding="18px 0 8px">
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
            {KIT.TASKS.map((k, i) => <TaskItem key={i} title={k.t} meta={k.m} done={!!done[i]} collapsed={!!gone[i]} autoCollapse={false} onToggle={() => check(i)} />)}
            {goneN > 0 ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0 8px' }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{goneN === 1 ? '1 concluída' : `${goneN} concluídas`}</span>
                <button onClick={() => { setDone({}); setGone({}); }} style={{ border: 0, background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--accent-ink)', cursor: 'pointer' }}>Desfazer</button>
              </div>
            ) : null}
          </div>
        </Section>
      </Enter>
      <Enter i={4}>
        <Section label={`Gastos de ${mo.label}`} action={<SegmentedControl size="sm" options={[{ value: 'out', label: 'Out' }, { value: 'nov', label: 'Nov' }]} value={month} onChange={setMonth} />}>
          <AnimatedAmount value={mo.spent} style={{ marginTop: 12 }} />
          <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 6 }}>de {fmtBRL(mo.budget)} · {pct}% do orçamento</div>
          <ProgressTrack value={grown ? pct : 0} style={{ marginTop: 14 }} />
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 42, marginTop: 14 }}>
            {KIT.BARS[month].map((b, i) => {
              const today = month === 'nov' && i === 21;
              return <div key={i} style={{ flex: 1, height: grown ? b.h : 2, borderRadius: 3, background: b.future ? 'var(--line)' : (today ? 'var(--accent)' : 'var(--ink3)'), opacity: b.future || today ? 1 : 0.45, transition: `height var(--d-gentle) var(--e-gentle) ${i * 10}ms, background-color var(--d-std) var(--e-std)` }}></div>;
            })}
          </div>
        </Section>
      </Enter>
      <Enter i={5}>
        <Section label="Devocional do dia · 4 min" onClick={() => setDevo(!devo)} action={<span style={{ display: 'flex', color: 'var(--ink3)', transform: devo ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--d-std) var(--e-std)' }}><Icon name="chevron-down" size={16} /></span>}>
          <div style={{ fontFamily: 'var(--font-read)', fontSize: 23, fontWeight: 500, lineHeight: 1.2, marginTop: 10 }}>Descanso no meio da pressa</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-ink)', marginTop: 4 }}>Mateus 11:28–30</div>
          <div style={{ display: 'grid', gridTemplateRows: devo ? '1fr' : '0fr', opacity: devo ? 1 : 0, transition: 'grid-template-rows var(--d-emph) var(--e-emph), opacity var(--d-std) var(--e-std)' }}>
            <div style={{ overflow: 'hidden', minHeight: 0 }}><div style={{ fontFamily: 'var(--font-read)', fontSize: 18, lineHeight: 1.55, color: 'var(--ink2)', paddingTop: 10 }}>Jesus não espera a lista acabar para oferecer descanso. O convite é para quem está cansado agora, no meio da semana, com o que ainda falta fazer.</div></div>
          </div>
        </Section>
      </Enter>
    </div>
  );
}
window.HojeScreen = HojeScreen;
