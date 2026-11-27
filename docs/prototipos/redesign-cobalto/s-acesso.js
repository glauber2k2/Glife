'use strict';
/* Acesso e bloqueio: entrar, verificação em duas etapas, configurar autenticador, senha do app e tela de bloqueio. */
(function () {
const { ic, mascot, esc, $, $$, motion, E } = G;
const GRP = 'Acesso e bloqueio';

const lockup = (size = 44) => `<div class="row g10 ai-c">${mascot(size * .9, 'var(--accent)', 'var(--bg)')}<span style="font-size:${size}px;line-height:1;font-weight:600;letter-spacing:${-size * .036}px">Glife</span></div>`;
const smallHead = (right = 'Sair') => `<div class="row between ai-c" style="min-height:44px">${lockup(22)}<button class="btn q sm" data-act="toast" data-msg="Você saiu da conta neste aparelho">${right}</button></div>`;
const msg = (kind, icon, text) => `<div class="hint ${kind} fd" role="alert" style="font-size:14px;line-height:20px">${ic(icon, 16)}<span>${text}</span></div>`;

/* ---------- Entrar ---------- */
G.screen('entrar', {
  group: GRP, name: 'Entrar', route: '/entrar', hue: 260, pad: 'nb g24',
  desc: 'Primeira tela sem sessão. O cadastro público é fechado: só a conta do dono entra. Depois do e-mail e da senha vem o código do autenticador.',
  states: [['normal', 'Padrão'], ['erro', 'Senha errada'], ['offline', 'Sem internet'], ['limite', 'Muitas tentativas']],
  feats: ['E-mail e senha forte, depois MFA (TOTP) obrigatório: a sessão precisa ser aal2.', 'Mensagens ficam entre os campos e o botão, com ícone de 16 px: erro em vermelho, falta de internet em tom neutro (não é culpa da pessoa), muitas tentativas em alerta com o botão bloqueado por 60 s.', 'Mostrar/ocultar senha no próprio campo.'],
  motion: ['O mascote flutua devagar (1,4 s, vai e volta) e pisca a cada 4 s.', 'Erro: o campo de senha treme uma vez (380 ms) e ganha o anel vermelho.', 'Entrar: o botão afunda a 0,96 e mostra o carregamento; a próxima etapa entra da direita.'],
  render: (p, st) => `
    <div style="height:44px"></div>
    <div class="col g16 rv" style="align-items:flex-start">${mascot(64, 'var(--accent)', 'var(--bg)', '', 'float')}<div class="col g6"><h1 class="t-1" style="font-size:40px;line-height:44px;letter-spacing:-1.6px">Que bom te ver</h1><p class="t-b c3" style="margin:0">Entre para abrir suas notas, finanças e planos.</p></div></div>
    <form class="col g14 rv" id="loginForm" novalidate>
      ${G.field('E-mail', { id: 'lgEmail', type: 'email', mode: 'email', v: 'rafa@exemplo.com', ac: 'username' })}
      ${G.field('Senha', { id: 'lgPass', html: `<div class="inp ${st === 'erro' ? 'err' : ''}" id="lgPassBox"><input id="lgPass" type="password" value="${st === 'normal' ? '' : 'senha-errada'}" placeholder="Sua senha" autocomplete="current-password"><button type="button" class="c3 row" data-act="peek" aria-label="Mostrar senha">${ic('eye', 20)}</button></div>` })}
      ${st === 'erro' ? msg('bad', 'circle-alert', 'E-mail ou senha não conferem. Confira e tente de novo.') : ''}
      ${st === 'offline' ? msg('', 'wifi-off', 'Sem internet agora. Seus dados continuam no aparelho; o login precisa de conexão.') : ''}
      ${st === 'limite' ? msg('warn', 'timer', 'Muitas tentativas seguidas. Tente de novo em <b class="tn" id="lgWait">60</b> s.') : ''}
      <button class="btn p b ${st === 'limite' ? 'off' : ''}" type="submit" id="lgBtn" style="margin-top:18px">Entrar</button>
    </form>
    <p class="t-s c3 rv" style="margin:0">O cadastro é fechado: este Glife é só seu. Esqueceu a senha? Use a recuperação do e-mail da conta.</p>`,
  mount: (el, p, st) => {
    if (st === 'erro') G.shake($('#lgPassBox', el));
    $('#loginForm', el).addEventListener('submit', e => {
      e.preventDefault();
      const b = $('#lgBtn', el); b.innerHTML = ic('loader-circle', 20, 'spin') + 'Entrando'; G.paint();
      setTimeout(() => G.go('verificacao'), G.D(700));
    });
    if (st === 'limite') { let n = 60; const t = setInterval(() => { const w = $('#lgWait', el); if (!w || !el.isConnected) return clearInterval(t); n--; w.textContent = n; if (n <= 0) { clearInterval(t); G.setState('normal'); } }, 1000); }
  }
});
G.act('peek', t => { const inp = t.parentElement.querySelector('input'); const show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; t.innerHTML = ic(show ? 'eye-off' : 'eye', 20); t.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha'); G.paint(); });

/* ---------- Verificação (código do autenticador) ---------- */
const codeBoxes = (val = '', err = false) => {
  const cells = [];
  for (let i = 0; i < 6; i++) { if (i === 3) cells.push('<span class="gap"></span>'); cells.push(`<span class="cx ${err ? 'err' : ''} ${!err && i === Math.min(val.length, 5) ? 'cur' : ''}">${val[i] || ''}</span>`); }
  return cells.join('');
};
G.screen('verificacao', {
  group: GRP, name: 'Código de verificação', route: '/verificacao', hue: 260, pad: 'nb g24',
  desc: 'Segunda etapa do login: o código de 6 dígitos do app autenticador. Seis casas visuais em dois grupos de 3 sobre um único campo, então colar e preencher automaticamente funcionam.',
  states: [['normal', 'Digitando'], ['erro', 'Código errado']],
  feats: ['Envia sozinho no 6º dígito.', 'Depois de erro, digitar recomeça e apagar limpa.', '"Sair" no topo volta para Entrar.', 'No protótipo, qualquer código entra, menos 000000.'],
  motion: ['A casa atual tem o anel de foco cobalto; ele anda junto com a digitação.', 'Código errado: as casas tremem uma vez e ficam vermelhas até a próxima tecla.'],
  render: (p, st) => `
    ${smallHead()}
    <div class="col g8 rv"><h1 class="t-1">Código do autenticador</h1><p class="t-b c3 pretty" style="margin:0">Abra o app autenticador e digite os 6 números do Glife.</p></div>
    <label class="col g12 rv" style="position:relative" for="codeIn">
      <div class="code-box" id="codeBox">${codeBoxes(st === 'erro' ? '482913' : '48', st === 'erro')}</div>
      <input id="codeIn" inputmode="numeric" autocomplete="one-time-code" maxlength="6" value="${st === 'erro' ? '' : '48'}" style="position:absolute;inset:0;opacity:0;width:100%" aria-label="Código de 6 dígitos">
    </label>
    ${st === 'erro' ? msg('bad', 'circle-alert', 'Código não confere. Ele muda a cada 30 s: use o que está na tela agora.') : '<span class="hint">' + ic('info', 16) + '<span>O código muda a cada 30 segundos.</span></span>'}
    <div class="col g10 rv" style="margin-top:8px"><button class="btn t b" data-go="mfa">Configurar outro autenticador</button></div>`,
  mount: (el, p, st) => {
    const inp = $('#codeIn', el), box = $('#codeBox', el);
    let err = st === 'erro';
    if (err) G.shake(box);
    setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) { /* foco opcional */ } }, 300);
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 6);
      err = false; box.innerHTML = codeBoxes(inp.value);
      if (inp.value.length === 6) {
        if (inp.value === '000000') { box.innerHTML = codeBoxes(inp.value, true); G.shake(box); inp.value = ''; }
        else setTimeout(() => G.go('criar-senha'), G.D(250));
      }
    });
  }
});

