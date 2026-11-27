'use strict';
/* Início, busca universal, captura (+), caixa de entrada e conversa com a Glife IA. */
(function () {
const { ic, mascot, esc, $, $$, motion, E, DB, brl } = G;
const GRP = 'Início e IA';

/* ---------- Início ---------- */
const task = (t, meta, time, done, mod, msg) => `<div class="li sm ${done ? 'done' : ''}" style="min-height:56px"><button class="noscale" data-act="task" ${msg ? `data-msg="${esc(msg)}"` : ''} aria-label="Concluir ${esc(t)}" style="display:flex">${G.ck(done)}</button><span class="col grow g2"><span class="tt"><span class="st">${t}</span></span><span class="mm">${meta}</span></span><span class="ptime ${done ? 'c3' : ''}">${time}</span></div>`;
const tiles = () => `<div class="tiles">${[['notas', 'Notas', 'sticky-note', 80, 'notas'], ['agenda', 'Agenda', 'calendar-check', 25, 'agenda'], ['financas', 'Finanças', 'wallet', 160, 'financas'], ['investimentos', 'Investir', 'trending-up', 205, 'investimentos'], ['biblia', 'Bíblia', 'book-open', 350, 'biblia'], ['dieta', 'Dieta', 'salad', 130, 'dieta'], ['compras', 'Compras', 'shopping-basket', 55, 'compras'], ['galeria', 'Galeria', 'images', 240, 'galeria']].map(([k, l, i, h, go]) => `<button class="tile pv" data-go="${go}"><span class="mi" style="--h:${h}">${ic(i, 24)}</span><span>${l}</span></button>`).join('')}</div>`;
const notePinned = n => `<button class="card tight col g8 ai-s m-notas" data-go="nota" data-p="id=${n.id}" data-expand style="background:oklch(var(--soft-l) var(--soft-c) 80);text-align:left;border-radius:22px"><span style="color:oklch(var(--strong-l) var(--strong-c) 80);display:flex">${ic('pin', 18)}</span><span class="t-e" style="font-size:15px;line-height:20px">${n.t}</span><span class="t-s c2" style="font-size:13px;line-height:19px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${n.p}</span><span class="t-c c3">${n.d}</span></button>`;
G.notePinned = notePinned;

G.screen('inicio', {
  group: GRP, name: 'Início', route: '/ (aba Início)', root: true, tab: 'inicio', hue: 260,
  desc: 'A tela que abre o app: um resumo calmo do dia para olhar em 5 segundos. A IA fica no topo, depois o que fazer hoje, o mês em números e atalhos para cada espaço.',
  states: [['cheio', 'Dia cheio'], ['inicial', 'Poucos módulos'], ['primeiro', 'Primeiro uso']],
  feats: ['Para hoje junta compromissos e lembretes da Agenda, com o horário em pílula; concluir risca o item.', 'Mês até agora: gasto contra o orçamento, com o previsto listrado na mesma barra; a cor de alerta só aparece se uma categoria estourar.', 'Próxima refeição e devocional do dia lado a lado; o trecho bíblico usa a fonte de leitura.', 'Caixa de entrada mostra o que a IA ainda não organizou.', 'Notas fixadas em grade, recentes em lista. Blocos de módulos não configurados ficam recolhidos numa linha só.'],
  motion: ['Blocos entram em cascata (sobem 18 px, +70 ms cada, no máximo 6).', 'Valores contam até o número ao abrir.', 'Concluir: o círculo enche, o visto entra com mola e o texto é riscado da esquerda para a direita.', 'Tocar numa nota fixada faz o cartão crescer até virar a nota (500 ms).'],
  render: (p, st) => {
    const head = G.hdr(DB.hojeLongo, `Bom dia, ${DB.user.nome}`, `<div class="row g8">${G.cbtn('search', { go: 'busca', label: 'Buscar' })}${G.cbtn('bell', { go: 'notificacoes', label: 'Notificações', badge: true })}${G.cbtn('settings', { go: 'ajustes', label: 'Ajustes' })}</div>`);
    const ask = `<button class="askbar rv" data-go="ia">${mascot(28, 'var(--accent)', 'var(--card)')}<span class="ph">Pergunte, anote ou lembre…</span><span class="mic">${ic('mic')}</span></button>`;
    if (st === 'primeiro') return `${head.replace(`Bom dia, ${DB.user.nome}`, `Boas-vindas, ${DB.user.nome}`)}${ask}
      <div class="card col g16 rv"><div class="row g14 ai-c">${mascot(52, 'var(--accent)', 'var(--card)', 'feliz', 'float')}<div class="col g2"><span class="t-3">Tudo pronto</span><span class="t-s c3">Três passos para o Glife ficar com a sua cara.</span></div></div>
        <div class="col">${G.li({ lead: '<span class="mi dash">' + ic('sticky-note', 19) + '</span>', t: 'Escreva sua primeira nota', m: 'Ideias, listas, diário', go: 'nota-nova' })}${G.li({ lead: '<span class="mi dash">' + ic('wallet', 19) + '</span>', t: 'Adicione uma conta', m: 'Para ver saldo e previsão', go: 'nova-conta' })}${G.li({ lead: '<span class="mi dash">' + ic('book-open', 19) + '</span>', t: 'Escolha um plano de leitura', m: 'Bíblia Livre, sem custo', go: 'biblia' })}</div></div>
      <div class="col g12 rv">${G.sec('Seus espaços')}${tiles()}</div>`;
    const inicial = st === 'inicial';
    return `${head}${ask}
      <section class="col g12 rv">${G.sec('Para hoje', inicial ? '' : 'Ver agenda', { act: 'goTab', p: 'tab=agenda' })}
        ${inicial ? `<div class="grp"><div class="li"><span class="mini-empty grow">${ic('calendar', 18)}Nada marcado para hoje.</span><button class="btn t sm" data-go="evento">Adicionar</button></div></div>` : `<div class="grp">${task('Pagar internet', 'Finanças · R$ 119,90', '10:00', false, 'financas', 'Lembrete concluído')}${task('Ler Salmos 23', 'Bíblia · plano, dia 23', '07:30', true)}${task('Consulta no dentista', 'Evento · Clínica Sorriso', '14:30', false, '', 'Marcado como feito')}</div><button class="t-s c3 self-s" data-act="goTab" data-p="tab=agenda">e mais 1 hoje · Culto de jovens às 19:30</button>`}
      </section>
      ${inicial ? `<section class="grp rv"><button class="li hi" data-go="nova-conta"><span class="mi dash">${ic('wallet', 19)}</span><span class="col grow g2"><span class="tt">Finanças</span><span class="mm">Adicione uma conta para ver o mês</span></span><span class="c4">${ic('plus', 18)}</span></button><button class="li hi" data-go="dieta"><span class="mi dash">${ic('salad', 19)}</span><span class="col grow g2"><span class="tt">Dieta e devocional</span><span class="mm">Aparecem aqui quando você configurar</span></span><span class="c4">${ic('chevron-right', 18)}</span></button></section>` : `
      <section class="col g12 rv">${G.sec('Mês até agora', 'Gráficos', { go: 'graficos' })}
        <button class="card col g14" data-go="financas" style="text-align:left">
          <div class="row between ai-e"><div class="col g4"><span class="t-s c3">Gasto em novembro</span><span class="t-big" style="font-size:34px;line-height:38px">${G.count(310278)}</span></div><span class="t-s c3 ta-r">de ${brl(458000)}<br><span class="c2 w5">faltam 4 dias</span></span></div>
          ${G.bar(67.7, { cls: 'thick', fc: 5.2, label: '68% do orçamento usado, 5% previsto' })}
          <div class="row g8 wrap"><span class="tag bad">${ic('triangle-alert', 13)}Restaurantes passou ${brl(8630)}</span><span class="tag">${brl(30170)} previstos</span></div>
        </button>
      </section>
      <section class="f2 rv">
        <button class="card tight col g8 ai-s" data-go="dieta" style="text-align:left;border-radius:22px">${G.mi('salad', 130, 'sm')}<span class="t-c c3">Próxima refeição · 16:00</span><span class="t-e" style="font-size:15px;line-height:20px">Lanche da tarde</span><span class="t-c c3">Iogurte, granola e banana · 280 kcal</span></button>
        <button class="card tight col g8 ai-s" data-go="devocional" style="text-align:left;border-radius:22px">${G.mi('book-open', 350, 'sm')}<span class="t-c c3 row g4">Devocional · <span class="cok w6">feito</span></span><span style="font-family:var(--serif);font-size:15px;line-height:22px">“Não temerei mal algum, porque tu estás comigo.”</span><span class="t-c c3">Salmos 23:4</span></button>
      </section>`}
      <section class="col g12 rv">${G.sec('Caixa de entrada', 'Abrir', { go: 'caixa' })}
        <div class="grp">${G.li({ icon: 'receipt', h: 160, t: 'Foto de nota fiscal', m: 'Há 5 min · esperando internet para ler', go: 'caixa', p: 'st=pendentes' })}${G.li({ icon: 'message-square-text', h: 260, t: '“gastei 45 no posto ipiranga”', m: 'Há 1 h · 1 proposta da IA', go: 'caixa', p: 'st=proposta', end: '<span class="tag ton">Revisar</span>' })}</div>
      </section>
      <section class="col g12 rv">${G.sec('Notas', 'Ver todas', { act: 'goTab', p: 'tab=notas' })}
        <div class="f2 ai-s" style="align-items:start">${DB.notas.filter(n => n.fix).map(notePinned).join('')}</div>
        <div class="grp">${DB.notas.filter(n => !n.fix).slice(0, 3).map(n => G.li({ t: n.t, m: n.p, go: 'nota', p: 'id=' + n.id, end: `<span class="t-c c3 none">${n.d}</span>` })).join('')}</div>
      </section>
      <section class="col g12 rv">${G.sec('Seus espaços')}${tiles()}</section>`;
  }
});
G.act('goTab', (t, p) => G.tab(p.tab));

/* ---------- Busca universal ---------- */
const IDX = [
  { k: 'acao', t: 'Nova nota', m: 'Ação', i: 'square-pen', go: 'nota-nova' },
  { k: 'acao', t: 'Novo gasto', m: 'Ação', i: 'wallet', sheet: 'lancamento' },
  { k: 'acao', t: 'Novo lembrete', m: 'Ação', i: 'alarm-clock', go: 'lembrete' },
  { k: 'acao', t: 'Registrar refeição', m: 'Ação', i: 'salad', go: 'registro-refeicao' },
  { k: 'acao', t: 'Abrir Salmos 23', m: 'Ação · Bíblia', i: 'book-open', go: 'leitor' },
  { k: 'nota', t: 'Compras do mês', m: 'Atacadão no sábado: arroz, feijão, café, ração da Mel.', i: 'sticky-note', h: 80, go: 'nota', p: 'id=n2' },
  { k: 'nota', t: 'Devocional · Salmo 23', m: 'O cuidado de Deus não depende do vale estar vazio.', i: 'sticky-note', h: 80, go: 'nota', p: 'id=n3' },
  { k: 'nota', t: 'Reunião do condomínio', m: 'Votar a troca do portão e o novo horário da academia.', i: 'sticky-note', h: 80, go: 'nota', p: 'id=n4' },
  { k: 'nota', t: 'Presentes de Natal', m: 'Bia: livro de receitas. Pai: carteira de couro.', i: 'sticky-note', h: 80, go: 'nota', p: 'id=n6' },
  { k: 'fin', t: 'Atacadão', m: 'Ontem · Mercado · − R$ 318,60', i: 'shopping-cart', h: 160, go: 'lancamento', p: 'id=t2' },
  { k: 'fin', t: 'Orçamento: Mercado', m: 'R$ 612,40 de R$ 800,00 em novembro', i: 'chart-pie', h: 160, go: 'orcamentos' },
  { k: 'fin', t: 'Lista: Mercado', m: 'Compras · 9 itens, 3 no carrinho', i: 'shopping-basket', h: 55, go: 'lista-compras' },
  { k: 'agenda', t: 'Ler Salmos 23', m: 'Hoje · 07:30 · lembrete', i: 'alarm-clock', h: 25, go: 'lembrete' },
  { k: 'agenda', t: 'Consulta no dentista', m: 'Hoje · 14:30 · Clínica Sorriso', i: 'calendar', h: 25, go: 'evento' },
  { k: 'biblia', t: 'Salmos 23:1', m: 'O Senhor é o meu pastor; nada me faltará.', i: 'book-open', h: 350, go: 'leitor' },
  { k: 'biblia', t: 'Salmos 23:4', m: 'Ainda que eu andasse pelo vale da sombra da morte…', i: 'book-open', h: 350, go: 'leitor' },
  { k: 'pasta', t: 'Casa', m: 'Pasta · 9 notas', i: 'folder', h: 80, go: 'pasta' },
  { k: 'pasta', t: 'Igreja', m: 'Pasta · 12 notas', i: 'folder', h: 350, go: 'pasta' },
  { k: 'foto', t: 'Nota fiscal Atacadão', m: 'Galeria · usada em 1 gasto', i: 'image', h: 240, go: 'foto' }
];
const KN = { acao: 'Ações', nota: 'Notas', fin: 'Finanças', agenda: 'Agenda', biblia: 'Bíblia', pasta: 'Pastas', foto: 'Galeria' };
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function hl(text, q) { if (!q) return esc(text); const i = norm(text).indexOf(norm(q)); if (i < 0) return esc(text); return esc(text.slice(0, i)) + `<mark style="background:var(--tonal);color:var(--tonal-fg);border-radius:4px;padding:0 2px">${esc(text.slice(i, i + q.length))}</mark>` + esc(text.slice(i + q.length)); }
function results(q) {
  const qq = norm(q.trim());
  if (!qq) return `<section class="col g12 rv">${G.sec('Ações rápidas')}<div class="chips">${IDX.filter(x => x.k === 'acao').map(x => `<button class="chip" ${x.go ? `data-go="${x.go}"` : `data-sheet="${x.sheet}"`}>${ic(x.i, 16)}${x.t}</button>`).join('')}</div></section>
    <section class="col g12 rv">${G.sec('Recentes')}<div class="grp">${[IDX[6], IDX[9], IDX[14], IDX[12]].map(x => G.li({ icon: x.i, h: x.h, t: x.t, m: x.m, go: x.go, p: x.p })).join('')}</div></section>
    <p class="t-s c3 rv" style="margin:0">Dica: no computador, abra a busca de qualquer lugar com <span class="kbd">Ctrl</span> <span class="kbd">K</span>.</p>`;
  const hits = IDX.filter(x => norm(x.t + ' ' + x.m).includes(qq));
  const create = `<button class="li hi kb" data-go="nota-nova"><span class="mi ton">${ic('plus', 19)}</span><span class="col grow g2"><span class="tt">Nova nota: “${esc(q.trim())}”</span><span class="mm">Criar e abrir</span></span><span class="kbd">Enter</span></button>`;
  if (!hits.length) return `<div class="col g16 ai-c rv" style="padding:28px 0 6px;text-align:center">${mascot(56, 'var(--accent)', 'var(--bg)', 'pensando')}<span class="t-3">Nada com “${esc(q.trim())}”</span><span class="t-s c3" style="max-width:260px">Procurei em notas, finanças, agenda, Bíblia e fotos.</span></div><div class="grp rv">${create}</div>
    <button class="aib rv" data-go="ia" style="text-align:left">${mascot(30, 'var(--accent)', 'var(--tonal)', 'feliz')}<span class="col g4"><span class="tx">Quer que eu procure pelo sentido, não só pelas palavras?</span><span class="ac">Perguntar à Glife IA</span></span></button>`;
  const groups = {};
  hits.forEach(x => (groups[x.k] = groups[x.k] || []).push(x));
  let n = 0;
  return Object.keys(groups).map(k => `<section class="col g10 rv"><span class="lbl">${KN[k]}</span><div class="grp">${groups[k].map(x => { const first = n++ === 0; return `<button class="li hi kb ${first ? 'kb-on' : ''}" ${x.go ? `data-go="${x.go}"` : `data-sheet="${x.sheet}"`} ${x.p ? `data-p="${x.p}"` : ''}><span class="mi ${x.k === 'acao' ? 'ton' : ''}" style="--h:${x.h || 260}">${ic(x.i, 19)}</span><span class="col grow g2"><span class="tt">${hl(x.t, q.trim())}</span><span class="mm ell">${hl(x.m, q.trim())}</span></span>${first ? '<span class="kbd">Enter</span>' : ''}</button>`; }).join('')}</div></section>`).join('') + `<div class="grp rv">${create}</div>`;
}
G.screen('busca', {
  group: GRP, name: 'Busca universal', route: '/busca (modal · Ctrl+K no web)', hue: 260, tab: 'inicio', pad: 'nb g20',
  desc: 'Um campo único que encontra notas, gastos, eventos, versículos e fotos, e também executa ações ("novo gasto", "abrir Salmo 23"). Digite de verdade: o protótipo filtra os exemplos.',
  states: [['vazio', 'Campo vazio'], ['digitando', 'Resultados'], ['nada', 'Nada encontrado']],
  feats: ['Vazio: ações rápidas e recentes (fixadas primeiro).', 'Digitando: grupos Ações, Notas, Finanças, Agenda, Bíblia, Pastas e Galeria; o termo aparece destacado no título e no trecho.', '"Nova nota: <texto>" sempre aparece no fim; Enter abre o primeiro resultado.', 'Web: setas sobem e descem a linha ativa, Enter abre, Esc fecha.', 'Nada encontrado: oferece criar a nota ou perguntar à IA pelo sentido.'],
  motion: ['Abre subindo como folha cheia a partir da lupa; o campo já vem com foco.', 'Cada letra refaz os grupos com um esmaecer de 160 ms, sem pular a altura.', 'O resultado escolhido empurra a tela de destino da direita.'],
  render: (p, st) => {
    const q = st === 'digitando' ? 'salmo' : st === 'nada' ? 'passaporte' : '';
    return `<div class="row g10"><label class="search grow" for="qIn" style="padding-right:10px">${ic('search', 20)}<input id="qIn" value="${q}" placeholder="Buscar ou fazer algo" autocomplete="off" enterkeyhint="go"><button class="c3 row ${q ? '' : 'hide'}" data-act="qClear" aria-label="Limpar">${ic('circle-x', 18)}</button></label><button class="btn q" data-back style="padding:0 4px">Cancelar</button></div><div class="col g20" id="qRes">${results(q)}</div>`;
  },
  mount: (el) => {
    const inp = $('#qIn', el), res = $('#qRes', el);
    setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) { /* foco opcional */ } }, 350);
    const upd = () => { res.innerHTML = results(inp.value); $('[data-act="qClear"]', el).classList.toggle('hide', !inp.value); G.paint(); motion(res, [{ opacity: .4 }, { opacity: 1 }], 160, 'linear'); };
    inp.addEventListener('input', upd);
    inp.addEventListener('keydown', e => {
      const items = $$('.kb', res); let i = items.findIndex(x => x.classList.contains('kb-on'));
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items.forEach(x => x.classList.remove('kb-on')); i = Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))); items[i] && items[i].classList.add('kb-on'); items[i] && items[i].scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter') { e.preventDefault(); (items[Math.max(0, i)] || items[0]) && (items[Math.max(0, i)] || items[0]).click(); }
    });
  }
});
G.act('qClear', t => { const inp = t.parentElement.querySelector('input'); inp.value = ''; inp.dispatchEvent(new Event('input')); inp.focus(); });

