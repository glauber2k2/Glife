'use strict';
/* Bíblia e devocionais (início, leitor em modo leitura, devocional SOAP, linha do tempo) e Galeria (grade e foto). */
(function () {
const { ic, mascot, esc, $, $$, motion, E, DB, brl } = G;
const GRP = 'Bíblia e devocionais';
const GRP2 = 'Galeria';
const PS23 = [
  'O Senhor é o meu pastor; nada me faltará.',
  'Em pastos verdes me faz descansar; conduz-me junto às águas tranquilas.',
  'Restaura a minha alma; guia-me pelas veredas da justiça, por amor do seu nome.',
  'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.',
  'Preparas uma mesa diante de mim na presença dos meus adversários; unges a minha cabeça com óleo; o meu cálice transborda.',
  'Certamente a bondade e a misericórdia me seguirão todos os dias da minha vida, e habitarei na casa do Senhor para sempre.'
];
const CREDIT = 'Texto de exemplo. No app: Bíblia Livre (BLIVRE), CC BY 4.0, com crédito aos autores.';

/* ---------- Início da Bíblia ---------- */
G.screen('biblia', {
  group: GRP, name: 'Bíblia', route: '/biblia', hue: 350, tab: 'inicio', pad: 'nb g20',
  desc: 'Plano de leitura, continuar de onde parou, devocional do dia e as marcações recentes. O texto original é só leitura: suas marcações, anotações e edições ficam em camadas separadas.',
  states: [['plano', 'Com plano'], ['semplano', 'Sem plano']],
  feats: ['Tradução no topo (BLIVRE); arquitetura pronta para comparar traduções depois.', 'Plano com o dia atual, a sequência de dias e o próximo trecho.', 'Marcações recentes com a cor do marca-texto e a anotação ligada.', 'Livros do Antigo e do Novo Testamento numa folha com busca.', 'Crédito da Bíblia Livre visível.'],
  motion: ['A barra do plano enche em 800 ms; o mascote comemora (olhos felizes) quando o dia é concluído.', '"Continuar" cresce até o leitor.'],
  render: (p, st) => `${G.hdr('', 'Bíblia', `<div class="row g8"><span class="tag lg" style="background:var(--card)">BLIVRE</span>${G.cbtn('type', { sheet: 'leituraAjustes', label: 'Ajustes de leitura' })}${G.cbtn('search', { go: 'busca-biblia', label: 'Buscar na Bíblia' })}</div>`)}
    ${st === 'semplano' ? `<div class="card col g12 rv"><div class="row g12 ai-c">${mascot(40, 'var(--accent)', 'var(--card)', 'feliz')}<div class="col"><span class="t-e">Escolha um plano</span><span class="t-s c3">Um pouco por dia, com lembrete.</span></div></div><div class="col">${[['Salmos em 30 dias', '5 salmos por dia'], ['Evangelhos em 60 dias', 'Mateus a João'], ['Bíblia em 1 ano', 'AT e NT todo dia']].map(([t, m]) => G.li({ t, m, act: 'toast', msg: 'Plano escolhido: ' + t })).join('')}</div></div>` : `
    <button class="card col g12 rv" data-go="leitor" style="text-align:left;background:oklch(var(--soft-l) var(--soft-c) 350)">
      <div class="row between ai-c"><div class="col g2"><span class="t-c" style="color:oklch(var(--strong-l) var(--strong-c) 350);font-weight:600">Plano de leitura</span><span class="t-e">Salmos em 30 dias</span></div>${mascot(36, 'oklch(var(--strong-l) var(--strong-c) 350)', 'oklch(var(--soft-l) var(--soft-c) 350)', 'feliz')}</div>
      <div class="bar" style="background:color-mix(in srgb,oklch(var(--strong-l) var(--strong-c) 350) 18%,transparent)"><i style="width:76%;background:oklch(var(--strong-l) var(--strong-c) 350)"></i></div>
      <div class="row between t-s"><span class="c2">Dia 23 de 30 · hoje: Salmos 23–27</span><span class="row g4 w6" style="color:oklch(var(--strong-l) var(--strong-c) 350)">${ic('flame', 16)}12 dias</span></div></button>`}
    ${st === 'semplano' ? '' : `<button class="row g6 t-s w5 ca self-s rv" data-go="planos">${ic('list-checks', 16)}Ver o plano e outros planos</button>`}<section class="col g12 rv">${G.sec('Continuar', 'Livros', { sheet: 'livros' })}
      <button class="card col g8" data-go="leitor" data-expand style="text-align:left"><span class="t-c c3">Salmos 23 · versículo 4</span><span class="verse" style="font-size:17px;line-height:28px">“${PS23[3].slice(0, 86)}…”</span></button></section>
    <section class="col g12 rv">${G.sec('Devocional de hoje', 'Todos', { go: 'devocionais' })}
      <button class="card col g8" data-go="devocional" style="text-align:left"><div class="row between"><span class="t-e">O vale não está vazio</span><span class="tag ok">${ic('check', 12)}Feito</span></div><span class="t-s c3">Salmos 23 · observação, aplicação e oração</span></button></section>
    <section class="col g12 rv">${G.sec('Marcações recentes')}<div class="grp">${[['y', 'Salmos 23:4', 'Lembrar disso nas semanas difíceis.'], ['b', 'Filipenses 4:6–7', 'Oração antes da ansiedade.'], ['g', 'Romanos 8:28', '']].map(([c, r, n]) => `<button class="li" data-go="leitor"><span class="hdot ${c}"></span><span class="col grow g2"><span class="tt">${r}</span><span class="mm">${n || 'Marca-texto'}</span></span>${n ? `<span class="c3">${ic('notebook-pen', 18)}</span>` : ''}</button>`).join('')}</div></section>
    <p class="t-c c3 rv" style="margin:0">${CREDIT}</p>`
});
G.sheet('livros', {
  title: 'Livros', cls: 'full',
  render: () => `<label class="search" for="bkIn" style="background:var(--bg)">${ic('search', 18)}<input id="bkIn" placeholder="Livro ou referência, ex.: Jo 3:16"></label>${G.seg(['Antigo Testamento', 'Novo Testamento'], 0)}
    <div class="col">${[['Gênesis', 50], ['Êxodo', 40], ['Josué', 24], ['1 Samuel', 31], ['Salmos', 150, 1], ['Provérbios', 31], ['Eclesiastes', 12], ['Isaías', 66]].map(([b, n, on]) => `<button class="li sm" data-act="${on ? 'openChap' : 'noop'}"><span class="tt grow ${on ? 'ca' : ''}">${b}</span><span class="t-s c3 tn">${n} cap.</span></button>`).join('')}</div>
    <span class="lbl">Salmos · capítulos</span><div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px">${Array.from({ length: 30 }, (_, i) => `<button class="chip ${i === 22 ? 'on' : ''}" data-act="openChap" style="justify-content:center;padding:0;${i < 22 ? 'color:var(--fg-3)' : ''}">${i + 1}</button>`).join('')}</div>`
});
G.act('openChap', () => G.closeSheet().then(() => G.go('leitor')));

/* ---------- Leitor ---------- */
const verseHtml = (st) => PS23.map((v, i) => {
  const n = i + 1; let cls = 'vs';
  if (n === 4) cls += ' hy';
  if (n === 1 && st === 'editado') cls += ' ed';
  if (n === 6) cls += ' ul';
  if (st === 'selecao' && (n === 2 || n === 3)) cls += ' sel';
  const text = n === 1 && st === 'editado' ? 'O Senhor cuida de mim como um pastor; nada me falta.' : v;
  return `<span class="${cls}" data-v="${n}" data-act="verse"><span class="vn">${n}</span>${text}</span>${n === 1 && st === 'editado' ? ` <button class="tag ton" data-sheet="original" style="height:22px;font-size:11px;vertical-align:middle">${ic('pencil', 11)}editado</button>` : ''}${n === 4 ? ` <button class="tag" data-sheet="anotacao" style="height:22px;font-size:11px;vertical-align:middle;background:oklch(var(--hlt-l) var(--hlt-c) 95)">${ic('notebook-pen', 11)}1</button>` : ''} `;
}).join('');
G.screen('leitor', {
  group: GRP, name: 'Leitor (modo leitura)', route: '/biblia/[livro]/[cap]', hue: 350, tab: 'inicio', parent: 'biblia', full: true,
  desc: 'Só texto: as barras somem ao rolar e a barra de ferramentas aparece só quando você seleciona versículos. Toque em versículos para selecionar.',
  states: [['leitura', 'Lendo'], ['selecao', 'Versículos selecionados'], ['editado', 'Versículo editado']],
  feats: ['Fonte de leitura serifada 19/32 (troca em Aa: serifa ou Outfit, tamanho e espaçamento).', 'Seleção: marca-texto em 4 tons (amarelo, verde, azul, rosa), sublinhar, anotar, copiar, ligar a nota/gasto/foto.', 'Versículo com edição sua mostra "editado", com "Ver original" e "Restaurar" (apaga só a sua camada).', 'Anotação ligada aparece como uma etiqueta no versículo.', 'No fim do capítulo: marcar como lido (avança o plano) e ir para o próximo.', 'Barra inferior: capítulo anterior/próximo e ouvir.'],
  motion: ['Selecionar: o fundo tonal entra em 200 ms e a barra de ferramentas sobe com mola; a barra de navegação desce.', 'Aplicar uma cor: a marca se espalha do fundo tonal para a cor escolhida.', 'Marcar como lido: o mascote do plano sorri e a barra do plano avança.'],
  render: (p, st) => `<div class="scroll" id="readScroll"><div class="pad g16" style="padding-bottom:140px">
      <div class="topbar">${G.cbtn('chevron-left', { back: true, label: 'Voltar' })}<button class="tb-t" data-sheet="livros">Salmos 23 ${ic('chevron-down', 14)}<small>Salmo de Davi · BLIVRE</small></button>${G.cbtn('type', { sheet: 'leituraAjustes', label: 'Aa' })}</div>
      <div class="verse" id="verses" style="padding-top:8px">${verseHtml(st)}</div>
      <div class="card col g12" style="margin-top:12px"><div class="row g10 ai-c">${G.mi('notebook-pen', 350, 'sm')}<span class="col grow"><span class="t-c c3">Sua anotação · v. 4</span><span class="t-s">Lembrar disso nas semanas difíceis.</span></span></div></div>
      <button class="btn t b" data-act="markRead">${ic('check', 18)}Marcar capítulo como lido</button>
      <p class="t-c c3" style="margin:0">${CREDIT}</p></div></div>
    <div class="read-bar ${st === 'selecao' ? 'away' : ''}" id="readBar">${G.cbtn('chevron-left', { cls: 'sm', act: 'toast', msg: 'Salmos 22', label: 'Capítulo anterior' })}<div class="col grow ta-c"><span class="t-s w6">Salmos 23</span><span class="t-c c3">Ouvir · 4 min</span></div><button class="cbtn sm" data-act="listen" aria-label="Ouvir" style="background:var(--accent);color:var(--on-accent)">${ic('play', 18)}</button>${G.cbtn('chevron-right', { cls: 'sm', act: 'toast', msg: 'Salmos 24', label: 'Próximo capítulo' })}</div>
    <div id="selHost">${st === 'selecao' ? selbar(2) : ''}</div>`,
  mount: (el, p, st) => { if (st === 'selecao') G.paint(); }
});
function selbar(n) {
  return `<div class="selbar" id="selbar" role="toolbar" aria-label="Ações nos versículos"><div class="r"><span class="t-s w6" style="padding-left:6px">${n} versículo${n > 1 ? 's' : ''}</span><div class="row g8">${['y', 'g', 'b', 'p'].map(c => `<button class="hdot ${c}" data-act="hlApply" data-c="${c}" aria-label="Marca-texto ${({ y: 'amarelo', g: 'verde', b: 'azul', p: 'rosa' })[c]}"></button>`).join('')}</div><button class="cbtn sm on-ink" data-act="selClear" aria-label="Limpar seleção">${ic('x', 16)}</button></div>
    <div class="r">${[['underline', 'Sublinhar', 'ulApply'], ['notebook-pen', 'Anotar', 'annot'], ['pencil', 'Editar', 'editVerse'], ['copy', 'Copiar', 'copyVerse'], ['link', 'Ligar', 'linkVerse']].map(([i, l, a]) => `<button class="sb" data-act="${a}">${ic(i, 20)}${l}</button>`).join('')}</div></div>`;
}
const showSel = () => { const el = G.cur().el; const sel = $$('.vs.sel', el); const host = $('#selHost', el); const bar = $('#readBar', el);
  if (sel.length && !$('#selbar', el)) { host.innerHTML = selbar(sel.length); G.paint(); motion($('#selbar', el), [{ transform: 'translateY(140%)' }, { transform: 'none' }], 420, E.spring); bar.classList.add('away'); }
  else if (sel.length) { $('#selbar .t-s', el).textContent = `${sel.length} versículo${sel.length > 1 ? 's' : ''}`; }
  else if (!sel.length && $('#selbar', el)) { const sb = $('#selbar', el); motion(sb, [{ transform: 'none' }, { transform: 'translateY(140%)' }], 220, E.exit, { fill: 'forwards' }).then(() => sb.remove()); bar.classList.remove('away'); } };
G.act('verse', t => { t.classList.toggle('sel'); showSel(); });
G.act('selClear', () => { $$('.vs.sel').forEach(v => v.classList.remove('sel')); showSel(); });
G.act('hlApply', t => { const c = t.dataset.c; const sel = $$('.vs.sel'); sel.forEach(v => { v.classList.remove('sel', 'hy', 'hg', 'hb', 'hp'); v.classList.add('h' + c); }); showSel(); G.toast(`${sel.length} versículo${sel.length > 1 ? 's' : ''} marcado${sel.length > 1 ? 's' : ''}`, { icon: 'highlighter', undo: () => sel.forEach(v => v.classList.remove('h' + c)) }); });
G.act('ulApply', () => { const sel = $$('.vs.sel'); sel.forEach(v => { v.classList.remove('sel'); v.classList.add('ul'); }); showSel(); });
G.act('annot', () => G.openSheet('anotacao', { novo: 1 }));
G.act('editVerse', () => G.openSheet('editarVersiculo'));
G.act('copyVerse', () => { const txt = $$('.vs.sel').map(v => v.textContent).join(' ') + ' (Salmos 23, BLIVRE)'; try { navigator.clipboard && navigator.clipboard.writeText(txt).catch(() => {}); } catch (e) { /* sem área de transferência */ } $$('.vs.sel').forEach(v => v.classList.remove('sel')); showSel(); G.toast('Copiado com a referência', { icon: 'copy' }); });
G.act('linkVerse', () => G.openSheet('ligar'));
G.act('listen', t => { const playing = t.dataset.on === '1'; t.dataset.on = playing ? '0' : '1'; t.innerHTML = ic(playing ? 'play' : 'pause', 18); G.paint(); });
G.act('markRead', t => { t.outerHTML = `<div class="alert ok pv">${mascot(28, 'var(--ok)', 'var(--ok-soft)', 'feliz')}<span class="grow"><b>Dia 23 concluído.</b> 13 dias seguidos. Amanhã: Salmos 28–32.</span></div>`; G.paint(); });
G.sheet('leituraAjustes', {
  title: 'Leitura',
  render: () => `<div class="field"><span class="fl">Fonte</span>${G.seg([['serif', '<span style="font-family:var(--serif)">Serifa</span>'], ['sans', 'Outfit']], 0, { on: 'fontPick' })}</div>
    <div class="field"><span class="fl">Tamanho</span><div class="row g12 ai-c"><span class="t-c">A</span><input type="range" min="16" max="24" value="19" id="fsRange" class="grow" aria-label="Tamanho do texto" style="accent-color:var(--accent)"><span style="font-size:20px">A</span></div></div>
    <div class="field"><span class="fl">Espaçamento</span>${G.seg(['Compacto', 'Confortável', 'Amplo'], 1)}</div>
    <div class="li" style="padding:0;min-height:52px"><span class="col grow g2"><span class="tt">Números dos versículos</span></span>${G.sw(true)}</div>
    <div class="field"><span class="fl">Tradução</span>${G.chips([['blivre', 'Bíblia Livre'], ['outra', 'Adicionar outra']], ['blivre'])}<span class="hint">${ic('info', 16)}<span>Outras traduções só para uso pessoal, por causa dos direitos autorais.</span></span></div>`,
  mount: sh => { $('#fsRange', sh).addEventListener('input', e => { const v = $('#verses'); if (v) { v.style.fontSize = e.target.value + 'px'; v.style.lineHeight = Math.round(e.target.value * 1.68) + 'px'; } }); }
});
G.act('fontPick', (t, v) => { const vs = $('#verses'); if (vs) vs.classList.toggle('sans', v === 'sans'); });
G.sheet('anotacao', {
  title: p => p.novo ? 'Anotar' : 'Anotação · Salmos 23:4',
  render: p => `<div class="card tight" style="background:oklch(var(--hlt-l) var(--hlt-c) 95);border-radius:16px"><span class="verse" style="font-size:16px;line-height:26px">“${p.novo ? PS23[1] : PS23[3]}”</span></div>
    <textarea class="inp" rows="4" placeholder="O que esse trecho te diz? Markdown e [[vínculos]] valem aqui." aria-label="Anotação">${p.novo ? '' : 'Lembrar disso nas semanas difíceis.'}</textarea>
    <div class="chips"><button class="chip">${ic('link', 15)}Ligar a nota</button><button class="chip">${ic('image', 15)}Foto</button></div>
    ${p.novo ? '' : G.linkPanel([{ icon: 'sticky-note', h: 80, t: 'Devocional · Salmo 23', m: 'Nota', go: 'devocional' }], [])}`,
  foot: p => `${p.novo ? '' : `<button class="btn d" data-act="closeThen" data-p="msg=Anotação excluída;icon=trash-2;undo=1" style="flex:none;width:52px;padding:0" aria-label="Excluir">${ic('trash-2', 18)}</button>`}<button class="btn p" data-act="closeThen" data-p="msg=Anotação salva;icon=notebook-pen">Salvar</button>`
});
G.sheet('original', {
  title: 'Salmos 23:1',
  render: () => `<div class="col g6"><span class="lbl">Sua versão</span><span class="verse" style="font-size:17px;line-height:28px">O Senhor cuida de mim como um pastor; nada me falta.</span></div><div class="col g6"><span class="lbl">Original · BLIVRE</span><span class="verse c2" style="font-size:17px;line-height:28px">${PS23[0]}</span></div><span class="hint">${ic('shield-check', 16)}<span>O texto original nunca muda. Restaurar apaga só a sua versão.</span></span>`,
  foot: () => `<button class="btn g" data-sheet="editarVersiculo" style="background:var(--bg)">Editar</button><button class="btn t" data-act="restoreVerse">Restaurar original</button>`
});
G.act('restoreVerse', () => G.closeSheet().then(() => { G.setState('leitura'); setTimeout(() => G.toast('Versículo restaurado', { icon: 'undo-2', undo: () => G.setState('editado') }), G.D(200)); }));
G.sheet('editarVersiculo', {
  title: 'Sua versão do versículo',
  render: () => `<p class="t-s c3" style="margin:0">Fica numa camada só sua, em markdown. O original continua disponível.</p><textarea class="inp" rows="3" style="font-family:var(--serif);font-size:17px;line-height:27px" aria-label="Sua versão">${PS23[1]}</textarea>`,
  foot: () => `<button class="btn p" data-act="closeThen" data-p="msg=Versão salva · marcada como editada;icon=pencil">Salvar versão</button>`
});

/* ---------- Devocional (SOAP) ---------- */
const soap = (k, t, ph, v) => `<section class="col g8"><span class="lbl">${k} · ${t}</span>${v ? `<div class="card md" style="padding:16px"><p class="serif" style="color:var(--fg)">${v}</p></div>` : `<textarea class="inp" rows="3" placeholder="${ph}" style="font-family:var(--serif);font-size:17px;line-height:27px" aria-label="${t}"></textarea>`}</section>`;
G.screen('devocional', {
  group: GRP, name: 'Devocional (SOAP)', route: '/nota/[id] (tipo devocional)', hue: 350, tab: 'inicio', parent: 'biblia', pad: 'cta g20',
  desc: 'O devocional é uma nota do tipo devocional com modelo pronto: passagem, observação, aplicação e oração. A passagem citada vira vínculo: abrindo o Salmo 23 você vê todos os devocionais sobre ele.',
  states: [['feito', 'Feito hoje'], ['novo', 'Novo (modelo vazio)']],
  feats: ['Data e passagem no topo ([[Sl 23]] vira glife://bible/PSA.23).', 'Texto da passagem em serifa, puxado do original.', 'Cada parte do SOAP em markdown, salvando sozinho.', '"Concluir" marca o dia na linha do tempo e no plano.'],
  motion: ['As quatro partes entram em cascata.', 'Concluir: a etiqueta "Feito" entra com mola e o mascote sorri.'],
  render: (p, st) => {
    const novo = st === 'novo';
    return `${G.topbar({ title: '<span class="savest"><i class="d"></i>Salvo</span>', right: G.cbtn('ellipsis', { sheet: 'notaMais', label: 'Mais' }) })}
      <div class="col g8 rv"><span class="t-s c3">Quinta, 26 de novembro${novo ? '' : ' · <span class="cok w6">feito</span>'}</span><h1 class="t-1" style="font-size:28px;line-height:34px">${novo ? 'Devocional de hoje' : 'O vale não está vazio'}</h1>
        <div class="chips"><button class="chip" data-go="leitor" style="height:32px">${ic('book-open', 15)}Salmos 23</button>${novo ? `<button class="chip" data-sheet="livros" style="height:32px">${ic('plus', 14)}Passagem</button>` : ''}</div></div>
      <div class="card rv" style="background:oklch(var(--soft-l) var(--soft-c) 350)"><span class="verse" style="font-size:17px;line-height:28px">“${PS23[3]}”</span><span class="t-c c3" style="display:block;margin-top:8px">Salmos 23:4 · BLIVRE</span></div>
      <div class="col g16 rv">${soap('O', 'Observação', 'O que o texto diz?', novo ? '' : 'Davi não diz que o vale some. Ele diz que não está sozinho nele. O cuidado aparece no meio da dificuldade, não depois dela.')}</div>
      <div class="col g16 rv">${soap('A', 'Aplicação', 'O que muda na minha vida?', novo ? '' : 'Na semana corrida, parar de esperar tudo se resolver para ter paz. Lembrar no trânsito e antes das reuniões.')}</div>
      <div class="col g16 rv">${soap('O', 'Oração', 'Escreva sua oração…', novo ? '' : 'Senhor, obrigado por estar comigo também nos dias pesados. Me ajuda a confiar antes de entender.')}</div>
      ${novo ? '' : G.linkPanel([{ icon: 'book-open', h: 350, t: 'Salmos 23', m: 'Bíblia · 3 devocionais sobre ele', go: 'leitor' }], [{ icon: 'sticky-note', h: 80, t: 'Diário · 25 de novembro', m: 'Nota', go: 'nota', p: 'id=n5' }])}`;
  },
  fixed: (p, st) => st === 'novo' ? `<div class="cta-bar"><button class="btn p" data-act="devDone">Concluir devocional</button></div>` : ''
});
G.act('devDone', () => { G.setState('feito'); setTimeout(() => G.toast('Devocional concluído · 13 dias seguidos', { icon: 'flame' }), G.D(250)); });
G.screen('devocionais', {
  group: GRP, name: 'Linha do tempo devocional', route: '/biblia/devocionais', hue: 350, tab: 'inicio', parent: 'biblia', pad: 'nb g20',
  desc: 'Calendário com os dias em que você fez devocional, a sequência atual e os devocionais por passagem. Lembrete diário opcional.',
  feats: ['Mapa do mês: cheio = feito, claro = só leitura do plano, contorno = hoje.', 'Lista dos devocionais com a passagem e a primeira linha.', 'Lembrete diário num horário (notificação local).'],
  motion: ['Os dias do calendário aparecem em cascata diagonal (+15 ms).'],
  render: () => {
    const done = [1, 2, 3, 5, 6, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26], light = [4, 7, 11];
    return `${G.topbar({ title: 'Devocionais' })}
      <div class="row g16 rv"><div class="card tight col g4 grow ai-c" style="border-radius:20px"><span class="t-2 tn">13</span><span class="t-c c3">dias seguidos</span></div><div class="card tight col g4 grow ai-c" style="border-radius:20px"><span class="t-2 tn">23</span><span class="t-c c3">em novembro</span></div><div class="card tight col g4 grow ai-c" style="border-radius:20px"><span class="t-2 tn">41</span><span class="t-c c3">no ano</span></div></div>
      <div class="card col g10 rv"><div class="row between"><span class="t-e">Novembro</span><span class="t-c c3">D S T Q Q S S</span></div><div class="calhm">${Array.from({ length: 30 }, (_, i) => { const d = i + 1; return `<i class="${done.includes(d) ? 'd2' : light.includes(d) ? 'd1' : ''} ${d === 26 ? 't' : ''} pv" style="animation-delay:${i * 15}ms" title="${d}/11"></i>`; }).join('')}</div></div>
      <div class="grp rv">${[['O vale não está vazio', 'Salmos 23 · hoje'], ['Cuidado antes da ansiedade', 'Filipenses 4 · 12/11'], ['Tudo coopera', 'Romanos 8 · 05/11']].map(([t, m]) => G.li({ icon: 'book-open', h: 350, t, m, go: 'devocional' })).join('')}</div>
      <div class="li rv" style="min-height:56px;background:var(--card);border-radius:20px;padding:0 16px"><span class="col grow g2"><span class="tt">Lembrete diário</span><span class="mm">Todo dia às 06:30</span></span>${G.sw(true)}</div>
      <button class="btn p b rv" data-go="devocional" data-p="st=novo">${ic('plus', 18)}Novo devocional</button>`;
  }
});

/* ---------- Galeria ---------- */
G.screen('galeria', {
  group: GRP2, name: 'Galeria', route: '/galeria', hue: 240, tab: 'inicio', pad: 'nb g20',
  desc: 'Fotos e arquivos na nuvem, ligáveis a qualquer coisa. A foto aparece na hora e sobe quando houver internet.',
  states: [['normal', 'Com fotos'], ['cota', 'Espaço quase cheio'], ['vazia', 'Vazia']],
  feats: ['Álbuns, tags e busca por legenda.', 'Filtro "Sem uso" mostra fotos que não estão ligadas a nada.', 'Fila de envio visível: "enviando" e "esperando internet".', 'Espaço: aos 800 MB um aviso; aos 950 MB novos envios esperam, para nunca travar o resto do app.'],
  motion: ['Miniaturas entram com esmaecer em cascata; a foto tocada cresce até a tela cheia.'],
  render: (p, st) => `${G.hdr('312 fotos', 'Galeria', `<div class="row g8">${G.cbtn('search', { go: 'busca', label: 'Buscar' })}${G.cbtn('camera', { act: 'toast', msg: 'Câmera aberta', label: 'Tirar foto' })}</div>`)}
    ${st === 'vazia' ? G.empty('Nenhuma foto ainda', 'Fotos de notas fiscais, refeições e anotações ficam aqui, ligadas ao que importam.', 'Adicionar foto', { act: 'toast', msg: 'Escolher foto' }) : `
    ${st === 'cota' ? `<div class="alert warn rv">${ic('hard-drive', 18)}<span><b>812 MB de 1 GB usados.</b> Ainda cabe bastante, mas vale planejar a mudança para o armazenamento maior. Fotos novas continuam subindo.</span></div>` : `<div class="row g10 ai-c rv"><span class="t-c c3 grow">${ic('cloud-upload', 14)} 2 enviando · 312 MB de 1 GB</span><div style="width:90px">${G.bar(31, { cls: 'thin', fill: 'acc' })}</div></div>`}
    ${G.chips([['todas', 'Todas'], ['comp', 'Comprovantes', 'receipt'], ['ref', 'Refeições', 'salad'], ['anot', 'Anotações', 'notebook-pen'], ['sem', 'Sem uso', 'unlink']], ['todas'], { cls: 'scroll-x rv' })}
    <section class="col g10 rv"><span class="lbl">Álbuns</span><div class="chips scroll-x">${[['Casa nova', 240, 0], ['Viagem Serra', 160, 3], ['Notas fiscais', 55, 1], ['Igreja', 350, 2]].map(([n, h, k]) => `<button class="col g6" data-go="album" data-p="n=${n}" style="width:112px;flex:none;text-align:left">${G.photo(h, k)}<span class="t-s w5">${n}</span></button>`).join('')}</div></section>
    <section class="col g10 rv"><span class="lbl">Novembro</span><div class="pgrid">${[[160, 1, 'up'], [130, 2], [240, 0], [55, 1], [205, 3], [350, 0], [130, 2, 'wait'], [80, 3], [305, 0], [160, 1], [240, 3], [25, 2]].map(([h, k, s]) => `<button data-go="foto" data-expand class="noscale" style="border-radius:6px">${G.photo(h, k, s ? `<span class="ov"><span class="tag" style="background:var(--card);height:20px;font-size:10.5px">${ic(s === 'up' ? 'cloud-upload' : 'wifi-off', 11)}${s === 'up' ? 'Enviando' : 'Esperando'}</span></span>` : '')}</button>`).join('')}</div></section>`}`
});
G.screen('foto', {
  group: GRP2, name: 'Foto', route: '/galeria/[id]', hue: 240, tab: 'inicio', parent: 'galeria', pad: 'nb g16',
  desc: 'A foto com legenda, informações e o painel "Usada em": em quais notas, gastos, anotações bíblicas ou refeições ela aparece.',
  feats: ['Legenda editável (entra na busca).', 'Original nunca é alterado: cortes e ajustes ficam em camada separada.', 'Inserir em nota: gera ![[media:id]].', 'Excluir vai para a lixeira; se a foto está em uso, avisa onde.'],
  motion: ['Chega crescendo da miniatura; arrastar para baixo devolve à grade.'],
  render: () => `${G.topbar({ title: '25/11 · 18:42', right: G.cbtn('ellipsis', { sheet: 'fotoMais', label: 'Mais' }) })}
    <div class="rv" style="margin:0 -20px">${G.photo(160, 1).replace('class="photo"', 'class="photo" style="--h:160;border-radius:0;aspect-ratio:3/4"')}</div>
    ${G.field('Legenda', { v: 'Nota fiscal Atacadão · compra do mês' })}
    <div class="row g8 wrap rv"><span class="tag">${ic('cloud-check', 13)}Na nuvem</span><span class="tag">WebP · 312 KB</span><span class="tag">2000 × 2667</span></div>
    ${G.linkPanel([], [{ icon: 'shopping-cart', h: 160, t: 'Atacadão', m: 'Gasto · comprovante · − R$ 318,60', go: 'lancamento', p: 'id=t2' }, { icon: 'sticky-note', h: 80, t: 'Compras do mês', m: 'Nota · embutida no texto', go: 'nota', p: 'id=n2' }]).replace('Mencionada em', 'Usada em')}
    <div class="row g10 rv"><button class="btn g grow" data-sheet="ligar">${ic('link', 18)}Ligar</button><button class="btn g grow" data-act="toast" data-msg="Inserida em Compras do mês">${ic('file-plus', 18)}Inserir em nota</button></div>`
});
G.sheet('fotoMais', {
  title: 'Foto',
  render: () => `<div class="col">${G.li({ lead: `<span class="mi neutral sm">${ic('crop', 17)}</span>`, t: 'Cortar e ajustar', m: 'O original fica guardado', act: 'noop' })}${G.li({ lead: `<span class="mi neutral sm">${ic('folder-plus', 17)}</span>`, t: 'Adicionar a álbum', act: 'noop' })}${G.li({ lead: `<span class="mi ton sm">${ic('sparkles', 17)}</span>`, t: 'Ler com IA', m: 'Cria o gasto a partir da nota fiscal', act: 'closeThen', p: 'msg=A IA propôs 1 gasto na Caixa de entrada;icon=sparkles' })}</div><div class="alert warn">${ic('triangle-alert', 18)}<span>Esta foto está em 2 lugares. Excluir tira ela do gasto e da nota.</span></div><button class="btn d b" data-act="closeThen" data-p="msg=Foto movida para a lixeira;icon=trash-2;undo=1">Excluir foto</button>`
});
})();
