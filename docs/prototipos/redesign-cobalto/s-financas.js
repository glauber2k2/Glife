'use strict';
/* Finanças: início do módulo, novo lançamento, confirmar previsto, extrato, fatura, pagar fatura, nova conta/cartão e detalhe do lançamento. */
(function () {
const { ic, mascot, esc, $, $$, motion, E, DB, brl } = G;
const GRP = 'Finanças';
DB.cartoes[0].fat = 178110; DB.cartoes[0].prev = 6180;

/* campo de dinheiro: digitar números empurra os centavos (teclado numérico do aparelho) */
G.moneyIn = (id, cents = 0, o = {}) => `<input id="${id}" class="big-amt ${o.cls || ''}" inputmode="numeric" data-money data-cents="${cents}" value="${brl(cents, 'abs')}" aria-label="${o.label || 'Valor'}" autocomplete="off">`;
document.addEventListener('input', e => {
  const t = e.target; if (!t.matches || !t.matches('[data-money]')) return;
  const digits = t.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11);
  const c = +(digits || 0); t.dataset.cents = c; t.value = brl(c, 'abs');
  t.dispatchEvent(new CustomEvent('money', { bubbles: true, detail: c }));
});
const catChips = (on = 'mercado', entrada = false) => G.chips(Object.entries(DB.cats).filter(([, c]) => !!c.entrada === entrada).map(([k, c]) => [k, c.n, c.i, c.h]), [on], { cls: 'scroll-x', on: 'catPick' });
const contaChips = (on = 'nubank', withCards = true) => G.chips(DB.contas.map(c => [c.id, c.n, c.i]).concat(withCards ? DB.cartoes.map(c => [c.id, c.n, 'credit-card']) : []), [on], { cls: 'scroll-x', on: 'contaPick' });
G.catChips = catChips; G.contaChips = contaChips;

/* ---------- Início de Finanças ---------- */
const MONTHS = { passado: 'outubro', atual: 'novembro', futuro: 'dezembro' };
const ORDER = ['passado', 'atual', 'futuro'];
const confRow = c => {
  const cat = G.cat(c.c);
  return `<div class="li hi" data-id="${c.id}" style="flex-wrap:wrap;row-gap:10px;padding:14px 0">${G.mi(cat.i, cat.h)}<span class="col grow g2"><span class="tt"><span class="st">${c.d}</span></span><span class="mm">${c.quando} · ${c.conta}</span></span><span class="amt fc self-s" data-amt style="padding-top:2px">${brl(c.v, 'auto')}</span><div class="row g8 ai-c" style="flex-basis:100%;padding-left:52px">${c.atrasado ? `<span class="tag warn">${ic('clock-alert', 12)}Atrasado</span>` : `<span class="tag ton">${ic('calendar-check', 12)}Hoje</span>`}<span class="grow"></span><button class="btn t sm" data-sheet="confirmar" data-p="id=${c.id}">Confirmar</button><button class="cbtn sm" data-sheet="previstoMenu" data-p="id=${c.id}" aria-label="Mais opções">${ic('ellipsis', 16)}</button></div></div>`;
};
const cardBlock = (c, i) => {
  const ink = i === 0;
  const st = c.sit === 'aberta' ? ['ton', 'Aberta'] : ['warn', 'Fechada'];
  return `<button class="card ${ink ? 'inkc' : ''} col g14" data-go="fatura" data-p="id=${c.id}" data-expand style="text-align:left">
    <div class="row between ai-c g10"><span class="row g10 ai-c">${ink ? `<span class="mi" style="background:rgba(255,255,255,.12);color:var(--inverse-2)">${ic('credit-card', 19)}</span>` : G.mi('credit-card', 45)}<span class="col" style="min-width:0"><span class="t-e ell" style="font-size:15px">${c.n}</span><span class="t-c" style="color:${ink ? 'var(--inverse-3)' : 'var(--fg-3)'};font-size:12.5px">${c.sit === 'aberta' ? 'Fecha ' + c.f : 'Fechou ' + c.f} · vence ${c.v}</span></span></span><span class="tag ${ink ? '' : st[0]}" style="${ink ? 'background:rgba(255,255,255,.12);color:var(--inverse-fg)' : ''}">${st[1]}</span></div>
    <div class="row between ai-e"><span style="font-size:30px;line-height:34px;font-weight:700;letter-spacing:-1.2px;color:${ink ? 'var(--inverse-2)' : 'var(--fg)'}" class="tn">${brl(c.fat)}</span><span class="btn sm ${ink ? '' : 't'}" style="${ink ? 'background:var(--inverse-fg);color:var(--inverse)' : ''}" data-sheet="pagarFatura" data-p="id=${c.id}">Pagar</span></div>
    <div class="col g6">${`<div class="bar thin" style="background:${ink ? 'rgba(255,255,255,.14)' : 'var(--track)'}"><i style="width:${(c.fat / c.lim * 100).toFixed(1)}%;background:${ink ? 'var(--inverse-2)' : 'var(--fg-2)'}"></i></div>`}<span class="t-c" style="color:${ink ? 'var(--inverse-3)' : 'var(--fg-3)'}">Disponível ${brl(c.lim - c.fat)} de ${brl(c.lim)}</span></div>
  </button>`;
};
G.budgetRow = (k, o = {}) => {
  const c = DB.cats[k]; const over = c.gasto > c.orc; const pct = c.orc ? c.gasto / c.orc * 100 : 0; const fcp = c.orc ? c.prev / c.orc * 100 : 0;
  return `<button class="col g8" data-go="categoria" data-p="c=${k}" style="padding:10px 0;width:100%;text-align:left">
    <div class="row between ai-c g10"><span class="row g10 ai-c">${G.mi(c.i, c.h, 'sm')}<span class="tt" style="font-size:15px;font-weight:500">${c.n}</span></span><span class="t-s tn"><span class="${over ? 'cbad w6' : 'w6'}">${brl(c.gasto)}</span><span class="c3"> de ${brl(c.orc)}</span></span></div>
    ${G.bar(pct, { fill: over ? 'bad' : '', fc: fcp, label: `${Math.round(pct)}% usado` })}
    ${over ? `<span class="t-c cbad">Passou ${brl(c.gasto - c.orc)} do limite</span>` : c.prev ? `<span class="t-c c3">${brl(c.prev)} previstos até o fim do mês</span>` : ''}
  </button>`;
};
const sixMonths = () => {
  const vals = [[402, 388], [455, 421], [398, 380], [470, 452], [421, 403], [310, 0, 30]];
  const max = 500, lb = ['jun', 'jul', 'ago', 'set', 'out', 'nov'];
  return `<button class="card col g12" data-go="graficos" style="text-align:left"><div class="row between ai-b"><span class="t-e">Últimos 6 meses</span><span class="t-c c3">gasto em R$ mil</span></div>
    <div class="chart" style="height:96px">${vals.map((v, i) => `<div class="cb">${v[2] ? `<i class="fc" style="height:${v[2] / max * 100}%"></i>` : ''}<i class="${i === 5 ? 'acc' : ''}" style="height:${v[0] / max * 100}%;animation-delay:${i * 40}ms"></i></div>`).join('')}</div>
    <div class="chart-x">${lb.map((l, i) => `<span class="${i === 5 ? 'ca w6' : ''}">${l}</span>`).join('')}</div></button>`;
};
G.screen('financas', {
  group: GRP, name: 'Início de Finanças', route: '/financas', hue: 160, tab: 'inicio', pad: 'g24',
  desc: 'O objetivo é planejar: mostra o que já aconteceu (realizado) e o que vai acontecer (previsto: salário, aluguel, assinaturas, faturas) e calcula o saldo esperado.',
  states: [['atual', 'Mês atual'], ['futuro', 'Mês futuro'], ['passado', 'Mês fechado'], ['primeiro', 'Primeiro uso']],
  feats: ['Topo: saldo hoje (soma das contas) e o esperado no fim do mês; o seletor de mês olha meses futuros.', 'A confirmar: previstos de hoje e atrasados, com "Confirmar" e menu (corrigir valor, pular, editar). O saldo real só muda com o confirmado.', 'Cartões com a fatura atual, a situação e "Pagar". A fatura leva o nome do mês do vencimento.', 'Orçamento: gasto × limite numa barra neutra, previsto listrado na mesma barra; vermelho só quando estoura. Compra no cartão conta no mês em que a fatura é paga.', 'Contas, planejamento (recorrentes, orçamentos, gráficos, compras, investimentos) e últimos lançamentos.', 'Uma ação principal: "Novo lançamento".'],
  motion: ['Trocar de mês: o conteúdo desliza 28 px na direção da seta e os números contam até o novo valor.', 'Confirmar um previsto: o valor passa do tom claro para o cheio e a linha recolhe; o saldo conta até o novo número.', 'Pular: o texto é riscado e a linha recolhe.', 'Barras do orçamento crescem da esquerda (800 ms).', 'Tocar num cartão: ele cresce até virar a fatura.'],
  render: (p, st) => {
    const top = G.topbar({ title: 'Finanças', right: G.cbtn('ellipsis', { sheet: 'finMais', label: 'Mais' }) });
    if (st === 'primeiro') return `${top}${G.empty('Comece por uma conta', 'Adicione a conta corrente ou o cartão que você mais usa. Com ela eu mostro saldo, previsão e orçamento.', 'Adicionar conta', { go: 'nova-conta', mood: 'feliz' })}<div class="grp rv">${G.li({ icon: 'repeat', h: 160, t: 'Depois: salário e contas fixas', m: 'Viram previstos todo mês', noChev: true, tag: 'div' })}${G.li({ icon: 'chart-pie', h: 160, t: 'Depois: orçamento por categoria', m: 'Avisa quando estourar', noChev: true, tag: 'div' })}</div>`;
    const mi = ORDER.indexOf(st), dir = p.dir || '';
    const saldo = 1452887, esperado = st === 'futuro' ? 1447997 : 1498907;
    const mes = `<div class="monthsel"><button data-act="finMonth" data-v="-1" aria-label="Mês anterior" ${mi === 0 ? 'disabled style="opacity:.3"' : ''}>${ic('chevron-left', 18)}</button><span>${MONTHS[st]}</span><button data-act="finMonth" data-v="1" aria-label="Próximo mês" ${mi === 2 ? 'disabled style="opacity:.3"' : ''}>${ic('chevron-right', 18)}</button></div>`;
    const hero = st === 'passado'
      ? `<div class="col g6"><span class="t-s c3">Resultado de outubro</span><span class="t-big">${G.count(62340, 'auto')}</span><div class="kv" style="margin-top:6px"><div><span class="k">Entradas</span><span class="v cok">${brl(536120)}</span></div><div><span class="k">Saídas</span><span class="v">${brl(473780)}</span></div><div><span class="k">Orçamento</span><span class="v">94%</span></div></div></div>`
      : `<div class="col g6"><span class="t-s c3">${st === 'futuro' ? 'Esperado em 31/12' : 'Saldo hoje'}</span><span class="t-big" id="saldoHoje">${G.count(st === 'futuro' ? esperado : saldo)}</span>
         ${st === 'futuro' ? `<span class="tag lg self-s">${ic('calendar-clock', 14)}Só previstos: nada aconteceu ainda</span>` : `<button class="tag lg ok self-s" data-go="graficos" style="height:30px">${ic('trending-up', 14)}Esperado em 30/11: <span id="esperado" class="tn">${brl(esperado)}</span></button>`}</div>`;
    const anim = dir ? (dir === '1' ? 'slide-r' : 'slide-l') : '';
    let blocks = '';
    if (st === 'atual') blocks = `
      <section class="col g12 rv">${G.sec('A confirmar', '')}<div class="grp" id="aconf">${DB.aConfirmar.map(confRow).join('')}</div></section>
      <section class="col g12 rv">${G.sec('Próximos', 'Recorrentes', { go: 'recorrentes' })}<div class="grp">${DB.proximos.map(x => G.li({ lead: `<span class="mi neutral col" style="gap:0;font-size:11px;font-weight:600;line-height:13px"><span class="tn">${x.dia.slice(0, 2)}</span><span class="c3" style="font-weight:500">nov</span></span>`, t: x.d, m: `${x.rec ? 'Todo mês · ' : ''}${x.conta}`, end: `<span class="end">${G.amt(x.v, { fc: true })}</span>`, go: x.inv ? 'ativo' : 'recorrente', p: x.inv ? 'id=selic' : '' })).join('')}</div></section>`;
    if (st === 'futuro') blocks = `
      <section class="col g12 rv">${G.sec('Previstos em dezembro', 'Recorrentes', { go: 'recorrentes' })}<div class="grp">${[['02', 'Fatura Itaú Click', 'Transferência · Itaú', -127640, 'credit-card', 45], ['05', 'Salário', 'Todo mês · Nubank', 500000, 'briefcase', 160], ['05', 'Aluguel', 'Todo mês · Nubank', -165000, 'house', 80], ['10', 'Fatura Nubank Ultravioleta', 'Transferência · Nubank', -184290, 'credit-card', 290], ['15', 'Internet Vivo Fibra', 'Todo mês · Nubank', -11990, 'wifi', 80], ['20', '13º salário (2ª parcela)', 'Agendado · Nubank', 250000, 'briefcase', 160]].map(([d, t, m, v, i, h]) => G.li({ lead: `<span class="mi neutral col" style="gap:0;font-size:11px;font-weight:600;line-height:13px"><span class="tn">${d}</span><span class="c3" style="font-weight:500">dez</span></span>`, t, m, end: `<span class="end">${G.amt(v, { fc: true })}</span>`, go: 'recorrente' })).join('')}</div></section>`;
    const cards = st === 'passado' ? '' : `<section class="col g12 rv">${G.sec('Cartões', 'Faturas', { go: 'fatura', p: 'id=nucard' })}${DB.cartoes.map(cardBlock).join('')}</section>`;
    const orc = `<section class="col g12 rv">${G.sec(st === 'futuro' ? 'Orçamento de dezembro' : 'Orçamento do mês', 'Ver todos', { go: 'orcamentos' })}<div class="grp">${st === 'futuro' ? ['casa', 'mercado', 'assinaturas'].map(k => { const c = DB.cats[k]; const fc = k === 'casa' ? 177000 : k === 'assinaturas' ? 9970 : 0; return `<div class="col g8" style="padding:10px 0"><div class="row between g10"><span class="row g10 ai-c">${G.mi(c.i, c.h, 'sm')}<span style="font-size:15px;font-weight:500">${c.n}</span></span><span class="t-s c3 tn">${brl(fc)} previstos de ${brl(c.orc)}</span></div>${G.bar(0, { fc: fc / c.orc * 100 })}</div>`; }).join('') : ['restaurantes', 'mercado', 'transporte', 'casa'].map(k => G.budgetRow(k)).join('')}</div></section>`;
    const contas = `<section class="col g12 rv">${G.sec('Contas', 'Nova conta', { go: 'nova-conta' })}<div class="grp">${DB.contas.map(c => G.li({ icon: c.i, h: c.h, t: c.n, m: c.t, go: 'conta', p: 'id=' + c.id, end: `<span class="amt none">${brl(c.s)}</span>` })).join('')}</div></section>`;
    const plan = `<section class="col g12 rv">${G.sec('Planejamento')}<div class="grp">${G.li({ icon: 'repeat', h: 160, t: 'Recorrentes', m: '9 ativas · próximas em 28/11', go: 'recorrentes' })}${G.li({ icon: 'chart-pie', h: 160, t: 'Orçamentos', m: '7 categorias · 1 estourada', go: 'orcamentos' })}${G.li({ icon: 'chart-column', h: 160, t: 'Gráficos', m: 'Entradas, saídas e patrimônio', go: 'graficos' })}${G.li({ icon: 'shopping-basket', h: 55, t: 'Compras', m: '3 listas · 12 itens', go: 'compras' })}${G.li({ icon: 'trending-up', h: 205, t: 'Investimentos', m: `Patrimônio ${brl(4832015)}`, go: 'investimentos' })}</div></section>`;
    const ult = `<section class="col g12 rv">${G.sec('Últimos lançamentos', 'Extrato', { go: 'conta', p: 'id=nubank' })}<div class="grp">${DB.lanc.slice(0, 5).map(t => G.txRow(t)).join('')}</div></section>`;
    return `${top}${mes}<div class="col g24 ${anim}">${hero}${blocks}${cards}${orc}${st === 'atual' ? `<section class="col rv">${sixMonths()}</section>` : ''}${st === 'atual' ? contas + plan + ult : st === 'passado' ? plan : ''}</div>`;
  },
  fixed: (p, st) => st === 'primeiro' ? '' : `<button class="btn p xfab" data-sheet="lancamento" style="position:absolute;right:20px;bottom:30px;z-index:15">${ic('plus', 20)}Novo lançamento</button>`
});
G.act('finMonth', t => { const c = G.cur(); const st = c.p.st || 'atual'; const i = ORDER.indexOf(st) + (+t.dataset.v); if (i < 0 || i > 2) return; G.rerender({ st: ORDER[i], dir: t.dataset.v }, 'none'); });
G.sheet('finMais', {
  title: 'Finanças',
  render: () => `<div class="col">${[['wallet', 'Nova conta ou cartão', 'nova-conta'], ['repeat', 'Recorrentes', 'recorrentes'], ['chart-pie', 'Orçamentos', 'orcamentos'], ['chart-column', 'Gráficos', 'graficos'], ['shopping-basket', 'Compras', 'compras'], ['trending-up', 'Investimentos', 'investimentos'], ['file-spreadsheet', 'Exportar CSV', '']].map(([i, t, g]) => G.li(g ? { lead: `<span class="mi neutral sm">${ic(i, 17)}</span>`, t, go: g } : { lead: `<span class="mi neutral sm">${ic(i, 17)}</span>`, t, act: 'closeThen', p: 'msg=CSV de novembro pronto;icon=file-down' })).join('')}</div>`
});

/* ---------- Confirmar previsto ---------- */
G.sheet('confirmar', {
  title: 'Confirmar',
  render: p => { const c = DB.aConfirmar.find(x => x.id === p.id) || DB.aConfirmar[1]; const cat = G.cat(c.c);
    return `<div class="row g12 ai-c">${G.mi(cat.i, cat.h)}<div class="col"><span class="t-e">${c.d}</span><span class="t-s c3">${c.quando} · ${brl(c.v, 'abs')}</span></div></div>
      <div class="col g4 ai-c" style="padding:8px 0">${G.moneyIn('cfVal', Math.abs(c.v), { cls: c.v > 0 ? 'pos' : '', label: 'Valor confirmado' })}<span class="t-c c3">Veio diferente? Corrija aqui. A recorrência não muda.</span></div>
      <div class="field"><span class="fl">Data</span>${G.chips([['hoje', 'Hoje, 26/11'], ['prev', c.atrasado ? 'No vencimento, 24/11' : 'Ontem'], ['outra', 'Outra data']], ['hoje'])}</div>
      <div class="field"><span class="fl">Conta</span>${contaChips('nubank', false)}</div>`; },
  foot: p => `<button class="btn g" data-act="skipPrev" data-p="id=${p.id || 'freela'}" style="background:var(--bg)">Pular este mês</button><button class="btn p" data-act="confirmPrev" data-p="id=${p.id || 'freela'}">Confirmar</button>`
});
G.act('confirmPrev', (t, p) => {
  const c = DB.aConfirmar.find(x => x.id === p.id) || DB.aConfirmar[1];
  const inp = $('#cfVal'); const val = inp ? +inp.dataset.cents * (c.v < 0 ? -1 : 1) : c.v;
  G.closeSheet().then(() => {
    const row = $(`#aconf [data-id="${p.id}"]`);
    if (row) { const a = $('[data-amt]', row); a.textContent = brl(val, 'auto'); a.classList.remove('fc'); a.classList.toggle('in', val > 0); motion(a, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], 380, E.spring); setTimeout(() => G.collapse(row), G.D(420)); }
    const s = $('#saldoHoje [data-count]'); if (s) setTimeout(() => G.recount(s, +s.dataset.count + val), G.D(300));
    G.toast(`${esc(c.d.split(' · ')[0])} confirmado · ${brl(val, 'auto')}`, { icon: 'check', undo: () => { if (row) G.uncollapse(row); if (s) G.recount(s, +s.dataset.count - val); } });
  });
});
G.act('skipPrev', (t, p) => {
  G.closeSheet().then(() => {
    const row = $(`#aconf [data-id="${p.id}"]`); if (!row) return;
    row.classList.add('done'); setTimeout(() => G.collapse(row), G.D(420));
    G.toast('Pulado neste mês', { icon: 'skip-forward', undo: () => { row.classList.remove('done'); G.uncollapse(row); } });
  });
});
G.sheet('previstoMenu', {
  title: p => (DB.aConfirmar.find(x => x.id === p.id) || DB.aConfirmar[0]).d,
  render: p => `<div class="col">${G.li({ lead: `<span class="mi neutral sm">${ic('pencil', 17)}</span>`, t: 'Corrigir valor e confirmar', sheet: 'confirmar', p: 'id=' + p.id })}${G.li({ lead: `<span class="mi neutral sm">${ic('skip-forward', 17)}</span>`, t: 'Pular este mês', m: 'Os próximos meses continuam', act: 'skipPrev', p: 'id=' + p.id })}${G.li({ lead: `<span class="mi neutral sm">${ic('repeat', 17)}</span>`, t: 'Editar recorrência', m: 'Vale deste mês em diante', go: 'recorrente' })}${G.li({ lead: `<span class="mi neutral sm">${ic('list', 17)}</span>`, t: 'Ver no extrato', go: 'conta', p: 'id=nubank' })}</div>`
});