/* ---------- Captura (botão +) ---------- */
G.sheet('capturar', {
  title: '', fab: true,
  render: () => `<div class="col g16" style="padding-top:6px">
    <div class="row g10 ai-c">${mascot(32, 'var(--accent)', 'var(--card)')}<span class="t-3">O que você quer guardar?</span></div>
    <textarea class="inp" id="capIn" rows="3" placeholder="Escreva ou fale… ex.: gastei 87,50 no Atacadão no cartão Nubank" aria-label="Texto para a caixa de entrada"></textarea>
    <div class="row g8"><button class="btn g sm" data-act="noop" style="background:var(--bg)">${ic('camera', 16)}Foto</button><button class="btn g sm" data-act="micDemo" style="background:var(--bg)">${ic('mic', 16)}Falar</button><span class="grow"></span><button class="btn p sm" data-act="capSend">Enviar ${ic('arrow-up', 16)}</button></div>
    <span class="lbl" style="margin-top:4px">Ou crie direto</span>
    <div class="tiles" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[['Gasto', 'wallet', 160, 'sheet', 'lancamento'], ['Nota', 'sticky-note', 80, 'go', 'nota-nova'], ['Lembrete', 'alarm-clock', 25, 'go', 'lembrete'], ['Evento', 'calendar-plus', 25, 'go', 'evento'], ['Refeição', 'salad', 130, 'go', 'registro-refeicao'], ['Item de compra', 'shopping-basket', 55, 'go', 'lista-compras']].map(([l, i, h, k, v]) => `<button class="tile pv" data-${k}="${v}"><span class="mi" style="--h:${h};height:56px">${ic(i, 22)}</span><span>${l}</span></button>`).join('')}</div>
    <p class="t-c c3" style="margin:0">A Glife IA lê o que você escrever e propõe o que criar. Nada é gravado sem você confirmar.</p></div>`,
  mount: sh => setTimeout(() => { const t = $('#capIn', sh); try { t && t.focus({ preventScroll: true }); } catch (e) { /* foco opcional */ } }, 420)
});
G.act('capSend', () => { G.closeSheet().then(() => G.go('caixa', { st: 'processando' })); });
G.act('micDemo', t => { const ta = $('#capIn'); if (ta) { ta.value = 'gastei 87,50 no Atacadão no cartão Nubank, era a compra do mês. Lembrar de comprar ração sábado'; } t.innerHTML = `<span class="wave" style="height:16px">${[0, 1, 2, 3].map(i => `<i style="animation-delay:${i * .12}s"></i>`).join('')}</span>Ouvindo`; setTimeout(() => { if (t.isConnected) { t.innerHTML = ic('mic', 16) + 'Falar'; G.paint(); } }, G.D(1600)); });

