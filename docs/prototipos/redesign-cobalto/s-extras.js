'use strict';
/* Telas complementares: sistema e estados (abertura, notificações, avisos do Android, sincronização, item não encontrado,
   espaço das fotos), tags, nota trancada, seleção múltipla, categorias, contas e cartões, calendário do mês,
   busca e planos da Bíblia, álbum, histórico da dieta e conversas da IA. */
(function () {
const { ic, mascot, esc, $, $$, motion, E, DB, brl } = G;
const SYS = 'Sistema e estados';

/* ================= Sistema e estados ================= */
G.screen('abertura', {
  group: SYS, name: 'Abertura e primeira sincronização', route: 'inicialização do app', hue: 260, full: true,
  desc: 'O que aparece ao abrir. Normalmente é instantâneo (local-first). No primeiro acesso de um aparelho, o app baixa os dados uma vez e já deixa usar o que chegou.',
  states: [['abrindo', 'Abrindo'], ['sincronizando', 'Primeira sincronização'], ['offline', 'Sem internet no primeiro acesso']],
  feats: ['Abrindo: só a marca, sem carregamento; a tela de bloqueio vem logo em seguida.', 'Primeira sincronização: o que já chegou por módulo, com "Começar a usar" liberado assim que as notas chegam.', 'Fotos não vêm agora: só miniaturas, sob demanda.', 'Sem internet no primeiro acesso: explica que precisa de conexão uma única vez.'],
  motion: ['O mascote flutua; o anel e os contadores avançam juntos.', 'Quando termina, o anel vira um visto com mola e o mascote sorri.'],
  render: (p, st) => {
    if (st === 'abrindo') return `<div class="lock" style="justify-content:center;gap:18px">${mascot(96, 'var(--accent)', 'var(--bg)', '', 'float')}<span style="font-size:40px;font-weight:600;letter-spacing:-1.6px">Glife</span><span class="t-s c3" style="position:absolute;bottom:48px">Seus dados ficam neste aparelho</span></div>`;
    if (st === 'offline') return `<div class="lock" style="justify-content:center;text-align:center">${G.mi('wifi-off', 260, 'lg ton')}<h1 class="t-2" style="margin-top:8px">Precisa de internet uma vez</h1><p class="t-b c3 pretty" style="margin:0;max-width:300px">No primeiro acesso deste aparelho eu baixo seus dados. Depois disso, o Glife funciona sem conexão.</p><button class="btn p md" data-act="state" data-v="sincronizando" style="margin-top:14px">Tentar de novo</button></div>`;
    return `<div class="lock" style="gap:20px">${mascot(56, 'var(--accent)', 'var(--bg)', 'pensando', 'float')}<div class="col ai-c g6" style="text-align:center"><h1 class="t-2">Trazendo seus dados</h1><p class="t-s c3" style="margin:0">Só desta vez. Pode começar a usar enquanto isso.</p></div>
      <div id="syncRing">${G.ring(.42, 120, 10, '<span class="t-2 tn" id="syncPct">42%</span>')}</div>
      <div class="grp" style="width:100%" id="syncList">${[['sticky-note', 80, 'Notas', '34 de 34', 1], ['wallet', 160, 'Finanças', '<span class="tn" data-n="812" data-t="1240">812 de 1.240</span>', 0], ['calendar', 25, 'Agenda e dieta', 'Na fila', 0], ['book-open', 350, 'Suas marcações na Bíblia', 'Na fila', 0], ['images', 240, 'Fotos', 'Só miniaturas, quando abrir', 1]].map(([i, h, t, m, ok]) => `<div class="li hi" style="min-height:52px">${G.mi(i, h, 'sm')}<span class="tt grow">${t}</span><span class="t-s c3">${m}</span><span class="row ${ok ? 'cok' : 'c3'}" style="width:20px">${ok ? ic('check', 18) : ic('loader-circle', 18, 'spin')}</span></div>`).join('')}</div>
      <button class="btn p b" data-act="goTab" data-p="tab=inicio" style="margin-top:auto">Começar a usar</button></div>`;
  },
  mount: (el, p, st) => {
    if (st !== 'sincronizando') return;
    let k = .42;
    const t = setInterval(() => {
      if (!el.isConnected) return clearInterval(t);
      k = Math.min(1, k + .07);
      const c = $('#syncRing circle.val', el); c.style.strokeDashoffset = (+c.dataset.c * (1 - k)).toFixed(1);
      $('#syncPct', el).textContent = Math.round(k * 100) + '%';
      const n = $('[data-n]', el); if (n) { const v = Math.min(1240, Math.round(812 + (1240 - 812) * (k - .42) / .58)); n.textContent = `${G.n0(v)} de 1.240`; }
      if (k >= 1) { clearInterval(t); $$('#syncList .spin', el).forEach(s => { s.parentElement.classList.replace('c3', 'cok'); s.outerHTML = ic('check', 18); }); G.paint(); $('#syncRing', el).innerHTML = `<span class="mi lg pv" style="--h:150;width:120px;height:120px;border-radius:999px;background:var(--ok-soft);color:var(--ok)">${ic('check', 44)}</span>`; G.paint(); }
    }, G.D(500));
  }
});

const notif = (o) => `<div class="li hi ${o.unread ? 'unread' : ''}" style="min-height:68px;align-items:flex-start;padding:14px 0">${G.mi(o.i, o.h)}<span class="col grow g2"><span class="tt row g6">${o.t}${o.unread ? '<span class="udot"></span>' : ''}</span><span class="mm" style="white-space:normal">${o.m}</span><span class="t-c c4" style="margin-top:2px">${o.w}</span></span>${o.btn ? `<button class="btn t sm self-c" ${o.btn[1]}>${o.btn[0]}</button>` : ''}</div>`;
G.screen('notificacoes', {
  group: SYS, name: 'Notificações', route: '/notificacoes', hue: 260, tab: 'inicio', pad: 'nb g20',
  desc: 'Tudo o que o app avisou, num lugar só, com a ação direto na linha. O sino do Início mostra o ponto quando há algo novo.',
  states: [['com', 'Com avisos'], ['vazio', 'Nada novo']],
  feats: ['Avisos de Finanças (fatura, previsto atrasado), Agenda, Dieta, Bíblia e da IA.', 'Cada aviso abre a tela certa ou resolve na hora (Pagar, Confirmar, Registrar, Revisar).', '"Marcar como lidas" limpa os pontos; avisos com mais de 30 dias somem sozinhos.', 'O que cada módulo avisa se ajusta em Ajustes › Notificações.'],
  motion: ['Marcar como lidas: os pontos encolhem e somem em cascata.', 'Resolver na linha: a linha recolhe e o aviso de confirmação sobe.'],
  render: (p, st) => `${G.topbar({ title: 'Notificações', right: st === 'vazio' ? G.cbtn('settings-2', { go: 'ajustes', label: 'Ajustes' }) : `<button class="btn q sm" data-act="readAll" style="padding:0 4px">Marcar lidas</button>` })}
    ${st === 'vazio' ? G.empty('Nada novo por aqui', 'Quando algo pedir sua atenção, eu aviso aqui e no celular.', '', { mood: 'dormindo' }) : `
    <section class="col g10 rv"><span class="lbl">Hoje</span><div class="grp">${[
      { i: 'credit-card', h: 45, t: 'Fatura do Itaú Click vence em 6 dias', m: `${brl(127640)} · fechou em 25/11`, w: 'Há 12 min', unread: 1, btn: ['Pagar', 'data-sheet="pagarFatura" data-p="id=itaucard"'] },
      { i: 'wifi', h: 80, t: 'Internet atrasada', m: `Venceu em 24/11 · ${brl(11990)} · ainda não confirmado`, w: 'Há 1 h', unread: 1, btn: ['Confirmar', 'data-sheet="confirmar" data-p="id=internet"'] },
      { i: 'sparkles', h: 260, t: 'A IA organizou 1 entrada', m: '“gastei 45 no posto ipiranga” virou uma proposta de gasto', w: 'Há 1 h', unread: 1, btn: ['Revisar', 'data-go="caixa" data-p="st=proposta"'] },
      { i: 'apple', h: 130, t: 'Lanche da tarde às 16:00', m: 'Iogurte, granola e banana', w: 'Daqui a 6 h', btn: ['Registrar', 'data-go="registro-refeicao"'] }
    ].map(notif).join('')}</div></section>
    <section class="col g10 rv"><span class="lbl">Ontem</span><div class="grp">${[
      { i: 'flame', h: 350, t: '12 dias seguidos de leitura', m: 'Plano Salmos em 30 dias · faltam 7', w: 'Ontem, 07:42' },
      { i: 'bitcoin', h: 55, t: 'Bitcoin caiu 2,3% no mês', m: `Sua posição: ${brl(602593)}`, w: 'Ontem, 18:00', btn: ['Ver', 'data-go="ativo" data-p="id=btc"'] },
      { i: 'hard-drive', h: 240, t: 'Foto enviada', m: 'Nota fiscal Atacadão subiu quando o Wi‑Fi voltou', w: 'Ontem, 19:12' }
    ].map(notif).join('')}</div></section>`}`
});
G.act('readAll', () => { $$('.udot').forEach((d, i) => motion(d, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0)', opacity: 0 }], 240, E.exit, { delay: i * 50, fill: 'forwards' })); $$('.li.unread').forEach(r => r.classList.remove('unread')); G.toast('Tudo marcado como lido', { icon: 'check-check' }); });

const andr = (title, text, acts, icon = '') => `<div class="anot pv"><div class="row g8 ai-c t-c c3">${mascot(16, 'var(--accent)', 'var(--card)')}<span>Glife · agora</span></div><div class="row g12 ai-s"><div class="col g2 grow"><span class="t-e" style="font-size:15px">${title}</span><span class="t-s c2">${text}</span></div>${icon}</div><div class="row g16">${acts.map(([l, a]) => `<button class="link" ${a}>${l}</button>`).join('')}</div></div>`;
G.screen('aviso-sistema', {
  group: SYS, name: 'Avisos do Android', route: 'notificações locais (expo-notifications)', hue: 260, tab: 'inicio', full: true,
  desc: 'Como os avisos aparecem no celular, inclusive com a tela bloqueada. São notificações locais: tocam sem internet e trazem ações que resolvem sem abrir o app.',
  feats: ['Lembrete: "Feito" e "Adiar" (10 min, 1 h, amanhã 9h).', 'Refeição do plano: "Registrar" abre o registro já na refeição certa.', 'Previsto do dia em Finanças: "Confirmar" grava com o valor previsto (corrigir pede abrir o app).', 'O conteúdo do aviso é curto e não mostra saldos com a tela bloqueada.'],
  motion: ['Avisos entram de cima com mola; resolver um faz ele recolher.'],
  render: () => `<div class="lock" style="background:var(--inverse);color:var(--inverse-fg);padding-top:calc(var(--sb) + 40px);gap:6px"><span style="font-size:72px;line-height:72px;font-weight:300;letter-spacing:-3px" class="tn">9:41</span><span class="t-s" style="color:var(--inverse-3)">quinta-feira, 26 de novembro</span>
    <div class="col g10" style="width:100%;margin-top:28px" id="anots">
      ${andr('Pagar internet', 'Lembrete das 10:00 · Finanças', [['Feito', 'data-act="anotDone"'], ['Adiar', 'data-sheet="adiar"']])}
      ${andr('Lanche da tarde · 16:00', 'Iogurte, granola e banana', [['Registrar', 'data-go="registro-refeicao"'], ['Adiar', 'data-sheet="adiar"']])}
      ${andr('Previsto para hoje', 'Freela · site da Clínica Sorriso', [['Confirmar', 'data-act="anotDone" data-msg="Freela confirmado"'], ['Abrir', 'data-go="financas"']])}
    </div><button class="btn q" data-back style="margin-top:auto;color:var(--inverse-2)">Voltar ao protótipo</button></div>`
});
G.act('anotDone', t => { const c = t.closest('.anot'); G.collapse(c, 280); G.toast(t.dataset.msg || 'Lembrete concluído', { icon: 'check' }); });
G.sheet('adiar', {
  title: 'Adiar para',
  render: () => `<div class="col">${['Daqui a 10 minutos', 'Daqui a 1 hora', 'Amanhã às 9:00', 'Escolher horário'].map(t => G.li({ t, act: 'closeThen', p: `msg=Adiado: ${t.toLowerCase()};icon=alarm-clock`, noChev: true })).join('')}</div>`
});

G.screen('sincronizacao', {
  group: SYS, name: 'Sincronização e offline', route: '/ajustes/sincronizacao', hue: 260, tab: 'inicio', parent: 'ajustes', pad: 'nb g20',
  desc: 'O estado da sincronização em linguagem simples. Tudo é gravado primeiro no aparelho; sem internet o app continua igual e envia depois.',
  states: [['emdia', 'Em dia'], ['offline', 'Sem internet'], ['sessao', 'Sessão expirada']],
  feats: ['Em dia: hora da última troca e o que existe por módulo.', 'Sem internet: a fila do que espera para subir, com a garantia de que nada se perde.', 'Sessão expirada: os dados continuam aqui; para enviar e receber é preciso entrar de novo (e-mail, senha e código).', 'Fotos sobem por fila própria, nunca pela sincronização dos dados.'],
  motion: ['"Sincronizar agora": o ícone gira até terminar e a hora atualiza com um esmaecer.'],
  render: (p, st) => {
    const hero = { emdia: ['cloud-check', 150, 'Tudo em dia', 'Última troca há 12 s com a nuvem.'], offline: ['cloud-off', 260, 'Sem internet', 'Pode continuar usando: tudo fica salvo neste aparelho e sobe quando a conexão voltar.'], sessao: ['key-round', 45, 'Entre de novo para sincronizar', 'Sua sessão expirou. Os dados continuam aqui; para enviar e receber, entre com e-mail, senha e código.'] }[st];
    return `${G.topbar({ title: 'Sincronização' })}
      <div class="card col ai-c g10 rv" style="text-align:center;padding:26px 20px">${G.mi(hero[0], hero[1], 'lg' + (st === 'sessao' ? '' : ''))}<span class="t-3">${hero[2]}</span><span class="t-s c3 pretty" style="max-width:300px">${hero[3]}</span>
        ${st === 'emdia' ? `<button class="btn t md" data-act="syncNow">${ic('refresh-cw', 18)}Sincronizar agora</button>` : st === 'sessao' ? `<button class="btn p md" data-go="entrar">Entrar</button>` : ''}</div>
      ${st === 'offline' ? `<section class="col g10 rv"><span class="lbl">Esperando para enviar · 3</span><div class="grp">${G.li({ tag: 'div', icon: 'sticky-note', h: 80, t: 'Compras do mês', m: 'Nota editada há 2 min' })}${G.li({ tag: 'div', icon: 'shopping-cart', h: 160, t: 'Padaria Pão Quente', m: 'Gasto criado há 5 min · − R$ 18,50' })}${G.li({ tag: 'div', icon: 'image', h: 240, t: 'Nota fiscal', m: 'Foto · 312 KB · sobe pela fila de fotos' })}</div></section>` : ''}
      <section class="col g10 rv"><span class="lbl">Neste aparelho</span><div class="grp">${[['sticky-note', 80, 'Notas', '34'], ['wallet', 160, 'Lançamentos', '1.240'], ['calendar', 25, 'Eventos e lembretes', '96'], ['book-open', 350, 'Marcações e anotações', '58'], ['images', 240, 'Fotos (informações)', '312']].map(([i, h, t, n]) => G.li({ tag: 'div', icon: i, h, t, end: `<span class="t-s w6 tn">${n}</span>` })).join('')}</div><span class="t-c c3">Cópia completa no aparelho. A nuvem guarda outra, e há backup noturno criptografado.</span></section>`;
  }
});
G.act('syncNow', t => { const s = $('svg', t); if (s) s.classList.add('spin'); setTimeout(() => { if (s) s.classList.remove('spin'); G.toast('Sincronizado agora', { icon: 'cloud-check' }); }, G.D(1200)); });

G.screen('nao-encontrado', {
  group: SYS, name: 'Item não encontrado', route: 'glife://… quebrado ou excluído', hue: 260, tab: 'inicio', pad: 'nb g20',
  desc: 'Quando um vínculo, um aviso ou um link aponta para algo que não está disponível. A tela diz o motivo e o que fazer, sem erro técnico.',
  states: [['lixeira', 'Está na lixeira'], ['naosync', 'Ainda não chegou'], ['apagado', 'Excluído para sempre']],
  feats: ['Na lixeira: restaurar devolve o item e os vínculos.', 'Ainda não chegou: criado em outro aparelho; chega na próxima sincronização.', 'Excluído para sempre: o vínculo fica marcado como quebrado nas notas.'],
  motion: ['Restaurar: a tela troca pelo item com esmaecer.'],
  render: (p, st) => {
    const v = { lixeira: ['Este gasto está na lixeira', 'Atacadão · − R$ 318,60. Foi excluído ontem. Se restaurar, os vínculos com a nota e a foto voltam.', 'Restaurar', 'data-act="restoreFound"', 'Abrir a lixeira', 'data-go="lixeira"'], naosync: ['Ainda não chegou neste aparelho', 'Foi criado no computador há pouco e chega na próxima sincronização.', 'Sincronizar agora', 'data-act="restoreFound"', 'Voltar', 'data-back'], apagado: ['Não encontrei este item', 'Ele foi excluído para sempre. O vínculo nas notas aparece riscado para você saber.', 'Voltar', 'data-back', '', ''] }[st];
    return `${G.topbar({})}<div class="empty" style="padding-top:60px">${mascot(72, 'var(--accent)', 'var(--bg)', 'pensando', 'float')}<h2 class="t-3">${v[0]}</h2><p>${v[1]}</p><div class="col g10" style="width:100%;max-width:300px;margin-top:8px"><button class="btn p" ${v[3]}>${v[2]}</button>${v[4] ? `<button class="btn g" ${v[5]}>${v[4]}</button>` : ''}</div></div>`;
  }
});
G.act('restoreFound', () => { G.toast('Pronto', { icon: 'check' }); G.jump('lancamento'); });

G.screen('armazenamento', {
  group: SYS, name: 'Espaço das fotos', route: '/ajustes/armazenamento', hue: 240, tab: 'inicio', parent: 'ajustes', pad: 'nb g20',
  desc: 'Quanto as fotos ocupam na nuvem e o que fazer quando o espaço apertar. Os dados (notas, finanças) não contam aqui: são minúsculos.',
  states: [['normal', 'Folgado'], ['alerta', 'Passou de 800 MB'], ['cheio', 'Passou de 950 MB']],
  feats: ['Barra com as marcas de 800 MB (aviso) e 950 MB (novos envios esperam).', 'Onde está o espaço: comprovantes, refeições, anotações, álbuns; as maiores fotos.', 'Miniaturas guardadas no aparelho podem ser limpas (voltam quando precisar).', 'A mudança para o armazenamento maior (10 GB) é configurada uma vez fora do app; as fotos antigas continuam abrindo durante a mudança.'],
  motion: ['A barra enche em 800 ms; as marcas ficam paradas para comparar.'],
  render: (p, st) => {
    const mb = { normal: 312, alerta: 812, cheio: 955 }[st];
    return `${G.topbar({ title: 'Espaço das fotos' })}
      <div class="card col g12 rv"><div class="row between ai-e"><div class="col g2"><span class="t-s c3">Na nuvem</span><span class="t-big" style="font-size:34px;line-height:38px">${mb} MB</span></div><span class="t-s c3">de 1 GB</span></div>
        <div style="position:relative">${G.bar(mb / 10.24, { cls: 'thick', fill: st === 'cheio' ? 'bad' : st === 'alerta' ? '' : 'acc' })}<span style="position:absolute;left:78.1%;top:-4px;width:2px;height:18px;background:var(--fg-3);border-radius:2px"></span><span style="position:absolute;left:92.8%;top:-4px;width:2px;height:18px;background:var(--bad-strong);border-radius:2px"></span></div>
        <div class="row between t-c c3"><span>0</span><span>800 MB · aviso</span><span>950 MB</span></div></div>
      ${st === 'alerta' ? `<div class="alert warn rv">${ic('triangle-alert', 18)}<span><b>Passou de 800 MB.</b> Ainda cabe, mas é hora de planejar o armazenamento maior.</span></div>` : ''}
      ${st === 'cheio' ? `<div class="alert bad rv">${ic('cloud-off', 18)}<span><b>Novos envios esperam.</b> Fotos novas ficam no aparelho e sobem quando houver espaço. Nada se perde e o resto do app segue normal.</span></div>` : ''}
      ${st !== 'normal' ? `<div class="card col g10 rv"><span class="t-e">Armazenamento maior · 10 GB</span><span class="t-s c3 pretty">Configurado uma vez, fora do app. Fotos novas vão para lá e as antigas são copiadas aos poucos; durante a mudança, todas continuam abrindo.</span><button class="btn t md self-s" data-act="toast" data-msg="Passo a passo salvo em Notas">Ver o passo a passo</button></div>` : ''}
      <section class="col g10 rv"><span class="lbl">Onde está o espaço</span><div class="grp">${[['receipt', 160, 'Comprovantes', 96], ['salad', 130, 'Refeições', 74], ['notebook-pen', 305, 'Anotações e notas', 41], ['images', 240, 'Álbuns', 101]].map(([i, h, t, v]) => G.li({ tag: 'div', icon: i, h, t, end: `<span class="t-s w6 tn">${Math.round(v * mb / 312)} MB</span>` })).join('')}</div></section>
      <section class="col g10 rv"><span class="lbl">Maiores fotos</span><div class="pgrid">${[[240, 0, '2,1 MB'], [160, 3, '1,8 MB'], [350, 2, '1,6 MB']].map(([h, k, s]) => `<button data-go="foto" class="noscale">${G.photo(h, k, `<span class="ov"><span class="tag" style="background:var(--card)">${s}</span></span>`)}</button>`).join('')}</div></section>
      <div class="grp rv"><div class="li"><span class="col grow g2"><span class="tt">Miniaturas neste aparelho</span><span class="mm">48 MB · voltam quando precisar</span></span><button class="btn t sm" data-act="toast" data-msg="48 MB liberados no aparelho">Limpar</button></div></div>`;
  }
});

/* ================= Notas ================= */
const TAGS = [['mercado', 12, '5 notas · 6 gastos · 1 foto'], ['casa', 9, '6 notas · 3 gastos'], ['salmos', 7, '4 notas · 3 marcações'], ['natal', 4, '2 notas · 2 itens de compra'], ['trabalho', 5, '5 notas'], ['treino', 3, '3 notas'], ['passeios', 2, '1 nota · 1 evento']];
G.screen('tags', {
  group: 'Notas', name: 'Tags', route: '/tags', hue: 80, tab: 'notas', parent: 'notas', pad: 'nb g20',
  desc: 'Tags valem para qualquer coisa: notas, gastos, eventos, fotos e marcações da Bíblia. Aqui você vê, renomeia, junta e exclui.',
  feats: ['Contagem por tipo de item em cada tag.', 'Toque longo ou ⋯: renomear, juntar com outra (os itens passam para a escolhida) e excluir (os itens ficam, só perdem a tag).'],
  motion: ['Juntar: a linha da tag absorvida recolhe e a contagem da outra conta até o novo número.'],
  render: () => `${G.topbar({ title: 'Tags', right: G.cbtn('plus', { sheet: 'tags', label: 'Nova tag' }) })}
    <label class="search rv" for="tgQ">${ic('search', 20)}<input id="tgQ" placeholder="Filtrar tags"></label>
    <div class="grp rv">${TAGS.map(([t, n, m]) => `<div class="li hi"><span class="mi" style="--h:80">${ic('hash', 19)}</span><button class="col grow g2" data-go="tag" data-p="t=${t}" style="text-align:left"><span class="tt">#${t}</span><span class="mm">${m}</span></button><span class="t-s w6 tn">${n}</span>${G.cbtn('ellipsis', { cls: 'sm', sheet: 'tagMais', p: 't=' + t, label: 'Opções da tag' })}</div>`).join('')}</div>`
});
G.sheet('tagMais', {
  title: p => '#' + (p.t || 'mercado'),
  render: p => `${G.field('Nome', { v: p.t || 'mercado' })}<div class="col">${G.li({ lead: `<span class="mi neutral sm">${ic('merge', 17)}</span>`, t: 'Juntar com outra tag', m: 'Os itens passam para a escolhida', act: 'closeThen', p: 'msg=#casa juntou-se a #mercado;icon=merge;undo=1' })}</div><button class="btn d b" data-act="closeThen" data-p="msg=Tag excluída · os itens ficaram;icon=trash-2;undo=1">Excluir tag</button>`,
  foot: () => `<button class="btn p" data-act="closeThen" data-p="msg=Tag renomeada;icon=tag">Salvar</button>`
});
G.screen('tag', {
  group: 'Notas', name: 'Tag aberta', route: '/tags/[nome]', hue: 80, tab: 'notas', parent: 'tags', pad: 'nb g20',
  desc: 'Tudo o que tem a tag, de todos os módulos, agrupado por tipo.',
  render: p => `${G.topbar({ title: '#' + (p.t || 'mercado'), sub: '12 itens' })}
    ${G.chips([['tudo', 'Tudo'], ['n', 'Notas'], ['g', 'Gastos'], ['f', 'Fotos']], ['tudo'], { cls: 'rv' })}
    <section class="col g10 rv"><span class="lbl">Notas</span><div class="grp">${DB.notas.slice(0, 3).map(n => G.li({ icon: 'sticky-note', h: 80, t: n.t, m: n.p, go: 'nota', p: 'id=' + n.id })).join('')}</div></section>
    <section class="col g10 rv"><span class="lbl">Gastos</span><div class="grp">${G.txRow(DB.lanc[1])}${G.txRow({ id: 'x', dia: '15/11', d: 'Sacolão Bom Preço', c: 'mercado', v: -8930, conta: 'Nubank' })}</div></section>
    <section class="col g10 rv"><span class="lbl">Fotos</span><div class="pgrid"><button data-go="foto" class="noscale">${G.photo(160, 1)}</button></div></section>`
});

const LOCKED = '### Exames de dezembro\n- Hemograma completo\n- Vitamina D\n\n> Levar a carteirinha do plano e o pedido médico.\n\nResultado anterior em [[Consulta no dentista]].';
G.screen('nota-trancada', {
  group: 'Notas', name: 'Nota trancada', route: '/nota/[id] (trancada)', hue: 80, tab: 'notas', parent: 'notas', pad: 'nb g20',
  desc: 'Opção para notas muito sensíveis: o texto é criptografado no aparelho com uma senha só desta nota. Nem o servidor nem a IA conseguem ler.',
  states: [['trancada', 'Trancada'], ['aberta', 'Aberta'], ['criar', 'Trancar uma nota']],
  feats: ['Fica fora da busca e da IA; o título continua visível na lista (com cadeado).', 'Se esquecer a senha da nota, ela não pode ser recuperada, nem pela conta: o app avisa antes de trancar.', 'Abre por alguns minutos e tranca de novo sozinha ao sair.', 'No protótipo, qualquer senha com 4 ou mais caracteres abre.'],
  motion: ['Senha certa: o cadeado abre (gira de leve) e o texto aparece com esmaecer.', 'Senha errada: o campo treme uma vez.'],
  render: (p, st) => {
    if (st === 'aberta') return `${G.topbar({ title: '<span class="tag">' + ic('lock-open', 13) + 'Aberta por 5 min</span>', right: G.cbtn('lock', { act: 'state', v: 'trancada', label: 'Trancar de novo' }) })}<h1 class="t-1 fd" style="font-size:28px;line-height:34px">Diagnóstico e exames</h1><span class="t-c c3">Nota trancada · fora da busca e da IA</span><div class="md col g12 fd">${G.md(LOCKED)}</div>`;
    if (st === 'criar') return `${G.topbar({ title: 'Trancar nota' })}<div class="col g8"><h1 class="t-2">Diagnóstico e exames</h1><p class="t-s c3" style="margin:0">Escolha uma senha só para esta nota.</p></div>
      ${G.field('Senha da nota', { type: 'password', ac: 'new-password' })}${G.field('Repita a senha', { type: 'password', ac: 'new-password' })}
      <div class="alert warn">${ic('triangle-alert', 18)}<span><b>Sem recuperação.</b> Se esquecer esta senha, a nota não pode ser aberta por ninguém, nem com a sua conta.</span></div>
      <button class="li" data-act="agree" style="padding:0;min-height:44px">${G.ck(false, { sq: true })}<span class="t-s grow">Entendi que não há como recuperar</span></button>
      <button class="btn p b off" id="lockNoteBtn" data-act="state" data-v="trancada">Trancar nota</button>`;
    return `${G.topbar({})}<div class="col ai-c g14" style="text-align:center;padding-top:30px"><span class="mi ton lg" id="lockIc">${ic('lock', 26)}</span><h1 class="t-2">Diagnóstico e exames</h1><p class="t-s c3 pretty" style="margin:0;max-width:290px">Nota trancada. Digite a senha desta nota para abrir.</p></div>
      <form id="lnForm" class="col g12" novalidate><div class="inp" id="lnBox"><input id="lnIn" type="password" placeholder="Senha da nota" aria-label="Senha da nota"></div><button class="btn p b" type="submit">Abrir</button></form>
      <span class="hint">${ic('shield-check', 16)}<span>Criptografada no aparelho: nem o servidor nem a IA conseguem ler.</span></span>`;
  },
  mount: (el, p, st) => {
    const f = $('#lnForm', el); if (!f) return;
    f.addEventListener('submit', e => { e.preventDefault(); if ($('#lnIn', el).value.length >= 4) { motion($('#lockIc svg', el), [{ transform: 'rotate(0)' }, { transform: 'rotate(-18deg)' }, { transform: 'rotate(0)' }], 380, E.spring).then(() => G.setState('aberta')); } else { $('#lnBox', el).classList.add('err'); G.shake($('#lnBox', el)); } });
  }
});
G.act('agree', t => { const c = $('.ck', t); c.classList.toggle('on'); const b = $('#lockNoteBtn'); if (b) b.classList.toggle('off', !c.classList.contains('on')); });
const notaMaisR = G.SH.notaMais.render;
G.SH.notaMais.render = p => notaMaisR(p).replace('<div class="col">', '<div class="col">' + G.li({ lead: `<span class="mi neutral sm">${ic('lock', 17)}</span>`, t: 'Trancar com senha', m: 'Some da busca e da IA', go: 'nota-trancada', p: 'st=criar' }));

/* seleção múltipla nas notas */
const notasR = G.SCR.notas.render;
G.SCR.notas.states.push(['selecao', 'Seleção múltipla']);
G.SCR.notas.feats.push('Seleção múltipla (toque longo numa nota ou "Selecionar"): mover, tags, fixar, exportar e lixeira em lote.');
G.SCR.notas.noTabs = st => st === 'selecao';
G.SCR.notas.render = (p, st) => st !== 'selecao' ? notasR(p, st) : `<div class="row between ai-c" style="min-height:44px"><button class="btn q" data-act="state" data-v="cheia" style="padding:0">Cancelar</button><span class="t-e" id="selCount">2 selecionadas</span><button class="btn q" data-act="selAll" style="padding:0">Todas</button></div>
  <div class="grp" id="selList">${DB.notas.map((n, i) => `<button class="li ${i === 1 || i === 3 ? 'on' : ''}" data-act="selNote" style="min-height:60px">${G.ck(i === 1 || i === 3, { sq: true })}<span class="col grow g2"><span class="tt">${n.t}</span><span class="mm ell">${n.p}</span></span><span class="t-c c3 none">${n.d}</span></button>`).join('')}</div>`;
G.SCR.notas.fixed = (p, st) => st === 'selecao' ? `<div class="selbar pv" style="bottom:24px"><div class="r">${[['folder-input', 'Mover', 'moverPasta'], ['tag', 'Tags', 'tags'], ['pin', 'Fixar', ''], ['file-down', 'Exportar', ''], ['trash-2', 'Lixeira', '']].map(([i, l, sh]) => `<button class="sb" ${sh ? `data-sheet="${sh}"` : `data-act="bulk" data-v="${l}"`}>${ic(i, 20)}${l}</button>`).join('')}</div></div>` : '';
G.SCR.notas.mount = (el, p, st) => {
  if (st === 'selecao') return;
  let timer;
  el.addEventListener('pointerdown', e => { const li = e.target.closest('.grp .li'); if (!li) return; timer = setTimeout(() => G.setState('selecao'), 550); });
  ['pointerup', 'pointerleave', 'pointercancel', 'scroll'].forEach(ev => el.addEventListener(ev, () => clearTimeout(timer), true));
  el.addEventListener('contextmenu', e => { if (e.target.closest('.grp .li')) { e.preventDefault(); G.setState('selecao'); } });
};
const selUpd = () => { const n = $$('#selList .li.on').length; const c = $('#selCount'); if (c) c.textContent = n ? `${n} selecionada${n > 1 ? 's' : ''}` : 'Nenhuma'; };
G.act('selNote', t => { t.classList.toggle('on'); $('.ck', t).classList.toggle('on'); selUpd(); });
G.act('selAll', () => { $$('#selList .li').forEach(l => { l.classList.add('on'); $('.ck', l).classList.add('on'); }); selUpd(); });
G.act('bulk', t => { const n = $$('#selList .li.on, .pgrid .on').length; const v = t.dataset.v; const msg = { Fixar: `${n} fixadas`, Exportar: `${n} arquivos .md prontos`, Lixeira: `${n} movidas para a lixeira`, Ligar: `${n} fotos ligadas`, Excluir: `${n} fotos movidas para a lixeira`, 'Álbum': `${n} fotos no álbum` }[v] || 'Pronto'; G.setState(G.cur().id === 'galeria' ? 'normal' : 'cheia'); setTimeout(() => G.toast(msg, { icon: 'check', undo: () => {} }), G.D(200)); });

/* ================= Finanças ================= */
G.screen('categorias', {
  group: 'Finanças', name: 'Categorias', route: '/financas/categorias', hue: 160, tab: 'inicio', parent: 'financas', pad: 'nb g20',
  desc: 'Categorias de gasto e de receita, cada uma com cor e ícone. A ordem aqui é a ordem dos chips no Novo lançamento.',
  feats: ['Gastos e Receitas em abas.', 'Arraste pela alça para reordenar.', 'Categoria arquivada some das escolhas, mas os lançamentos antigos continuam com ela.', 'O orçamento mensal aparece ao lado; "Sem orçamento" quando não há.'],
  motion: ['Reordenar: a linha levanta (sombra 1) e as outras abrem espaço com a mola padrão.'],
  render: () => {
    const row = (k, c) => `<div class="li hi">${G.mi(c.i, c.h)}<button class="col grow g2" data-go="categoria-editar" data-p="c=${k}" style="text-align:left"><span class="tt">${c.n}</span><span class="mm">${c.entrada ? 'Receita' : c.orc ? `Orçamento ${brl(c.orc)}` : 'Sem orçamento'}</span></button><span class="c4 row" aria-label="Arrastar para reordenar" style="cursor:grab">${ic('grip-vertical', 18)}</span></div>`;
    return `${G.topbar({ title: 'Categorias', right: G.cbtn('plus', { go: 'categoria-editar', p: 'st=nova', label: 'Nova categoria' }) })}
      ${G.seg([['g', 'Gastos'], ['r', 'Receitas']], 0, { panes: 'cats' })}
      <div data-pane-of="cats" class="col g16"><div class="grp rv">${Object.entries(DB.cats).filter(([, c]) => !c.entrada).map(([k, c]) => row(k, c)).join('')}</div><section class="col g10 rv"><span class="lbl">Arquivadas</span><div class="grp">${G.li({ tag: 'div', icon: 'baby', h: 0, t: 'Bebê (antiga)', m: '23 lançamentos até 2025', end: '<button class="btn t sm" data-act="toast" data-msg="Categoria de volta às escolhas">Reativar</button>' })}</div></section></div>
      <div data-pane-of="cats" hidden><div class="grp">${Object.entries(DB.cats).filter(([, c]) => c.entrada).map(([k, c]) => row(k, c)).join('')}</div></div>`;
  }
});
const ICONS = ['shopping-cart', 'utensils', 'car', 'house', 'popcorn', 'heart-pulse', 'repeat', 'graduation-cap', 'gift', 'plane', 'shirt', 'dog', 'baby', 'dumbbell', 'smartphone', 'church'];
G.screen('categoria-editar', {
  group: 'Finanças', name: 'Editar categoria', route: '/financas/categoria/[id]', hue: 160, tab: 'inicio', parent: 'categorias', pad: 'cta g20',
  desc: 'Nome, tipo, ícone, cor e orçamento mensal da categoria. A prévia mostra o chip como vai aparecer nos lançamentos.',
  states: [['editar', 'Editar'], ['nova', 'Nova']],
  feats: ['Ícones Lucide de contorno, numa grade de 8 por linha.', 'Cores do sistema de módulos (claras no fundo, fortes no ícone), legíveis nos dois temas.', 'Orçamento opcional; zero tira a categoria do bloco de orçamento.', 'Arquivar em vez de excluir: o histórico não muda.'],
  motion: ['Escolher ícone ou cor atualiza a prévia com uma mola curta.'],
  render: (p, st) => {
    const c = st === 'nova' ? { n: '', i: 'plane', h: 205, orc: 0 } : (DB.cats[p.c] || DB.cats.mercado);
    return `${G.topbar({ title: st === 'nova' ? 'Nova categoria' : 'Categoria' })}
      <div class="row center rv" id="catPrev"><span class="chip" style="height:44px;font-size:16px;background:var(--card)"><span class="mi" style="--h:${c.h};width:28px;height:28px;border-radius:9px">${ic(c.i, 16)}</span><span id="catPrevName">${c.n || 'Viagens'}</span></span></div>
      ${G.field('Nome', { v: c.n, ph: 'Ex.: Viagens', id: 'catName' })}
      <div class="field"><span class="fl">Tipo</span>${G.seg(['Gasto', 'Receita'], 0)}</div>
      <div class="field"><span class="fl">Ícone</span><div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px" data-radios data-on="catIcon">${ICONS.map(i => `<button class="${i === c.i ? 'on' : ''}" data-act="radio" data-v="${i}" aria-label="${i}" style="aspect-ratio:1;border-radius:12px;display:flex;align-items:center;justify-content:center;background:${i === c.i ? 'var(--tonal)' : 'var(--card)'};color:${i === c.i ? 'var(--tonal-fg)' : 'var(--fg-2)'}">${ic(i, 18)}</button>`).join('')}</div></div>
      <div class="field"><span class="fl">Cor</span><div class="row g8 wrap" data-radios data-on="catHue">${[160, 25, 80, 205, 305, 350, 130, 55, 260].map(h => `<button class="${h === c.h ? 'on' : ''}" data-act="radio" data-v="${h}" aria-label="Cor" style="width:36px;height:36px;border-radius:12px;background:oklch(var(--soft-l) var(--soft-c) ${h});box-shadow:${h === c.h ? 'inset 0 0 0 2px oklch(var(--strong-l) var(--strong-c) ' + h + ')' : 'none'}"></button>`).join('')}</div></div>
      <div class="field"><span class="fl">Orçamento mensal</span><div class="card tight">${G.moneyIn('catOrc', c.orc || 0, { label: 'Orçamento mensal' })}</div><span class="hint">${ic('info', 16)}<span>Compra no cartão conta no mês em que a fatura é paga.</span></span></div>
      ${st === 'nova' ? '' : `<button class="btn g b" data-act="closeThen" data-p="msg=Categoria arquivada · o histórico continua;icon=archive;undo=1;go=categorias">${ic('archive', 18)}Arquivar categoria</button>`}`;
  },
  fixed: () => `<div class="cta-bar"><button class="btn p" data-act="closeThen" data-p="msg=Categoria salva;go=categorias">Salvar</button></div>`,
  mount: el => { const n = $('#catName', el); n.addEventListener('input', () => { $('#catPrevName', el).textContent = n.value || 'Viagens'; }); }
});
const catPrev = () => { const icn = $('[data-on="catIcon"] .on'), hue = $('[data-on="catHue"] .on'); const box = $('#catPrev .mi'); if (!box) return; box.style.setProperty('--h', hue ? hue.dataset.v : 160); box.innerHTML = ic(icn ? icn.dataset.v : 'plane', 16); G.paint(); motion(box, [{ transform: 'scale(.7)' }, { transform: 'none' }], 320, E.spring); };
G.act('catIcon', () => { $$('[data-on="catIcon"] button').forEach(b => { const on = b.classList.contains('on'); b.style.background = on ? 'var(--tonal)' : 'var(--card)'; b.style.color = on ? 'var(--tonal-fg)' : 'var(--fg-2)'; }); catPrev(); });
G.act('catHue', () => { $$('[data-on="catHue"] button').forEach(b => { b.style.boxShadow = b.classList.contains('on') ? `inset 0 0 0 2px oklch(var(--strong-l) var(--strong-c) ${b.dataset.v})` : 'none'; }); catPrev(); });

G.screen('contas', {
  group: 'Finanças', name: 'Contas e cartões', route: '/financas/contas', hue: 160, tab: 'inicio', parent: 'financas', pad: 'nb g20',
  desc: 'Todas as contas e cartões num lugar: saldo, fatura atual, ordem e arquivamento. O ajuste de saldo corrige diferenças com o banco sem bagunçar o orçamento.',
  feats: ['Total das contas no topo (cartões não somam: a fatura é dívida a pagar).', 'Ajustar saldo: informe o saldo do banco; a diferença vira um lançamento "Ajuste de saldo", fora do orçamento.', 'Arquivar conta encerrada: some das escolhas, o extrato continua.', 'Arraste para reordenar.'],
  motion: ['Ajustar: o saldo conta até o valor novo; a linha pisca de leve no tom de sucesso.'],
  render: () => `${G.topbar({ title: 'Contas e cartões', right: G.cbtn('plus', { go: 'nova-conta', label: 'Nova conta' }) })}
    <div class="col g4 rv"><span class="t-s c3">Total nas contas</span><span class="t-big">${G.count(1452887)}</span></div>
    <section class="col g10 rv"><span class="lbl">Contas</span><div class="grp">${DB.contas.map(c => `<div class="li hi">${G.mi(c.i, c.h)}<button class="col grow g2" data-go="conta" data-p="id=${c.id}" style="text-align:left"><span class="tt">${c.n}</span><span class="mm">${c.t}</span></button><span class="amt">${brl(c.s)}</span>${G.cbtn('ellipsis', { cls: 'sm', sheet: 'contaMais', p: 'id=' + c.id, label: 'Opções' })}</div>`).join('')}</div></section>
    <section class="col g10 rv"><span class="lbl">Cartões</span><div class="grp">${DB.cartoes.map(c => G.li({ icon: 'credit-card', h: c.id === 'nucard' ? 290 : 45, t: c.n, m: `Fatura de dezembro · ${c.sit} · vence ${c.v}`, go: 'fatura', p: 'id=' + c.id, end: `<span class="end"><span class="amt">${brl(c.fat)}</span><span class="t-c c3">limite ${brl(c.lim)}</span></span>` })).join('')}</div></section>
    <section class="col g10 rv"><span class="lbl">Arquivadas</span><div class="grp">${G.li({ tag: 'div', icon: 'landmark', h: 0, t: 'Santander', m: 'Encerrada em 03/2026 · extrato guardado', end: '<button class="btn t sm" data-go="conta" data-p="id=itau">Extrato</button>' })}</div></section>`
});
G.sheet('contaMais', {
  title: p => (DB.contas.find(c => c.id === p.id) || DB.contas[0]).n,
  render: p => `<div class="col">${G.li({ lead: `<span class="mi neutral sm">${ic('scale', 17)}</span>`, t: 'Ajustar saldo', m: 'Igualar ao saldo do banco', sheet: 'ajusteSaldo', p: 'id=' + p.id })}${G.li({ lead: `<span class="mi neutral sm">${ic('pencil', 17)}</span>`, t: 'Editar conta', go: 'nova-conta' })}${G.li({ lead: `<span class="mi neutral sm">${ic('archive', 17)}</span>`, t: 'Arquivar conta', m: 'Some das escolhas; o extrato continua', act: 'closeThen', p: 'msg=Conta arquivada;icon=archive;undo=1' })}</div>`
});
G.sheet('ajusteSaldo', {
  title: 'Ajustar saldo',
  render: p => { const c = DB.contas.find(x => x.id === p.id) || DB.contas[0];
    return `<div class="row between t-s"><span class="c3">Saldo no Glife</span><span class="w6 tn">${brl(c.s)}</span></div><div class="field"><span class="fl">Saldo que o banco mostra agora</span><div class="card tight" style="background:var(--bg)">${G.moneyIn('ajVal', c.s - 1237)}</div></div><div class="alert info" id="ajInfo">${ic('info', 18)}<span>Diferença de <b>${brl(-1237, 'auto')}</b> vira um lançamento “Ajuste de saldo”. Não entra no orçamento.</span></div>`; },
  foot: () => `<button class="btn p" data-act="closeThen" data-p="msg=Saldo ajustado;icon=scale;undo=1">Ajustar</button>`,
  mount: (sh, p) => { const c = DB.contas.find(x => x.id === p.id) || DB.contas[0]; sh.addEventListener('money', e => { const d = +$('#ajVal', sh).dataset.cents - c.s; $('#ajInfo span', sh).innerHTML = d ? `Diferença de <b>${brl(d, 'auto')}</b> vira um lançamento “Ajuste de saldo”. Não entra no orçamento.` : 'Saldo igual ao do banco. Nada a ajustar.'; }); }
});
const finMaisR = G.SH.finMais.render;
G.SH.finMais.render = p => finMaisR(p).replace('<div class="col">', '<div class="col">' + G.li({ lead: `<span class="mi neutral sm">${ic('landmark', 17)}</span>`, t: 'Contas e cartões', go: 'contas' }) + G.li({ lead: `<span class="mi neutral sm">${ic('shapes', 17)}</span>`, t: 'Categorias', go: 'categorias' }));

/* ================= Agenda e dieta ================= */
const MES = { 3: 1, 5: 2, 6: 1, 10: 3, 12: 1, 14: 2, 17: 1, 19: 2, 20: 1, 23: 1, 24: 2, 26: 4, 27: 1, 28: 2, 29: 1 };
const dayItems = d => d === 26 ? [['07:30', 'Devocional', 350], ['09:00', 'Foco: site da Clínica Sorriso', 205], ['14:30', 'Consulta no dentista', 25], ['19:30', 'Culto de jovens', 305]] : MES[d] ? [['10:00', 'Pagar boleto do condomínio', 80], ['19:30', 'Culto de jovens', 305]].slice(0, MES[d]) : [];
const dayList = d => { const it = dayItems(d); return it.length ? `<div class="grp">${it.map(([h, t, hue]) => G.li({ lead: `<span class="mi sm" style="--h:${hue}">${ic('calendar', 16)}</span>`, t, m: h, go: 'evento', p: 'st=semanal' })).join('')}</div>` : `<div class="mini-empty">${ic('calendar', 18)}Dia livre.</div>`; };
G.screen('agenda-mes', {
  group: 'Agenda e dieta', name: 'Calendário do mês', route: '/agenda?vista=mes', hue: 25, tab: 'agenda', pad: 'nb g16',
  desc: 'O mês em grade, com até três pontos por dia (cor do módulo). Tocar num dia mostra a lista embaixo, sem sair da tela.',
  feats: ['Hoje com contorno; dia escolhido com fundo tonal.', 'Pontos: eventos, lembretes e refeições do plano (no máximo 3 por dia).', 'Setas para meses vizinhos; "Hoje" volta ao mês atual.'],
  motion: ['Trocar de mês: a grade desliza na direção da seta.', 'Escolher um dia: o destaque anda com mola e a lista troca com esmaecer.'],
  render: () => `${G.topbar({ title: 'Novembro de 2026', right: `<button class="btn t sm" data-act="toast" data-msg="Voltou para hoje">Hoje</button>` })}
    <div class="card col g10 rv" style="padding:14px"><div class="row between"><button class="cbtn sm" data-act="toast" data-msg="Outubro">${ic('chevron-left', 18)}</button><span class="t-e">Novembro</span><button class="cbtn sm" data-act="toast" data-msg="Dezembro">${ic('chevron-right', 18)}</button></div>
      <div class="mgrid">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `<span class="mh">${d}</span>`).join('')}${Array.from({ length: 35 }, (_, i) => { const d = i + 1; const inM = d <= 30; const n = inM ? d : d - 30; return `<button class="md-d ${inM ? '' : 'out'} ${d === 26 ? 'today sel' : ''}" ${inM ? `data-act="mesDay" data-d="${d}"` : 'disabled'}><span class="tn">${n}</span><span class="dots">${inM && MES[d] ? Array.from({ length: Math.min(3, MES[d]) }, (_, k) => `<i style="background:oklch(var(--chart-l) var(--chart-c) ${[25, 305, 130][k]})"></i>`).join('') : ''}</span></button>`; }).join('')}</div></div>
    <section class="col g10 rv"><span class="t-3" id="mesTitle">Quinta, 26</span><div id="mesList">${dayList(26)}</div></section>
    <button class="btn p b rv" data-sheet="agendaNovo">${ic('plus', 18)}Novo no dia</button>`
});
G.act('mesDay', t => { const d = +t.dataset.d; $$('.md-d').forEach(b => b.classList.toggle('sel', b === t)); const wd = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][(d - 1) % 7]; $('#mesTitle').textContent = `${wd}, ${d}`; const l = $('#mesList'); l.innerHTML = dayList(d); G.paint(); motion(l, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], 240, E.enter); });

G.screen('dieta-semana', {
  group: 'Agenda e dieta', name: 'Histórico da dieta', route: '/dieta/historico', hue: 130, tab: 'inicio', parent: 'dieta', pad: 'nb g20',
  desc: 'A semana da dieta: calorias por dia contra a meta, quanto do plano foi cumprido e a água.',
  states: [['semana', 'Semana'], ['mes', 'Mês']],
  feats: ['Barras por dia com a linha da meta; hoje em cobalto, dias acima da meta em tom de alerta só no número.', 'Média, aderência ao plano e água média.', 'Cada dia abre os registros daquele dia.'],
  motion: ['Barras crescem de baixo em cascata; a linha da meta desenha da esquerda.'],
  render: (p, st) => {
    const days = [['S', 1940, 4], ['T', 2210, 4], ['Q', 1780, 3], ['Q', 1420, 2], ['S', 0, 0], ['S', 0, 0], ['D', 0, 0]];
    return `${G.topbar({ title: 'Dieta', sub: st === 'mes' ? 'Novembro' : '23 a 29 de novembro' })}
      ${G.seg([['semana', 'Semana'], ['mes', 'Mês']], st === 'mes' ? 1 : 0, { cls: 'pill', on: 'dietMode' })}
      <div class="card col g12 rv"><div class="row between ai-b"><span class="t-e">Calorias por dia</span><span class="t-c c3">meta 2.000 kcal</span></div>
        <div class="chart" style="height:130px">${(st === 'mes' ? Array.from({ length: 26 }, (_, i) => [String(i + 1), 1600 + ((i * 137) % 700), 4]) : days).map(([l, v], i, arr) => `<div class="cb"><i class="${i === (st === 'mes' ? 25 : 3) ? 'acc' : ''}" style="height:${v / 2400 * 100}%;animation-delay:${i * 30}ms;${v ? '' : 'background:var(--track)'}"></i></div>`).join('')}<span style="position:absolute;left:0;right:0;bottom:${2000 / 2400 * 100}%;border-top:1.5px dashed var(--fg-3)"></span></div>
        ${st === 'mes' ? '<div class="chart-x"><span style="text-align:left">1</span><span style="text-align:right">26</span></div>' : `<div class="chart-x">${days.map(([l], i) => `<span class="${i === 3 ? 'ca w6' : ''}">${l}</span>`).join('')}</div>`}</div>
      <div class="card rv"><div class="kv"><div><span class="k">Média</span><span class="v">1.840 kcal</span></div><div><span class="k">Plano cumprido</span><span class="v">86%</span></div><div><span class="k">Água média</span><span class="v">1,7 L</span></div></div></div>
      <section class="col g10 rv"><span class="lbl">Dias</span><div class="grp">${[['Quinta, 26 · hoje', '1.420 kcal · 2 de 4 refeições'], ['Quarta, 25', '1.780 kcal · 3 de 4 refeições'], ['Terça, 24', '<span class="cwarn w6">2.210 kcal</span> · 4 de 4 refeições'], ['Segunda, 23', '1.940 kcal · 4 de 4 refeições']].map(([t, m]) => G.li({ icon: 'calendar', h: 130, t, m, go: 'dieta' })).join('')}</div></section>`;
  }
});
G.act('dietMode', (t, v) => G.setState(v));

/* ================= Bíblia ================= */
const BS = [['Filipenses 4:6', 'Não estejais <mark>inquietos</mark> por coisa alguma; antes, em tudo, sejam as vossas petições conhecidas diante de Deus pela oração.', 'nt'], ['Mateus 6:34', 'Não vos <mark>inquieteis</mark>, pois, pelo dia de amanhã, porque o dia de amanhã cuidará de si mesmo.', 'nt'], ['1 Pedro 5:7', 'Lançando sobre ele toda a vossa <mark>ansiedade</mark>, porque ele tem cuidado de vós.', 'nt'], ['Salmos 94:19', 'Na multidão dos meus <mark>pensamentos aflitos</mark>, as tuas consolações alegraram a minha alma.', 'at'], ['Salmos 55:22', 'Lança o teu <mark>cuidado</mark> sobre o Senhor, e ele te susterá.', 'at']];
G.screen('busca-biblia', {
  group: 'Bíblia e devocionais', name: 'Busca na Bíblia', route: '/biblia/busca', hue: 350, tab: 'inicio', parent: 'biblia', pad: 'nb g20',
  desc: 'Busca no texto bíblico (índice no aparelho, funciona offline) e nas suas anotações. Aceita palavras ou referências ("Jo 3:16").',
  states: [['resultados', 'Resultados'], ['ref', 'Referência digitada'], ['vazio', 'Nada encontrado']],
  feats: ['Suas anotações e marcações aparecem primeiro.', 'Filtro Tudo · Antigo · Novo Testamento.', 'Busca aproximada: "ansiedade" também acha "inquietos" e "aflitos" (sinônimos do índice).', 'Referência digitada vira atalho direto para o versículo.'],
  motion: ['Resultados entram em cascata; o termo destacado aparece com fundo tonal.'],
  render: (p, st) => {
    const q = st === 'ref' ? 'Jo 3:16' : st === 'vazio' ? 'drone' : 'ansiedade';
    const top = `${G.topbar({ title: 'Buscar na Bíblia' })}<label class="search rv" for="bbQ">${ic('search', 20)}<input id="bbQ" value="${q}" aria-label="Buscar na Bíblia"></label>`;
    if (st === 'ref') return `${top}<button class="card col g8 rv" data-go="leitor" style="text-align:left"><span class="t-c c3">Ir para</span><span class="t-e">João 3:16</span><span class="verse" style="font-size:16px;line-height:26px">Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito…</span></button>`;
    if (st === 'vazio') return `${top}<div class="empty">${mascot(56, 'var(--accent)', 'var(--bg)', 'pensando')}<h2 class="t-3">Nada com “drone”</h2><p>Tente outra palavra ou uma referência, como “Sl 23”.</p></div>`;
    return `${top}${G.seg([['tudo', 'Tudo'], ['at', 'Antigo'], ['nt', 'Novo']], 0, { cls: 'pill rv' })}<span class="t-s c3 rv">12 versículos · 1 anotação sua</span>
      <section class="col g10 rv"><span class="lbl">Suas anotações</span><div class="grp"><button class="li" data-sheet="anotacao"><span class="hdot b"></span><span class="col grow g2"><span class="tt">Filipenses 4:6–7</span><span class="mm">Oração antes da <mark>ansiedade</mark>.</span></span></button></div></section>
      <section class="col g10 rv"><span class="lbl">Versículos</span><div class="grp">${BS.map(([r, t]) => `<button class="li" data-go="leitor" style="align-items:flex-start;padding:14px 0"><span class="col grow g4"><span class="t-c w6 ca">${r}</span><span class="verse" style="font-size:16px;line-height:25px">${t}</span></span></button>`).join('')}</div></section>
      <p class="t-c c3 rv" style="margin:0">Texto de exemplo. No app: Bíblia Livre (BLIVRE), CC BY 4.0.</p>`;
  }
});
G.screen('planos', {
  group: 'Bíblia e devocionais', name: 'Planos de leitura', route: '/biblia/planos', hue: 350, tab: 'inicio', parent: 'biblia', pad: 'nb g20',
  desc: 'O plano atual dia a dia e os outros planos para começar. Um plano por vez, com lembrete próprio.',
  states: [['atual', 'Plano em andamento'], ['atrasado', 'Com dias atrasados']],
  feats: ['Grade dos 30 dias: lido, hoje e futuro; dias pulados ficam marcados.', 'Atrasado: oferece "Pôr em dia" (junta os trechos) ou "Recomeçar daqui" (empurra o plano).', 'Lembrete do plano no horário escolhido.', 'Pausar não perde o progresso.'],
  motion: ['Os dias aparecem em cascata diagonal; o dia de hoje pulsa uma vez.'],
  render: (p, st) => {
    const late = st === 'atrasado';
    return `${G.topbar({ title: 'Planos de leitura' })}
      <div class="card col g14 rv"><div class="row between ai-c"><div class="col g2"><span class="t-e">Salmos em 30 dias</span><span class="t-s c3">Dia 23 de 30 · hoje: Salmos 23–27</span></div>${mascot(36, 'oklch(var(--strong-l) var(--strong-c) 350)', 'var(--card)', late ? 'pensando' : 'feliz')}</div>
        <div class="calhm" style="grid-template-columns:repeat(10,minmax(0,1fr))">${Array.from({ length: 30 }, (_, i) => { const d = i + 1; const done = late ? (d < 23 && ![19, 20, 21].includes(d)) : d < 23; return `<i class="${done ? 'd2' : ''} ${d === 23 ? 't' : ''} pv" style="animation-delay:${i * 15}ms;${late && [19, 20, 21].includes(d) ? 'background:var(--warn-soft);box-shadow:inset 0 0 0 1.5px var(--warn)' : ''}"></i>`; }).join('')}</div>
        ${late ? `<div class="alert warn">${ic('calendar-clock', 18)}<span><b>3 dias atrasados.</b> Sem pressa: escolha como seguir.</span></div><div class="row g10"><button class="btn t md grow" data-act="toast" data-msg="Hoje: Salmos 19–27 (pondo em dia)">Pôr em dia</button><button class="btn g md grow" data-act="toast" data-msg="Plano empurrado 3 dias" style="background:var(--bg)">Recomeçar daqui</button></div>` : `<button class="btn p md" data-go="leitor">Ler o dia 23</button>`}</div>
      <div class="grp rv"><div class="li" style="min-height:56px"><span class="col grow g2"><span class="tt">Lembrete do plano</span><span class="mm">Todo dia às 06:30</span></span>${G.sw(true)}</div>${G.li({ t: 'Pausar plano', m: 'O progresso fica guardado', act: 'toast', msg: 'Plano pausado', noChev: true })}</div>
      <section class="col g10 rv"><span class="lbl">Outros planos</span><div class="grp">${[['Evangelhos em 60 dias', 'Mateus a João · 15 min por dia'], ['Provérbios em 31 dias', 'Um capítulo por dia'], ['Bíblia em 1 ano', 'AT e NT todo dia · 20 min']].map(([t, m]) => G.li({ icon: 'book-open', h: 350, t, m, end: '<button class="btn t sm" data-act="toast" data-msg="Plano trocado">Começar</button>', tag: 'div' })).join('')}</div></section>`;
  }
});

/* ================= Galeria ================= */
G.screen('album', {
  group: 'Galeria', name: 'Álbum', route: '/galeria/album/[id]', hue: 240, tab: 'inicio', parent: 'galeria', pad: 'nb g16',
  desc: 'As fotos de um álbum, com capa, contagem e o que está ligado a ele.',
  feats: ['Adicionar fotos da galeria ou da câmera.', 'Menu: renomear, escolher a capa, excluir o álbum (as fotos ficam na galeria).'],
  motion: ['A capa cresce a partir do cartão do álbum; as miniaturas entram em cascata.'],
  render: p => `${G.topbar({ title: '', right: G.cbtn('ellipsis', { sheet: 'fotoMais', label: 'Opções do álbum' }) })}
    <div class="rv" style="border-radius:24px;overflow:hidden;position:relative">${G.photo(240, 0).replace('class="photo"', 'class="photo" style="--h:240;aspect-ratio:16/9;border-radius:24px"')}</div>
    <div class="col g2 rv"><h1 class="t-1">${esc(p.n || 'Casa nova')}</h1><span class="t-s c3">48 fotos · 18/10 a 22/11</span></div>
    <div class="pgrid rv">${Array.from({ length: 15 }, (_, i) => `<button data-go="foto" class="noscale">${G.photo([240, 80, 160, 205, 305][i % 5], i % 4)}</button>`).join('')}</div>
    <button class="btn t b rv" data-act="toast" data-msg="Escolher fotos">${ic('image-plus', 18)}Adicionar fotos</button>`
});
const galR = G.SCR.galeria.render;
G.SCR.galeria.states.push(['selecao', 'Seleção múltipla']);
G.SCR.galeria.render = (p, st) => st !== 'selecao' ? galR(p, st) : `<div class="row between ai-c" style="min-height:44px"><button class="btn q" data-act="state" data-v="normal" style="padding:0">Cancelar</button><span class="t-e">3 selecionadas</span><button class="btn q" style="padding:0" data-act="noop">Todas</button></div>
  <div class="pgrid">${[[160, 1, 1], [130, 2], [240, 0, 1], [55, 1], [205, 3, 1], [350, 0], [130, 2], [80, 3], [305, 0]].map(([h, k, on]) => `<button class="noscale ${on ? 'on' : ''}" data-act="selPhoto" style="position:relative;border-radius:6px">${G.photo(h, k)}<span style="position:absolute;top:6px;right:6px">${G.ck(!!on)}</span></button>`).join('')}</div>`;
G.SCR.galeria.fixed = (p, st) => st === 'selecao' ? `<div class="selbar pv"><div class="r">${[['link', 'Ligar'], ['folder-plus', 'Álbum'], ['trash-2', 'Excluir']].map(([i, l]) => `<button class="sb" data-act="bulk" data-v="${l}">${ic(i, 20)}${l}</button>`).join('')}</div></div>` : '';
G.SCR.galeria.feats.push('Seleção múltipla: ligar várias fotos a algo, pôr num álbum ou excluir.');
G.act('selPhoto', t => { t.classList.toggle('on'); $('.ck', t).classList.toggle('on'); });

/* ================= IA ================= */
G.screen('conversas', {
  group: 'Início e IA', name: 'Conversas com a IA', route: '/ia/conversas', hue: 260, tab: 'inicio', parent: 'ia', pad: 'nb g20',
  desc: 'As conversas anteriores com a Glife IA. Ficam só na sua conta e podem ser apagadas a qualquer hora.',
  feats: ['Título gerado do assunto, com data.', 'Buscar nas conversas.', 'Apagar uma conversa não desfaz o que ela criou (isso fica em "Ações da IA").'],
  motion: ['Apagar: a linha recolhe e o aviso oferece desfazer.'],
  render: () => `${G.topbar({ title: 'Conversas', right: G.cbtn('square-pen', { go: 'ia', label: 'Nova conversa' }) })}
    <label class="search rv" for="cvQ">${ic('search', 20)}<input id="cvQ" placeholder="Buscar nas conversas"></label>
    <div class="grp rv">${[['Fatura e gastos de novembro', 'Hoje, 08:12 · 4 mensagens'], ['Resumo das notas da igreja', '22/11 · 6 mensagens'], ['Cardápio leve para a semana', '18/11 · 3 mensagens · criou 1 lista'], ['Reserva de emergência', '10/11 · 8 mensagens']].map(([t, m]) => `<div class="li hi">${G.mi('message-circle', 260)}<button class="col grow g2" data-go="ia" style="text-align:left"><span class="tt">${t}</span><span class="mm">${m}</span></button>${G.cbtn('trash-2', { cls: 'sm', act: 'delConv', label: 'Apagar conversa' })}</div>`).join('')}</div>
    <p class="t-c c3 rv" style="margin:0">O que a IA criou nas conversas continua em “Ações da IA”, com desfazer.</p>`
});
G.act('delConv', t => { const r = t.closest('.li'); G.collapse(r); G.toast('Conversa apagada', { icon: 'trash-2', undo: () => G.uncollapse(r) }); });
const iaHR = G.SH.iaHistorico.render;
G.SH.iaHistorico.render = p => G.li({ lead: `<span class="mi ton sm">${ic('messages-square', 17)}</span>`, t: 'Conversas anteriores', m: '4 conversas', go: 'conversas' }) + iaHR(p);
})();