/* ---------- Novo lançamento ---------- */
G.sheet('lancamento', {
  title: 'Novo lançamento', cls: 'full',
  render: p => `${G.seg([['gasto', 'Gasto'], ['receita', 'Receita'], ['transf', 'Transferência']], 0, { panes: 'lanc', on: 'lancType' })}
    <div class="col g4 ai-c" style="padding:6px 0 2px">${G.moneyIn('lcVal', +(p.v || 0), { label: 'Valor do lançamento' })}<span class="t-c c3" id="lcHint">Digite só os números: 8750 vira R$ 87,50</span></div>
    ${G.field('Descrição', { id: 'lcDesc', v: p.d || '', ph: 'Ex.: Atacadão' })}
    <div data-pane-of="lanc" class="col g18" style="gap:18px">
      <div class="field"><span class="fl">Categoria</span>${catChips('mercado')}</div>
      <div class="field"><span class="fl">Conta ou cartão</span>${contaChips('nucard')}</div>
      <div class="col g12" id="parcBox" style="background:var(--bg);border-radius:18px;padding:14px">
        <div class="row between ai-c"><span class="t-e" style="font-size:15px">Parcelar</span><span class="t-s c3" id="parcVal">1× de R$ 0,00</span></div>
        <div class="chips scroll-x" data-mode="single" data-on="parcPick" style="margin:0 -14px;padding:0 14px">${[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => `<button class="chip ${n === 1 ? 'on' : ''}" data-act="chip" data-v="${n}" style="background:var(--card)">${n}×</button>`).join('')}</div>
        <span class="hint">${ic('calendar-clock', 16)}<span id="parcHint">Cai na fatura de dezembro (fecha 03/12). Conta no orçamento de dezembro, quando a fatura for paga.</span></span>
      </div>
    </div>
    <div data-pane-of="lanc" hidden class="col" style="gap:18px"><div class="field"><span class="fl">Categoria</span>${catChips('salario', true)}</div><div class="field"><span class="fl">Entra em</span>${contaChips('nubank', false)}</div></div>
    <div data-pane-of="lanc" hidden class="col" style="gap:18px"><div class="field"><span class="fl">De</span>${contaChips('nubank', false)}</div><div class="field"><span class="fl">Para</span>${G.chips(DB.contas.map(c => [c.id, c.n, c.i]).concat(DB.cartoes.map(c => [c.id, 'Fatura ' + c.n, 'credit-card'])), ['poup'], { cls: 'scroll-x' })}</div><span class="alert info">${ic('info', 18)}<span>Transferência não é gasto nem receita: não entra no orçamento. Pagar a fatura é uma transferência para o cartão.</span></span></div>
    <div class="field"><span class="fl">Data</span>${G.chips([['hoje', 'Hoje'], ['ontem', 'Ontem'], ['outra', `${ic('calendar', 15)}Outra`]], ['hoje'])}</div>
    <div class="col" style="gap:0">
      <div class="li" style="min-height:56px"><span class="col grow g2"><span class="tt">É previsto</span><span class="mm" style="white-space:normal">Agendado: espera você confirmar no dia</span></span>${G.sw(false, { label: 'É previsto' })}</div>
      <div class="li" style="min-height:56px"><span class="col grow g2"><span class="tt">Repetir</span><span class="mm">Salário, aluguel, assinaturas</span></span>${G.sw(false, { label: 'Repetir', on: 'repeatSw' })}</div>
      <div class="col g12" id="repBox" hidden style="padding:4px 0 8px">${G.seg(['Semanal', 'Mensal', 'Anual', 'A cada N'], 1)}<div class="f2">${G.select('Começa', '26/11/2026', { act: 'noop', chev: 'calendar' })}${G.select('Termina', 'Nunca', { act: 'noop' })}</div></div>
    </div>
    <div class="alert neutral" id="lcBudget" style="background:var(--bg)">${ic('chart-pie', 18)}<span>Mercado: ${brl(61240)} de ${brl(80000)} em novembro.</span></div>`,
  foot: () => `<button class="btn p" data-act="saveLanc">Salvar lançamento</button>`,
  mount: sh => {
    const val = $('#lcVal', sh);
    const upd = () => { const c = +val.dataset.cents; const n = +($('[data-on="parcPick"] .chip.on', sh) || { dataset: { v: 1 } }).dataset.v; $('#parcVal', sh).textContent = `${n}× de ${brl(Math.round(c / n))}`; $('#lcBudget span', sh).innerHTML = `Mercado: ${brl(61240)} de ${brl(80000)} → <b>${brl(61240 + c)}</b> depois deste`; };
    sh.addEventListener('money', upd); upd();
    setTimeout(() => { try { val.focus({ preventScroll: true }); } catch (e) { /* foco opcional */ } }, 420);
  }
});
G.act('lancType', (t, v) => { const val = $('#lcVal'); if (val) { val.classList.toggle('pos', v === 'receita'); } });
G.act('contaPick', (t, v) => { const box = $('#parcBox'); if (box) { const isCard = v.includes('card'); box.hidden = !isCard; if (isCard) motion(box, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], 280, E.enter); } });
G.act('parcPick', (t, v) => { const sh = t.closest('.sheet'); sh.dispatchEvent(new CustomEvent('money', { bubbles: true })); const h = $('#parcHint'); if (h) h.textContent = +v > 1 ? `1ª parcela na fatura de dezembro, a última em ${['', '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', '', 'julho', '', 'setembro', '', 'novembro'][+v] || 'dezembro'} de 2027. Cada parcela conta no mês em que a fatura é paga.` : 'Cai na fatura de dezembro (fecha 03/12). Conta no orçamento de dezembro, quando a fatura for paga.'; });
G.act('catPick', (t, v) => { const b = $('#lcBudget span'); const c = DB.cats[v]; if (b && c && c.orc) b.innerHTML = `${c.n}: ${brl(c.gasto)} de ${brl(c.orc)} em novembro.`; else if (b && c) b.textContent = `${c.n}: sem orçamento definido.`; });
G.act('repeatSw', (t, on) => { const r = $('#repBox'); r.hidden = !on; if (on) { G.paint(); motion(r, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], 280, E.enter); } });
G.act('saveLanc', () => { const v = $('#lcVal'); const c = v ? +v.dataset.cents : 0; if (!c) { G.shake(v); v.focus(); return; } const d = ($('#lcDesc') || {}).value || 'Lançamento'; G.closeSheet().then(() => G.toast(`${esc(d)} · ${brl(-c, 'auto')} salvo`, { icon: 'check', undo: () => G.toast('Lançamento desfeito', { icon: 'undo-2' }) })); });