/* ---------- Caixa de entrada ---------- */
const PROP = [
  ['wallet', 160, 'Criar gasto', 'R$ 87,50 · Mercado · Nubank Ultravioleta · hoje', 'Cai na fatura de dezembro'],
  ['link', 260, 'Ligar à nota', '“Compras do mês”', ''],
  ['shopping-basket', 55, 'Item na lista Mercado', 'Ração da Mel', ''],
  ['alarm-clock', 25, 'Lembrete', 'Sáb, 28/11 · 09:00 · Comprar ração', 'Ligado ao item da lista']
];
const proposal = (st) => `<div class="card col g14 rv" id="propCard">
  <div class="row g10 ai-s"><span class="mi ton sm">${ic('message-square-text', 17)}</span><div class="col g4 grow"><span class="t-s" style="line-height:21px">“gastei 87,50 no Atacadão no cartão Nubank, era a compra do mês. Lembrar de comprar ração sábado”</span><span class="t-c c3">Agora · texto</span></div></div>
  ${st === 'processando' ? `<div class="row g10 ai-c" id="thinking">${mascot(28, 'var(--accent)', 'var(--card)', 'pensando')}<span class="t-s c3">Organizando</span><span class="typing"><span></span><span></span><span></span></span></div>` : `
  <div class="col" id="propList"><span class="lbl" style="padding-bottom:6px">A IA propõe</span>${PROP.map(([i, h, t, m, s], k) => `<div class="li hi pv" style="min-height:60px"><span class="mi sm" style="--h:${h}">${ic(i, 17)}</span><span class="col grow g2"><span class="tt">${t}</span><span class="mm" style="white-space:normal">${m}${s ? ` · <span class="c4">${s}</span>` : ''}</span></span><button class="noscale" data-act="propToggle" aria-label="Incluir ${t}" style="display:flex">${G.ck(true, { sq: true })}</button></div>`).join('')}</div>
  <div class="row g10" id="propBtns"><button class="btn p md grow" data-act="propApply">Aplicar 4</button><button class="btn g md" data-act="propEdit" style="background:var(--bg)">Editar</button><button class="cbtn sm" data-act="propDiscard" aria-label="Descartar">${ic('trash-2', 18)}</button></div>`}
</div>`;
G.screen('caixa', {
  group: GRP, name: 'Caixa de entrada', route: '/caixa-de-entrada', hue: 260, tab: 'inicio', pad: 'cta g20',
  desc: 'Texto, foto ou áudio solto. A IA lê, chama as ferramentas de busca de verdade e devolve propostas. Nada é gravado sem confirmar, e tudo pode ser desfeito.',
  states: [['processando', 'Organizando'], ['proposta', 'Propostas'], ['pendentes', 'Pendentes e histórico'], ['vazio', 'Vazia']],
  feats: ['Cada proposta mostra o que será criado e onde (ex.: o gasto no cartão cai na fatura de dezembro); dá para desmarcar uma a uma.', '"Aplicar" grava tudo de uma vez: se uma parte falhar, nada fica pela metade.', 'Excluir não é ferramenta da IA: no máximo ela propõe mover para a lixeira.', 'Funciona offline: o item espera a internet para ser lido.', 'Mostra o uso da IA no mês contra o teto definido em Ajustes.'],
  motion: ['Enquanto organiza: mascote pensando e três pontos.', 'Propostas entram uma a uma com mola (+50 ms).', 'Aplicar: as linhas recolhem, o cartão vira "Aplicado" e o aviso sobe com "Desfazer".', 'Descartar: o cartão esmaece e recolhe.'],
  render: (p, st) => {
    const top = G.topbar({ title: 'Caixa de entrada', right: G.cbtn('history', { sheet: 'iaHistorico', label: 'Histórico da IA' }) });
    if (st === 'vazio') return `${top}${G.empty('Caixa vazia', 'Tudo que você jogar aqui eu organizo e te mostro antes de gravar.', 'Anotar algo', { act: 'fab' })}`;
    const pend = `<section class="col g10 rv"><span class="lbl">Esperando</span><div class="grp">${G.li({ tag: 'div', icon: 'receipt', h: 160, t: 'Foto de nota fiscal', m: 'Há 5 min · lida quando a internet voltar', end: '<span class="tag">' + ic('wifi-off', 13) + 'Offline</span>' })}${G.li({ tag: 'div', icon: 'audio-lines', h: 305, t: 'Áudio de 0:14', m: 'Há 20 min · transcrevendo', end: '<span class="c3 row">' + ic('loader-circle', 18, 'spin') + '</span>' })}</div></section>`;
    const hist = `<section class="col g10 rv"><span class="lbl">Organizado hoje</span><div class="grp">${G.li({ tag: 'div', icon: 'check', h: 160, t: '“me lembra de comprar café amanhã às 9h”', m: '1 lembrete criado · 08:12', end: '<button class="link" data-act="toast" data-msg="Lembrete desfeito">Desfazer</button>' })}${G.li({ tag: 'div', icon: 'check', h: 160, t: '“uber 24,30 ontem”', m: '1 gasto criado · 07:58', end: '<button class="link" data-act="toast" data-msg="Gasto desfeito">Desfazer</button>' })}</div></section>`;
    const usage = `<div class="row g10 ai-c rv"><span class="t-c c3 grow">Uso da IA em novembro: R$ 4,20 de R$ 20,00</span><div style="width:90px">${G.bar(21, { cls: 'thin', fill: 'acc' })}</div></div>`;
    if (st === 'pendentes') return `${top}${pend}${hist}${usage}`;
    return `${top}${proposal(st)}${pend}${usage}`;
  },
  fixed: () => `<div class="composer"><div class="comp"><button class="r" data-act="noop" aria-label="Anexar foto">${ic('camera')}</button><input placeholder="Escreva ou fale…" aria-label="Nova entrada"><span class="c3 row">${ic('mic')}</span><button class="r send" data-act="capSendInline" aria-label="Enviar">${ic('arrow-up')}</button></div></div>`,
  mount: (el, p, st) => {
    if (st === 'processando') setTimeout(() => { if (el.isConnected) { const c = $('#propCard', el); c.outerHTML = proposal('proposta'); G.mountEl(el); } }, G.D(1800));
  }
});
G.act('propToggle', t => { const c = $('.ck', t); c.classList.toggle('on'); const n = $$('#propList .ck.on').length; const b = $('[data-act="propApply"]'); b.textContent = n ? `Aplicar ${n}` : 'Nada marcado'; b.classList.toggle('off', !n); });
G.act('propApply', () => {
  const card = $('#propCard'); const rows = $$('#propList .li');
  const n = $$('#propList .ck.on').length;
  Promise.all(rows.map((r, i) => new Promise(res => setTimeout(() => G.collapse(r, 280).then(res), G.D(i * 60))))).then(() => {
    $('#propList').outerHTML = `<div class="alert ok fd">${ic('circle-check', 18)}<span class="grow"><b>Aplicado</b> · ${n} ações criadas</span><button class="w6" data-act="toast" data-msg="Ações desfeitas">Desfazer</button></div>`;
    $('#propBtns').remove(); G.paint();
  });
  G.toast(`${n} ações aplicadas`, { icon: 'check', undo: () => G.setState('proposta') });
});
G.act('propDiscard', () => { const c = $('#propCard'); G.collapse(c, 320); G.toast('Entrada descartada', { icon: 'trash-2', undo: () => G.setState('proposta') }); });
G.act('propEdit', () => G.openSheet('lancamento', { v: '8750', d: 'Atacadão' }));
G.act('capSendInline', t => { const inp = t.parentElement.querySelector('input'); if (inp.value.trim()) G.setState('processando'); else G.shake(t.parentElement); });
G.sheet('iaHistorico', {
  title: 'Ações da IA',
  render: () => `<p class="t-s c3" style="margin:0">Tudo que a IA criou ou mudou fica aqui com o estado anterior, para desfazer quando quiser.</p><div class="col">${[['Lembrete criado', '“Comprar café” · hoje 08:12'], ['Gasto criado', 'Uber R$ 24,30 · hoje 07:58'], ['Nota alterada', 'Compras do mês · ontem 19:40'], ['Ligação criada', 'Atacadão → Compras do mês · ontem']].map(([t, m]) => G.li({ tag: 'div', icon: 'sparkles', h: 260, t, m, end: '<button class="link" data-act="toast" data-msg="Desfeito">Desfazer</button>' })).join('')}</div>`
});

