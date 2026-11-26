'use strict';
/* Glife · protótipo — núcleo: dados, formatação, componentes, navegação, folhas, avisos e movimento. */
(function () {
const G = window.G = {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
G.$ = $; G.$$ = $$;

/* ---------- movimento ---------- */
const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
G.slow = 1; G.rmUser = false;
G.rm = () => RMQ.matches || G.rmUser;
const E = G.E = { std: 'cubic-bezier(.2,0,0,1)', enter: 'cubic-bezier(.05,.7,.1,1)', exit: 'cubic-bezier(.3,0,.8,.15)', spring: 'cubic-bezier(.34,1.56,.64,1)' };
const D = G.D = ms => Math.round(ms * G.slow);
function motion(el, kf, ms, ease, opt = {}) {
  if (!el || !el.animate) return Promise.resolve();
  let frames = kf, dur = ms;
  if (G.rm()) {
    frames = kf.map(k => ({ opacity: k.opacity === undefined ? 1 : k.opacity }));
    if (frames.every(f => f.opacity === frames[0].opacity)) return Promise.resolve();
    dur = 160; ease = 'linear';
  }
  const a = el.animate(frames, Object.assign({ duration: D(dur), easing: ease, fill: 'both' }, opt, { delay: D(opt.delay || 0) }));
  return a.finished.then(() => a).catch(() => a);
}
G.motion = motion;
function settle(el) { if (el && el.getAnimations) el.getAnimations().forEach(a => a.cancel()); }

/* ---------- formatação ---------- */
const nf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
G.brl = (c, mode) => {
  const s = 'R$ ' + nf.format(Math.abs(c) / 100);
  if (mode === 'auto') return c < 0 ? '− ' + s : c > 0 ? '+ ' + s : s;
  if (mode === 'abs') return s;
  return (c < 0 ? '− ' : '') + s;
};
G.n0 = v => nf0.format(v);
G.pct = v => nf.format(v).replace(/,00$/, '') + '%';
G.esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/* ---------- ícones e mascote ---------- */
G.ic = (n, s = 20, cls = '') => `<i data-lucide="${n}" width="${s}" height="${s}"${cls ? ` class="${cls}"` : ''} aria-hidden="true"></i>`;
G.paint = () => { if (window.lucide && lucide.createIcons) { try { lucide.createIcons({ attrs: { 'stroke-width': 1.5 } }); } catch (e) { /* sem ícones */ } } };
function eye(x, y, rx, ry, mood, a) {
  if (mood === 'feliz') return `<path d="M${x - rx - .6} ${y + 1.2} Q${x} ${y - ry - 1.6} ${x + rx + .6} ${y + 1.2}" style="fill:none;stroke:${a}" stroke-width="2.2" stroke-linecap="round"/>`;
  if (mood === 'pensando') return `<ellipse cx="${x + 1.3}" cy="${y - 1.8}" rx="${rx * .85}" ry="${ry * .85}" style="fill:${a}"/>`;
  if (mood === 'dormindo') return `<path d="M${x - rx - .6} ${y} Q${x} ${y + ry} ${x + rx + .6} ${y}" style="fill:none;stroke:${a}" stroke-width="2.2" stroke-linecap="round"/>`;
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" style="fill:${a}"/>`;
}
G.mascot = (size = 28, color = 'var(--accent)', accent = 'var(--card)', mood = '', cls = '') =>
  `<svg class="mascot ${cls}" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 24 V8 A16 16 0 1 0 40 24 Z" style="fill:${color};stroke:${color}" stroke-width="3" stroke-linejoin="round"/><rect x="24" y="18" width="13" height="7" rx="2.5" style="fill:${color}"/><g class="eyes">${eye(16.5, 28, 2.6, 3.6, mood, accent)}${eye(26.5, 28, 2.6, 3.6, mood, accent)}</g></svg>`;

/* ---------- dados de exemplo ---------- */
const DB = G.DB = {
  user: { nome: 'Rafa' },
  hojeLongo: 'Quinta, 26 de novembro',
  cats: {
    mercado: { n: 'Mercado', i: 'shopping-cart', h: 160, orc: 80000, gasto: 61240, prev: 0 },
    restaurantes: { n: 'Restaurantes', i: 'utensils', h: 25, orc: 40000, gasto: 48630, prev: 0 },
    transporte: { n: 'Transporte', i: 'car', h: 205, orc: 30000, gasto: 21000, prev: 6000 },
    casa: { n: 'Casa', i: 'house', h: 80, orc: 190000, gasto: 165000, prev: 11990 },
    lazer: { n: 'Lazer', i: 'popcorn', h: 305, orc: 25000, gasto: 13250, prev: 0 },
    saude: { n: 'Saúde', i: 'heart-pulse', h: 350, orc: 30000, gasto: 5680, prev: 11990 },
    assinaturas: { n: 'Assinaturas', i: 'repeat', h: 260, orc: 12000, gasto: 7980, prev: 2190 },
    educacao: { n: 'Educação', i: 'graduation-cap', h: 130, orc: 0, gasto: 0, prev: 0 },
    presentes: { n: 'Presentes', i: 'gift', h: 0, orc: 0, gasto: 0, prev: 0 },
    salario: { n: 'Salário', i: 'briefcase', h: 160, entrada: true },
    freela: { n: 'Freela', i: 'laptop', h: 205, entrada: true },
    rendimentos: { n: 'Rendimentos', i: 'trending-up', h: 205, entrada: true }
  },
  contas: [
    { id: 'nubank', n: 'Nubank', t: 'Conta corrente', s: 481237, i: 'landmark', h: 290 },
    { id: 'itau', n: 'Itaú', t: 'Conta corrente', s: 123000, i: 'landmark', h: 45 },
    { id: 'poup', n: 'Poupança Caixa', t: 'Poupança', s: 840000, i: 'piggy-bank', h: 230 },
    { id: 'carteira', n: 'Carteira', t: 'Dinheiro', s: 8650, i: 'wallet', h: 130 }
  ],
  cartoes: [
    { id: 'nucard', n: 'Nubank Ultravioleta', fecha: 3, vence: 10, lim: 600000, fat: 184290, sit: 'aberta', mes: 'dezembro', v: '10/12', f: '03/12', paga: 'Nubank', pago: 0 },
    { id: 'itaucard', n: 'Itaú Click', fecha: 25, vence: 2, lim: 450000, fat: 127640, sit: 'fechada', mes: 'dezembro', v: '02/12', f: '25/11', paga: 'Itaú', pago: 0 }
  ],
  aConfirmar: [
    { id: 'internet', d: 'Internet Vivo Fibra', c: 'casa', v: -11990, quando: 'Venceu em 24/11', atrasado: true, conta: 'Nubank' },
    { id: 'freela', d: 'Freela · site da Clínica Sorriso', c: 'freela', v: 120000, quando: 'Previsto para hoje', conta: 'Nubank' }
  ],
  proximos: [
    { dia: '28/11', d: 'Spotify Família', c: 'assinaturas', v: -2190, rec: true, conta: 'Nubank Ultravioleta' },
    { dia: '30/11', d: 'Academia Smart Fit', c: 'saude', v: -11990, rec: true, conta: 'Nubank' },
    { dia: '30/11', d: 'Aporte Tesouro Selic', c: null, v: -50000, rec: true, conta: 'Nubank', inv: true }
  ],
  lanc: [
    { id: 't1', dia: 'Hoje', d: 'Padaria Pão Quente', c: 'mercado', v: -1850, conta: 'Nubank' },
    { id: 't2', dia: 'Ontem', d: 'Atacadão', c: 'mercado', v: -31860, conta: 'Nubank Ultravioleta', obs: 'Compra do mês', links: true },
    { id: 't3', dia: 'Ontem', d: 'Uber · casa → centro', c: 'transporte', v: -2430, conta: 'Nubank Ultravioleta' },
    { id: 't4', dia: '23/11', d: 'Madero Shopping', c: 'restaurantes', v: -14200, conta: 'Itaú Click' },
    { id: 't5', dia: '22/11', d: 'Drogasil', c: 'saude', v: -5680, conta: 'Nubank' },
    { id: 't6', dia: '20/11', d: 'Rendimento poupança', c: 'rendimentos', v: 4120, conta: 'Poupança Caixa' }
  ],
  ativos: [
    { id: 'selic', n: 'Tesouro Selic 2029', t: 'Tesouro direto', inst: 'Nubank', v: 1284022, r: .87, auto: false, i: 'landmark', h: 205 },
    { id: 'cdb', n: 'CDB Nubank', t: 'CDB · 120% do CDI', inst: 'Nubank', v: 1840000, r: .98, auto: false, i: 'landmark', h: 205 },
    { id: 'prev', n: 'Previdência XP', t: 'Previdência', inst: 'XP', v: 500000, r: .61, auto: false, i: 'shield', h: 160 },
    { id: 'hglg', n: 'HGLG11', t: 'Fundo imobiliário · 30 cotas', inst: 'B3', v: 475200, r: 1.42, auto: true, i: 'building-2', h: 305 },
    { id: 'btc', n: 'Bitcoin', t: 'Cripto · 0,0123 BTC', inst: 'CoinGecko', v: 602593, r: -2.31, auto: true, i: 'bitcoin', h: 55 },
    { id: 'itsa', n: 'ITSA4', t: 'Ação · 120 cotas', inst: 'B3', v: 130200, r: 2.05, auto: true, i: 'chart-candlestick', h: 260 }
  ],
  notas: [
    { id: 'n1', t: 'Ideias para o fim de semana', p: 'Trilha da Pedra Grande, almoço na casa da mãe, terminar o livro.', d: 'Ontem', fix: true, k: 'note', pasta: 'Pessoal', tags: ['passeios'] },
    { id: 'n2', t: 'Compras do mês', p: 'Atacadão no sábado: arroz, feijão, café, ração da Mel.', d: 'Ontem', fix: true, k: 'note', pasta: 'Casa', tags: ['mercado'] },
    { id: 'n3', t: 'Devocional · Salmo 23', p: 'O cuidado de Deus não depende do vale estar vazio.', d: 'Hoje', k: 'devotional', pasta: 'Igreja', tags: ['salmos'] },
    { id: 'n4', t: 'Reunião do condomínio', p: 'Votar a troca do portão e o novo horário da academia.', d: '24/11', k: 'note', pasta: 'Casa', tags: [] },
    { id: 'n5', t: 'Diário · 25 de novembro', p: 'Dia corrido, mas fechei o site da clínica. Dormir mais cedo.', d: '25/11', k: 'journal', pasta: null, tags: [] },
    { id: 'n6', t: 'Presentes de Natal', p: 'Bia: livro de receitas. Pai: carteira de couro. Mãe: vaso.', d: '22/11', k: 'note', pasta: 'Pessoal', tags: ['natal'] },
    { id: 'n7', t: 'Treino A/B', p: 'Agachamento 4×10, remada curvada, prancha 3×40 s.', d: '20/11', k: 'note', pasta: 'Pessoal', tags: ['treino'] }
  ],
  pastas: [{ n: 'Casa', c: 9, h: 80 }, { n: 'Igreja', c: 12, h: 350 }, { n: 'Pessoal', c: 8, h: 305 }, { n: 'Trabalho', c: 5, h: 205 }]
};

/* ---------- componentes (HTML) ---------- */
const ic = G.ic;
G.attrs = (o = {}) => {
  let s = '';
  if (o.go) s += ` data-go="${o.go}"`;
  if (o.p) s += ` data-p="${o.p}"`;
  if (o.act) s += ` data-act="${o.act}"`;
  if (o.sheet) s += ` data-sheet="${o.sheet}"`;
  if (o.back) s += ' data-back';
  if (o.expand) s += ' data-expand';
  if (o.close) s += ' data-close';
  if (o.msg) s += ` data-msg="${G.esc(o.msg)}"`;
  return s;
};
const A = G.attrs;
G.topbar = (o = {}) => `<div class="topbar">${o.left !== undefined ? o.left : `<button class="cbtn" data-back aria-label="Voltar">${ic('chevron-left')}</button>`}<div class="tb-t">${o.title || ''}${o.sub ? `<small>${o.sub}</small>` : ''}</div>${o.right !== undefined ? o.right : '<span style="width:42px"></span>'}</div>`;
G.cbtn = (icon, o = {}) => `<button class="cbtn ${o.cls || ''}"${A(o)} aria-label="${o.label || icon}">${ic(icon)}${o.badge ? '<span class="badge"></span>' : ''}</button>`;
G.hdr = (eb, title, right = '') => `<div class="hdr"><div class="col g2 grow">${eb ? `<span class="eb">${eb}</span>` : ''}<h1 class="t-1">${title}</h1></div>${right}</div>`;
G.sec = (title, action, o = {}) => `<div class="sec-h"><h2 class="t-3">${title}</h2>${action ? `<button class="a"${A(o)}>${action}</button>` : ''}</div>`;
G.mi = (icon, h, cls = '') => `<span class="mi ${cls}" style="--h:${h}">${ic(icon, cls.includes('sm') ? 17 : 19)}</span>`;
G.cat = k => DB.cats[k] || { n: 'Investimento', i: 'trending-up', h: 205 };
G.li = (o) => {
  const tag = o.tag || 'button';
  return `<${tag} class="li ${o.icon || o.lead ? 'hi' : ''} ${o.cls || ''}"${A(o)}${o.id ? ` data-id="${o.id}"` : ''}>${o.lead || (o.icon ? G.mi(o.icon, o.h === undefined ? 260 : o.h, o.miCls || '') : '')}<span class="col grow g2"><span class="tt ${o.ttCls || ''}">${o.t}</span>${o.m ? `<span class="mm ${o.mCls || 'ell'}">${o.m}</span>` : ''}</span>${o.end !== undefined ? o.end : (tag === 'button' && !o.noChev ? `<span class="c4 none">${ic('chevron-right', 18)}</span>` : '')}</${tag}>`;
};
G.amt = (v, o = {}) => `<span class="amt ${v > 0 ? 'in' : ''} ${o.fc ? 'fc' : ''}">${G.brl(v, 'auto')}</span>`;
G.txRow = (t, o = {}) => {
  const c = G.cat(t.c);
  return G.li({ icon: c.i, h: c.h, t: t.d, m: o.m || `${t.dia ? t.dia + ' · ' : ''}${c.n} · ${t.conta}`, end: `<span class="end">${G.amt(t.v, o)}${o.endSub || ''}</span>`, go: o.go || 'lancamento', p: `id=${t.id || ''}`, cls: o.cls || '' });
};
G.seg = (items, on = 0, o = {}) => {
  const n = items.length;
  return `<div class="seg ${o.cls || ''}" role="tablist" data-on="${o.on || ''}"${o.panes ? ` data-panes="${o.panes}"` : ''} style="${o.style || ''}"><span class="s-ind" style="width:calc((100% - ${o.cls && o.cls.includes('pill') ? 6 : 8}px)/${n});transform:translateX(${on * 100}%)"></span>${items.map((it, i) => `<button class="s-i ${i === on ? 'on' : ''}" role="tab" aria-selected="${i === on}" data-act="seg" data-i="${i}" data-v="${G.esc(Array.isArray(it) ? it[0] : it)}">${Array.isArray(it) ? it[1] : it}</button>`).join('')}</div>`;
};
G.chips = (items, on = [], o = {}) => `<div class="chips ${o.cls || ''}" data-mode="${o.multi ? 'multi' : 'single'}"${o.on ? ` data-on="${o.on}"` : ''}>${items.map((it, i) => { const [v, label, icon, h] = Array.isArray(it) ? it : [it, it]; const sel = on.includes(i) || on.includes(v); return `<button class="chip ${sel ? 'on' : ''}" data-act="chip" data-v="${G.esc(v)}" aria-pressed="${sel}">${o.check ? `<span class="ck-mark">${ic('check', 16)}</span>` : ''}${icon ? (h !== undefined ? `<span class="mi" style="--h:${h}">${ic(icon, 14)}</span>` : ic(icon, 16)) : ''}${label}</button>`; }).join('')}</div>`;
G.sw = (on, o = {}) => `<button class="sw ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" data-act="switch"${o.id ? ` id="${o.id}"` : ''}${o.on ? ` data-on="${o.on}"` : ''} aria-label="${o.label || 'Ligar ou desligar'}"></button>`;
G.ck = (on, o = {}) => `<span class="ck ${o.sq ? 'sq' : ''} ${on ? 'on' : ''}">${ic('check', o.sq ? 14 : 15)}</span>`;
G.field = (label, o = {}) => {
  const id = o.id || 'f' + Math.random().toString(36).slice(2, 8);
  const inner = o.html || `<input id="${id}" class="inp ${o.cls || ''}" ${o.type ? `type="${o.type}"` : ''} ${o.mode ? `inputmode="${o.mode}"` : ''} value="${G.esc(o.v || '')}" placeholder="${G.esc(o.ph || '')}" ${o.ac ? `autocomplete="${o.ac}"` : 'autocomplete="off"'} ${o.dis ? 'disabled' : ''}>`;
  return `<div class="field ${o.wrap || ''}"><label for="${id}">${label}</label>${inner}${o.hint ? `<span class="hint ${o.hintCls || ''}">${o.hint}</span>` : ''}</div>`;
};
G.select = (label, value, o = {}) => `<div class="field"><span class="fl">${label}</span><button class="inp"${A(o)}>${o.icon ? `<span class="c3 row">${ic(o.icon, 18)}</span>` : ''}<span class="grow ell">${value}</span><span class="c4 row">${ic(o.chev || 'chevron-down', 18)}</span></button></div>`;
G.bar = (pct, o = {}) => `<div class="bar ${o.cls || ''}" role="img" aria-label="${o.label || Math.round(pct) + '%'}"><i class="${o.fill || ''}" style="width:${Math.min(100, pct)}%"></i>${o.fc ? `<i class="fc" style="width:${Math.max(0, Math.min(100 - Math.min(100, pct), o.fc))}%"></i>` : ''}</div>`;
G.ai = (text, action, o = {}) => `<div class="aib ${o.cls || ''}">${G.mascot(30, 'var(--accent)', 'var(--tonal)', o.mood || 'feliz')}<div class="col g4 grow"><span class="tx">${text}</span>${action ? `<button class="ac self-s"${A(o)}>${action}</button>` : ''}</div></div>`;
G.empty = (title, text, btn, o = {}) => `<div class="empty">${G.mascot(o.size || 72, 'var(--accent)', 'var(--bg)', o.mood || '', 'float')}<h2 class="t-3">${title}</h2><p>${text}</p>${btn ? `<button class="btn ${o.btnCls || 'p'} md"${A(o)}>${btn}</button>` : ''}</div>`;
G.ring = (pct, size = 112, stroke = 10, inner = '', color = '') => {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle class="trk" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/><circle class="val" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - Math.min(1, pct))).toFixed(1)}" data-c="${c.toFixed(1)}" data-pct="${pct}" ${color ? `style="stroke:${color}"` : ''}/></svg><div class="lbl-in">${inner}</div></div>`;
};
G.count = (c, mode = '', cls = '') => `<span class="tn ${cls}" data-count="${c}" data-mode="${mode}">${G.brl(c, mode)}</span>`;
G.money = (label, v, o = {}) => `<div class="col g6 ${o.cls || ''}"><span class="t-s c3">${label}</span><span class="${o.size || 't-big'}">${G.count(v, o.mode || '')}</span>${o.sub || ''}</div>`;
G.photo = (h, kind = 0, extra = '') => {
  const shapes = [
    `<circle cx="72" cy="30" r="12" style="fill:oklch(var(--strong-l) var(--strong-c) ${h});opacity:.5"/><path d="M0 100 L30 58 L52 80 L70 64 L100 100Z" style="fill:oklch(var(--strong-l) var(--strong-c) ${h});opacity:.55"/>`,
    `<rect x="26" y="14" width="48" height="72" rx="4" style="fill:var(--card);opacity:.9"/><path d="M34 28h32M34 38h24M34 48h28M34 66h32" style="stroke:oklch(var(--strong-l) var(--strong-c) ${h})" stroke-width="3" stroke-linecap="round"/>`,
    `<circle cx="50" cy="56" r="26" style="fill:oklch(var(--strong-l) var(--strong-c) ${h});opacity:.35"/><circle cx="50" cy="56" r="14" style="fill:oklch(var(--strong-l) var(--strong-c) ${h});opacity:.55"/>`,
    `<path d="M0 72 Q25 52 50 70 T100 64 V100 H0Z" style="fill:oklch(var(--strong-l) var(--strong-c) ${h});opacity:.5"/><path d="M0 84 Q30 70 60 84 T100 80 V100 H0Z" style="fill:oklch(var(--strong-l) var(--strong-c) ${h});opacity:.6"/>`
  ];
  return `<span class="photo" style="--h:${h}"><svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${shapes[kind % 4]}</svg>${extra}</span>`;
};

