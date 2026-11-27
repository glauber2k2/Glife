'use strict';
/* Notas: lista, editor (escrever ⇄ ler), vínculos [[ ]], pastas, tags e lixeira. */
(function () {
const { ic, mascot, esc, $, $$, motion, E, DB } = G;
const GRP = 'Notas';
const KIND = { note: ['Nota', 'sticky-note'], journal: ['Diário', 'notebook-pen'], devotional: ['Devocional', 'book-open'] };
const noteGo = n => n.k === 'devotional' ? 'go: devocional' : '';
const noteRow = n => G.li({ t: n.t, m: n.p, go: n.k === 'devotional' ? 'devocional' : 'nota', p: 'id=' + n.id, end: `<span class="col ai-e g4 none"><span class="t-c c3">${n.d}</span>${n.k !== 'note' ? `<span class="tag" style="height:20px;font-size:11px">${KIND[n.k][0]}</span>` : ''}</span>` });
function listHtml(filter) {
  const ns = DB.notas.filter(n => filter === 'todas' || (filter === 'fixadas' && n.fix) || (filter === 'diario' && n.k === 'journal') || (filter === 'devocionais' && n.k === 'devotional'));
  if (!ns.length) return `<div class="mini-empty rv">${ic('inbox', 18)}Nenhuma nota aqui ainda.</div>`;
  const pins = ns.filter(n => n.fix), rest = ns.filter(n => !n.fix);
  return `${pins.length && filter === 'todas' ? `<section class="col g10 rv"><span class="lbl">Fixadas</span><div class="f2" style="align-items:start">${pins.map(G.notePinned).join('')}</div></section>` : ''}
    <section class="col g10 rv"><span class="lbl">${filter === 'todas' ? 'Recentes' : 'Notas'}</span><div class="grp">${(filter === 'todas' ? rest : ns).map(noteRow).join('')}</div></section>`;
}
G.screen('notas', {
  group: GRP, name: 'Lista de notas', route: '/notas (aba Notas)', root: true, tab: 'notas', hue: 80,
  desc: 'Fixadas em grade, recentes em lista. Filtros por tipo e atalho para as pastas, sem árvore pesada.',
  states: [['cheia', 'Com notas'], ['vazia', 'Primeira nota']],
  feats: ['Busca abre a busca universal já filtrada em notas; o botão de brilho pergunta à IA pelo sentido.', 'Filtros: Todas, Fixadas, Diário, Devocionais.', 'Pastas em pílulas roláveis; "Todas" abre a lista de pastas.', 'Devocionais abrem no modelo SOAP; as outras, no editor.', 'Lixeira no fim da lista, com a contagem.'],
  motion: ['Trocar o filtro: a lista esmaece e as linhas sobem em cascata.', 'Cartão fixado cresce até virar a nota.', 'Nota que vai para a lixeira recolhe na lista ao voltar.'],
  render: (p, st) => {
    const head = G.hdr(st === 'vazia' ? '' : '34 notas', 'Notas', `<div class="row g8">${G.cbtn('folder', { go: 'pastas', label: 'Pastas' })}${G.cbtn('square-pen', { go: 'nota-nova', label: 'Nova nota' })}</div>`);
    if (st === 'vazia') return `${head}${G.empty('Sua primeira nota', 'Crie sua primeira anotação e eu guardo pra você. Funciona sem internet.', 'Escrever nota', { go: 'nota-nova' })}`;
    return `${head}
      <button class="search rv" data-go="busca" style="text-align:left">${ic('search', 20)}<span class="grow t-s" style="font-size:15px">Buscar notas</span><span class="ai-b" aria-hidden="true">${ic('sparkles', 18)}</span></button>
      ${G.chips([['todas', 'Todas'], ['fixadas', 'Fixadas'], ['diario', 'Diário'], ['devocionais', 'Devocionais']], ['todas'], { cls: 'scroll-x rv', on: 'noteFilter' })}
      <div class="chips scroll-x rv">${DB.pastas.map(f => `<button class="chip" data-go="pasta" data-p="n=${f.n}"><span style="color:oklch(var(--strong-l) var(--strong-c) ${f.h});display:flex">${ic('folder', 16)}</span>${f.n}<span class="c3 tn">${f.c}</span></button>`).join('')}<button class="chip" data-go="pastas">${ic('folders', 16)}Todas</button></div>
      <div class="col g24" id="noteList">${listHtml('todas')}</div>
      <div class="row g4 self-c rv"><button class="row g8 t-s c3" data-go="tags" style="padding:8px 12px">${ic('hash', 16)}Tags</button><button class="row g8 t-s c3" data-act="state" data-v="selecao" style="padding:8px 12px">${ic('list-checks', 16)}Selecionar</button><button class="row g8 t-s c3" data-go="lixeira" style="padding:8px 12px">${ic('trash-2', 16)}Lixeira · 3</button></div>`;
  }
});
G.act('noteFilter', (t, v) => { const box = $('#noteList'); box.innerHTML = listHtml(v); G.mountEl(box); });

/* ---------- Editor ---------- */
const BODY = {
  n2: `Atacadão no **sábado** de manhã. Levar as sacolas retornáveis.\n\n### Lista\n- arroz 5 kg\n- feijão carioca\n- café\n- ração da Mel\n\n> Orçamento de mercado: R$ 800 por mês.\n\nItens soltos na [[Lista: Mercado]]. Gasto de novembro: [[Atacadão 25/11]].`,
  n1: `- Trilha da Pedra Grande (sair 6h)\n- Almoço na casa da mãe\n- Terminar o livro\n\nVer previsão do tempo na sexta. Ligado a [[Ideias de passeio]].`,
  n4: `### Pauta\n- Troca do portão (3 orçamentos)\n- Novo horário da academia\n\n> Levar a proposta da empresa Fortaleza.`
};
function md(src) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b class="w6" style="color:var(--fg)">$1</b>').replace(/\[\[(.+?)\]\]/g, '<button class="wl" data-act="wikilink">$1</button>');
  const out = []; let list = null;
  src.split('\n').forEach(line => {
    if (/^- /.test(line)) { list = list || []; list.push(`<li>${inline(line.slice(2))}</li>`); return; }
    if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
    if (/^### /.test(line)) out.push(`<h3>${inline(line.slice(4))}</h3>`);
    else if (/^> /.test(line)) out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  });
  if (list) out.push(`<ul>${list.join('')}</ul>`);
  return out.join('');
}
G.md = md;
const linkPanel = (out, inn) => `<section class="col g12" id="vinculos"><div class="sec-h"><h2 class="t-3">Vínculos</h2><button class="a" data-sheet="ligar">Ligar a…</button></div>
  ${out.length ? `<span class="lbl">Liga para</span><div class="grp">${out.map(x => G.li(x)).join('')}</div>` : ''}
  ${inn.length ? `<span class="lbl">Mencionada em</span><div class="grp">${inn.map(x => G.li(x)).join('')}</div>` : ''}</section>`;
G.linkPanel = linkPanel;
G.screen('nota', {
  group: GRP, name: 'Nota: ler e escrever', route: '/nota/[id]', hue: 80, tab: 'notas', pad: 'cta g20',
  desc: 'Mesma tela para ler e escrever. O app salva sozinho e funciona offline; o estado "salvando/salvo" aparece no topo sem ruído.',
  states: [['ler', 'Ler'], ['escrever', 'Escrever'], ['vinculo', 'Digitando [['], ['longa', 'Nota longa']],
  feats: ['Tipo trocável (Nota, Diário, Devocional), pasta e tags como chips logo abaixo do título.', 'Markdown: títulos, listas, citações, negrito e [[vínculos]]. No modo Ler, [[Título]] vira link.', 'Digitar [[ abre sugestões de notas, gastos, eventos e versículos, e "Nova nota: …" se não existir.', 'Vínculos no fim: "Liga para" e "Mencionada em" (backlinks), de qualquer módulo.', 'Barra de formatação mínima acima do teclado no Android: negrito, lista, citação, título, [[ ]], foto.', 'Mais ações: mover para pasta, organizar com IA, mover para a lixeira.'],
  motion: ['Escrever ⇄ Ler: troca cruzada com esmaecer e deslize de 24 px na direção do segmento.', 'Fixar: o alfinete gira de leve e enche com mola.', 'Sugestões do [[ sobem do cursor com mola.', '"Salvando" pisca o ponto; vira "Salvo" com ponto verde.'],
  render: (p, st) => {
    const n = DB.notas.find(x => x.id === p.id) || DB.notas[1];
    const body = BODY[n.id] || (n.p + '\n\n' + BODY.n4);
    const write = st === 'escrever' || st === 'vinculo';
    const src = st === 'vinculo' ? body.replace('Gasto de novembro: [[Atacadão 25/11]].', 'Gasto de novembro: [[Ata') : body;
    return `${G.topbar({ title: `<span class="savest ${write ? 'ing' : ''}" id="saveSt"><i class="d"></i>${write ? 'Salvando…' : 'Salvo agora'}</span>`, right: `<div class="row g8">${G.cbtn(n.fix ? 'pin-off' : 'pin', { act: 'pinNote', label: n.fix ? 'Desafixar' : 'Fixar' })}${G.cbtn('ellipsis', { sheet: 'notaMais', label: 'Mais ações' })}</div>` })}
      <div class="row between ai-c g10">${G.seg([['ler', `${ic('book-open-text', 16)}Ler`], ['escrever', `${ic('pencil-line', 16)}Escrever`]], write ? 1 : 0, { cls: 'pill', panes: 'nota', style: 'width:210px' })}<button class="chip" data-sheet="tipoNota" style="height:34px">${ic(KIND[n.k][1], 16)}${KIND[n.k][0]}${ic('chevron-down', 14)}</button></div>
      <div class="col g10"><h1 class="t-1" contenteditable="${write}" spellcheck="false" style="font-size:28px;line-height:34px;outline:0">${n.t}</h1>
        <div class="chips">${n.pasta ? `<button class="chip" data-sheet="moverPasta" style="height:30px;font-size:13px">${ic('folder', 15)}${n.pasta}</button>` : `<button class="chip" data-sheet="moverPasta" style="height:30px;font-size:13px">${ic('folder-plus', 15)}Sem pasta</button>`}${n.tags.map(t => `<span class="chip" style="height:30px;font-size:13px">#${t}</span>`).join('')}<button class="chip" data-sheet="tags" style="height:30px;font-size:13px">${ic('plus', 14)}Tag</button></div>
        <span class="t-c c3">Editada ${n.d.toLowerCase()} · ${body.split(/\s+/).length} palavras</span></div>
      <div data-pane-of="nota" ${write ? 'hidden' : ''}><div class="md col g12">${md(st === 'longa' ? body + '\n\n' + BODY.n1 + '\n\n' + BODY.n4 + '\n\n' + body : body)}</div></div>
      <div data-pane-of="nota" ${write ? '' : 'hidden'} style="position:relative"><textarea class="inp" id="noteTa" spellcheck="false" style="min-height:300px;background:var(--card);font-size:16px;line-height:26px" aria-label="Texto da nota">${esc(src)}</textarea><div id="wlPop"></div></div>
      ${linkPanel([
        { icon: 'shopping-cart', h: 160, t: 'Atacadão', m: 'Gasto · 25/11 · − R$ 318,60', go: 'lancamento', p: 'id=t2' },
        { icon: 'shopping-basket', h: 55, t: 'Lista: Mercado', m: 'Compras · 9 itens', go: 'lista-compras' }
      ], [
        { icon: 'alarm-clock', h: 25, t: 'Comprar ração', m: 'Lembrete · sáb, 28/11 · 09:00', go: 'lembrete' },
        { icon: 'sparkles', h: 260, t: 'Caixa de entrada', m: 'Ligada pela IA · hoje', go: 'caixa', p: 'st=pendentes' }
      ])}`;
  },
  fixed: (p, st) => `<div class="fmt-bar ${st === 'escrever' || st === 'vinculo' ? '' : 'hide'}" id="fmtBar" role="toolbar" aria-label="Formatação">${[['bold', 'Negrito', '**'], ['heading-3', 'Título', '### '], ['list', 'Lista', '- '], ['quote', 'Citação', '> '], ['brackets', 'Vínculo', '[['], ['image-plus', 'Foto', '![[media:]]']].map(([i, l, ins]) => `<button data-act="fmt" data-ins="${esc(ins)}" aria-label="${l}">${ic(i, 20)}</button>`).join('')}<span class="grow"></span><button data-act="seg-ler" aria-label="Concluir">${ic('check', 20)}</button></div>`,
  mount: (el, p, st) => {
    const ta = $('#noteTa', el), pop = $('#wlPop', el), seg = $('.seg', el);
    seg.dataset.on = 'noteMode';
    const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    if (st === 'escrever' || st === 'vinculo') setTimeout(fit, 0);
    let saveT;
    const save = () => { const s = $('#saveSt', el); s.classList.add('ing'); s.innerHTML = '<i class="d"></i>Salvando…'; clearTimeout(saveT); saveT = setTimeout(() => { if (s.isConnected) { s.classList.remove('ing'); s.innerHTML = '<i class="d"></i>Salvo'; } }, G.D(900)); };
    const check = () => {
      const before = ta.value.slice(0, ta.selectionStart); const m = before.match(/\[\[([^\]\n]*)$/);
      if (!m) { pop.innerHTML = ''; return; }
      const q = m[1].toLowerCase();
      const opts = [['Atacadão 25/11', 'Gasto · − R$ 318,60', 'shopping-cart', 160], ['Compras do mês', 'Nota', 'sticky-note', 80], ['Lista: Mercado', 'Compras', 'shopping-basket', 55], ['Salmos 23', 'Bíblia', 'book-open', 350], ['Consulta no dentista', 'Evento · hoje 14:30', 'calendar', 25]].filter(o => o[0].toLowerCase().includes(q));
      pop.innerHTML = `<div class="pop" style="left:12px;right:12px;bottom:auto;top:${Math.min(ta.offsetHeight - 40, 26 * before.split('\n').length + 20)}px">${opts.map((o, i) => `<button class="pi ${i === 0 ? 'on' : ''}" data-act="wlPick" data-v="${esc(o[0])}"><span class="mi sm" style="--h:${o[3]}">${ic(o[2], 16)}</span><span class="col grow"><span class="w5">${esc(o[0])}</span><span class="t-c c3">${o[1]}</span></span></button>`).join('')}<button class="pi" data-act="wlPick" data-v="${esc(m[1] || 'Nova nota')}"><span class="mi sm ton">${ic('plus', 16)}</span><span class="col grow"><span class="w5">Nova nota: “${esc(m[1] || '…')}”</span><span class="t-c c3">Cria e liga</span></span></button></div>`;
      G.paint();
    };
    ta.addEventListener('input', () => { fit(); save(); check(); });
    ta.addEventListener('click', check);
    if (st === 'vinculo') setTimeout(() => { fit(); try { ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { /* foco opcional */ } check(); }, 360);
  }
});
G.act('noteMode', (t, v) => {
  const el = t.closest('.scr'); const bar = $('#fmtBar', el); bar.classList.toggle('hide', v !== 'escrever');
  $('h1', el).setAttribute('contenteditable', v === 'escrever');
  if (v === 'escrever') { const ta = $('#noteTa', el); setTimeout(() => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }, 0); motion(bar, [{ transform: 'translateY(100%)' }, { transform: 'none' }], 300, E.enter); }
  else { const md2 = $('[data-pane-of="nota"] .md', el); md2.innerHTML = md($('#noteTa', el).value); G.paint(); }
});
G.act('seg-ler', t => { const el = t.closest('.scr'); $('.seg .s-i[data-i="0"]', el).click(); });
G.act('fmt', t => { const ta = $('#noteTa'); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + t.dataset.ins + ta.value.slice(s); ta.focus(); ta.setSelectionRange(s + t.dataset.ins.length, s + t.dataset.ins.length); ta.dispatchEvent(new Event('input')); });
G.act('wlPick', t => { const ta = $('#noteTa'); const before = ta.value.slice(0, ta.selectionStart).replace(/\[\[([^\]\n]*)$/, `[[${t.dataset.v}]]`); ta.value = before + ta.value.slice(ta.selectionStart); $('#wlPop').innerHTML = ''; ta.focus(); ta.dispatchEvent(new Event('input')); G.toast(`Ligada a “${esc(t.dataset.v)}”`, { icon: 'link' }); });
G.act('wikilink', t => { const v = t.textContent; if (/Atacad/.test(v)) G.go('lancamento', { id: 't2' }); else if (/Lista/.test(v)) G.go('lista-compras'); else G.go('nota', { id: 'n1' }); });
G.act('pinNote', t => { const pinned = t.getAttribute('aria-label') === 'Desafixar'; t.innerHTML = ic(pinned ? 'pin' : 'pin-off'); t.setAttribute('aria-label', pinned ? 'Fixar' : 'Desafixar'); G.paint(); motion($('svg', t), [{ transform: 'rotate(-30deg) scale(.6)' }, { transform: 'none' }], 380, E.spring); G.toast(pinned ? 'Nota desafixada' : 'Nota fixada no topo', { icon: 'pin' }); });

G.screen('nota-nova', {
  group: GRP, name: 'Nova nota', route: '/nota/nova', hue: 80, tab: 'notas', pad: 'cta g20',
  desc: 'Abre direto no modo Escrever, com o cursor no título. Nota vazia não é gravada: se sair sem escrever, ela não aparece na lista.',
  feats: ['Tipo escolhido na hora (Nota, Diário ou Devocional: o devocional abre o modelo SOAP).', 'Pasta e tags opcionais.', 'Placeholder curto, sem texto de exemplo para apagar.'],
  motion: ['Entra da direita; a barra de formatação sobe junto com o teclado.'],
  render: () => `${G.topbar({ title: '<span class="savest"><i class="d" style="background:var(--fg-4)"></i>Rascunho</span>', right: G.cbtn('ellipsis', { sheet: 'notaMais', label: 'Mais ações' }) })}
    ${G.chips([['note', 'Nota', 'sticky-note'], ['journal', 'Diário', 'notebook-pen'], ['devotional', 'Devocional', 'book-open']], ['note'], { on: 'newKind' })}
    <h1 class="t-1" contenteditable="true" data-ph="Título" id="nnTitle" style="font-size:28px;line-height:34px;outline:0;min-height:34px"></h1>
    <div class="chips"><button class="chip" data-sheet="moverPasta" style="height:30px;font-size:13px">${ic('folder-plus', 15)}Pasta</button><button class="chip" data-sheet="tags" style="height:30px;font-size:13px">${ic('plus', 14)}Tag</button></div>
    <textarea class="inp" placeholder="Comece a escrever… use [[ para ligar a outra coisa" style="min-height:320px;background:transparent;padding:0;box-shadow:none;font-size:16px;line-height:26px" aria-label="Texto da nota"></textarea>`,
  fixed: () => `<div class="fmt-bar" role="toolbar" aria-label="Formatação">${[['bold', 'Negrito'], ['heading-3', 'Título'], ['list', 'Lista'], ['quote', 'Citação'], ['brackets', 'Vínculo'], ['image-plus', 'Foto']].map(([i, l]) => `<button aria-label="${l}" data-act="noop">${ic(i, 20)}</button>`).join('')}</div>`,
  mount: el => setTimeout(() => { try { $('#nnTitle', el).focus(); } catch (e) { /* foco opcional */ } }, 400)
});
G.act('newKind', (t, v) => { if (v === 'devotional') G.go('devocional', { st: 'novo' }); });

/* ---------- Pastas ---------- */
G.screen('pastas', {
  group: GRP, name: 'Pastas', route: '/pastas', hue: 80, tab: 'notas', pad: 'nb g20',
  desc: 'Um nível só de pastas, cada uma com cor própria. Notas sem pasta ficam em "Sem pasta".',
  states: [['cheia', 'Com pastas'], ['vazia', 'Sem pastas']],
  feats: ['Nova pasta numa folha curta (nome e cor).', 'Toque longo numa pasta: renomear, mudar a cor, excluir (as notas vão para "Sem pasta").'],
  motion: ['Linhas entram em cascata; a nova pasta aparece no lugar certo com mola.'],
  render: (p, st) => `${G.topbar({ title: 'Pastas', right: G.cbtn('folder-plus', { sheet: 'novaPasta', label: 'Nova pasta' }) })}
    ${st === 'vazia' ? G.empty('Nenhuma pasta ainda', 'Pastas ajudam quando as notas passam de algumas dezenas. Dá para começar sem elas.', 'Criar pasta', { sheet: 'novaPasta' }) : `
    <div class="grp rv">${DB.pastas.map(f => G.li({ lead: `<span class="mi" style="--h:${f.h}">${ic('folder', 19)}</span>`, t: f.n, m: `${f.c} notas`, go: 'pasta', p: 'n=' + f.n })).join('')}${G.li({ lead: `<span class="mi neutral">${ic('folder-open', 19)}</span>`, t: 'Sem pasta', m: '4 notas', go: 'pasta', p: 'n=Sem pasta' })}</div>
    <p class="t-s c3 rv" style="margin:0">Toque e segure uma pasta para renomear ou mudar a cor.</p>`}`
});
G.screen('pasta', {
  group: GRP, name: 'Pasta aberta', route: '/pasta/[id]', hue: 80, tab: 'notas', parent: 'pastas', pad: 'nb g20',
  desc: 'As notas de uma pasta, com a mesma linha da lista principal.',
  states: [['cheia', 'Com notas'], ['vazia', 'Pasta vazia']],
  render: (p, st) => {
    const nome = p.n || 'Casa'; const f = DB.pastas.find(x => x.n === nome) || { h: 80, c: 0 };
    return `${G.topbar({ title: '', right: G.cbtn('ellipsis', { sheet: 'novaPasta', label: 'Editar pasta' }) })}
      <div class="row g14 ai-c rv"><span class="mi lg" style="--h:${f.h}">${ic('folder', 26)}</span><div class="col"><h1 class="t-1">${esc(nome)}</h1><span class="t-s c3">${st === 'vazia' ? 'Nenhuma nota' : (f.c || 4) + ' notas'}</span></div></div>
      ${st === 'vazia' ? `<div class="card col ai-c g10 rv" style="text-align:center;padding:28px 20px"><span class="t-e">Pasta vazia</span><span class="t-s c3">Mova notas para cá pelo menu ⋯ de cada nota, ou crie uma aqui.</span><button class="btn t md" data-go="nota-nova">Nova nota nesta pasta</button></div>` : `<div class="grp rv">${DB.notas.filter(n => n.pasta === nome || (!DB.pastas.find(x => x.n === nome) && !n.pasta)).concat(nome === 'Casa' ? [] : []).map(noteRow).join('') || DB.notas.slice(0, 3).map(noteRow).join('')}</div>`}`;
  }
});

/* ---------- Lixeira ---------- */
G.screen('lixeira', {
  group: GRP, name: 'Lixeira', route: '/lixeira', hue: 80, tab: 'notas', pad: 'nb g20',
  desc: 'Exclusão é sempre lógica: o item vai para a lixeira e volta com um toque. Vale para notas, lançamentos e outros itens.',
  states: [['cheia', 'Com itens'], ['vazia', 'Vazia']],
  feats: ['Cada item mostra quando foi excluído e de onde veio.', 'Restaurar devolve ao lugar de origem, com aviso e "Desfazer".', '"Esvaziar" pede confirmação na própria tela: não dá para desfazer.'],
  motion: ['Restaurar: a linha recolhe (300 ms) e o aviso sobe com mola.', 'Esvaziar: as linhas saem em cascata depois de confirmar.'],
  render: (p, st) => `${G.topbar({ title: 'Lixeira' })}
    ${st === 'vazia' ? G.empty('Lixeira vazia', 'O que você excluir fica aqui até você esvaziar.', '', {}) : `
    ${G.chips([['tudo', 'Tudo'], ['notas', 'Notas'], ['fin', 'Finanças']], ['tudo'], { cls: 'rv' })}
    <div class="grp rv" id="trashList">${[['sticky-note', 80, 'Lista de livros 2025', 'Nota · excluída há 2 dias'], ['sticky-note', 80, 'Rascunho do discurso', 'Nota · excluída em 18/11'], ['shopping-cart', 160, 'Padaria (duplicado)', 'Gasto · − R$ 18,50 · excluído ontem']].map(([i, h, t, m]) => G.li({ tag: 'div', icon: i, h, t, m, end: '<button class="btn t sm" data-act="restore">Restaurar</button>' })).join('')}</div>
    <button class="btn d b rv" data-sheet="esvaziar">Esvaziar lixeira</button>`}`
});
G.act('restore', t => { const row = t.closest('.li'); const name = $('.tt', row).textContent; G.collapse(row); G.toast(`“${esc(name)}” restaurada`, { icon: 'undo-2', undo: () => G.uncollapse(row) }); });
G.sheet('esvaziar', {
  title: 'Esvaziar a lixeira?',
  render: () => `<p class="t-b c2" style="margin:0">Os 3 itens serão excluídos para sempre, em todos os aparelhos. Não dá para desfazer.</p>`,
  foot: () => `<button class="btn g" data-close style="background:var(--bg)">Cancelar</button><button class="btn d" data-act="emptyTrash">Excluir 3 itens</button>`
});
G.act('emptyTrash', () => { G.closeSheet().then(() => { const rows = $$('#trashList .li'); rows.forEach((r, i) => setTimeout(() => G.collapse(r), G.D(i * 70))); setTimeout(() => G.setState('vazia'), G.D(600)); G.toast('Lixeira esvaziada', { icon: 'trash-2' }); }); });

/* ---------- folhas de notas ---------- */
G.sheet('notaMais', {
  title: 'Nota',
  render: () => `<div class="col">${[['folder-input', 'Mover para pasta', 'moverPasta'], ['tag', 'Tags', 'tags'], ['link', 'Ligar a…', 'ligar']].map(([i, t, s]) => G.li({ lead: `<span class="mi neutral sm">${ic(i, 17)}</span>`, t, sheet: s })).join('')}${G.li({ lead: `<span class="mi ton sm">${ic('sparkles', 17)}</span>`, t: 'Organizar com IA', m: 'Sugere tags, vínculos e tarefas', act: 'closeThen', p: 'msg=A IA sugeriu 2 tags e 1 vínculo;icon=sparkles' })}${G.li({ lead: `<span class="mi neutral sm">${ic('file-down', 17)}</span>`, t: 'Exportar em Markdown', m: 'Compatível com Obsidian', act: 'closeThen', p: 'msg=Arquivo .md pronto;icon=file-down' })}</div>
    <button class="btn d b" data-act="trashNote">${ic('trash-2', 18)}Mover para a lixeira</button>`
});
G.act('trashNote', () => { G.closeSheet().then(() => { G.back(); G.onBackMount(); setTimeout(() => G.toast('Nota movida para a lixeira', { icon: 'trash-2', undo: () => G.toast('Nota de volta', { icon: 'undo-2' }) }), G.D(300)); }); });
G.sheet('moverPasta', {
  title: 'Mover para pasta',
  render: () => `<div class="col" data-radios data-on="pastaPick">${DB.pastas.map((f, i) => `<button class="li hi ${i === 0 ? 'on' : ''}" data-act="radio" data-v="${f.n}"><span class="mi sm" style="--h:${f.h}">${ic('folder', 17)}</span><span class="tt grow">${f.n}</span><span class="radio"></span></button>`).join('')}<button class="li hi" data-act="radio" data-v="Sem pasta"><span class="mi sm neutral">${ic('folder-open', 17)}</span><span class="tt grow">Sem pasta</span><span class="radio"></span></button></div><button class="btn t b" data-sheet="novaPasta">${ic('folder-plus', 18)}Nova pasta</button>`
});
G.act('pastaPick', (t, v) => { setTimeout(() => G.closeSheet().then(() => G.toast(`Movida para ${esc(v)}`, { icon: 'folder' })), G.D(250)); });
G.sheet('novaPasta', {
  title: 'Nova pasta',
  render: () => `${G.field('Nome', { ph: 'Ex.: Viagens', id: 'npName' })}<div class="field"><span class="fl">Cor</span><div class="row g10 wrap" data-radios>${[80, 25, 160, 205, 350, 130, 305, 260].map((h, i) => `<button class="${i === 0 ? 'on' : ''}" data-act="radio" style="width:40px;height:40px;border-radius:13px;background:oklch(var(--soft-l) var(--soft-c) ${h});color:oklch(var(--strong-l) var(--strong-c) ${h});display:flex;align-items:center;justify-content:center" aria-label="Cor ${i + 1}">${ic('folder', 18)}</button>`).join('')}</div></div>`,
  foot: () => `<button class="btn p" data-act="closeThen" data-p="msg=Pasta criada;icon=folder-plus">Criar pasta</button>`
});
G.sheet('tags', {
  title: 'Tags',
  render: () => `<label class="search" for="tagIn" style="background:var(--bg)">${ic('hash', 18)}<input id="tagIn" placeholder="Nova tag ou buscar"></label>${G.chips([['mercado', '#mercado'], ['casa', '#casa'], ['natal', '#natal'], ['salmos', '#salmos'], ['treino', '#treino'], ['passeios', '#passeios'], ['trabalho', '#trabalho']], ['mercado'], { multi: true, check: true })}<p class="t-c c3" style="margin:0">Tags valem para qualquer coisa: notas, gastos, eventos e fotos.</p>`,
  foot: () => `<button class="btn p" data-act="closeThen" data-p="msg=Tags atualizadas;icon=tag">Pronto</button>`
});
G.sheet('tipoNota', {
  title: 'Tipo da nota',
  render: () => `<div class="col" data-radios data-on="kindPick">${Object.entries(KIND).map(([k, [l, i]], j) => `<button class="li hi ${j === 0 ? 'on' : ''}" data-act="radio" data-v="${k}"><span class="mi sm" style="--h:80">${ic(i, 17)}</span><span class="col grow g2"><span class="tt">${l}</span><span class="mm">${k === 'note' ? 'Texto livre em markdown' : k === 'journal' ? 'Um por dia, com a data no título' : 'Modelo SOAP: passagem, observação, aplicação, oração'}</span></span><span class="radio"></span></button>`).join('')}</div>`
});
G.act('kindPick', () => setTimeout(() => G.closeSheet().then(() => G.toast('Tipo alterado', { icon: 'check' })), G.D(250)));
G.sheet('ligar', {
  title: 'Ligar a…',
  render: () => `<label class="search" for="lkIn" style="background:var(--bg)">${ic('search', 18)}<input id="lkIn" placeholder="Notas, gastos, eventos, versículos, fotos"></label>
    ${G.chips([['tudo', 'Tudo'], ['nota', 'Notas'], ['tx', 'Gastos'], ['ev', 'Eventos'], ['bib', 'Bíblia'], ['foto', 'Fotos']], ['tudo'], { cls: 'scroll-x' })}
    <div class="col">${[['sticky-note', 80, 'Ideias para o fim de semana', 'Nota'], ['shopping-cart', 160, 'Atacadão · R$ 318,60', 'Gasto · 25/11'], ['calendar', 25, 'Consulta no dentista', 'Evento · hoje 14:30'], ['book-open', 350, 'Salmos 23:4', 'Bíblia'], ['image', 240, 'Nota fiscal Atacadão', 'Foto']].map(([i, h, t, m]) => G.li({ icon: i, h, t, m, act: 'closeThen', p: 'msg=Vínculo criado;icon=link', end: `<span class="c4">${ic('plus', 18)}</span>` })).join('')}</div>`
});
})();