/* ---------- Glife IA ---------- */
const chatSeed = () => `<span class="t-c c3 self-c">Hoje, 08:12</span>
  <div class="bub">Bom dia! Você tem 3 compromissos hoje e a fatura do Itaú Click vence em 6 dias.</div>
  <div class="bub me">Quanto gastei com mercado este mês?</div>
  <div class="bub wide"><span><b class="w6">R$ 612,40</b> em 7 compras, 18% a menos que em outubro.</span>
    <div class="col g8">${[['Out', 100, '746', ''], ['Nov', 82, '612', 'acc']].map(([m, w, v, c]) => `<div style="display:grid;grid-template-columns:30px minmax(0,1fr) 40px;gap:8px;align-items:center;font-size:12.5px"><span class="c3">${m}</span>${G.bar(w, { cls: 'thick', fill: c || '' })}<span class="ta-r w6 tn">${v}</span></div>`).join('')}</div>
    <button class="btn t sm self-s" data-go="categoria" data-p="c=mercado">Abrir em Finanças ${ic('arrow-right', 16)}</button></div>
  <div class="bub me">Me lembra de comprar café amanhã às 9h</div>
  <div class="bub wide" style="flex-direction:row;align-items:center;gap:12px;padding:12px">${G.mi('alarm-clock', 25)}<div class="col grow"><span class="t-e" style="font-size:15px">Comprar café</span><span class="t-c c3" style="font-size:13px">Sex, 27/11 · 09:00</span></div><button class="link" data-act="toast" data-msg="Lembrete desfeito">Desfazer</button></div>`;