/* ---------- registro de telas e folhas ---------- */
const SCR = G.SCR = {};
const SH = G.SH = {};
const ACT = G.ACT = {};
G.GROUPS = [];
G.screen = (id, def) => { SCR[id] = Object.assign({ id }, def); if (!G.GROUPS.includes(def.group)) G.GROUPS.push(def.group); };
G.sheet = (id, def) => { SH[id] = def; };
G.act = (name, fn) => { ACT[name] = fn; };

/* ---------- navegação ---------- */
const NAV = G.NAV = { stack: [], tab: 'inicio' };
const TABS = [
  { id: 'inicio', l: 'Início', i: 'house' },
  { id: 'agenda', l: 'Agenda', i: 'calendar-check' },
  { id: 'add' },
  { id: 'notas', l: 'Notas', i: 'sticky-note' },
  { id: 'ia', l: 'IA', mascot: true }
];
let app, stackEl, layer, toastsEl, tabbar;
const cur = G.cur = () => NAV.stack[NAV.stack.length - 1];
function parseP(s) {
  const o = {};
  if (!s) return o;
  s.split(';').forEach(kv => { const i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); });
  return o;
}
G.parseP = parseP;
function defState(d) { return d.states ? d.states[0][0] : ''; }
function build(id, p = {}) {
  const d = SCR[id];
  const st = p.st || defState(d);
  const el = document.createElement('section');
  el.className = 'scr' + (d.ink ? ' ink' : '');
  el.dataset.id = id;
  el.setAttribute('aria-label', d.name);
  const body = d.render(p, st);
  el.innerHTML = (d.full ? body : `<div class="scroll"><div class="pad ${d.pad || ''}">${body}</div></div>`) + (d.fixed ? d.fixed(p, st) : '') + '<div class="dimmer"></div>';
  return el;
}
function stagger(el) {
  $$('.rv,.pv', el).forEach((n, i) => { if (!n.style.animationDelay) n.style.animationDelay = D(Math.min(i, 6) * 70) + 'ms'; });
}
function counts(el) {
  if (G.still) return;
  $$('[data-count]', el).forEach(n => {
    const to = +n.dataset.count; const from = n.dataset.from !== undefined ? +n.dataset.from : Math.round(to * .86);
    countTo(n, from, to, n.dataset.mode || '');
  });
}
function countTo(n, from, to, mode, ms = 700) {
  if (G.rm() || from === to) { n.textContent = G.brl(to, mode); return; }
  const t0 = performance.now(), dur = D(ms);
  const step = t => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    n.textContent = G.brl(Math.round(from + (to - from) * e), mode);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
G.countTo = countTo;
G.recount = (el, to) => { const from = +el.dataset.count; el.dataset.count = to; countTo(el, from, to, el.dataset.mode || ''); };
function mount(el) {
  const id = el.dataset.id, entry = NAV.stack.find(s => s.el === el);
  G.paint(); stagger(el); counts(el);
  const d = SCR[id];
  if (d.mount) d.mount(el, entry ? entry.p : {}, entry ? (entry.p.st || defState(d)) : '');
}
G.mountEl = el => { G.paint(); stagger(el); counts(el); };

function go(id, p = {}, how = 'push') {
  const d = SCR[id];
  if (!d) return;
  if (d.root && how === 'push') { tab(d.tab, p); return; }
  if (sheetOpen) closeSheet();
  const prev = cur();
  const el = build(id, p);
  stackEl.appendChild(el);
  NAV.stack.push({ id, p, el });
  mount(el);
  syncChrome();
  if (!prev) return;
  if (how === 'push') {
    settle(prev.el);
    motion(el, [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], 420, E.std, { fill: 'backwards' });
    motion(prev.el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-30%)' }], 420, E.std, { fill: 'forwards' }).then(() => { if (cur() && cur().el !== prev.el) prev.el.style.visibility = 'hidden'; });
    motion($('.dimmer', prev.el), [{ opacity: 0 }, { opacity: 1 }], 420, E.std, { fill: 'forwards' });
  } else if (how === 'fade') {
    motion(el, [{ opacity: 0 }, { opacity: 1 }], 240, E.std, { fill: 'backwards' }).then(() => { prev.el.style.visibility = 'hidden'; });
  } else { prev.el.style.visibility = 'hidden'; }
}
G.go = go;
function back() {
  if (sheetOpen) { closeSheet(); return; }
  if (NAV.stack.length < 2) return;
  const top = NAV.stack.pop(), prev = cur();
  prev.el.style.visibility = '';
  settle(prev.el); settle($('.dimmer', prev.el));
  syncChrome();
  motion(prev.el, [{ transform: 'translateX(-30%)' }, { transform: 'translateX(0)' }], 380, E.std, { fill: 'backwards' });
  motion($('.dimmer', prev.el), [{ opacity: 1 }, { opacity: 0 }], 380, E.std, { fill: 'backwards' });
  motion(top.el, [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }], 380, E.std, { fill: 'forwards' }).then(() => top.el.remove());
  const d = SCR[prev.id]; if (d.onBack) d.onBack(prev.el);
}
G.back = back;
function rootOf(tabId) { return Object.values(SCR).find(s => s.root && s.tab === tabId); }
function tab(tabId, p = {}) {
  const r = rootOf(tabId); if (!r) return;
  if (sheetOpen) closeSheet(true);
  const old = NAV.stack.slice();
  NAV.tab = tabId;
  NAV.stack = [];
  const el = build(r.id, p);
  stackEl.appendChild(el);
  NAV.stack.push({ id: r.id, p, el });
  mount(el);
  syncChrome();
  old.forEach(s => { motion(s.el, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }], 120, E.exit, { fill: 'forwards' }).then(() => s.el.remove()); });
  if (old.length) motion(el, [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)' }], 300, E.enter, { delay: 110, fill: 'backwards' });
}
G.tab = tab;
function jump(id, st, still) {
  const d = SCR[id]; if (!d) return;
  if (sheetOpen) closeSheet(true);
  const old = NAV.stack.slice();
  NAV.stack = [];
  if (d.tab) NAV.tab = d.tab;
  const chain = [];
  if (!d.root && d.tab) { const r = rootOf(d.tab); if (r) chain.push(r.id); }
  if (d.parent && d.parent !== (chain[0] || '')) chain.push(d.parent);
  chain.push(id);
  chain.forEach((cid, i) => {
    const p = (i === chain.length - 1 && st) ? { st } : {};
    const el = build(cid, p);
    stackEl.appendChild(el);
    NAV.stack.push({ id: cid, p, el });
    if (i < chain.length - 1) el.style.visibility = 'hidden';
    else mount(el);
  });
  const top = cur().el;
  syncChrome();
  old.forEach(s => motion(s.el, [{ opacity: 1 }, { opacity: 0 }], 160, E.exit, { fill: 'forwards' }).then(() => s.el.remove()));
  if (!still) motion(top, [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'scale(1)' }], 320, E.enter, { delay: 80, fill: 'backwards' });
  // as telas abaixo da pilha só são montadas quando o usuário voltar a elas
  NAV.stack.slice(0, -1).forEach(s => { s.lazy = true; });
}
G.jump = jump;
G.onBackMount = () => { const c = cur(); if (c && c.lazy) { c.lazy = false; mount(c.el); } };
function rerender(p, how = 'fade') {
  const c = cur(); if (!c) return;
  const el = build(c.id, p);
  c.el.replaceWith(el); c.el = el; c.p = p;
  mount(el); syncChrome();
  if (how === 'fade') motion(el, [{ opacity: .3 }, { opacity: 1 }], 220, E.std, { fill: 'backwards' });
}
G.rerender = rerender;
G.setState = st => rerender(Object.assign({}, cur().p, { st }));