/* ---------- Extrato da conta ---------- */
G.screen('conta', {
  group: GRP, name: 'Extrato da conta', route: '/financas/conta/[id]', hue: 160, tab: 'inicio', parent: 'financas', pad: 'g20',
  desc: 'Saldo real e projetado no topo; lançamentos por dia, com realizados e previstos no mesmo fio. Previsto em tom mais claro, atrasado marcado.',
  states: [['normal', 'Mês inteiro'], ['filtro', 'Filtrado por categoria'], ['vazio', 'Sem lançamentos']],
  feats: ['Busca e filtro por categoria em chips.', 'Previstos do mês aparecem no topo ("Ainda neste mês"), com o ícone de recorrente.', 'Tocar num lançamento abre o detalhe, com vínculos e comprovante.'],
  motion: ['Filtro: a lista esmaece e as linhas sobem em cascata.', 'O saldo projetado conta até o valor ao abrir.'],
  render: (p, st) => {
    const c = DB.contas.find(x => x.id === p.id) || DB.contas[0];
    const head = `${G.topbar({ title: c.n, sub: c.t, right: G.cbtn('pencil', { go: 'nova-conta', label: 'Editar conta' }) })}
      <div class="card col g14 rv"><div class="kv" style="grid-template-columns:1fr 1fr"><div><span class="k">Saldo hoje</span><span class="v" style="font-size:24px;line-height:30px;font-weight:700;letter-spacing:-.6px">${G.count(c.s)}</span></div><div><span class="k">Esperado em 30/11</span><span class="v" style="font-size:24px;line-height:30px;font-weight:700;letter-spacing:-.6px;color:var(--fg-3)">${G.count(c.s + 46030)}</span></div></div>${G.bar(100, { cls: 'thin', fill: 'acc' })}<span class="t-c c3">+ ${brl(120000)} a confirmar · − ${brl(73990)} previstos</span></div>`;
    if (st === 'vazio') return head + `<div class="card col ai-c g8 rv" style="text-align:center;padding:28px"><span class="t-e">Nada nesta conta ainda</span><span class="t-s c3">Os lançamentos aparecem aqui por dia.</span><button class="btn t md" data-sheet="lancamento">Novo lançamento</button></div>`;
    const filt = st === 'filtro';
    const day = (label, rows) => `<section class="col g8 rv"><span class="lbl">${label}</span><div class="grp">${rows}</div></section>`;
    return `${head}<label class="search rv" for="exQ">${ic('search', 20)}<input id="exQ" placeholder="Buscar no extrato" value="${filt ? '' : ''}"></label>
      ${G.chips([['todas', 'Todas'], ['mercado', 'Mercado', 'shopping-cart'], ['casa', 'Casa', 'house'], ['saude', 'Saúde', 'heart-pulse'], ['transporte', 'Transporte', 'car']], [filt ? 'mercado' : 'todas'], { cls: 'scroll-x rv', on: 'exFilter' })}
      <div class="col g20" id="exList">${filt ? day('Mercado em novembro · − R$ 612,40', DB.lanc.filter(t => t.c === 'mercado').map(t => G.txRow(t)).join('') + G.txRow({ id: 'x', dia: '15/11', d: 'Sacolão Bom Preço', c: 'mercado', v: -8930, conta: 'Nubank' })) :
      day('Ainda neste mês', [G.txRow({ id: 'p1', dia: '30/11', d: 'Academia Smart Fit', c: 'saude', v: -11990, conta: 'Nubank' }, { fc: true, m: '30/11 · previsto · todo mês', endSub: `<span class="c4 row">${ic('repeat', 14)}</span>` }), G.txRow({ id: 'p2', dia: '30/11', d: 'Aporte Tesouro Selic', c: null, v: -50000, conta: 'Nubank' }, { fc: true, m: '30/11 · previsto · investimento' })].join('')) +
      day('Hoje · quinta, 26', G.txRow(DB.lanc[0]) + G.txRow({ id: 'p3', d: 'Freela · Clínica Sorriso', c: 'freela', v: 120000, conta: 'Nubank' }, { fc: true, m: 'Previsto para hoje · a confirmar' })) +
      day('Terça, 24', G.txRow({ id: 'p4', d: 'Internet Vivo Fibra', c: 'casa', v: -11990, conta: 'Nubank' }, { fc: true, m: 'Atrasado · venceu 24/11', endSub: '<span class="tag warn" style="height:18px;font-size:10.5px">Atrasado</span>' })) +
      day('Domingo, 22', G.txRow(DB.lanc[4])) +
      day('Sexta, 20', G.txRow({ id: 'p5', d: 'Pix para Bia', c: 'presentes', v: -15000, conta: 'Nubank' }) + G.txRow({ id: 'p6', d: 'Aluguel', c: 'casa', v: -165000, conta: 'Nubank' }, { endSub: `<span class="c4 row">${ic('repeat', 14)}</span>` }))}</div>`;
  },
  fixed: () => `<button class="btn p xfab" data-sheet="lancamento" style="position:absolute;right:20px;bottom:30px;z-index:15">${ic('plus', 20)}Lançamento</button>`
});
G.act('exFilter', (t, v) => G.rerender(Object.assign({}, G.cur().p, { st: v === 'todas' ? 'normal' : 'filtro' })));