const REPLIES = [
  ['Quanto falta da fatura', `A fatura de dezembro do <b class="w6">Nubank Ultravioleta</b> está em R$ 1.842,90 e fecha em 03/12. O Itaú Click já fechou: R$ 1.276,40, vence 02/12.`, 'Ver faturas', 'fatura'],
  ['Resumir', `Suas 3 últimas notas falam de: compras do mês, a reunião do condomínio (votar o portão) e presentes de Natal. Quer que eu junte os presentes numa lista de compras?`, 'Criar lista', 'compras'],
  ['', `Achei 2 devocionais sobre ansiedade: Salmo 23 (hoje) e Filipenses 4 (12/11). Os dois falam de confiar no cuidado de Deus no meio da dificuldade.`, 'Abrir devocionais', 'devocional']
];
let replyI = 0;
G.screen('ia', {
  group: GRP, name: 'Glife IA', route: '/ia (aba IA)', hue: 260, tab: 'inicio', full: true,
  desc: 'Conversa com dados dos módulos. Responde com números reais, cria itens direto da conversa e sempre deixa desfazer. Envie uma mensagem: o protótipo responde.',
  feats: ['Modelo rápido para a caixa de entrada; modelo mais forte só na conversa e em análises.', 'Respostas com gráfico pequeno e atalho para a tela de origem.', 'Itens criados aparecem como cartão com "Desfazer".', 'Sugestões acima do campo mudam conforme a hora e o que está pendente.'],
  motion: ['Mensagens entram com mola (escala 0,92 → 1, 380 ms).', 'Três pontos enquanto a IA pensa; o mascote pisca a cada 4 s.', 'O campo fica preso embaixo, com uma faixa de proteção que esmaece o conteúdo por trás.'],
  render: () => `<div class="scroll" id="chatScroll"><div class="pad g12" style="padding-bottom:170px">
    <div class="row g12 ai-c" style="padding-bottom:12px;border-bottom:1px solid var(--line-2);margin:0 -20px;padding-left:20px;padding-right:20px">${G.cbtn('chevron-left', { back: true, label: 'Voltar' })}<span class="mi acc" style="border-radius:14px">${mascot(28, 'var(--on-accent)', 'var(--accent)')}</span><div class="col grow"><span class="t-e">Glife IA</span><span class="t-c c3" style="font-size:12.5px">Lê suas notas, agenda e finanças</span></div>${G.cbtn('ellipsis', { sheet: 'iaHistorico', label: 'Mais' })}</div>
    <div class="col g12" id="chat" style="padding-top:4px">${chatSeed()}</div></div></div>
    <div class="composer"><div class="chips scroll-x" style="margin:0 -16px;padding:0 16px">${['Quanto falta da fatura?', 'Resumir minhas notas', 'Devocionais sobre ansiedade', 'Cardápio leve para hoje'].map(s => `<button class="chip" data-act="chatSuggest">${ic('sparkles', 16, 'ca')}${s}</button>`).join('')}</div>
    <form class="comp" id="chatForm"><button type="button" class="r" data-act="fab" aria-label="Anexar">${ic('plus')}</button><input id="chatIn" placeholder="Escreva ou fale…" aria-label="Mensagem para a Glife IA" autocomplete="off"><span class="c3 row">${ic('mic')}</span><button class="r send" type="submit" aria-label="Enviar">${ic('arrow-up')}</button></form></div>`,
  mount: (el) => {
    const sc = $('#chatScroll', el); setTimeout(() => { sc.scrollTop = sc.scrollHeight; }, 50);
    $('#chatForm', el).addEventListener('submit', e => { e.preventDefault(); const i = $('#chatIn', el); if (!i.value.trim()) return; ask(el, i.value.trim()); i.value = ''; });
  }
});
function ask(el, text) {
  const chat = $('#chat', el), sc = $('#chatScroll', el);
  chat.insertAdjacentHTML('beforeend', `<div class="bub me">${esc(text)}</div><div class="bub" id="typing"><span class="typing"><span></span><span></span><span></span></span></div>`);
  sc.scrollTo({ top: sc.scrollHeight, behavior: G.rm() ? 'auto' : 'smooth' });
  let r = REPLIES.find(x => x[0] && text.toLowerCase().includes(x[0].toLowerCase().split(' ')[0].slice(0, 6))) || REPLIES[replyI++ % REPLIES.length];
  setTimeout(() => {
    const t = $('#typing', el); if (!t) return;
    t.outerHTML = `<div class="bub wide"><span>${r[1]}</span><button class="btn t sm self-s" data-go="${r[3]}">${r[2]} ${ic('arrow-right', 16)}</button></div>`;
    G.paint(); sc.scrollTo({ top: sc.scrollHeight, behavior: G.rm() ? 'auto' : 'smooth' });
  }, G.D(1300));
}
G.act('chatSuggest', t => { const el = t.closest('.scr'); ask(el, t.textContent.trim()); });
})();