/* expansão: o cartão cresce até virar a tela */
function expandTo(src, id, p) {
  if (G.rm()) { go(id, p, 'fade'); return; }
  const ar = app.getBoundingClientRect(), s = ar.width / app.offsetWidth;
  const r = src.getBoundingClientRect();
  const x = document.createElement('div');
  x.className = 'xp';
  const cs = getComputedStyle(src);
  const bg = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : getComputedStyle(app).getPropertyValue('--card');
  Object.assign(x.style, { left: (r.left - ar.left) / s + 'px', top: (r.top - ar.top) / s + 'px', width: r.width / s + 'px', height: r.height / s + 'px', borderRadius: cs.borderRadius || '24px', background: bg });
  app.appendChild(x);
  src.style.visibility = 'hidden';
  const W = app.offsetWidth, H = app.offsetHeight;
  motion(x, [{}, { left: '0px', top: '0px', width: W + 'px', height: H + 'px', borderRadius: '48px', background: getComputedStyle(app).getPropertyValue('--bg') }], 500, E.std, { fill: 'forwards' }).then(() => {
    go(id, p, 'none');
    const el = cur().el;
    motion(el, [{ opacity: 0 }, { opacity: 1 }], 220, E.std, { fill: 'backwards' }).then(() => { x.remove(); src.style.visibility = ''; });
  });
}

