'use strict';
/* Ajustes: aparência, segurança, senha do app, IA, notificações, dados (exportar, lixeira, espaço) e conta. */
(function () {
const { ic, mascot, esc, $, $$, motion, E, DB, brl } = G;
const GRP = 'Ajustes e segurança';
const row = (icon, t, m, end, o = {}) => G.li(Object.assign({ lead: `<span class="mi neutral sm">${ic(icon, 17)}</span>`, t, m, end }, o));

G.screen('ajustes', {
  group: GRP, name: 'Ajustes', route: '/ajustes', hue: 260, tab: 'inicio', pad: 'nb g24',
  desc: 'Tudo em seções curtas. "Sair deste aparelho" é secundário, sem cor de alerta, no fim.',
  feats: ['Aparência: Claro · Escuro · Sistema (funciona de verdade neste protótipo).', 'Segurança: bloqueio, digital, tempo para bloquear, senha do app.', 'Glife IA: teto mensal de gasto, uso do mês, aplicar sem perguntar (desligado por padrão).', 'Notificações: lembretes, refeições, devocional diário.', 'Dados: exportar tudo (.zip com .md, CSV e JSON), lixeira e espaço das fotos.', 'Conta: e-mail, duas etapas, sair deste aparelho. Sobre: versão e crédito da Bíblia Livre.'],
  motion: ['Trocar o tema: o indicador desliza (340 ms) e as cores mudam com um esmaecer de 300 ms.', 'Interruptores: a bolinha corre com mola (300 ms).'],
  render: () => `${G.topbar({ title: '' })}
    <div class="row g14 ai-c rv"><span class="mi acc lg" style="border-radius:20px">${mascot(36, 'var(--on-accent)', 'var(--accent)', 'feliz')}</span><div class="col"><h1 class="t-1">Ajustes</h1><span class="t-s c3">Glife 0.4.0 · sincronizado agora</span></div></div>
    <section class="col g10 rv"><span class="lbl">Aparência</span><div class="grp"><div class="li" style="min-height:60px"><span class="tt grow">Tema</span>${G.seg([['light', 'Claro'], ['dark', 'Escuro'], ['system', 'Sistema']], ['light', 'dark', 'system'].indexOf(G.theme), { cls: 'pill', on: 'themeSeg', style: 'width:220px' })}</div></div></section>
    <section class="col g10 rv"><span class="lbl">Segurança</span><div class="grp">${row('lock', 'Bloqueio e senha do app', 'Digital · bloqueia depois de 1 min', undefined, { go: 'seguranca' })}${row('shield-check', 'Duas etapas', 'Ligado · app autenticador', '<span class="tag ok">Ativo</span>', { go: 'mfa' })}</div></section>
    <section class="col g10 rv"><span class="lbl">Glife IA</span><div class="card col g12" style="padding:16px"><div class="row between"><span class="t-s">Uso em novembro</span><span class="t-s tn"><b class="w6">R$ 4,20</b> <span class="c3">de R$ 20,00</span></span></div>${G.bar(21, { fill: 'acc' })}<span class="t-c c3">Ao chegar no teto, a IA para até o mês virar e eu aviso.</span></div>
      <div class="grp">${row('gauge', 'Teto mensal', 'R$ 20,00', undefined, { sheet: 'teto' })}<div class="li hi" style="min-height:60px"><span class="mi neutral sm">${ic('wand-sparkles', 17)}</span><span class="col grow g2"><span class="tt">Aplicar sem perguntar</span><span class="mm" style="white-space:normal">Propostas da caixa de entrada entram direto (dá para desfazer)</span></span>${G.sw(false)}</div></div></section>
    <section class="col g10 rv"><span class="lbl">Notificações</span><div class="grp">${[['alarm-clock', 'Lembretes e eventos', true], ['salad', 'Horário das refeições', true], ['book-open', 'Devocional diário · 06:30', true], ['receipt', 'Previstos do dia em Finanças', false]].map(([i, t, on]) => `<div class="li hi" style="min-height:56px"><span class="mi neutral sm">${ic(i, 17)}</span><span class="tt grow">${t}</span>${G.sw(on)}</div>`).join('')}</div></section>
    <section class="col g10 rv"><span class="lbl">Dados</span><div class="grp">${row('download', 'Exportar tudo', 'Notas em .md, finanças em CSV, tudo em JSON', undefined, { sheet: 'exportar' })}${row('trash-2', 'Lixeira', '3 itens', undefined, { go: 'lixeira' })}${row('hard-drive', 'Espaço das fotos', '312 MB de 1 GB', undefined, { go: 'armazenamento' })}${row('refresh-cw', 'Sincronização', 'Tudo em dia · há 12 s', '<span class="tag ok">' + ic('check', 12) + 'Em dia</span>', { go: 'sincronizacao' })}</div></section>
    <section class="col g10 rv"><span class="lbl">Conta</span><div class="grp">${row('at-sign', 'E-mail', 'ra•••@exemplo.com', '', { tag: 'div' })}${row('key-round', 'Senha da conta', 'Troca pelo e-mail de recuperação', undefined, { act: 'toast', msg: 'Link de troca enviado ao e-mail da conta' })}</div>
      <button class="btn g self-s" data-act="signOut">${ic('log-out', 18)}Sair deste aparelho</button></section>
    <section class="col g6 rv"><span class="lbl">Sobre</span><p class="t-s c3" style="margin:0">Glife 0.4.0 · feito para uma pessoa só. Texto bíblico: Bíblia Livre (BLIVRE), CC BY 4.0, de seus autores e colaboradores.</p></section>`
});
G.act('signOut', () => G.openSheet('sair'));
G.sheet('sair', {
  title: 'Sair deste aparelho?',
  render: () => `<p class="t-b c2" style="margin:0">Os dados ficam na sua conta e voltam quando você entrar de novo. O que ainda não sincronizou (0 itens) seria perdido.</p>`,
  foot: () => `<button class="btn g" data-close style="background:var(--bg)">Cancelar</button><button class="btn ink" data-act="doSignOut">Sair</button>`
});
G.act('doSignOut', () => G.closeSheet().then(() => G.jump('entrar')));
G.sheet('teto', {
  title: 'Teto mensal da IA',
  render: () => `<div class="col g4 ai-c">${G.moneyIn('tetoVal', 2000)}<span class="t-c c3">Uso medido por chamada. Modelo rápido na caixa de entrada, modelo mais forte só na conversa.</span></div>${G.chips([['10', 'R$ 10'], ['20', 'R$ 20'], ['50', 'R$ 50']], ['20'])}`,
  foot: () => `<button class="btn p" data-act="closeThen" data-p="msg=Teto atualizado;icon=gauge">Salvar</button>`
});
G.sheet('exportar', {
  title: 'Exportar tudo',
  render: () => `<p class="t-b c2" style="margin:0">Um arquivo .zip para guardar no seu Drive. Faça de vez em quando: é o seu backup próprio.</p>
    <div class="col">${[['sticky-note', 'Notas', '34 arquivos .md, abrem no Obsidian', true], ['wallet', 'Finanças', 'CSV por conta e por mês', true], ['braces', 'Tudo em JSON', 'Inclui vínculos, Bíblia (suas camadas) e agenda', true], ['images', 'Fotos', '312 MB · demora mais', false]].map(([i, t, m, on]) => `<div class="li hi" style="min-height:60px"><span class="mi neutral sm">${ic(i, 17)}</span><span class="col grow g2"><span class="tt">${t}</span><span class="mm">${m}</span></span>${G.sw(on)}</div>`).join('')}</div>`,
  foot: () => `<button class="btn p" data-act="doExport">Gerar arquivo</button>`
});
G.act('doExport', t => { t.innerHTML = ic('loader-circle', 18, 'spin') + 'Gerando…'; G.paint(); setTimeout(() => G.closeSheet().then(() => G.toast('glife-2026-11-26.zip pronto · 4,1 MB', { icon: 'file-archive' })), G.D(1400)); });

G.screen('seguranca', {
  group: GRP, name: 'Segurança', route: '/seguranca', hue: 260, tab: 'inicio', parent: 'ajustes', pad: 'nb g24',
  desc: 'O bloqueio está sempre ligado (explicado, não desligável). A digital é opcional; a senha do app é a alternativa.',
  feats: ['Usar digital (liga/desliga).', '"Bloquear depois de": imediatamente, 1 min, 5 min, 15 min.', 'Trocar a senha do app, sempre confirmando a atual.', 'Lista de aparelhos conectados à conta.'],
  motion: ['Escolher o tempo: o ponto do rádio cresce com mola; o anterior encolhe.'],
  render: () => `${G.topbar({ title: 'Segurança' })}
    <div class="card row g12 ai-s rv"><span class="mi ton">${ic('lock', 19)}</span><div class="col g4"><span class="t-e">Bloqueio sempre ligado</span><span class="t-s c3 pretty">O Glife pede a digital ou a senha do app ao abrir e ao voltar depois de um tempo. Seus dados ficam protegidos mesmo com o celular desbloqueado.</span></div></div>
    <div class="grp rv"><div class="li hi" style="min-height:60px"><span class="mi neutral sm">${ic('fingerprint', 17)}</span><span class="col grow g2"><span class="tt">Usar digital</span><span class="mm">Se falhar, pede a senha do app</span></span>${G.sw(true)}</div>${G.li({ lead: `<span class="mi neutral sm">${ic('key-round', 17)}</span>`, t: 'Trocar a senha do app', go: 'trocar-senha' })}${G.li({ lead: `<span class="mi neutral sm">${ic('lock-keyhole', 17)}</span>`, t: 'Ver a tela de bloqueio', m: 'Para testar', go: 'bloqueio' })}</div>
    <section class="col g10 rv"><span class="lbl">Bloquear depois de</span><div class="grp" data-radios>${['Imediatamente', '1 minuto', '5 minutos', '15 minutos'].map((t, i) => `<button class="li ${i === 1 ? 'on' : ''}" data-act="radio"><span class="tt grow">${t}</span><span class="radio"></span></button>`).join('')}</div><span class="t-c c3">Conta o tempo com o Glife em segundo plano.</span></section>
    <section class="col g10 rv"><span class="lbl">Aparelhos com a conta</span><div class="grp">${G.li({ tag: 'div', icon: 'smartphone', h: 260, t: 'Este celular · Android', m: 'Agora', end: '<span class="tag ok">Este</span>' })}${G.li({ tag: 'div', icon: 'monitor', h: 260, t: 'Chrome no Windows', m: 'Ontem, 22:10', end: '<button class="link" data-act="toast" data-msg="Sessão do Chrome encerrada">Encerrar</button>' })}</div></section>`
});
G.screen('trocar-senha', {
  group: GRP, name: 'Trocar senha do app', route: '/trocar-senha', hue: 260, tab: 'inicio', parent: 'seguranca', pad: 'cta g20',
  desc: 'Senha atual, nova e confirmação. A senha do app é só deste aparelho e nunca vai ao servidor.',
  states: [['normal', 'Preenchendo'], ['erro', 'Senha atual errada']],
  feats: ['Mesmas regras da criação (mínimo de 6, as duas iguais), marcadas em tempo real.', 'Errar a senha atual conta nas tentativas do bloqueio.'],
  motion: ['Erro na senha atual: o campo treme uma vez.'],
  render: (p, st) => `${G.topbar({ title: 'Senha do app' })}
    ${G.field('Senha atual', { id: 'csOld', html: `<div class="inp ${st === 'erro' ? 'err' : ''}" id="csOldBox"><input id="csOld" type="password" value="${st === 'erro' ? 'errada' : ''}" autocomplete="current-password" aria-label="Senha atual"></div>`, hint: st === 'erro' ? `${ic('circle-alert', 16)}<span>Senha atual errada. 4 de 5 tentativas antes de esperar.</span>` : '', hintCls: 'bad' })}
    ${G.field('Nova senha', { type: 'password', ph: 'Mínimo de 6 caracteres', ac: 'new-password' })}
    ${G.field('Repita a nova senha', { type: 'password', ac: 'new-password' })}
    <span class="hint">${ic('info', 16)}<span>Vale só neste aparelho. No computador, a senha do app é outra.</span></span>`,
  fixed: () => `<div class="cta-bar"><button class="btn p" data-act="savePass">Trocar senha</button></div>`,
  mount: (el, p, st) => { if (st === 'erro') G.shake($('#csOldBox', el)); }
});
G.act('savePass', () => { G.back(); G.onBackMount(); setTimeout(() => G.toast('Senha do app trocada', { icon: 'key-round' }), G.D(300)); });
})();
