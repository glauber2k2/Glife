const GL = window.GlifeDesignSystem_55cfbd;

function Enter({ i = 0, base = 0, on = true, children, style }) {
  const [m, setM] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setM(true), 40); return () => clearTimeout(t); }, []);
  const v = m && on, d = base + i * 40;
  return <div style={{ opacity: v ? 1 : 0, transform: v ? 'translateY(0)' : 'translateY(var(--enter-y))', transition: `opacity var(--d-std) var(--e-std) ${d}ms, transform var(--d-std) var(--e-std) ${d}ms`, ...style }}>{children}</div>;
}

function Phone({ theme, children }) {
  return (
    <div data-theme={theme} style={{ width: 340, height: 720, flex: 'none', boxSizing: 'border-box', borderRadius: 48, border: '6px solid var(--device-bezel)', background: 'var(--bg)', color: 'var(--ink1)', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', textAlign: 'left', transition: 'background-color 300ms ease' }}>
      <div style={{ height: 36, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', fontSize: 12, fontWeight: 600, color: 'var(--ink1)' }}><span>9:41</span><span style={{ width: 20, height: 9, border: '1px solid var(--ink2)', borderRadius: 3 }}></span></div>
      {children}
    </div>
  );
}

const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const KIT = {
  MONTHS: { nov: { label: 'novembro', short: 'Nov', spent: 3184.2, budget: 4500 }, out: { label: 'outubro', short: 'Out', spent: 4212.7, budget: 4500 } },
  TASKS: [{ t: 'Pagar fatura do cartão', m: 'Vence 25/11 · R$ 1.240,00' }, { t: 'Comprar ração da Mel', m: 'Amanhã, 18:00' }, { t: 'Remarcar retorno com a Dra. Helena', m: 'Esta semana' }],
  VERSES: [
    'O Senhor é o meu pastor; nada me faltará.',
    'Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas.',
    'Refrigera a minha alma; guia-me pelas veredas da justiça, por amor do seu nome.',
    'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.',
    'Preparas uma mesa perante mim na presença dos meus inimigos, unges a minha cabeça com óleo, o meu cálice transborda.',
    'Certamente que a bondade e a misericórdia me seguirão todos os dias da minha vida; e habitarei na casa do Senhor por longos dias.'
  ],
  NOTES: [
    { id: 'n1', tag: 'Estudos', title: 'Salmo 23: anotações', date: 'Hoje, 07:12', ex: 'O pastor conduz antes de prover. No verso 4 o salmo muda de "ele" para "tu": a conversa fica pessoal.', body: 'O pastor conduz antes de prover. No verso 4 o salmo muda de "ele" para "tu": a conversa fica pessoal exatamente no vale. Vale a pena ler devagar essa virada.', verse: 'Não temeria mal algum, porque tu estás comigo.', verseRef: 'Salmos 23:4', links: [['book-open', 'Sl 23:4'], ['calendar', 'Plano de leitura']] },
    { id: 'n2', tag: 'Finanças', title: 'Lista da semana', date: 'Ontem', ex: 'Arroz, feijão, café, frutas, ração da Mel. Teto de R$ 250,00 para o mercado.', body: 'Arroz, feijão, café, frutas e ração da Mel. Teto de R$ 250,00 para o mercado; gastei R$ 186,40 no Pão de Mel.', links: [['receipt', 'R$ 186,40 · Pão de Mel'], ['image', 'Cupom fiscal']] },
    { id: 'n3', tag: 'Diário', title: 'Domingo calmo', date: '22/11', ex: 'Culto às 10h, almoço com a família. Quero manter o ritmo da semana sem correria.', body: 'Culto às 10h, almoço com a família. Quero manter o ritmo da semana sem correria e dormir antes das 23h.', links: [] },
    { id: 'n4', tag: 'Casa', title: 'Reforma do banheiro', date: '18/11', ex: 'Orçamentos: R$ 3.200,00 (Marcos) e R$ 2.850,00 (Obra Fácil). Decidir até dia 30.', body: 'Dois orçamentos: R$ 3.200,00 com o Marcos e R$ 2.850,00 com a Obra Fácil. Decidir até dia 30 e reservar o valor na conta da casa.', links: [['wallet', '2 orçamentos'], ['calendar', 'Decidir até 30/11']] },
    { id: 'n5', tag: 'Estudos', title: 'Plano de leitura · Salmos', date: '10/11', ex: 'Um salmo por dia, devocional curto à noite. Dia 12 de 30.', body: 'Um salmo por dia e um devocional curto à noite. Hoje é o dia 12 de 30.', links: [['calendar', 'Diário, 21:00']] }
  ],
  CATS: [['Mercado', 1012.4], ['Casa', 890], ['Transporte', 486.3], ['Saúde', 412], ['Lazer', 238.5], ['Outros', 145]],
  TX: [
    { id: 't1', icon: 'shopping-cart', n: 'Mercado Pão de Mel', m: 'Ontem, 19:42 · Mercado', v: '− R$ 186,40', links: [['notebook-text', 'Lista da semana'], ['image', 'Cupom fiscal'], ['credit-card', 'Crédito final 4821']] },
    { id: 't2', icon: 'car', n: 'Uber', m: 'Ontem, 08:15 · Transporte', v: '− R$ 23,90', links: [['credit-card', 'Crédito final 4821']] },
    { id: 't3', icon: 'heart-pulse', n: 'Drogaria São Paulo', m: '20/11 · Saúde', v: '− R$ 64,20', links: [['image', 'Receita'], ['calendar', 'Dentista, hoje 14:30']] },
    { id: 't4', icon: 'briefcase', n: 'Salário', m: '20/11 · Entrada', v: '+ R$ 6.800,00', inc: true, links: [['wallet', 'Conta corrente']] }
  ]
};

function genBars() {
  const gen = (seed, days, total) => { let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; const raw = Array.from({ length: days }, () => 0.2 + r() * 0.8 + (r() > 0.86 ? 1.5 : 0)); const sum = raw.reduce((a, b) => a + b, 0); return raw.map(x => x / sum * total); };
  const nov = gen(7, 22, 3184.2), out = gen(19, 31, 4212.7), max = Math.max(...nov, ...out);
  const toH = (arr) => Array.from({ length: 31 }, (_, i) => i < arr.length ? { h: 4 + arr[i] / max * 36, future: false } : { h: 2, future: true });
  return { nov: toH(nov), out: toH(out) };
}
KIT.BARS = genBars();

Object.assign(window, { GL, Enter, Phone, fmtBRL, KIT });