/* ---------- Configurar autenticador ---------- */
function qr() {
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const finder = (x, y) => { for (const [fx, fy] of [[0, 0], [14, 0], [0, 14]]) { const dx = x - fx, dy = y - fy; if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) return (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx > 1 && dx < 5 && dy > 1 && dy < 5)) ? 1 : 0; } return -1; };
  let s = '';
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) { const f = finder(x, y); const on = f === -1 ? rnd() > .52 : f; s += `<i style="background:${on ? '#0E1116' : 'transparent'}"></i>`; }
  return s;
}
G.screen('mfa', {
  group: GRP, name: 'Configurar autenticador', route: '/verificacao (primeiro acesso)', hue: 260, pad: 'nb g24', parent: null,
  desc: 'Primeiro acesso: ligar a verificação em duas etapas. O QR fica sempre em papel claro, nos dois temas, para qualquer câmera ler.',
  feats: ['Chave em mono, em grupos de 4, com "Copiar" que vira "Copiada" por 2,2 s.', 'Depois de escanear, digita o primeiro código para confirmar.'],
  motion: ['"Copiar" troca o rótulo com um esmaecer curto; o ícone vira um visto com mola.'],
  render: () => `
    ${G.topbar({ title: 'Duas etapas' })}
    <div class="col g8 rv"><h1 class="t-2">Ligue o app autenticador</h1><p class="t-b c3 pretty" style="margin:0">Escaneie o código com o Google Authenticator, 1Password ou outro app de sua preferência.</p></div>
    <div class="card col g16 ai-c rv"><div class="qr" role="img" aria-label="Código QR para o app autenticador">${qr()}</div>
      <div class="col g6 ai-c"><span class="t-c c3">Ou digite a chave</span><span class="mono" style="font-size:15px;letter-spacing:.5px">JBSW Y3DP EHPK 3PXP</span></div>
      <button class="btn t sm" data-act="copyKey">${ic('copy', 16)}<span>Copiar</span></button></div>
    <button class="btn p b rv" data-go="verificacao">Já escaneei</button>`
});
G.act('copyKey', t => {
  try { navigator.clipboard && navigator.clipboard.writeText('JBSWY3DPEHPK3PXP').catch(() => {}); } catch (e) { /* sem área de transferência */ }
  t.innerHTML = ic('check', 16) + '<span>Copiada</span>'; G.paint();
  setTimeout(() => { if (t.isConnected) { t.innerHTML = ic('copy', 16) + '<span>Copiar</span>'; G.paint(); } }, G.D(2200));
});