/* ---------- Fatura do cartão ---------- */
const FAT = [
  ['25/11', 'Atacadão', 'mercado', -31860], ['24/11', 'Decathlon', 'lazer', -21930], ['24/11', 'Geladeira Brastemp', 'casa', -38990, '4/10'], ['23/11', 'Restaurante Coco Bambu', 'restaurantes', -18640], ['22/11', 'Posto Ipiranga', 'transporte', -21000],
  ['20/11', 'Estorno · Amazon', 'lazer', 7990], ['19/11', 'Mercado Livre · fone', 'lazer', -19990, '2/3'], ['18/11', 'Amazon · livros', 'educacao', -12990], ['15/11', 'iFood', 'restaurantes', -6490], ['12/11', 'Cinemark', 'lazer', -7200], ['10/11', 'Drogasil', 'saude', -4580], ['08/11', 'Uber', 'transporte', -2430]
];
G.screen('fatura', {
  group: GRP, name: 'Fatura do cartão', route: '/financas/fatura/[id]', hue: 160, tab: 'inicio', parent: 'financas', pad: 'g20',
  desc: 'O cartão funciona como cartão: compra até o fechamento cai na fatura do mês; no dia do fechamento ou depois, na seguinte. A fatura leva o nome do mês do vencimento.',
  states: [['aberta', 'Aberta'], ['fechada', 'Fechada'], ['parcial', 'Paga em parte'], ['paga', 'Paga'], ['vencida', 'Vencida']],
  feats: ['Cabeçalho: total, pago, restante, fechamento, vencimento e a situação.', 'Compras e estornos da fatura; parcelas com "4/10".', 'Previstos do cartão (assinaturas) em tom de previsto, somados à parte.', '"Pagar fatura" abre a folha com o valor sugerido = restante; aceita pagamento parcial.', 'Seletor de fatura por mês (‹ dez ›).'],
  motion: ['Chega crescendo a partir do cartão em Finanças (500 ms) e volta deslizando.', 'Pagar: o restante conta até zero e a etiqueta troca para "Paga" com mola.'],
  render: (p, st) => {
    const c = DB.cartoes.find(x => x.id === p.id) || DB.cartoes[0];
    const total = 178110;
    const pago = st === 'parcial' ? 100000 : st === 'paga' ? total + 6180 : 0;
    const rest = Math.max(0, total + 6180 - pago);
    const tag = { aberta: ['', 'Aberta · fecha 03/12'], fechada: ['', 'Fechada · vence em 14 dias'], parcial: ['', 'Paga em parte'], paga: ['', 'Paga em 08/12'], vencida: ['', 'Vencida há 2 dias'] }[st];
    const tagStyle = st === 'vencida' ? 'background:var(--bad-soft);color:var(--bad)' : st === 'paga' ? 'background:var(--ok-soft);color:var(--ok)' : 'background:rgba(255,255,255,.14);color:var(--inverse-fg)';
    return `${G.topbar({ title: c.n, sub: `Fecha dia ${c.fecha} · vence dia ${c.vence}`, right: G.cbtn('settings-2', { go: 'nova-conta', p: 'st=cartao', label: 'Ajustar cartão' }) })}
      <div class="monthsel self-c"><button data-act="noop" aria-label="Fatura anterior">${ic('chevron-left', 18)}</button><span>dezembro</span><button data-act="noop" aria-label="Próxima fatura">${ic('chevron-right', 18)}</button></div>
      <div class="card inkc col g16 rv">
        <div class="row between ai-c"><span class="t-s" style="color:var(--inverse-3)">Fatura de dezembro · vence 10/12</span><span class="tag" id="fatTag" style="${tagStyle}">${tag[1]}</span></div>
        <span style="font-size:40px;line-height:44px;font-weight:700;letter-spacing:-1.6px;color:var(--inverse-2)" class="tn" id="fatRest">${G.count(st === 'paga' ? 0 : rest)}</span>
        <div class="kv"><div><span class="k">Total</span><span class="v">${brl(total + 6180)}</span></div><div><span class="k">Pago</span><span class="v">${brl(pago)}</span></div><div><span class="k">Previsto</span><span class="v">${brl(6180)}</span></div></div>
        <div class="col g6"><div class="bar thin" style="background:rgba(255,255,255,.14)"><i style="width:${(pago / (total + 6180) * 100).toFixed(1)}%;background:var(--inverse-2)"></i></div><span class="t-c" style="color:var(--inverse-3)">${st === 'paga' ? 'Tudo pago' : `${brl(rest)} restantes`} · limite disponível ${brl(c.lim - total)}</span></div>
      </div>
      ${st === 'vencida' ? `<div class="alert bad rv">${ic('triangle-alert', 18)}<span><b>Venceu em 10/12.</b> Pague o restante para o banco não cobrar juros. O Glife não calcula os juros do banco.</span></div>` : ''}
      ${st === 'aberta' ? `<div class="alert info rv">${ic('info', 18)}<span>Compras até 02/12 entram aqui. A partir de 03/12, vão para a fatura de janeiro.</span></div>` : ''}
      ${st !== 'paga' ? `<button class="btn p b rv" data-sheet="pagarFatura" data-p="id=${c.id};st=${st}">${st === 'parcial' ? 'Pagar o restante' : 'Pagar fatura'}</button>` : ''}
      <section class="col g10 rv"><span class="lbl">Previstos neste cartão</span><div class="grp">${G.txRow({ id: 'f1', dia: '28/11', d: 'Spotify Família', c: 'assinaturas', v: -2190, conta: '' }, { fc: true, m: '28/11 · todo mês', endSub: `<span class="c4 row">${ic('repeat', 14)}</span>` })}${G.txRow({ id: 'f2', dia: '01/12', d: 'Netflix', c: 'assinaturas', v: -3990, conta: '' }, { fc: true, m: '01/12 · todo mês', endSub: `<span class="c4 row">${ic('repeat', 14)}</span>` })}</div></section>
      <section class="col g10 rv"><span class="lbl">Compras e estornos · ${FAT.length}</span><div class="grp">${FAT.map(([d, n, cat, v, parc]) => G.txRow({ id: 't2', d: n, c: cat, v, conta: '' }, { m: `${d} · ${G.cat(cat).n}${parc ? '' : ''}`, endSub: parc ? `<span class="tag out" style="height:18px;font-size:10.5px">${parc}</span>` : '' })).join('')}</div></section>`;
  }
});
G.sheet('pagarFatura', {
  title: 'Pagar fatura',
  render: p => { const c = DB.cartoes.find(x => x.id === p.id) || DB.cartoes[0]; const rest = p.st === 'parcial' ? 84290 : (c.id === 'nucard' ? 184290 : c.fat);
    return `<div class="col g4 ai-c">${G.moneyIn('pfVal', rest, { label: 'Valor do pagamento' })}<span class="t-c c3">Sugerido: o restante da fatura de dezembro. Pode pagar menos.</span></div>
      <div class="field"><span class="fl">Pagar com</span><div class="col" data-radios>${DB.contas.slice(0, 2).map((a, i) => `<button class="li hi ${i === 0 ? 'on' : ''}" data-act="radio">${G.mi(a.i, a.h, 'sm')}<span class="col grow g2"><span class="tt">${a.n}</span><span class="mm">Saldo ${brl(a.s)}</span></span><span class="radio"></span></button>`).join('')}</div></div>
      <div class="field"><span class="fl">Data</span>${G.chips([['hoje', 'Hoje'], ['venc', 'No vencimento, 10/12'], ['outra', 'Outra']], ['hoje'])}</div>
      <div class="alert info">${ic('arrow-left-right', 18)}<span>É uma transferência da conta para o cartão: não entra no orçamento. As compras desta fatura contam em dezembro, o mês do pagamento.</span></div>`; },
  foot: () => `<button class="btn p" data-act="payInvoice">Pagar</button>`,
  mount: sh => { const v = $('#pfVal', sh), b = $('[data-act="payInvoice"]'); const u = () => { b.textContent = 'Pagar ' + brl(+v.dataset.cents, 'abs'); }; sh.addEventListener('money', u); u(); }
});
G.act('payInvoice', () => {
  const v = $('#pfVal'); const c = +v.dataset.cents;
  G.closeSheet().then(() => {
    const r = $('#fatRest [data-count]'); const tag = $('#fatTag');
    if (r) { const left = Math.max(0, +r.dataset.count - c); G.recount(r, left); if (tag) { setTimeout(() => { tag.textContent = left ? 'Paga em parte' : 'Paga hoje'; tag.style.cssText = left ? 'background:var(--warn-soft);color:var(--warn)' : 'background:var(--ok-soft);color:var(--ok)'; motion(tag, [{ transform: 'scale(.8)' }, { transform: 'none' }], 380, E.spring); }, G.D(500)); } }
    G.toast(`Pagamento de ${brl(c, 'abs')} registrado`, { icon: 'check', undo: () => G.setState(G.cur().p.st || 'aberta') });
  });
});

