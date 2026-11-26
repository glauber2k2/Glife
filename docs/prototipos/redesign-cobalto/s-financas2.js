'use strict';
/* Finanças (planejamento): recorrentes, orçamentos, gráficos, compras e investimentos. */
(function () {
const { ic, mascot, esc, $, $$, motion, E, DB, brl } = G;
const GRP = 'Finanças';
const GRP2 = 'Compras e investimentos';

/* ---------- Recorrentes ---------- */
const REC = [
  ['Salário', 'salario', 500000, 'Mensal · dia 5', '05/12', 'Nubank'],
  ['Aluguel', 'casa', -165000, 'Mensal · dia 5', '05/12', 'Nubank'],
  ['Internet Vivo Fibra', 'casa', -11990, 'Mensal · dia 24', '24/12', 'Nubank'],
  ['Academia Smart Fit', 'saude', -11990, 'Mensal · dia 30', '30/11', 'Nubank'],
  ['Spotify Família', 'assinaturas', -2190, 'Mensal · dia 28', '28/11', 'Nubank Ultravioleta'],
  ['Netflix', 'assinaturas', -3990, 'Mensal · dia 1', '01/12', 'Nubank Ultravioleta'],
  ['Dízimo', 'presentes', -50000, 'Mensal · dia 6', '06/12', 'Nubank'],
  ['IPVA (3 parcelas)', 'transporte', -48200, 'Mensal · termina em mar/27', '15/01', 'Itaú'],
  ['Seguro do carro', 'transporte', -189000, 'Anual · 12/03', '12/03/27', 'Itaú']
];
G.screen('recorrentes', {
  group: GRP, name: 'Recorrentes', route: '/financas/recorrentes', hue: 160, tab: 'inicio', parent: 'financas', pad: 'g20',
  desc: 'As regras que geram os previstos: salário, aluguel, assinaturas, parcelas de imposto. Cada uma mostra a próxima data e a conta.',
  feats: ['Totais do mês: entradas e saídas recorrentes.', 'Filtro Entradas · Saídas · Todas.', 'Tocar abre o editor da regra.'],
  motion: ['Linhas entram em cascata; trocar o filtro reorganiza a lista suavemente.'],
  render: () => `${G.topbar({ title: 'Recorrentes', right: G.cbtn('plus', { sheet: 'lancamento', label: 'Nova recorrência' }) })}
    <div class="card rv"><div class="kv"><div><span class="k">Entram por mês</span><span class="v cok">${brl(500000)}</span></div><div><span class="k">Saem por mês</span><span class="v">${brl(293140)}</span></div><div><span class="k">Sobra prevista</span><span class="v">${brl(206860)}</span></div></div></div>
    ${G.seg([['todas', 'Todas'], ['ent', 'Entradas'], ['sai', 'Saídas']], 0, { on: 'recFilter' })}
    <div class="grp rv" id="recList">${REC.map(([d, c, v, f, nx, ct]) => { const cat = G.cat(c); return `<button class="li hi" data-go="recorrente" data-p="d=${d}" data-kind="${v > 0 ? 'ent' : 'sai'}">${G.mi(cat.i, cat.h)}<span class="col grow g2"><span class="tt">${d}</span><span class="mm">${f} · ${ct}</span></span><span class="end"><span class="amt ${v > 0 ? 'in' : ''}">${brl(v, 'auto')}</span><span class="t-c c3">próx. ${nx}</span></span></button>`; }).join('')}</div>`
});
G.act('recFilter', (t, v) => { $$('#recList .li').forEach(r => { const show = v === 'todas' || r.dataset.kind === v; if (show && r.style.display === 'none') G.uncollapse(r); else if (!show && r.style.display !== 'none') G.collapse(r, 240); }); });

G.screen('recorrente', {
  group: GRP, name: 'Editar recorrência', route: '/financas/recorrente/[id]', hue: 160, tab: 'inicio', parent: 'recorrentes', pad: 'cta g20',
  desc: 'Editor de uma regra. Mudança vale "deste mês em diante": os meses que já passaram não mudam.',
  states: [['editar', 'Editar'], ['aplicar', 'Aplicar a partir de quando?']],
  feats: ['Valor, descrição, categoria, conta, frequência (semanal, mensal, anual, a cada N) e término (nunca ou em data).', 'Próximas 3 ocorrências calculadas na hora.', 'Ao salvar, a pergunta "Aplicar a partir de quando?" com a data (padrão: deste mês em diante).', '"Encerrar recorrência" para de gerar previstos a partir de uma data.'],
  motion: ['As próximas datas se recalculam com um esmaecer quando a frequência muda.'],
  render: (p, st) => {
    const d = p.d || 'Internet Vivo Fibra'; const r = REC.find(x => x[0] === d) || REC[2]; const cat = G.cat(r[1]);
    return `${G.topbar({ title: 'Recorrência' })}
      <div class="col g4 ai-c">${G.moneyIn('rcVal', Math.abs(r[2]), { cls: r[2] > 0 ? 'pos' : '' })}<span class="t-c c3">${r[2] > 0 ? 'Entrada' : 'Saída'} · ${cat.n}</span></div>
      ${G.field('Descrição', { v: d })}
      <div class="field"><span class="fl">Frequência</span>${G.seg(['Semanal', 'Mensal', 'Anual', 'A cada N'], 1, { on: 'freqPick' })}</div>
      <div class="f2">${G.select('Dia', 'Todo dia 24', { act: 'noop' })}${G.select('Termina', 'Nunca', { act: 'noop' })}</div>
      <div class="field"><span class="fl">Conta</span>${G.contaChips('nubank')}</div>
      <section class="col g10"><span class="lbl">Próximas</span><div class="grp" id="nextOcc">${['24/12 · quinta', '24/01 · domingo', '24/02 · quarta'].map(x => `<div class="li sm"><span class="t-s grow">${x}</span><span class="amt fc">${brl(r[2], 'auto')}</span></div>`).join('')}</div></section>
      <button class="btn d b" data-sheet="encerrar">Encerrar recorrência</button>`;
  },
  fixed: () => `<div class="cta-bar"><button class="btn p" data-sheet="aplicarQuando">Salvar mudança</button></div>`,
  mount: (el, p, st) => { if (st === 'aplicar') setTimeout(() => G.openSheet('aplicarQuando'), G.D(300)); }
});
G.act('freqPick', (t, v) => { const n = $('#nextOcc'); const sets = { Semanal: ['03/12 · quinta', '10/12 · quinta', '17/12 · quinta'], Mensal: ['24/12 · quinta', '24/01 · domingo', '24/02 · quarta'], Anual: ['24/11/2027', '24/11/2028', '24/11/2029'], 'A cada N': ['24/01 (a cada 2 meses)', '24/03', '24/05'] }[v]; const amt = $('.amt', n).outerHTML; n.innerHTML = sets.map(x => `<div class="li sm"><span class="t-s grow">${x}</span>${amt}</div>`).join(''); motion(n, [{ opacity: .2 }, { opacity: 1 }], 240, E.std); });
G.sheet('aplicarQuando', {
  title: 'Aplicar a partir de quando?',
  render: () => `<p class="t-b c2" style="margin:0">Os meses que já passaram continuam como estavam.</p><div class="col" data-radios>${[['Deste mês em diante', 'A partir de novembro de 2026'], ['Do próximo mês em diante', 'A partir de dezembro de 2026'], ['Escolher a data', '']].map(([t, m], i) => `<button class="li ${i === 0 ? 'on' : ''}" data-act="radio"><span class="col grow g2"><span class="tt">${t}</span>${m ? `<span class="mm">${m}</span>` : ''}</span><span class="radio"></span></button>`).join('')}</div>`,
  foot: () => `<button class="btn p" data-act="recSaved">Salvar</button>`
});
G.act('recSaved', () => G.closeSheet().then(() => { G.back(); G.onBackMount(); setTimeout(() => G.toast('Recorrência atualizada de novembro em diante', { icon: 'repeat' }), G.D(300)); }));
G.sheet('encerrar', {
  title: 'Encerrar recorrência?',
  render: () => `<p class="t-b c2" style="margin:0">Para de gerar previstos a partir da data escolhida. Os lançamentos já confirmados ficam no extrato.</p>${G.select('Último mês', 'Novembro de 2026', { act: 'noop' })}`,
  foot: () => `<button class="btn g" data-close style="background:var(--bg)">Cancelar</button><button class="btn d" data-act="closeThen" data-p="msg=Recorrência encerrada;icon=circle-stop">Encerrar</button>`
});

/* ---------- Orçamentos ---------- */
G.screen('orcamentos', {
  group: GRP, name: 'Orçamentos', route: '/financas/orcamentos', hue: 160, tab: 'inicio', parent: 'financas', pad: 'g20',
  desc: 'Categorias de despesa com o limite mensal e o mês até agora: gasto realizado, previsto e restante.',
  states: [['mes', 'Novembro'], ['editar', 'Editando limites']],
  feats: ['O limite é editável na própria linha (teclado numérico do aparelho).', 'Compra no cartão conta no mês em que a fatura é paga; transferências e pulados ficam fora.', 'Categoria sem orçamento aparece no fim, com o gasto e "Definir limite".', 'Resumo no topo: total orçado, gasto e o que sobra.'],
  motion: ['Barras crescem da esquerda; a que estoura fica vermelha só depois de crescer.', 'Editar: os valores viram campos com esmaecer, sem mudar a altura das linhas.'],
  render: (p, st) => {
    const ks = ['restaurantes', 'mercado', 'casa', 'transporte', 'lazer', 'saude', 'assinaturas'];
    const edit = st === 'editar';
    return `${G.topbar({ title: 'Orçamentos', sub: 'novembro', right: `<button class="btn ${edit ? 'p' : 't'} sm" data-act="state" data-v="${edit ? 'mes' : 'editar'}">${edit ? 'Pronto' : 'Editar'}</button>` })}
      <div class="card col g12 rv"><div class="row between ai-e"><div class="col g4"><span class="t-s c3">Gasto até agora</span><span class="t-big" style="font-size:32px;line-height:36px">${G.count(327780)}</span></div><span class="t-s c3 ta-r">de ${brl(437000)}<br><b class="c2 w6">${brl(109220)} livres</b></span></div>${G.bar(75, { cls: 'thick', fc: 6 })}<span class="t-c c3">Listrado = previsto até 30/11 (${brl(30170)})</span></div>
      <div class="grp rv">${ks.map(k => edit ? (() => { const c = DB.cats[k]; return `<div class="li hi" style="min-height:64px">${G.mi(c.i, c.h, 'sm')}<span class="col grow g2"><span class="tt">${c.n}</span><span class="mm">Gasto ${brl(c.gasto)}</span></span><input class="inp" inputmode="numeric" data-money data-cents="${c.orc}" value="${brl(c.orc, 'abs')}" style="width:132px;height:44px;text-align:right;font-weight:600" aria-label="Limite de ${c.n}"></div>`; })() : G.budgetRow(k)).join('')}</div>
      <section class="col g10 rv"><span class="lbl">Sem orçamento</span><div class="grp">${G.li({ tag: 'div', icon: 'graduation-cap', h: 130, t: 'Educação', m: 'Nada gasto em novembro', end: '<button class="btn t sm" data-act="state" data-v="editar">Definir limite</button>' })}${G.li({ tag: 'div', icon: 'gift', h: 0, t: 'Presentes', m: `${brl(15000)} em novembro`, end: '<button class="btn t sm" data-act="state" data-v="editar">Definir limite</button>' })}</div></section>`;
  }
});

/* ---------- Gráficos ---------- */
const flowBars = (mode) => {
  const data = mode === 'mes' ? [[1350, 980], [0, 1120], [120, 690], [1200, 312, 300]] : mode === '12m' ? [[5100, 4300], [5200, 4800], [5000, 4400], [5300, 4700], [5100, 3900], [5600, 4200], [5000, 4020], [5100, 4550], [5000, 3980], [5150, 4700], [5361, 4737], [5361, 3102, 302]] : [[5000, 4020], [5100, 4550], [5000, 3980], [5150, 4700], [5361, 4737], [5361, 3102, 302]];
  const lab = mode === 'mes' ? ['1–7', '8–14', '15–21', '22–30'] : mode === '12m' ? ['dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov'] : ['jun', 'jul', 'ago', 'set', 'out', 'nov'];
  const max = Math.max(...data.map(d => Math.max(d[0], d[1] + (d[2] || 0)))) * 1.08;
  return `<div class="chart" data-act="noop" id="flow" style="height:150px;gap:${mode === '12m' ? 4 : 10}px">${data.map((d, i) => `<div class="cb" data-i="${i}" data-l="${lab[i]}: entrou ${brl(d[0] * 100)}, saiu ${brl((d[1] + (d[2] || 0)) * 100)}" style="flex-direction:row;align-items:flex-end;gap:3px"><i class="out" style="flex:1;height:${d[0] / max * 100}%"></i><span style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;gap:2px">${d[2] ? `<i class="fc" style="height:${d[2] / max * 100}%"></i>` : ''}<i class="${i === data.length - 1 ? 'acc' : ''}" style="height:${d[1] / max * 100}%;${i === data.length - 1 ? '' : 'background:var(--fg-3)'}"></i></span></div>`).join('')}</div><div class="chart-x">${lab.map((l, i) => `<span class="${i === lab.length - 1 ? 'ca w6' : ''}">${l}</span>`).join('')}</div>`;
};
const lineChart = () => {
  const real = [118, 121, 120, 126, 131, 129, 133, 140, 138, 145.3], proj = [145.3, 149.9, 144.8, 151.2, 147.9];
  const all = real.concat(proj.slice(1)); const max = 160, min = 110, W = 320, H = 120;
  const x = i => i / (all.length - 1) * W, y = v => H - (v - min) / (max - min) * H;
  const pts = arr => arr.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const pts2 = proj.map((v, i) => `${x(i + real.length - 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg viewBox="-4 -8 ${W + 8} ${H + 22}" width="100%" height="150" aria-label="Saldo das contas: R$ 14.528 hoje, cerca de R$ 14.790 previstos no fim de dezembro"><line x1="0" x2="${W}" y1="${y(130)}" y2="${y(130)}" style="stroke:var(--line)" stroke-width="1"/><line x1="0" x2="${W}" y1="${y(150)}" y2="${y(150)}" style="stroke:var(--line)" stroke-width="1"/><polyline points="${pts(real)}" style="fill:none;stroke:var(--fg-2)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${pts2}" style="fill:none;stroke:var(--fg-3)" stroke-width="2" stroke-dasharray="4 5" stroke-linecap="round"/><circle cx="${x(real.length - 1)}" cy="${y(145.3)}" r="5" style="fill:var(--accent);stroke:var(--card)" stroke-width="2"/><text x="${x(real.length - 1)}" y="${y(145.3) - 12}" text-anchor="middle" style="fill:var(--fg);font-size:11px;font-weight:600;font-family:var(--font)">hoje</text><text x="0" y="${H + 14}" style="fill:var(--fg-3);font-size:11px;font-family:var(--font)">out</text><text x="${W}" y="${H + 14}" text-anchor="end" style="fill:var(--fg-3);font-size:11px;font-family:var(--font)">fim de dez</text></svg>`;
};
G.screen('graficos', {
  group: GRP, name: 'Gráficos', route: '/financas/graficos', hue: 160, tab: 'inicio', parent: 'financas', pad: 'nb g20',
  desc: 'Monocromático em cinza, com o cobalto só no dado que importa (o mês atual). Toque numa barra para ler o valor.',
  states: [['mes', 'Mês'], ['6m', '6 meses'], ['12m', '12 meses']],
  feats: ['Entradas e saídas: contorno = entrou, cheio = saiu, listrado = previsto; semanas no modo Mês.', 'Para onde foi: até 7 linhas (6 + Outras), com a parte de cada categoria.', 'Saldo das contas: real até hoje e tracejado até o fim do mês que vem, com previstos e faturas.', 'Patrimônio investido ao longo do tempo.'],
  motion: ['Barras crescem de baixo (800 ms, +40 ms cada).', 'Toque: etiqueta só texto + as outras barras esmaecem a 35%; some 2,5 s depois de soltar.', 'Trocar o período refaz o gráfico com as barras crescendo de novo.'],
  render: (p, st) => `${G.topbar({ title: 'Gráficos', sub: st === 'mes' ? 'novembro' : st === '6m' ? 'jun a nov' : 'dez/25 a nov/26' })}
    ${G.seg([['mes', 'Mês'], ['6m', '6 meses'], ['12m', '12 meses']], ['mes', '6m', '12m'].indexOf(st), { cls: 'pill', on: 'chartMode' })}
    <section class="card col g14 rv"><div class="row between ai-b"><span class="t-e">Entradas e saídas</span><span class="t-c c3">toque numa barra</span></div><div class="t-s c2" id="flowTip" style="min-height:20px">${st === 'mes' ? `Novembro: entrou ${brl(536120)}, saiu ${brl(310278)}` : `Média: entra ${brl(511000)}, sai ${brl(434000)}`}</div>${flowBars(st)}<div class="row g14 t-c c3 wrap"><span class="row g6"><span class="dotc" style="box-shadow:inset 0 0 0 1.5px var(--fg-3)"></span>Entrou</span><span class="row g6"><span class="dotc" style="background:var(--fg-3)"></span>Saiu</span><span class="row g6"><span class="dotc" style="background:repeating-linear-gradient(135deg,var(--border) 0 2px,transparent 2px 4px);box-shadow:inset 0 0 0 1px var(--border)"></span>Previsto</span></div></section>
    <section class="card col g12 rv"><span class="t-e">Para onde foi</span><div class="dist">${[['casa', 53], ['restaurantes', 15.7], ['mercado', 19.7], ['transporte', 6.8], ['lazer', 4.3]].map(([k, w], i) => `<span style="width:${w}%;background:${i === 1 ? 'var(--accent)' : `color-mix(in srgb,var(--fg-2) ${90 - i * 15}%,var(--track))`};animation-delay:${i * 60}ms"></span>`).join('')}</div>
      <div class="col">${[['casa', 165000, '53%'], ['mercado', 61240, '20%'], ['restaurantes', 48630, '16%', 1], ['transporte', 21000, '7%'], ['lazer', 13250, '4%'], ['saude', 5680, '2%']].map(([k, v, pc, hi]) => { const c = DB.cats[k]; return `<button class="li hi sm" data-go="categoria" data-p="c=${k}">${G.mi(c.i, c.h, 'sm')}<span class="tt grow ${hi ? 'cbad' : ''}">${c.n}${hi ? ' · estourou' : ''}</span><span class="t-s c3 tn" style="width:36px;text-align:right">${pc}</span><span class="amt" style="min-width:92px;text-align:right">${brl(v)}</span></button>`; }).join('')}</div></section>
    <section class="card col g8 rv"><div class="row between ai-b"><span class="t-e">Saldo das contas</span><span class="t-c c3">real · previsto</span></div>${lineChart()}</section>
    <section class="card col g12 rv"><div class="row between ai-b"><span class="t-e">Patrimônio investido</span><span class="t-s w6 tn">${brl(4832015)}</span></div><div class="chart" style="height:90px">${[38, 39.2, 40.1, 41, 41.8, 42.4, 43.5, 44.1, 45.6, 46.3, 47.7, 48.3].map((v, i) => `<div class="cb"><i class="${i === 11 ? 'acc' : ''}" style="height:${(v - 30) / 20 * 100}%;animation-delay:${i * 40}ms"></i></div>`).join('')}</div><div class="chart-x"><span style="text-align:left">dez/25</span><span style="text-align:right">nov/26</span></div></section>`,
  mount: (el) => {
    let timer;
    $$('#flow .cb', el).forEach(b => b.addEventListener('click', () => {
      const ch = $('#flow', el); ch.classList.add('focus'); $$('.cb', ch).forEach(x => x.classList.toggle('sel', x === b));
      $('#flowTip', el).textContent = b.dataset.l;
      clearTimeout(timer); timer = setTimeout(() => { ch.classList.remove('focus'); }, G.D(2500));
    }));
  }
});
G.act('chartMode', (t, v) => G.setState(v));
G.screen('categoria', {
  group: GRP, name: 'Gráfico da categoria', route: '/financas/grafico/[categoria]', hue: 160, tab: 'inicio', parent: 'graficos', pad: 'nb g20',
  desc: 'Uma categoria no tempo: total, comparação com o período anterior, orçamento do mês e os lançamentos.',
  feats: ['A barra do orçamento (3 px) não muda de cor; só o número estourado fica vermelho.', 'Barras por mês com o atual em cobalto.', 'A IA comenta a variação quando ela é grande.'],
  motion: ['Total conta até o valor; barras crescem em cascata.'],
  render: p => {
    const k = p.c || 'restaurantes'; const c = DB.cats[k] || DB.cats.restaurantes; const over = c.gasto > c.orc;
    const hist = k === 'mercado' ? [690, 720, 655, 801, 746, 612] : [310, 380, 295, 412, 367, 486];
    return `${G.topbar({ title: c.n, sub: 'Categoria · novembro' })}
      <div class="col ai-c g8 rv" style="text-align:center">${G.mi(c.i, c.h, 'lg')}<span class="t-big">${G.count(c.gasto)}</span><span class="tag lg ${k === 'mercado' ? 'ok' : 'bad'}">${ic(k === 'mercado' ? 'trending-down' : 'trending-up', 14)}${k === 'mercado' ? '18% a menos que outubro' : '32% a mais que outubro'}</span></div>
      <div class="card col g10 rv"><div class="row between"><span class="t-s c3">Orçamento de novembro</span><span class="t-s tn"><b class="${over ? 'cbad' : ''} w6">${brl(c.gasto)}</b> <span class="c3">de ${brl(c.orc)}</span></span></div><div class="bar thin"><i style="width:${Math.min(100, c.gasto / c.orc * 100)}%"></i></div></div>
      <div class="card col g12 rv"><span class="t-e">Por mês</span><div class="chart" style="height:110px">${hist.map((v, i) => `<div class="cb"><i class="${i === 5 ? 'acc' : ''}" style="height:${v / 900 * 100}%;animation-delay:${i * 40}ms"></i></div>`).join('')}</div><div class="chart-x">${['jun', 'jul', 'ago', 'set', 'out', 'nov'].map((l, i) => `<span class="${i === 5 ? 'ca w6' : ''}">${l}</span>`).join('')}</div></div>
      ${k !== 'mercado' ? G.ai('Metade do aumento veio de 2 jantares de fim de semana. Quer um lembrete quando passar de 80% do limite?', 'Criar aviso', { act: 'toast', msg: 'Aviso criado: 80% de Restaurantes' }) : ''}
      <section class="col g10 rv"><span class="lbl">Lançamentos</span><div class="grp">${(k === 'mercado' ? DB.lanc.filter(t => t.c === 'mercado') : [{ id: 't4', dia: '23/11', d: 'Madero Shopping', c: 'restaurantes', v: -14200, conta: 'Itaú Click' }, { id: 'x1', dia: '23/11', d: 'Coco Bambu', c: 'restaurantes', v: -18640, conta: 'Nubank Ultravioleta' }, { id: 'x2', dia: '15/11', d: 'iFood', c: 'restaurantes', v: -6490, conta: 'Nubank Ultravioleta' }, { id: 'x3', dia: '09/11', d: 'Padoca do Zé', c: 'restaurantes', v: -9300, conta: 'Nubank' }]).map(t => G.txRow(t)).join('')}</div></section>`;
  }
});

/* ---------- Compras ---------- */
G.screen('compras', {
  group: GRP2, name: 'Listas de compras', route: '/financas/compras', hue: 55, tab: 'inicio', parent: 'financas', pad: 'nb g20',
  desc: 'Listas com itens e preço. "Comprei" grava o gasto na mesma ação, com a categoria da lista.',
  states: [['cheia', 'Com listas'], ['vazia', 'Sem listas']],
  feats: ['Cada lista mostra itens pendentes, no carrinho e o total estimado.', 'Lista nova recebe a categoria de gasto com o mesmo nome, quando existe ("Mercado" → Mercado).'],
  motion: ['Cartões entram em cascata; o progresso cresce da esquerda.'],
  render: (p, st) => `${G.topbar({ title: 'Compras', right: G.cbtn('plus', { sheet: 'novaLista', label: 'Nova lista' }) })}
    ${st === 'vazia' ? G.empty('Nenhuma lista ainda', 'Monte a lista do mercado aqui. Quando comprar, o gasto entra em Finanças com um toque.', 'Criar lista', { sheet: 'novaLista' }) :
    [['Mercado', 'shopping-cart', 160, 9, 3, 41280, 'Mercado'], ['Farmácia', 'pill', 350, 3, 0, 8650, 'Saúde'], ['Presentes de Natal', 'gift', 0, 5, 1, 62000, 'Presentes']].map(([n, i, h, tot, cart, est, cat]) => `<button class="card col g12 rv" data-go="lista-compras" data-p="n=${n}" style="text-align:left"><div class="row g12 ai-c">${G.mi(i, h)}<div class="col grow g2"><span class="t-e">${n}</span><span class="t-s c3">${tot - cart} pendentes · ${cart} no carrinho · gasto em ${cat}</span></div><span class="amt c2">~ ${brl(est)}</span></div>${G.bar(cart / tot * 100, { cls: 'thin', fill: 'acc' })}</button>`).join('')}`
});
const ITEMS = [['Arroz 5 kg', '1 un', 2890, 1], ['Feijão carioca', '2 un', 1580, 1], ['Café 500 g', '2 un', 3790, 1], ['Leite integral', '12 un', 6480], ['Pão integral', '1 un', 990], ['Bananas', '1 kg', 690], ['Ração da Mel 10 kg', '1 un', 18900], ['Sabão em pó', '1 un', 2490], ['Detergente', '3 un', 720]];
const itemRow = ([n, q, v, inCart]) => `<div class="li ${inCart ? 'done' : ''}" style="min-height:56px"><button class="noscale" data-act="cartItem" aria-label="Marcar ${esc(n)}" style="display:flex">${G.ck(inCart, { sq: true })}</button><button class="col grow g2" data-sheet="editItem" data-p="n=${n}" style="text-align:left"><span class="tt"><span class="st">${n}</span></span><span class="mm">${q}</span></button><span class="amt ${inCart ? '' : 'fc'}">${brl(v)}</span></div>`;
G.screen('lista-compras', {
  group: GRP2, name: 'Lista de compras', route: '/financas/compra/[id]', hue: 55, tab: 'inicio', parent: 'compras', pad: 'cta g20',
  desc: 'Itens da lista. Marcar põe no carrinho; "Comprei" abre a folha que grava o gasto com o total dos itens marcados.',
  feats: ['Quantidade e preço são editados numa folha ("Editar item"), não na linha.', 'Toque longo no item: editar, mover, excluir.', 'Folha "Lista" (⋯): renomear, trocar a categoria do gasto, excluir com desfazer.', 'Rodapé com o total no carrinho e o botão "Comprei".'],
  motion: ['Marcar: o visto entra com mola e o texto é riscado; o total do rodapé conta até o novo valor.', 'Item novo entra no topo com mola.'],
  render: p => `${G.topbar({ title: p.n || 'Mercado', sub: 'Gasto em Mercado', right: G.cbtn('ellipsis', { sheet: 'listaMais', label: 'Lista' }) })}
    <form class="search rv" id="addItemF" style="padding-right:6px">${ic('plus', 20)}<input id="addItem" placeholder="Adicionar item" aria-label="Adicionar item" autocomplete="off"><button class="btn t sm" type="submit">Adicionar</button></form>
    <section class="col g10 rv"><span class="lbl">Pendentes</span><div class="grp" id="pend">${ITEMS.filter(x => !x[3]).map(itemRow).join('')}</div></section>
    <section class="col g10 rv"><span class="lbl">No carrinho</span><div class="grp" id="cart">${ITEMS.filter(x => x[3]).map(itemRow).join('')}</div></section>`,
  fixed: () => `<div class="cta-bar" style="align-items:center"><div class="col" style="flex:none"><span class="t-c c3">No carrinho</span><span class="t-e tn" style="font-size:20px" id="cartTot" data-count="8260" data-from="8260">${brl(8260)}</span></div><button class="btn p" data-sheet="comprei">${ic('check', 18)}Comprei</button></div>`,
  mount: el => {
    $('#addItemF', el).addEventListener('submit', e => { e.preventDefault(); const i = $('#addItem', el); if (!i.value.trim()) return; $('#pend', el).insertAdjacentHTML('afterbegin', itemRow([esc(i.value.trim()), '1 un', 0])); G.paint(); motion($('#pend .li', el), [{ opacity: 0, transform: 'translateY(-10px) scale(.96)' }, { opacity: 1, transform: 'none' }], 380, E.spring); i.value = ''; });
  }
});
G.act('cartItem', t => {
  const row = t.closest('.li'); const on = !row.classList.contains('done'); row.classList.toggle('done', on); $('.ck', row).classList.toggle('on', on); $('.amt', row).classList.toggle('fc', !on);
  const v = +$('.amt', row).textContent.replace(/\D/g, ''); const tot = $('#cartTot'); G.recount(tot, +tot.dataset.count + (on ? v : -v));
  setTimeout(() => { const dest = on ? $('#cart') : $('#pend'); G.collapse(row, 240).then(() => { row.style.display = ''; settleRow(row); dest.appendChild(row); motion(row, [{ opacity: 0 }, { opacity: 1 }], 240, E.std); }); }, G.D(420));
});
function settleRow(r) { r.getAnimations().forEach(a => a.cancel()); }
G.sheet('comprei', {
  title: 'Comprei',
  render: () => `<div class="col g4 ai-c">${G.moneyIn('cpVal', +(($('#cartTot') || { dataset: { count: 8260 } }).dataset.count))}<span class="t-c c3">Total dos itens no carrinho. Corrija se o caixa deu diferente.</span></div>
    <div class="field"><span class="fl">Pago com</span>${G.contaChips('nucard')}</div>
    <div class="field"><span class="fl">Categoria</span>${G.catChips('mercado')}</div>
    <div class="alert neutral" style="background:var(--bg)">${ic('chart-pie', 18)}<span>Conta no orçamento de dezembro (mês em que a fatura é paga): Mercado ${brl(0)} de ${brl(80000)}.</span></div>
    <div class="field"><span class="fl">Data</span>${G.chips([['hoje', 'Hoje'], ['ontem', 'Ontem'], ['outra', 'Outra']], ['hoje'])}</div>`,
  foot: () => `<button class="btn p" data-act="compreiOk">Gravar gasto</button>`
});
G.act('compreiOk', () => { G.closeSheet().then(() => { $$('#cart .li').forEach((r, i) => setTimeout(() => G.collapse(r), G.D(i * 60))); const tot = $('#cartTot'); if (tot) G.recount(tot, 0); G.toast('Gasto gravado em Finanças · 3 itens comprados', { icon: 'check', undo: () => G.setState(undefined) }); }); });
G.sheet('editItem', {
  title: 'Editar item',
  render: p => `${G.field('Item', { v: p.n || '' })}<div class="f2">${G.field('Quantidade', { v: '2', mode: 'decimal' })}${G.select('Unidade', 'un', { act: 'noop' })}</div><div class="field"><span class="fl">Preço total</span>${G.moneyIn('eiVal', 1580)}</div>`,
  foot: () => `<button class="btn d" data-act="closeThen" data-p="msg=Item excluído;icon=trash-2;undo=1" style="flex:none;width:52px;padding:0" aria-label="Excluir item">${ic('trash-2', 18)}</button><button class="btn p" data-act="closeThen" data-p="msg=Item atualizado">Salvar</button>`
});
G.sheet('listaMais', {
  title: 'Lista',
  render: () => `${G.field('Nome', { v: 'Mercado' })}<div class="field"><span class="fl">Categoria do gasto</span>${G.catChips('mercado')}</div>`,
  foot: () => `<button class="btn d" data-act="closeThen" data-p="msg=Lista excluída;icon=trash-2;undo=1">Excluir lista</button><button class="btn p" data-act="closeThen" data-p="msg=Lista salva">Salvar</button>`
});
G.sheet('novaLista', {
  title: 'Nova lista',
  render: () => `${G.field('Nome', { ph: 'Ex.: Mercado', id: 'nlName' })}<span class="hint">${ic('info', 16)}<span>Se existir uma categoria com o mesmo nome, o gasto vai para ela.</span></span>`,
  foot: () => `<button class="btn p" data-act="closeThen" data-p="msg=Lista criada;go=lista-compras">Criar lista</button>`
});

/* ---------- Investimentos ---------- */
G.screen('investimentos', {
  group: GRP2, name: 'Investimentos', route: '/financas/investimentos', hue: 205, tab: 'inicio', parent: 'financas', pad: 'g20',
  desc: 'Total em destaque, histórico em barras e a distribuição. Ações, FIIs e cripto têm cotação automática; o resto é manual.',
  states: [['cheia', 'Com ativos'], ['vazia', 'Primeiro ativo']],
  feats: ['Patrimônio e variação do mês.', 'Período 1M · 6M · 1A · Tudo.', 'Distribuição por tipo; leitura da IA sobre a reserva de emergência.', 'Lista de ativos com valor e variação; os automáticos mostram a hora da cotação.'],
  motion: ['Patrimônio conta até o valor; barras crescem; a distribuição se preenche da esquerda.', 'Tocar num ativo faz a linha crescer até o detalhe.'],
  render: (p, st) => `${G.topbar({ title: 'Investimentos', right: G.cbtn('plus', { go: 'novo-ativo', label: 'Novo ativo' }) })}
    ${st === 'vazia' ? G.empty('Seu primeiro ativo', 'Tesouro, CDB, ações, fundos imobiliários ou cripto. Ações, FIIs e cripto têm cotação automática.', 'Adicionar ativo', { go: 'novo-ativo' }) : `
    <div class="col g6 rv"><span class="t-s c3">Patrimônio investido</span><span class="t-big">${G.count(4832015)}</span><span class="tag lg ok self-s">${ic('trending-up', 14)}${brl(59420)} · 1,24% no mês</span></div>
    <div class="card col g14 rv"><div class="periods" data-radios>${['1M', '6M', '1A', 'Tudo'].map((x, i) => `<button class="${i === 2 ? 'on' : ''}" data-act="period">${x}</button>`).join('')}</div>
      <div class="chart" style="height:110px" id="invChart">${[38, 39.2, 40.1, 41, 41.8, 42.4, 43.5, 44.1, 45.6, 46.3, 47.7, 48.3].map((v, i) => `<div class="cb"><i class="${i === 11 ? 'acc' : ''}" style="height:${(v - 30) / 20 * 100}%;animation-delay:${i * 40}ms"></i></div>`).join('')}</div>
      <div class="chart-x"><span style="text-align:left">dez 2025</span><span style="text-align:right">nov 2026</span></div></div>
    <section class="col g12 rv">${G.sec('Distribuição')}<div class="dist">${[['var(--accent)', 52], ['oklch(var(--chart-l) var(--chart-c) 205)', 13], ['oklch(var(--chart-l) var(--chart-c) 305)', 10], ['oklch(var(--chart-l) var(--chart-c) 55)', 12], ['var(--border)', 13]].map(([c, w], i) => `<span style="width:${w}%;background:${c};animation-delay:${i * 60}ms"></span>`).join('')}</div>
      <div class="f2" style="gap:8px 16px">${[['var(--accent)', 'Renda fixa', '65%'], ['oklch(var(--chart-l) var(--chart-c) 205)', 'Ações', '3%'], ['oklch(var(--chart-l) var(--chart-c) 305)', 'Fundos imob.', '10%'], ['oklch(var(--chart-l) var(--chart-c) 55)', 'Cripto', '12%'], ['var(--border)', 'Previdência', '10%']].map(([c, l, v]) => `<span class="row g8 t-s"><span class="dotc" style="background:${c}"></span>${l}<span class="w6 tn" style="margin-left:auto">${v}</span></span>`).join('')}</div></section>
    ${G.ai('Sua reserva cobre 5,2 meses de gastos. Faltam R$ 3.900 para 6 meses.', 'Ver plano', { act: 'toast', msg: 'Plano de reserva salvo em Notas' })}
    <section class="col g12 rv">${G.sec('Ativos')}<div class="grp">${DB.ativos.map(a => `<button class="li hi" data-go="ativo" data-p="id=${a.id}">${G.mi(a.i, a.h)}<span class="col grow g2"><span class="tt">${a.n}</span><span class="mm">${a.t}</span></span><span class="end"><span class="amt">${brl(a.v)}</span><span class="t-c ${a.r < 0 ? 'cbad' : 'cok'} tn">${a.r < 0 ? '−' : '+'}${G.pct(Math.abs(a.r))}</span></span></button>`).join('')}</div></section>`}`
});
G.act('period', t => { const g = t.parentElement; $$('button', g).forEach(b => b.classList.toggle('on', b === t)); const ch = $('#invChart'); if (ch) { const html = ch.innerHTML; ch.innerHTML = ''; void ch.offsetWidth; ch.innerHTML = html; } });
G.screen('ativo', {
  group: GRP2, name: 'Detalhe do ativo', route: '/financas/investimento/[id]', hue: 205, tab: 'inicio', parent: 'investimentos', pad: 'cta g20',
  desc: 'Posição de um ativo: valor, resultado, cotas e preço. Ativo automático mostra "Cotação de dd/mm hh:mm · B3/CoinGecko" e "Atualizar".',
  states: [['auto', 'Cotação automática'], ['manual', 'Valor manual']],
  feats: ['Movimentos: aporte, resgate, rendimento e (no manual) atualização de valor.', 'Aporte com conta tira do saldo e aparece no extrato como "Investimento": não é gasto nem entra no orçamento.', 'Rendimento (dividendo) entra no resultado sem mudar o valor das cotas.', 'Menu ⋯: editar, encerrar ativo (resgata tudo pelo preço atual).'],
  motion: ['"Atualizar" gira o ícone enquanto busca; o valor conta até a nova cotação.'],
  render: (p, st) => {
    const a = DB.ativos.find(x => x.id === p.id) || (st === 'manual' ? DB.ativos[1] : DB.ativos[3]);
    const auto = st === 'manual' ? false : a.auto;
    return `${G.topbar({ title: a.n, sub: `${a.t.split(' · ')[0]} · ${a.inst}`, right: G.cbtn('ellipsis', { sheet: 'ativoMais', label: 'Mais' }) })}
      <div class="col g6 rv"><span class="t-s c3">Valor hoje</span><span class="t-big" id="atVal">${G.count(a.v)}</span>${auto ? `<span class="inst">${ic('radio', 14)}Cotação de 26/11 09:41 · ${a.inst === 'B3' ? 'B3 (via brapi)' : 'CoinGecko'}<button class="link row g4" data-act="refreshQuote" style="margin-left:6px">${ic('refresh-cw', 14)}Atualizar</button></span>` : '<span class="inst">' + ic('pencil', 14) + 'Valor informado por você em 20/11</span>'}</div>
      <div class="card rv"><div class="kv"><div><span class="k">Investido</span><span class="v">${brl(Math.round(a.v / (1 + a.r / 100) * .96))}</span></div><div><span class="k">Resultado</span><span class="v ${a.r < 0 ? 'cbad' : 'cok'}">${a.r < 0 ? '−' : '+'} ${brl(Math.round(a.v * .045))}</span></div><div><span class="k">${auto ? 'Cotas' : 'Rendimentos'}</span><span class="v">${auto ? (a.id === 'btc' ? '0,0123' : a.id === 'itsa' ? '120' : '30') : brl(14800)}</span></div></div>${auto ? `<div class="kv" style="margin-top:14px"><div><span class="k">Preço</span><span class="v">${a.id === 'btc' ? brl(48991300) : a.id === 'itsa' ? brl(1085) : brl(15840)}</span></div><div><span class="k">Preço médio</span><span class="v">${a.id === 'btc' ? brl(45210000) : a.id === 'itsa' ? brl(1012) : brl(15110)}</span></div><div><span class="k">No mês</span><span class="v ${a.r < 0 ? 'cbad' : 'cok'}">${a.r < 0 ? '−' : '+'}${G.pct(Math.abs(a.r))}</span></div></div>` : ''}</div>
      <section class="col g10 rv"><span class="lbl">Movimentos</span><div class="grp">${(auto ? [['arrow-down-to-line', 'Aporte · 10 cotas', '12/11 · Nubank', -158400], ['coins', 'Rendimento', '14/11 · dividendos', 3300], ['arrow-down-to-line', 'Aporte · 20 cotas', '10/08 · Nubank', -301200]] : [['arrow-down-to-line', 'Aporte', '30/10 · Nubank', -50000], ['pencil', 'Valor atualizado', '20/11', 0], ['arrow-down-to-line', 'Aporte', '30/09 · Nubank', -50000], ['arrow-up-from-line', 'Resgate parcial', '02/09 · para Itaú', 120000]]).map(([i, t, m, v]) => G.li({ tag: 'div', icon: i, h: 205, t, m, end: v ? `<span class="amt">${brl(Math.abs(v))}</span>` : '<span class="t-s c3">—</span>' })).join('')}</div></section>
      ${G.linkPanel([{ icon: 'sticky-note', h: 80, t: 'Tese: por que FIIs de logística', m: 'Nota', go: 'nota', p: 'id=n1' }], [])}`;
  },
  fixed: () => `<div class="cta-bar"><button class="btn g" data-sheet="movimento" data-p="t=resgate">Resgatar</button><button class="btn p" data-sheet="movimento" data-p="t=aporte">Aportar</button></div>`
});
G.act('refreshQuote', t => { const s = $('svg', t); if (s) s.classList.add('spin'); setTimeout(() => { if (s) s.classList.remove('spin'); const v = $('#atVal [data-count]'); if (v) G.recount(v, +v.dataset.count + 2190); G.toast('Cotação atualizada · 26/11 09:43', { icon: 'refresh-cw' }); }, G.D(1100)); });
G.sheet('movimento', {
  title: p => p.t === 'resgate' ? 'Resgate' : 'Aporte',
  render: p => `${G.seg([['aporte', 'Aporte'], ['resgate', 'Resgate'], ['rend', 'Rendimento']], p.t === 'resgate' ? 1 : 0)}
    <div class="f2">${G.field('Quantidade de cotas', { v: '10', mode: 'decimal' })}${G.field('Preço por cota', { v: 'R$ 158,40', mode: 'numeric' })}</div>
    <div class="col g4 ai-c">${G.moneyIn('mvVal', 158400)}<span class="t-c c3">Total do movimento</span></div>
    <div class="field"><span class="fl">${p.t === 'resgate' ? 'Vai para' : 'Sai de'}</span>${G.contaChips('nubank', false)}<span class="hint">${ic('info', 16)}<span>Saldo do Nubank: ${brl(481237)}. ${p.t === 'resgate' ? 'O valor entra como "Investimento" no extrato.' : 'Sai como "Investimento": não é gasto nem entra no orçamento.'}</span></span></div>
    <div class="field"><span class="fl">Data</span>${G.chips([['hoje', 'Hoje'], ['ontem', 'Ontem'], ['outra', 'Outra']], ['hoje'])}</div>`,
  foot: p => `<button class="btn p" data-act="closeThen" data-p="msg=${p.t === 'resgate' ? 'Resgate registrado' : 'Aporte registrado'};icon=check;undo=1">Registrar</button>`
});
G.sheet('ativoMais', {
  title: 'Ativo',
  render: () => `<div class="col">${G.li({ lead: `<span class="mi neutral sm">${ic('pencil', 17)}</span>`, t: 'Editar ativo', go: 'novo-ativo', p: 'st=editar' })}${G.li({ lead: `<span class="mi neutral sm">${ic('bell-ring', 17)}</span>`, t: 'Alerta de preço', m: 'Em breve', tag: 'div', noChev: true })}${G.li({ lead: `<span class="mi neutral sm">${ic('circle-stop', 17)}</span>`, t: 'Encerrar ativo', m: 'Resgata todas as cotas pelo preço atual', act: 'closeThen', p: 'msg=Ativo encerrado;icon=circle-stop;undo=1' })}</div>`
});
G.screen('novo-ativo', {
  group: GRP2, name: 'Novo ativo', route: '/financas/investimento/novo', hue: 205, tab: 'inicio', parent: 'investimentos', pad: 'cta g20',
  desc: 'Cadastro do ativo. Ação e FII pedem o código da B3 (conferido na hora); cripto, a moeda por nome ou sigla; o resto é manual.',
  states: [['acao', 'Ação ou FII'], ['cripto', 'Cripto'], ['manual', 'Renda fixa (manual)'], ['editar', 'Editar']],
  feats: ['Tipos: Tesouro, CDB/LCI, Ação, FII, Cripto, Previdência, Outro.', 'Código conferido com a cotação do dia; erro explica o que fazer.', 'Primeiro aporte opcional já no cadastro, saindo de uma conta.'],
  motion: ['Código válido: um visto verde entra no campo com mola e a cotação aparece embaixo.'],
  render: (p, st) => {
    const type = st === 'editar' ? 'acao' : st;
    return `${G.topbar({ title: st === 'editar' ? 'Editar ativo' : 'Novo ativo' })}
      <div class="field"><span class="fl">Tipo</span>${G.chips([['manual', 'Tesouro', 'landmark'], ['cdb', 'CDB / LCI', 'landmark'], ['acao', 'Ação', 'chart-candlestick'], ['fii', 'FII', 'building-2'], ['cripto', 'Cripto', 'bitcoin'], ['prev', 'Previdência', 'shield']], [type === 'acao' ? 'fii' : type], { on: 'assetType' })}</div>
      ${type === 'acao' ? `${G.field('Código na B3', { html: `<div class="inp"><input value="HGLG11" aria-label="Código na B3" style="text-transform:uppercase"><span class="cok row pv">${ic('circle-check', 20)}</span></div>`, hint: `${ic('radio', 14)}CSHG Logística · ${brl(15840)} hoje às 09:41` })}` : type === 'cripto' ? G.field('Moeda', { html: `<div class="inp">${ic('search', 18)}<input value="Bitcoin" aria-label="Moeda"><span class="tag">BTC</span></div>`, hint: `${ic('radio', 14)}${brl(48991300)} hoje às 09:41 · CoinGecko` }) : `${G.field('Nome', { v: 'Tesouro Selic 2029' })}${G.field('Instituição', { v: 'Nubank' })}<div class="field"><span class="fl">Valor atual</span><div class="card tight">${G.moneyIn('naVal', 1284022)}</div><span class="hint">${ic('info', 16)}<span>Sem cotação automática: atualize o valor quando quiser.</span></span></div>`}
      <section class="col g12"><div class="li" style="min-height:56px"><span class="col grow g2"><span class="tt">Registrar o primeiro aporte</span><span class="mm">Sai de uma conta como "Investimento"</span></span>${G.sw(true)}</div>
      <div class="f2">${G.field('Cotas', { v: type === 'cripto' ? '0,0123' : '30', mode: 'decimal' })}${G.field('Preço pago', { v: type === 'cripto' ? 'R$ 452.100,00' : 'R$ 151,10', mode: 'numeric' })}</div>
      <div class="field"><span class="fl">Sai de</span>${G.contaChips('nubank', false)}</div></section>`;
  },
  fixed: (p, st) => `<div class="cta-bar"><button class="btn p" data-act="closeThen" data-p="msg=Ativo salvo;go=investimentos">${st === 'editar' ? 'Salvar' : 'Adicionar ativo'}</button></div>`
});
G.act('assetType', (t, v) => G.setState(v === 'fii' || v === 'acao' ? 'acao' : v === 'cripto' ? 'cripto' : 'manual'));
})();