/* ---------- Criar a senha do app ---------- */
G.screen('criar-senha', {
  group: GRP, name: 'Criar senha do app', route: '/seguranca (primeiro uso)', hue: 260, pad: 'nb g24',
  desc: 'Logo após o primeiro login. A senha é só deste aparelho, diferente da senha da conta e do PIN do celular.',
  states: [['senha', 'Criar senha'], ['bio', 'Oferta da biometria']],
  feats: ['Mínimo de 6 caracteres, com a regra marcada em tempo real.', 'Esquecer a senha exige entrar de novo com a conta (e-mail, senha e código).', 'Guardada só como hash lento com sal no armazenamento seguro do aparelho; nunca vai ao servidor.', 'Depois, a oferta de ligar a biometria.'],
  motion: ['A regra cumprida troca o círculo vazio por um visto com mola.', 'A oferta da biometria entra deslizando da direita, como uma nova etapa.'],
  render: (p, st) => st === 'bio' ? `
    <div style="height:40px"></div>
    <div class="col ai-c g16 rv" style="text-align:center"><div class="bio">${ic('fingerprint', 44)}</div><h1 class="t-2">Desbloquear com a digital?</h1><p class="t-b c3 pretty" style="margin:0;max-width:300px">É o caminho mais rápido. Se a digital falhar, o Glife pede a senha do app, nunca o PIN do celular.</p></div>
    <div class="col g10 rv" style="margin-top:auto"><button class="btn p b" data-act="unlockDone" data-msg="Biometria ligada">Usar digital</button><button class="btn g b" data-act="unlockDone">Agora não</button></div>` : `
    ${smallHead()}
    <div class="col g8 rv"><h1 class="t-1">Crie a senha do app</h1><p class="t-b c3 pretty" style="margin:0">Ela protege o Glife neste aparelho. É diferente da senha da conta.</p></div>
    <div class="col g14 rv">
      ${G.field('Senha do app', { id: 'np1', html: `<div class="inp"><input id="np1" type="password" placeholder="Mínimo de 6 caracteres" autocomplete="new-password"><button type="button" class="c3 row" data-act="peek" aria-label="Mostrar senha">${ic('eye', 20)}</button></div>` })}
      ${G.field('Repita a senha', { id: 'np2', type: 'password', ph: 'Digite de novo', ac: 'new-password' })}
      <div class="col g8" id="rules">
        <span class="row g8 t-s c3" data-rule="len">${G.ck(false)}Pelo menos 6 caracteres</span>
        <span class="row g8 t-s c3" data-rule="eq">${G.ck(false)}As duas iguais</span>
      </div>
    </div>
    <div class="alert info rv">${ic('info', 18)}<span>Se esquecer, você entra de novo com a conta e cria outra. Nada se perde.</span></div>
    <button class="btn p b off" id="npBtn" data-act="newPass">Criar senha</button>`,
  mount: (el, p, st) => {
    if (st === 'bio') return;
    const a = $('#np1', el), b = $('#np2', el), btn = $('#npBtn', el);
    const check = () => {
      const len = a.value.length >= 6, eq = len && a.value === b.value;
      $('[data-rule="len"] .ck', el).classList.toggle('on', len);
      $('[data-rule="eq"] .ck', el).classList.toggle('on', eq);
      btn.classList.toggle('off', !(len && eq));
    };
    a.addEventListener('input', check); b.addEventListener('input', check);
  }
});
G.act('newPass', () => G.go('criar-senha', { st: 'bio' }));
G.act('unlockDone', t => { if (t.dataset.msg) setTimeout(() => G.toast(t.dataset.msg, { icon: 'fingerprint' }), G.D(500)); G.tab('inicio'); });