/* ---------- folhas ---------- */
let sheetOpen = null;
G.isSheet = () => sheetOpen;
function openSheet(id, p = {}) {
  const d = SH[id]; if (!d) return;
  if (sheetOpen) closeSheet(true);
  const title = typeof d.title === 'function' ? d.title(p) : d.title;
  layer.innerHTML = `<div class="scrim" data-close></div><div class="sheet ${d.cls || ''}" role="dialog" aria-modal="true" aria-label="${G.esc(title || '')}"><div class="grab"></div>${title ? `<div class="sh-h"><h2 class="t-3">${title}</h2><button class="cbtn sm" data-close aria-label="Fechar">${ic('x', 18)}</button></div>` : ''}<div class="sh-b">${d.render(p)}</div>${d.foot ? `<div class="sh-f">${d.foot(p)}</div>` : ''}</div>`;
  layer.hidden = false;
  sheetOpen = { id, p };
  G.paint();
  const sh = $('.sheet', layer);
  stagger(sh); counts(sh);
  motion($('.scrim', layer), [{ opacity: 0 }, { opacity: 1 }], 300, 'linear', { fill: 'backwards' });
  if (G.isWeb()) motion(sh, [{ opacity: 0, transform: 'translateY(16px) scale(.98)' }, { opacity: 1, transform: 'none' }], 300, E.enter, { fill: 'backwards' });
  else motion(sh, [{ transform: 'translateY(104%)' }, { transform: 'translateY(0)' }], 400, E.enter, { fill: 'backwards' });
  if (d.mount) d.mount(sh, p);
  if (d.fab) $('.fab', tabbar) && $('.fab', tabbar).classList.add('open');
}
G.openSheet = openSheet;
function closeSheet(instant) {
  if (!sheetOpen) return Promise.resolve();
  const d = SH[sheetOpen.id];
  sheetOpen = null;
  const fab = $('.fab', tabbar); if (fab) fab.classList.remove('open');
  if (instant) { layer.hidden = true; layer.innerHTML = ''; return Promise.resolve(); }
  const sh = $('.sheet', layer), sc = $('.scrim', layer);
  motion(sc, [{ opacity: 1 }, { opacity: 0 }], 240, 'linear', { fill: 'forwards' });
  return motion(sh, G.isWeb() ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px) scale(.98)' }] : [{ transform: 'translateY(0)' }, { transform: 'translateY(104%)' }], G.isWeb() ? 200 : 240, E.exit, { fill: 'forwards' }).then(() => { if (!sheetOpen) { layer.hidden = true; layer.innerHTML = ''; } if (d && d.onClose) d.onClose(); });
}
G.closeSheet = closeSheet;