/* ---------- Nova conta / novo cartão ---------- */
G.screen('nova-conta', {
  group: GRP, name: 'Nova conta ou cartão', route: '/financas/nova-conta', hue: 160, tab: 'inicio', parent: 'financas', pad: 'cta g20',
  desc: 'Conta corrente, poupança, carteira ou cartão de crédito. Para cartão, pergunta se ele já está em uso: dá para trazer a fatura aberta e os parcelamentos em andamento, ou começar do zero.',
  states: [['conta', 'Conta'], ['cartao', 'Cartão'], ['emuso', 'Cartão já em uso'], ['zero', 'Começar do zero']],
  feats: ['Conta: nome e saldo inicial.', 'Cartão: nome, dia de fechamento, dia de vencimento, limite (opcional) e a conta que paga a fatura.', 'Explica a regra do fechamento com as datas reais do cartão.', 'Trazer o que já existe: valor da fatura em aberto + parcelamentos (descrição, valor da parcela, "parcela 4 de 10"), com "Adicionar outro".'],
  motion: ['Trocar o tipo: os campos de cartão entram deslizando de cima, os de conta recolhem.', 'Escolher "em uso" ou "do zero" troca a área de baixo com esmaecer cruzado.'],
  render: (p, st) => {
    const type = st === 'conta' ? 'corrente' : 'cartao';
    const types = `<div class="f2" data-radios data-on="acctType">${[['corrente', 'Conta corrente', 'landmark'], ['poup', 'Poupança', 'piggy-bank'], ['carteira', 'Carteira', 'wallet'], ['cartao', 'Cartão de crédito', 'credit-card']].map(([k, l, i]) => `<button class="card tight row g10 ai-c ${k === type ? 'on' : ''}" data-act="radio" data-v="${k}" style="border-radius:18px;${k === type ? 'box-shadow:inset 0 0 0 2px var(--accent)' : ''}">${G.mi(i, 160, 'sm')}<span class="t-s w5 grow">${l}</span></button>`).join('')}</div>`;
    const contaF = `<div class="col g14">${G.field('Nome', { v: 'Inter', ph: 'Ex.: Nubank' })}<div class="field"><span class="fl">Saldo de hoje</span><div class="card tight">${G.moneyIn('ncSaldo', 250000, { label: 'Saldo inicial' })}</div></div><span class="hint">${ic('info', 16)}<span>Use o saldo que o app do banco mostra hoje. Dá para corrigir depois.</span></span></div>`;
    const cardF = `<div class="col g14">${G.field('Nome do cartão', { v: 'Nubank Ultravioleta' })}<div class="f2">${G.field('Fecha no dia', { v: '3', mode: 'numeric' })}${G.field('Vence no dia', { v: '10', mode: 'numeric' })}</div>${G.field('Limite (opcional)', { v: 'R$ 6.000,00', mode: 'numeric' })}<div class="field"><span class="fl">Conta que paga a fatura</span>${contaChips('nubank', false)}</div><div class="alert info">${ic('calendar-clock', 18)}<span>Compra até o dia 2 cai na fatura do mês. Do dia 3 em diante, na fatura seguinte.</span></div></div>`;
    const uso = `<section class="col g12"><span class="t-3">Este cartão já está em uso?</span><div class="col g10" data-radios data-on="usoPick">${[['emuso', 'Trazer o que já existe', 'Fatura em aberto e parcelamentos em andamento'], ['zero', 'Começar do zero', 'Só o que você lançar daqui para frente']].map(([k, t, m]) => `<button class="card tight row g12 ai-c ${k === st ? 'on' : ''}" data-act="radio" data-v="${k}" style="border-radius:18px;text-align:left">${'<span class="radio"></span>'}<span class="col g2 grow"><span class="t-e" style="font-size:15px">${t}</span><span class="t-s c3">${m}</span></span></button>`).join('')}</div>
      ${st === 'emuso' ? `<div class="col g14 fd"><div class="field"><span class="fl">Valor da fatura em aberto hoje</span><div class="card tight">${G.moneyIn('ncFat', 98240, { label: 'Fatura em aberto' })}</div></div><span class="lbl">Parcelamentos em andamento</span><div class="grp">${G.li({ tag: 'div', icon: 'refrigerator', h: 80, t: 'Geladeira Brastemp', m: 'R$ 389,90 · parcela 4 de 10', end: G.cbtn('x', { cls: 'sm', act: 'rmParc', label: 'Remover' }) })}${G.li({ tag: 'div', icon: 'headphones', h: 305, t: 'Fone JBL', m: 'R$ 199,90 · parcela 2 de 3', end: G.cbtn('x', { cls: 'sm', act: 'rmParc', label: 'Remover' }) })}</div><button class="btn t b" data-sheet="addParc">${ic('plus', 18)}Adicionar outro</button></div>` : ''}${st === 'zero' ? `<div class="alert neutral fd">${ic('circle-check', 18)}<span>A primeira fatura será a de dezembro, com o que você lançar a partir de hoje.</span></div>` : ''}</section>`;
    return `${G.topbar({ title: st === 'conta' ? 'Nova conta' : 'Novo cartão' })}${types}${type === 'cartao' ? cardF + uso : contaF}`;
  },
  fixed: (p, st) => `<div class="cta-bar"><button class="btn p" data-act="saveAcct">${st === 'conta' ? 'Criar conta' : 'Criar cartão'}</button></div>`
});
G.act('acctType', (t, v) => G.setState(v === 'cartao' ? 'cartao' : 'conta'));
G.act('usoPick', (t, v) => G.setState(v));
G.act('rmParc', t => { const r = t.closest('.li'); G.collapse(r); G.toast('Parcelamento removido', { icon: 'trash-2', undo: () => G.uncollapse(r) }); });
G.act('saveAcct', () => { G.back(); G.onBackMount(); setTimeout(() => G.toast('Pronto: já aparece em Finanças', { icon: 'check' }), G.D(300)); });
G.sheet('addParc', {
  title: 'Parcelamento em andamento',
  render: () => `${G.field('Descrição', { ph: 'Ex.: Notebook' })}<div class="field"><span class="fl">Valor da parcela</span>${G.moneyIn('apVal', 0)}</div><div class="f2">${G.field('Parcela atual', { v: '1', mode: 'numeric' })}${G.field('Total de parcelas', { v: '10', mode: 'numeric' })}</div><span class="hint">${ic('info', 16)}<span>A parcela atual é a que está na fatura aberta. As seguintes entram uma por fatura.</span></span>`,
  foot: () => `<button class="btn p" data-act="closeThen" data-p="msg=Parcelamento adicionado;icon=plus">Adicionar</button>`
});