/* ---------- Tela de bloqueio ---------- */
const lockTop = (title, sub) => `<div class="col ai-c g8" style="text-align:center">${mascot(56, 'var(--accent)', 'var(--bg)', '')}<h1 class="t-2" style="margin-top:6px">${title}</h1>${sub ? `<p class="t-s c3 pretty" style="margin:0;max-width:290px">${sub}</p>` : ''}</div>`;
const passBox = (o = {}) => `<form class="col g12" id="lockForm" style="width:100%;margin-top:18px" novalidate><div class="inp ${o.err ? 'err' : ''}" id="lockBox"><input id="lockIn" type="password" placeholder="Senha do app" autocomplete="current-password" ${o.dis ? 'disabled' : ''} aria-label="Senha do app"><button type="button" class="c3 row" data-act="peek" aria-label="Mostrar senha">${ic('eye', 20)}</button></div>${o.msg || ''}<button class="btn p b ${o.dis ? 'off' : ''}" type="submit" style="margin-top:6px">Desbloquear</button></form>`;
G.screen('bloqueio', {
  group: GRP, name: 'Tela de bloqueio', route: 'app-lock (sobre qualquer rota)', hue: 260, full: true,
  desc: 'O app nunca abre sem desbloqueio: ao abrir e ao voltar depois de 1 min em segundo plano (ajustável). Cobre tudo; o conteúdo nunca aparece por trás.',
  states: [['bio', 'Chamando a digital'], ['senha', 'Senha do app'], ['erro', 'Senha errada'], ['espera', 'Esperando 30 s'], ['travado', 'Travado (10 erros)'], ['nova', 'Digital nova']],
  feats: ['A digital é chamada sozinha. Falhou, cancelou ou não existe: aparece a senha do app.', '5 erros: espera de 30 s; 7 erros: 5 min; 10 erros: só destrava com o login completo da conta.', 'Digital nova cadastrada no celular: pede a senha uma vez antes de voltar a aceitar a digital.', 'No web não há biometria: só a senha do app.', 'No protótipo, a senha certa é 123456.'],
  motion: ['O anel em volta da digital pulsa enquanto espera o sistema.', 'Senha errada: o campo treme uma vez, sem quique exagerado.', 'A contagem regressiva anda de segundo em segundo, sem pular.', 'Desbloquear: a tela some num esmaecer e o app aparece por baixo, sem deslizar.'],
  render: (p, st) => {
    let body = '';
    if (st === 'bio') body = `${lockTop('Glife bloqueado', 'Toque no sensor de digital para entrar.')}<button class="bio" data-act="bioFail" style="margin-top:28px" aria-label="Simular digital">${ic('fingerprint', 44)}</button><span class="t-s c3" style="margin-top:14px">Aguardando o sensor…</span><button class="btn q" data-act="state" data-v="senha" style="margin-top:auto">Usar a senha do app</button>`;
    if (st === 'senha') body = `${lockTop('Glife bloqueado', 'A digital não foi reconhecida. Use a senha do app.')}${passBox()}<button class="btn q" data-act="state" data-v="bio" style="margin-top:auto">${ic('fingerprint', 18)}Usar digital</button>`;
    if (st === 'erro') body = `${lockTop('Glife bloqueado', 'Use a senha do app.')}${passBox({ err: 1, msg: msg('bad', 'circle-alert', 'Senha errada. 3 de 5 tentativas antes de esperar.') })}<button class="btn q" data-act="state" data-v="bio" style="margin-top:auto">${ic('fingerprint', 18)}Usar digital</button>`;
    if (st === 'espera') body = `${lockTop('Espere um pouco', 'Foram 5 tentativas erradas seguidas.')}${passBox({ dis: 1, msg: msg('warn', 'timer', 'Tente de novo em <b class="tn" id="lockWait">0:30</b>.') })}`;
    if (st === 'travado') body = `${lockTop('Glife travado neste aparelho', 'Foram 10 tentativas erradas. Para proteger seus dados, entre de novo com a conta e crie uma senha nova.')}<div class="col g10" style="width:100%;margin-top:auto"><button class="btn p b" data-go="entrar">Entrar com a conta</button><span class="t-c c3 ta-c">Pede e-mail, senha e o código do autenticador.</span></div>`;
    if (st === 'nova') body = `${lockTop('Digital nova no celular', 'Uma digital foi cadastrada no aparelho. Confirme com a senha do app uma vez para voltar a usar a digital.')}${passBox()}`;
    return `<div class="lock">${body}</div>`;
  },
  mount: (el, p, st) => {
    const f = $('#lockForm', el);
    if (st === 'erro') G.shake($('#lockBox', el));
    if (st === 'bio') { const tm = setTimeout(() => { if (el.isConnected && G.cur().el === el) { /* continua esperando */ } }, 0); clearTimeout(tm); }
    if (f) f.addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#lockIn', el).value;
      if (v === '123456') { motion(el, [{ opacity: 1 }, { opacity: 0 }], 320, E.std, { fill: 'forwards' }).then(() => G.tab('inicio')); }
      else { const box = $('#lockBox', el); box.classList.add('err'); G.shake(box); }
    });
    if (st === 'espera') { let n = 30; const t = setInterval(() => { const w = $('#lockWait', el); if (!w || !el.isConnected) return clearInterval(t); n--; w.textContent = '0:' + String(n).padStart(2, '0'); if (n <= 0) { clearInterval(t); G.setState('senha'); } }, 1000); }
  }
});
G.act('bioFail', () => G.setState('senha'));
})();