/* ---------- aviso (toast) ---------- */
let toastTimer;
function toast(msg, o = {}) {
  clearTimeout(toastTimer);
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `${o.icon ? `<span class="row" style="color:var(--inverse-2)">${ic(o.icon, 18)}</span>` : ''}<span class="grow">${msg}</span>${o.undo ? '<button class="ta">Desfazer</button>' : ''}`;
  toastsEl.replaceChildren(t);
  G.paint();
  motion(t, [{ transform: 'translateY(140%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], 480, E.spring, { fill: 'backwards' });
  const hide = () => motion(t, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(140%)', opacity: 0 }], 220, E.exit, { fill: 'forwards' }).then(() => t.remove());
  if (o.undo) $('.ta', t).addEventListener('click', () => { clearTimeout(toastTimer); o.undo(); hide(); });
  toastTimer = setTimeout(hide, D(4000));
}
G.toast = toast;

/* ---------- recolher linha (concluir, pular, excluir) ---------- */
G.collapse = (row, ms = 300) => {
  const h = row.offsetHeight;
  return motion(row, [{ height: h + 'px', opacity: 1 }, { height: h + 'px', opacity: .0, offset: .45 }, { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px', minHeight: '0px' }], ms, E.std, { fill: 'forwards' }).then(() => { row.style.display = 'none'; });
};
G.uncollapse = row => { settle(row); row.style.display = ''; motion(row, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], 300, E.enter, { fill: 'backwards' }); };
G.shake = el => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };

/* ---------- cromado: barra de abas, índice, ficha ---------- */
function buildTabbar() {
  tabbar.innerHTML = '<span class="tb-ind"></span>' + TABS.map(t => t.id === 'add'
    ? `<div class="tb-c"><button class="fab" data-act="fab" aria-label="Capturar: anotar, lançar ou lembrar">${ic('plus', 24)}</button></div>`
    : `<button class="tb-i" data-tab="${t.id}" aria-label="${t.l}"><span class="ic">${t.mascot ? G.mascot(22, 'currentColor', 'var(--card)') : ic(t.i, 22)}</span><span>${t.l}</span></button>`).join('');
}
const NAVWEB = [['inicio', 'Início'], ['agenda', 'Agenda'], ['notas', 'Notas'], ['financas', 'Finanças'], ['biblia', 'Bíblia'], ['ia', 'Glife IA']];
function buildTopnav() {
  const tn = $('#topnav'); if (!tn) return;
  tn.innerHTML = `<span class="row g8 ai-c none">${G.mascot(26, 'var(--accent)', 'var(--bg)')}<b style="font-size:19px;font-weight:600;letter-spacing:-.6px">Glife</b></span><div class="tn-l">${NAVWEB.map(([id, l]) => `<button class="tn-a" data-act="navTo" data-v="${id}">${l}</button>`).join('')}</div><button class="tn-s" data-go="busca">${ic('search', 18)}<span class="grow" style="text-align:left">Buscar</span><span class="kbd">Ctrl K</span></button><button class="btn p sm" data-act="fab" style="width:40px;height:40px;padding:0;border-radius:14px" aria-label="Capturar">${ic('plus', 20)}</button>`;
}
G.act('navTo', (t) => { const id = t.dataset.v; const d = SCR[id]; if (!d) return; if (d.root) tab(d.tab); else jump(id); });
function section(d) {
  if (d.id === 'ia' || d.id === 'conversas') return 'ia';
  if (d.group === 'Finanças' || d.group === 'Compras e investimentos') return 'financas';
  if (d.group === 'Bíblia e devocionais') return 'biblia';
  if (d.group === 'Notas') return 'notas';
  if (d.tab === 'agenda') return 'agenda';
  return 'inicio';
}
G.isWeb = () => !!(app && app.classList.contains('web'));
function placeInd() {
  const ind = $('.tb-ind', tabbar), on = $('.tb-i.on', tabbar);
  if (!on) { ind.style.opacity = 0; return; }
  ind.style.opacity = 1;
  ind.style.transform = `translateX(${on.offsetLeft + on.offsetWidth / 2 - 26}px)`;
}
function syncChrome() {
  const c = cur(); if (!c) return;
  const d = SCR[c.id];
  const showTabs = !!d.root && !(d.noTabs && d.noTabs(c.p.st || defState(d)));
  const sec = section(d);
  $$('.tn-a', document).forEach(b => b.classList.toggle('on', b.dataset.v === sec));
  const url = $('#urlBar'); if (url) url.textContent = 'glife.app' + (d.route ? d.route.split(' ')[0].replace(/^\/$/, '') : '');
  tabbar.classList.toggle('away', !showTabs);
  toastsEl.classList.toggle('low', !showTabs);
  $$('.tb-i', tabbar).forEach(b => b.classList.toggle('on', b.dataset.tab === NAV.tab && showTabs));
  placeInd();
  // índice e ficha
  $$('.idx-b', document).forEach(b => b.classList.toggle('on', b.dataset.id === c.id));
  const onB = $('.idx-b.on'); if (onB && G.booted) onB.scrollIntoView({ block: 'nearest' });
  renderNotes(c.id, c.p.st || defState(d));
  const mt = $('#mTitle'); if (mt) mt.textContent = d.name;
  try { if (location.hash.slice(1) !== c.id) history.replaceState(null, '', '#' + c.id); } catch (e) { /* sem histórico */ }
}
G.syncChrome = syncChrome;
function renderNotes(id, st) {
  const d = SCR[id], n = $('#notes');
  if (!n || !d) return;
  const li = arr => `<ul class="nt-ul">${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;
  n.innerHTML = `<div class="nt-card"><span class="nt-eb">${d.group}</span><h2 class="nt-t">${d.name}</h2>${d.route ? `<span class="nt-r">${d.route}</span>` : ''}${d.desc ? `<p class="nt-d">${d.desc}</p>` : ''}${d.states ? `<span class="nt-h">Estados</span><div class="nt-states">${d.states.map(([k, l]) => `<button class="nt-st ${k === st ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div>` : ''}${d.feats ? `<span class="nt-h">Regras e conteúdo</span>${li(d.feats)}` : ''}${d.motion ? `<span class="nt-h">Movimento</span>${li(d.motion)}` : ''}</div>`;
  $$('.nt-st', n).forEach(b => b.addEventListener('click', () => G.setState(b.dataset.st)));
}
function buildIndex(filter = '') {
  const f = filter.trim().toLowerCase();
  const idx = $('#idx');
  let total = 0;
  idx.innerHTML = G.GROUPS.map(g => {
    const items = Object.values(SCR).filter(s => s.group === g && !s.hidden && (!f || (s.name + ' ' + g).toLowerCase().includes(f)));
    total += items.length;
    if (!items.length) return '';
    return `<div class="idx-g"><div class="idx-h">${g}<span>${items.length}</span></div>${items.map(s => `<button class="idx-b" data-id="${s.id}" style="--h:${s.hue === undefined ? 260 : s.hue}"><span class="dot"></span>${s.name}</button>`).join('')}</div>`;
  }).join('') || '<p class="legend">Nenhuma tela com esse nome.</p>';
  $$('.idx-b', idx).forEach(b => b.addEventListener('click', () => { jump(b.dataset.id); closeSide(); }));
  const c = cur(); if (c) $$('.idx-b', idx).forEach(b => b.classList.toggle('on', b.dataset.id === c.id));
  return total;
}
function closeSide() { const s = $('#side'); if (s) s.classList.remove('open'); const sc = $('.scrim-side'); if (sc) sc.remove(); }

/* ---------- ações genéricas ---------- */
G.act('seg', (t) => {
  const seg = t.closest('.seg'); const i = +t.dataset.i;
  $$('.s-i', seg).forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', j === i); });
  $('.s-ind', seg).style.transform = `translateX(${i * 100}%)`;
  if (seg.dataset.panes) {
    const host = seg.closest('.scr, .sheet') || document;
    const panes = $$(`[data-pane-of="${seg.dataset.panes}"]`, host);
    panes.forEach((p, j) => {
      const show = j === i;
      if (show && p.hidden) { p.hidden = false; G.paint(); stagger(p); motion(p, [{ opacity: 0, transform: `translateX(${j > (+seg.dataset.last || 0) ? 24 : -24}px)` }, { opacity: 1, transform: 'none' }], 300, E.enter, { fill: 'backwards' }); }
      else if (!show) p.hidden = true;
    });
    seg.dataset.last = i;
  }
  if (seg.dataset.on && ACT[seg.dataset.on]) ACT[seg.dataset.on](t, t.dataset.v, i);
});
G.act('chip', (t) => {
  const box = t.closest('.chips');
  if (box.dataset.mode === 'multi') { t.classList.toggle('on'); t.setAttribute('aria-pressed', t.classList.contains('on')); }
  else { $$('.chip', box).forEach(c => { c.classList.toggle('on', c === t); c.setAttribute('aria-pressed', c === t); }); }
  if (box.dataset.on && ACT[box.dataset.on]) ACT[box.dataset.on](t, t.dataset.v);
});
G.act('switch', (t) => { t.classList.toggle('on'); t.setAttribute('aria-checked', t.classList.contains('on')); if (t.dataset.on && ACT[t.dataset.on]) ACT[t.dataset.on](t, t.classList.contains('on')); });
G.act('toast', (t) => toast(t.dataset.msg, { icon: 'check' }));
G.act('radio', (t) => { const g = t.closest('[data-radios]'); $$('[data-act="radio"]', g).forEach(r => r.classList.toggle('on', r === t)); if (g.dataset.on && ACT[g.dataset.on]) ACT[g.dataset.on](t, t.dataset.v); });
G.act('state', (t) => G.setState(t.dataset.v));
G.act('fab', () => { if (sheetOpen && sheetOpen.id === 'capturar') closeSheet(); else openSheet('capturar'); });
G.act('task', (t) => {
  const row = t.closest('.li'); const on = !row.classList.contains('done');
  row.classList.toggle('done', on); const ck = $('.ck', row); if (ck) ck.classList.toggle('on', on);
  if (t.dataset.msg && on) toast(t.dataset.msg, { icon: 'check', undo: () => { row.classList.remove('done'); if (ck) ck.classList.remove('on'); } });
});
G.act('closeThen', (t) => { const p = parseP(t.dataset.p); closeSheet().then(() => { if (p.msg) toast(p.msg, { icon: p.icon || 'check', undo: p.undo ? () => toast('Desfeito', { icon: 'undo-2' }) : null }); if (p.go) { const s = NAV.stack; if (s.length > 1 && s[s.length - 2].id === p.go) { back(); G.onBackMount(); } else go(p.go, p); } }); });
G.act('noop', () => {});

/* ---------- tema e controles da página ---------- */
G.theme = 'system';
function applyTheme(v) {
  G.theme = v;
  const root = document.documentElement;
  if (v === 'system') delete root.dataset.theme; else root.dataset.theme = v;
  try { localStorage.setItem('glife-theme', v); } catch (e) { /* armazenamento bloqueado */ }
  const sw = $('#themeSw'); const order = ['light', 'dark', 'system'];
  if (sw) { $$('button', sw).forEach(b => b.classList.toggle('on', b.dataset.v === v)); $$('button', sw).forEach(b => b.setAttribute('aria-checked', b.dataset.v === v)); const i = order.indexOf(v); $('.ind', sw).style.width = 'calc((100% - 6px)/3)'; $('.ind', sw).style.transform = `translateX(${i * 100}%)`; }
  $$('.seg[data-on="themeSeg"]', app).forEach(seg => { const i = order.indexOf(v); $$('.s-i', seg).forEach((b, j) => b.classList.toggle('on', j === i)); $('.s-ind', seg).style.transform = `translateX(${i * 100}%)`; });
}
G.applyTheme = applyTheme;
G.act('themeSeg', (t, v) => applyTheme(v));

G.web = false;
function fitPhone() {
  const wrap = $('#phoneWrap'), ph = $('#phone');
  const web = G.web && innerWidth > 860;
  ph.classList.toggle('web', web); app.classList.toggle('web', web);
  if (innerWidth <= 860) { app.classList.add('bare'); wrap.style.width = ''; wrap.style.height = ''; return; }
  app.classList.remove('bare');
  const W = web ? 1180 : 410, H = web ? 800 : 864;
  const availH = innerHeight - 48, availW = $('.stage').clientWidth - 32;
  const s = Math.max(web ? .38 : .55, Math.min(1, availH / H, availW / W));
  ph.style.transform = `scale(${s})`;
  wrap.style.width = W * s + 'px'; wrap.style.height = H * s + 'px';
}
function setDevice(v) {
  G.web = v === 'web';
  document.body.classList.toggle('webmode', G.web);
  try { localStorage.setItem('glife-device', v); } catch (e) { /* sem armazenamento */ }
  const sw = $('#devSw'); if (sw) { $$('button', sw).forEach(b => { b.classList.toggle('on', b.dataset.v === v); b.setAttribute('aria-checked', b.dataset.v === v); }); $('.ind', sw).style.width = 'calc((100% - 6px)/2)'; $('.ind', sw).style.transform = `translateX(${v === 'web' ? 100 : 0}%)`; }
  if (app) { fitPhone(); if (sheetOpen) closeSheet(true); syncChrome(); requestAnimationFrame(placeInd); }
}
G.setDevice = setDevice;

G.boot = () => {
  app = $('#app'); stackEl = $('#stack'); layer = $('#layer'); toastsEl = $('#toasts'); tabbar = $('#tabbar');
  G.app = app;
  $('#brandMark').innerHTML = G.mascot(36, 'var(--accent)', 'var(--canvas)');
  buildTabbar();
  buildTopnav();
  buildIndex();
  let saved = 'system'; try { saved = localStorage.getItem('glife-theme') || 'system'; } catch (e) { /* sem armazenamento */ }
  $$('#themeSw button').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.v)));
  applyTheme(saved);
  const rmSync = () => document.documentElement.classList.toggle('rm', G.rm());
  RMQ.addEventListener && RMQ.addEventListener('change', rmSync); rmSync();
  $('#rmSw').checked = RMQ.matches; $('#rmSw').addEventListener('change', e => { G.rmUser = e.target.checked; rmSync(); });
  $('#slowSw').addEventListener('change', e => { G.slow = e.target.checked ? 3 : 1; document.documentElement.style.setProperty('--slow', G.slow); });
  $('#findIn').addEventListener('input', e => buildIndex(e.target.value));
  $('#openSide').addEventListener('click', () => { $('#side').classList.add('open'); const sc = document.createElement('div'); sc.className = 'scrim-side'; sc.addEventListener('click', closeSide); document.body.appendChild(sc); });
  $('#mNotes').addEventListener('click', () => $('#notes').scrollIntoView({ behavior: G.rm() ? 'auto' : 'smooth' }));

  app.addEventListener('click', e => {
    const t = e.target.closest('[data-close],[data-back],[data-tab],[data-act],[data-sheet],[data-go]');
    if (!t || !app.contains(t)) return;
    if (t.hasAttribute('data-close')) { closeSheet(); return; }
    if (t.hasAttribute('data-back')) { back(); G.onBackMount(); return; }
    if (t.dataset.tab) { if (t.dataset.tab === 'ia') go('ia'); else if (NAV.tab !== t.dataset.tab || NAV.stack.length > 1) tab(t.dataset.tab); return; }
    if (t.dataset.act) { const f = ACT[t.dataset.act]; if (f) f(t, parseP(t.dataset.p), e); return; }
    if (t.dataset.sheet) { openSheet(t.dataset.sheet, parseP(t.dataset.p)); return; }
    if (t.dataset.go) {
      const p = parseP(t.dataset.p);
      if (sheetOpen) { closeSheet().then(() => go(t.dataset.go, p)); return; }
      if (t.hasAttribute('data-expand')) { expandTo(t, t.dataset.go, p); return; }
      go(t.dataset.go, p);
    }
  });
  app.addEventListener('keydown', e => { if (e.key === 'Escape') { if (sheetOpen) closeSheet(); else { back(); G.onBackMount(); } } });
  addEventListener('resize', () => { fitPhone(); placeInd(); syncChrome(); });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!cur() || cur().id !== 'busca') go('busca'); } });
  let dev = 'phone'; try { dev = localStorage.getItem('glife-device') || 'phone'; } catch (e) { /* sem armazenamento */ }
  $$('#devSw button').forEach(b => b.addEventListener('click', () => setDevice(b.dataset.v)));
  setDevice(dev);
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (SCR[h] && (!cur() || cur().id !== h)) jump(h); });
  fitPhone();
  const h = location.hash.slice(1);
  G.still = true;
  if (SCR[h]) jump(h, undefined, true); else tab('inicio');
  G.still = false;
  cur().el.classList.add('still');
  G.paint();
  G.booted = true;
};
})();