/* ---------- Detalhe do lançamento ---------- */
G.screen('lancamento', {
  group: GRP, name: 'Detalhe do lançamento', route: '/gasto/[id]', hue: 160, tab: 'inicio', parent: 'financas', pad: 'nb g20',
  desc: 'Um gasto ou receita com tudo o que se liga a ele: comprovante (foto), nota de contexto, evento, item de compra. Vínculos nos dois sentidos, pelo mesmo painel de qualquer tela.',
  feats: ['Mostra em que fatura caiu e em que mês conta no orçamento.', 'Comprovante da galeria em miniatura; tocar abre a foto.', 'Editar, duplicar e excluir (vai para a lixeira, com desfazer).'],
  motion: ['Valor conta ao abrir; a miniatura do comprovante cresce até a foto ao tocar.'],
  render: p => {
    const t = DB.lanc.find(x => x.id === p.id) || DB.lanc[1]; const c = G.cat(t.c);
    return `${G.topbar({ right: G.cbtn('pencil', { sheet: 'lancamento', p: `v=${Math.abs(t.v)};d=${t.d}`, label: 'Editar' }) })}
      <div class="col ai-c g10 rv" style="text-align:center">${G.mi(c.i, c.h, 'lg')}<span class="t-e c2" style="font-weight:500">${t.d}</span><span class="t-num ${t.v > 0 ? 'cok' : ''}">${G.count(t.v, 'auto')}</span><span class="tag lg">${c.n}</span></div>
      <div class="grp rv">${[['calendar', 'Data', 'Quarta, 25/11/2026'], ['credit-card', 'Pago com', t.conta], ['receipt-text', 'Fatura', 'Dezembro · vence 10/12'], ['chart-pie', 'Conta no orçamento de', 'Dezembro (mês do pagamento)']].map(([i, k, v]) => `<div class="li sm"><span class="c3 row">${ic(i, 18)}</span><span class="t-s c3 grow">${k}</span><span class="t-s w5 ta-r">${v}</span></div>`).join('')}</div>
      ${t.obs ? `<div class="card tight col g4 rv"><span class="t-c c3">Observação</span><span class="t-b">${t.obs}</span></div>` : ''}
      <section class="col g10 rv"><span class="lbl">Comprovante</span><div class="row g10"><button data-go="foto" style="width:96px">${G.photo(160, 1)}</button><button class="card tight col ai-c center g6 grow" data-act="noop" style="border-radius:16px;box-shadow:inset 0 0 0 1.5px var(--border);background:transparent;min-height:96px">${ic('camera', 22)}<span class="t-s c3">Adicionar foto</span></button></div></section>
      ${G.linkPanel([{ icon: 'sticky-note', h: 80, t: 'Compras do mês', m: 'Nota', go: 'nota', p: 'id=n2' }], [{ icon: 'shopping-basket', h: 55, t: 'Lista: Mercado', m: 'Compras · comprado em 25/11', go: 'lista-compras' }, { icon: 'sparkles', h: 260, t: 'Criado pela IA', m: 'Caixa de entrada · 25/11', go: 'caixa', p: 'st=pendentes' }])}
      <div class="row g10 rv"><button class="btn g grow" data-act="toast" data-msg="Lançamento duplicado para hoje">${ic('copy', 18)}Duplicar</button><button class="btn d grow" data-act="delTx">${ic('trash-2', 18)}Excluir</button></div>`;
  }
});
G.act('delTx', () => { G.back(); G.onBackMount(); setTimeout(() => G.toast('Lançamento movido para a lixeira', { icon: 'trash-2', undo: () => G.toast('Lançamento de volta', { icon: 'undo-2' }) }), G.D(300)); });
})();
