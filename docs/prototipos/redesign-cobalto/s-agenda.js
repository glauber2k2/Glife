'use strict';
/* Agenda (eventos e lembretes) e Dieta (plano alimentar e registro de refeições). */
(function () {
const { ic, mascot, esc, $, $$, motion, E, DB, brl } = G;
const GRP = 'Agenda e dieta';
const DAYS = [['Seg', 23, 1], ['Ter', 24, 2], ['Qua', 25, 0], ['Qui', 26, 4], ['Sex', 27, 1], ['Sáb', 28, 2], ['Dom', 29, 1]];

/* ---------- Agenda ---------- */
const ev = (h, t, m, mod, go, extra = '') => `<div class="tl"><span class="h">${h}</span><button class="ev mod" style="--h:${mod}" data-go="${go}">${extra}<span class="tt" style="font-size:15px;font-weight:600">${t}</span><span class="mm" style="font-size:13px;color:var(--fg-2)">${m}</span></button></div>`;
const gap = h => `<div class="tl"><span class="h">${h}</span><span style="border-top:1px dashed var(--line);margin-top:22px"></span></div>`;
G.screen('agenda', {
  group: GRP, name: 'Agenda', route: '/agenda (aba Agenda)', root: true, tab: 'agenda', hue: 25,
  desc: 'O dia em uma coluna: lembretes no topo (com check) e os eventos numa linha do tempo, com a marca de agora. A semana fica numa faixa de dias acima.',
  states: [['hoje', 'Hoje'], ['livre', 'Dia livre'], ['avisos', 'Avisos desligados']],
  feats: ['Faixa da semana com pontos nos dias que têm algo.', 'Lembretes avulsos e ligados a outra coisa (ex.: "Pagar internet" abre o previsto em Finanças).', 'Eventos com repetição simples: diária, semanal com dias, mensal, anual, e pular uma data.', 'Avisos são notificações locais: tocam mesmo sem internet. Se o Android bloquear, a tela avisa e leva aos ajustes.'],
  motion: ['Trocar o dia: a lista desliza na direção do dia escolhido e o destaque do dia anda com mola.', 'A linha de agora pulsa de leve.', 'Concluir lembrete: visto com mola e texto riscado.'],
  render: (p, st) => {
    const sel = st === 'livre' ? (p.day === undefined ? 2 : +p.day) : 3; const dn = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'][sel];
    const strip = `<div class="daystrip rv" role="tablist" aria-label="Dias da semana">${DAYS.map(([d, n, c], i) => `<button class="day ${i === sel ? 'on' : ''} ${i === 3 ? 'today' : ''}" data-act="pickDay" data-i="${i}" role="tab" aria-selected="${i === sel}"><span>${d}</span><b class="tn">${n}</b>${c ? '<span class="dt"></span>' : ''}</button>`).join('')}</div>`;
    const head = G.hdr('Novembro de 2026', 'Agenda', `<div class="row g8">${G.cbtn('calendar-days', { go: 'agenda-mes', label: 'Ver o mês' })}${G.cbtn('plus', { sheet: 'agendaNovo', label: 'Novo' })}</div>`);
    if (st === 'livre') return `${head}${strip}<div class="card col ai-c g10 rv ${p.dir > 0 ? 'slide-r' : p.dir < 0 ? 'slide-l' : ''}" style="text-align:center;padding:32px 20px">${mascot(56, 'var(--accent)', 'var(--card)', 'dormindo', 'float')}<span class="t-3">${dn} livre</span><span class="t-s c3" style="max-width:250px">Nada marcado para ${DAYS[sel][1]}/11. Quer reservar um tempo para algo?</span><button class="btn t md" data-go="evento">Novo evento</button></div>`;
    return `${head}${strip}
      ${st === 'avisos' ? `<div class="alert warn rv">${ic('bell-off', 18)}<span class="grow"><b>Avisos desligados no Android.</b> Os lembretes não vão tocar até você liberar as notificações do Glife.</span></div><button class="btn t b rv" data-act="toast" data-msg="Abrindo ajustes do Android">Liberar notificações</button>` : ''}
      <section class="col g12 rv">${G.sec('Lembretes', 'Novo', { go: 'lembrete' })}<div class="grp">${[['Pagar internet', 'Finanças · R$ 119,90 · atrasado', '10:00', false], ['Ler Salmos 23', 'Bíblia · plano, dia 23', '07:30', true], ['Tomar vitamina D', 'Todo dia', '21:00', false]].map(([t, m, h, d]) => `<div class="li sm ${d ? 'done' : ''}" style="min-height:56px"><button class="noscale" data-act="task" data-msg="Lembrete concluído" aria-label="Concluir ${t}" style="display:flex">${G.ck(d)}</button><button class="col grow g2" data-go="lembrete" data-p="st=editar" style="text-align:left"><span class="tt"><span class="st">${t}</span></span><span class="mm">${m}</span></button><span class="ptime">${h}</span></div>`).join('')}</div></section>
      <section class="col g8 rv">${G.sec('Quinta, 26')}
        <div class="timeline">${ev('07:30', 'Devocional', 'Salmos 23 · plano de leitura', 350, 'leitor')}${ev('09:00', 'Foco: site da Clínica Sorriso', '09:00–11:30 · trabalho', 205, 'evento')}<div class="now" aria-label="Agora, 9:41"></div>${gap('12:00')}${ev('14:30', 'Consulta no dentista', '14:30–15:30 · Clínica Sorriso · aviso 1 h antes', 25, 'evento', `<span class="tag" style="height:20px;font-size:11px;align-self:flex-start;margin-bottom:4px;background:var(--card)">${ic('map-pin', 12)}Rua das Flores, 120</span>`)}${gap('16:00')}${ev('19:30', 'Culto de jovens', '19:30–21:30 · toda quinta · Igreja Batista Central', 305, 'evento', `<span class="row g4 c3" style="font-size:11.5px;margin-bottom:2px">${ic('repeat', 12)}Semanal</span>`)}</div>
      </section>`;
  }
});
G.act('pickDay', t => { const i = +t.dataset.i; const prev = $('.day.on'); const dir = prev && +prev.dataset.i > i ? -1 : 1; G.rerender({ st: i === 3 ? 'hoje' : 'livre', day: i, dir }); });
G.sheet('agendaNovo', {
  title: 'Criar',
  render: () => `<div class="col">${G.li({ icon: 'calendar-plus', h: 25, t: 'Evento', m: 'Com início, fim, local e repetição', go: 'evento' })}${G.li({ icon: 'alarm-clock', h: 25, t: 'Lembrete', m: 'Um aviso numa hora, avulso ou ligado a algo', go: 'lembrete' })}${G.li({ icon: 'sparkles', h: 260, t: 'Escrever do meu jeito', m: '"dentista sexta às 15h" e a IA monta', act: 'fab' })}</div>`
});
const repChips = on => G.chips([['nao', 'Não repete'], ['dia', 'Todo dia'], ['sem', 'Semanal'], ['mes', 'Mensal'], ['ano', 'Anual']], [on], { cls: 'scroll-x', on: 'repPick' });
G.screen('evento', {
  group: GRP, name: 'Evento', route: '/agenda/evento/[id] · /novo', hue: 25, tab: 'agenda', pad: 'cta g20',
  desc: 'Criar ou editar um compromisso. Repetição em campos simples, não em regra de calendário: diária, semanal com dias, mensal, anual, e pular uma data.',
  states: [['novo', 'Novo'], ['semanal', 'Semanal com dias'], ['pular', 'Pular uma data']],
  feats: ['Título, dia inteiro, início e fim, local.', 'Semanal mostra os dias da semana em chips; mensal repete no mesmo dia.', '"Pular uma data" lista as exceções; excluir um evento repetido pergunta se é só esta data ou todos.', 'Aviso: na hora, 10 min, 1 h ou 1 dia antes (notificação local).', 'Vínculos: nota da reunião, gasto, lista.'],
  motion: ['Escolher "Semanal" abre os dias da semana deslizando de cima; os chips não mudam de tamanho ao marcar.'],
  render: (p, st) => {
    const rep = st === 'novo' ? 'nao' : 'sem';
    return `${G.topbar({ title: st === 'novo' ? 'Novo evento' : 'Editar evento', right: st === 'novo' ? undefined : G.cbtn('trash-2', { sheet: 'excluirEvento', label: 'Excluir' }) })}
      ${G.field('Título', { v: st === 'novo' ? '' : 'Culto de jovens', ph: 'Ex.: Consulta no dentista' })}
      <div class="li" style="min-height:52px;padding:0"><span class="tt grow">Dia inteiro</span>${G.sw(false)}</div>
      <div class="f2">${G.select('Começa', st === 'novo' ? 'Sex, 27/11 · 15:00' : 'Qui, 26/11 · 19:30', { act: 'noop', chev: 'calendar' })}${G.select('Termina', st === 'novo' ? '16:00' : '21:30', { act: 'noop', chev: 'clock' })}</div>
      ${G.field('Local', { v: st === 'novo' ? '' : 'Igreja Batista Central', ph: 'Endereço ou nome do lugar' })}
      <div class="field"><span class="fl">Repetir</span>${repChips(rep)}</div>
      <div class="col g10" id="weekBox" ${rep === 'sem' ? '' : 'hidden'}><span class="fl t-s c3">Nos dias</span><div class="row g6">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => `<button class="chip ${i === 4 ? 'on' : ''}" data-act="dayToggle" style="width:40px;padding:0;justify-content:center" aria-pressed="${i === 4}" aria-label="${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][i]}">${d}</button>`).join('')}</div>${G.select('Termina', 'Nunca', { act: 'noop' })}</div>
      ${st === 'pular' ? `<section class="col g10"><span class="lbl">Datas puladas</span><div class="grp">${G.li({ tag: 'div', icon: 'calendar-x', h: 25, t: 'Qui, 24/12', m: 'Véspera de Natal', end: G.cbtn('x', { cls: 'sm', act: 'rmSkip', label: 'Voltar a valer' }) })}${G.li({ tag: 'div', icon: 'calendar-x', h: 25, t: 'Qui, 31/12', m: 'Ano-novo', end: G.cbtn('x', { cls: 'sm', act: 'rmSkip', label: 'Voltar a valer' }) })}</div><button class="btn t b">${ic('calendar-x', 18)}Pular outra data</button></section>` : (rep === 'sem' ? `<button class="btn g b" data-act="state" data-v="pular">${ic('calendar-x', 18)}Pular uma data</button>` : '')}
      <div class="field"><span class="fl">Aviso</span>${G.chips([['0', 'Na hora'], ['10', '10 min antes'], ['60', '1 h antes'], ['1d', '1 dia antes']], ['60'], { cls: 'scroll-x', check: true, multi: true })}</div>
      ${st === 'novo' ? '' : G.linkPanel([{ icon: 'sticky-note', h: 80, t: 'Anotações do culto', m: 'Nota · toda quinta', go: 'nota', p: 'id=n3' }], [])}`;
  },
  fixed: () => `<div class="cta-bar"><button class="btn p" data-act="saveEvent">Salvar</button></div>`
});
G.act('repPick', (t, v) => { const b = $('#weekBox'); if (!b) return; const show = v === 'sem'; if (show && b.hidden) { b.hidden = false; motion(b, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], 280, E.enter); } else if (!show) b.hidden = true; });
G.act('dayToggle', t => { t.classList.toggle('on'); t.setAttribute('aria-pressed', t.classList.contains('on')); });
G.act('rmSkip', t => { const r = t.closest('.li'); G.collapse(r); G.toast('A data volta a valer', { icon: 'calendar-check', undo: () => G.uncollapse(r) }); });
G.act('saveEvent', () => { G.back(); G.onBackMount(); setTimeout(() => G.toast('Evento salvo · aviso 1 h antes', { icon: 'calendar-check' }), G.D(300)); });
G.sheet('excluirEvento', {
  title: 'Excluir evento repetido',
  render: () => `<p class="t-b c2" style="margin:0">Culto de jovens repete toda quinta.</p><div class="col" data-radios>${[['Só em 26/11', 'As outras quintas continuam'], ['Este e os próximos', 'A partir de 26/11'], ['Todos', 'Vai para a lixeira']].map(([t, m], i) => `<button class="li ${i === 0 ? 'on' : ''}" data-act="radio"><span class="col grow g2"><span class="tt">${t}</span><span class="mm">${m}</span></span><span class="radio"></span></button>`).join('')}</div>`,
  foot: () => `<button class="btn g" data-close style="background:var(--bg)">Cancelar</button><button class="btn d" data-act="closeThen" data-p="msg=Evento excluído;icon=trash-2;undo=1">Excluir</button>`
});
G.screen('lembrete', {
  group: GRP, name: 'Lembrete', route: '/agenda/lembrete/[id] · /novo', hue: 25, tab: 'agenda', pad: 'cta g20',
  desc: 'Um aviso numa hora: avulso ou ligado a qualquer coisa (gasto previsto, item de compra, versículo). Toca mesmo sem internet.',
  states: [['novo', 'Novo'], ['editar', 'Ligado a um gasto']],
  feats: ['O que lembrar, dia e hora, repetir (como no evento).', 'Ligado a: mostra a entidade e abre com um toque.', '"Adiar" na notificação: 10 min, 1 h ou amanhã.'],
  motion: ['O cartão do vínculo entra com mola quando a ligação é feita.'],
  render: (p, st) => `${G.topbar({ title: st === 'novo' ? 'Novo lembrete' : 'Lembrete', right: st === 'novo' ? undefined : G.cbtn('trash-2', { act: 'delReminder', label: 'Excluir' }) })}
    ${G.field('O que lembrar', { v: st === 'novo' ? '' : 'Pagar internet', ph: 'Ex.: Comprar ração' })}
    <div class="f2">${G.select('Dia', st === 'novo' ? 'Sáb, 28/11' : 'Hoje, 26/11', { act: 'noop', chev: 'calendar' })}${G.select('Hora', st === 'novo' ? '09:00' : '10:00', { act: 'noop', chev: 'clock' })}</div>
    <div class="field"><span class="fl">Repetir</span>${repChips(st === 'novo' ? 'nao' : 'mes')}</div>
    <div class="field"><span class="fl">Ligado a</span>${st === 'novo' ? `<button class="inp" data-sheet="ligar"><span class="c3 row">${ic('link', 18)}</span><span class="grow ph">Nota, gasto, item de compra…</span></button>` : `<div class="card tight row g12 ai-c pv" style="border-radius:18px">${G.mi('wifi', 80)}<span class="col grow g2"><span class="t-e" style="font-size:15px">Internet Vivo Fibra</span><span class="t-s c3">Previsto · ${brl(-11990, 'auto')} · venceu 24/11</span></span><button class="btn t sm" data-go="financas">Abrir</button></div>`}</div>
    ${st === 'novo' ? '' : `<div class="alert info">${ic('info', 18)}<span>Quando confirmar o pagamento em Finanças, este lembrete é concluído sozinho.</span></div>`}`,
  fixed: () => `<div class="cta-bar"><button class="btn p" data-act="saveEvent">Salvar lembrete</button></div>`
});
G.act('delReminder', () => { G.back(); G.onBackMount(); setTimeout(() => G.toast('Lembrete excluído', { icon: 'trash-2', undo: () => {} }), G.D(300)); });

/* ---------- Dieta ---------- */
const water = n => `<div class="row g6" id="waterDots">${Array.from({ length: 8 }, (_, i) => `<span style="flex:1;height:8px;border-radius:99px;background:${i < n ? 'oklch(var(--chart-l) var(--chart-c) 230)' : 'var(--track)'};transition:background-color 240ms linear ${i * 30}ms"></span>`).join('')}</div>`;
G.screen('dieta', {
  group: GRP, name: 'Dieta', route: '/dieta', hue: 130, tab: 'inicio', pad: 'cta g20',
  desc: 'O dia da dieta: calorias e macros num cartão, água, o plano alimentar com horários e o que já foi registrado.',
  states: [['hoje', 'Hoje'], ['semplano', 'Sem plano']],
  feats: ['Anel de calorias restantes e barras de proteína, carboidratos e gorduras.', 'Água em copos de 250 ml.', 'Refeições do plano (horário e dias da semana) com o que já foi registrado e o que falta; lembrete no horário de cada uma.', 'Registrar com foto: a IA estima as calorias (proposta, você confirma).', 'Refeição de delivery pode virar gasto ligado.'],
  motion: ['O anel enche em 800 ms; tocar em "+ 250 ml" enche o próximo copo e o anel da água.', 'Refeição registrada troca o círculo vazio por um visto com mola.'],
  render: (p, st) => {
    const top = G.topbar({ title: 'Dieta', sub: 'Hoje, 26 nov', right: G.cbtn('chart-column', { go: 'dieta-semana', label: 'Histórico da semana' }) });
    if (st === 'semplano') return `${top}${G.empty('Monte seu plano', 'Diga os horários das refeições e o que comer em cada uma. Eu aviso na hora certa, mesmo sem internet.', 'Criar plano', { go: 'refeicao-plano' })}<button class="btn g b rv" data-go="registro-refeicao">${ic('camera', 18)}Só registrar o que comi</button>`;
    return `${top}
      <div class="card row g20 ai-c rv">${G.ring(.71, 112, 10, '<span style="font-size:26px;font-weight:700;letter-spacing:-.8px" class="tn">580</span><span class="t-c c3">kcal restantes</span>', 'oklch(var(--chart-l) var(--chart-c) 130)')}
        <div class="col g12 grow">${[['Proteína', 92, 120], ['Carboidratos', 160, 220], ['Gorduras', 48, 65]].map(([l, v, m]) => `<div class="col g4"><div class="row between t-s"><span>${l}</span><span class="c3 tn">${v}/${m} g</span></div>${G.bar(v / m * 100, { cls: 'thin' })}</div>`).join('')}</div></div>
      <div class="card col g12 rv"><div class="row g12 ai-c"><span class="mi" style="--h:230">${ic('glass-water', 19)}</span><div class="col grow"><span class="t-e" style="font-size:15px">Água</span><span class="t-s c3 tn" id="waterTxt">1,25 de 2 L</span></div><button class="btn t sm" data-act="water">+ 250 ml</button></div>${water(5)}</div>
      <section class="col g12 rv"><div class="sec-h"><h2 class="t-3">Refeições</h2><span class="t-s c3 tn">1.420 kcal</span></div>
        <div class="grp">${[['coffee', 'Café da manhã', 'Ovos mexidos, pão integral, café', '380', '07:00', true], ['utensils', 'Almoço', 'Arroz, feijão, frango grelhado, salada', '760', '12:30', true], ['apple', 'Lanche da tarde', 'Plano: iogurte, granola e banana', '280', '16:00', false, 'próxima'], ['soup', 'Jantar', 'Plano: sopa de legumes e frango', '420', '20:00', false]].map(([i, t, m, k, h, done, nx]) => `<div class="li hi" style="min-height:64px">${G.mi(i, 130)}<button class="col grow g2" data-go="${done ? 'registro-refeicao' : 'refeicao-plano'}" style="text-align:left"><span class="tt row g6">${t}${nx ? '<span class="tag ton" style="height:20px;font-size:11px">Próxima</span>' : ''}</span><span class="mm">${h} · ${m}</span></button>${done ? `<span class="col ai-e g2"><span class="amt">${k}</span><span class="t-c c3">kcal</span></span>` : `<button class="btn t sm" data-act="logMeal">Registrar</button>`}</div>`).join('')}</div></section>
      <div class="grp rv">${G.li({ icon: 'clipboard-list', h: 130, t: 'Plano alimentar', m: '4 refeições · seg a sex · avisos ligados', go: 'refeicao-plano' })}</div>`;
  },
  fixed: (p, st) => st === 'semplano' ? '' : `<div class="cta-bar"><button class="btn p" data-go="registro-refeicao" data-p="st=foto">${ic('camera', 18)}Registrar com foto</button></div>`,
  mount: (el) => { el._water = 5; }
});
G.act('water', t => { const el = t.closest('.scr'); el._water = Math.min(8, (el._water || 5) + 1); const n = el._water; $('#waterDots', el).outerHTML = water(n); $('#waterTxt', el).textContent = `${(n * .25).toFixed(2).replace('.', ',').replace(/0$/, '')} de 2 L`; if (n === 8) G.toast('Meta de água do dia batida', { icon: 'glass-water' }); });
G.act('logMeal', t => { const row = t.closest('.li'); t.outerHTML = `<span class="col ai-e g2 pv"><span class="amt">280</span><span class="t-c c3">kcal</span></span>`; G.toast('Lanche da tarde registrado · 280 kcal', { icon: 'check', undo: () => {} }); });
G.screen('refeicao-plano', {
  group: GRP, name: 'Refeição do plano', route: '/dieta/refeicao/[id] · /novo', hue: 130, tab: 'inicio', parent: 'dieta', pad: 'cta g20',
  desc: 'Uma refeição do plano alimentar: nome, horário, dias da semana e o que comer. O aviso no horário é uma notificação local.',
  feats: ['Dias da semana em chips que não mudam de tamanho ao marcar.', 'Itens do plano em lista simples, com kcal estimada opcional.', 'Aviso no horário (liga/desliga) e "lembrar 15 min antes".'],
  motion: ['Item novo entra no fim da lista com mola.'],
  render: () => `${G.topbar({ title: 'Lanche da tarde', right: G.cbtn('trash-2', { act: 'closeThen', p: 'msg=Refeição removida do plano;icon=trash-2;undo=1', label: 'Excluir' }) })}
    ${G.field('Nome', { v: 'Lanche da tarde' })}
    <div class="f2">${G.select('Horário', '16:00', { act: 'noop', chev: 'clock' })}${G.field('kcal estimada', { v: '280', mode: 'numeric' })}</div>
    <div class="field"><span class="fl">Dias</span><div class="row g6">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => `<button class="chip ${i > 0 && i < 6 ? 'on' : ''}" data-act="dayToggle" style="width:40px;padding:0;justify-content:center" aria-pressed="${i > 0 && i < 6}">${d}</button>`).join('')}</div></div>
    <section class="col g10"><span class="fl t-s c3">O que comer</span><div class="grp" id="mealItems">${['Iogurte natural 170 g', 'Granola 30 g', 'Banana 1 un'].map(x => G.li({ tag: 'div', t: x, end: G.cbtn('x', { cls: 'sm', act: 'rmParc', label: 'Remover' }) })).join('')}</div><button class="btn t b" data-act="addMealItem">${ic('plus', 18)}Adicionar item</button></section>
    <div class="col"><div class="li" style="min-height:56px"><span class="col grow g2"><span class="tt">Avisar no horário</span><span class="mm">Toca mesmo sem internet</span></span>${G.sw(true)}</div><div class="li" style="min-height:56px"><span class="col grow g2"><span class="tt">Avisar 15 min antes</span></span>${G.sw(false)}</div></div>`,
  fixed: () => `<div class="cta-bar"><button class="btn p" data-act="saveEvent">Salvar refeição</button></div>`
});
G.act('addMealItem', () => { const l = $('#mealItems'); l.insertAdjacentHTML('beforeend', G.li({ tag: 'div', t: 'Castanhas 20 g', end: G.cbtn('x', { cls: 'sm', act: 'rmParc', label: 'Remover' }) })); G.paint(); motion(l.lastElementChild, [{ opacity: 0, transform: 'translateY(10px) scale(.96)' }, { opacity: 1, transform: 'none' }], 380, E.spring); });
G.screen('registro-refeicao', {
  group: GRP, name: 'Registrar refeição', route: '/dieta/registro/[id] · /novo', hue: 130, tab: 'inicio', parent: 'dieta', pad: 'cta g20',
  desc: 'O que você comeu, com foto opcional. Com foto, a IA estima calorias e macros como proposta: você confirma ou corrige.',
  states: [['novo', 'Sem foto'], ['foto', 'Com foto e estimativa']],
  feats: ['Qual refeição (do plano ou extra) e horário.', 'Foto vai para a Galeria e fica ligada ao registro; sobe quando houver internet.', 'Foi delivery? Liga a um gasto existente ou cria um novo.'],
  motion: ['A estimativa da IA entra com o mascote pensando e depois as barras crescem.'],
  render: (p, st) => `${G.topbar({ title: 'Registrar refeição' })}
    ${G.chips([['cafe', 'Café', 'coffee'], ['almoco', 'Almoço', 'utensils'], ['lanche', 'Lanche', 'apple'], ['jantar', 'Jantar', 'soup'], ['extra', 'Extra', 'plus']], ['lanche'], { cls: 'scroll-x' })}
    ${st === 'foto' ? `<div class="col g12">${G.photo(130, 2, '<span class="ov"><span class="tag" style="background:var(--card)">' + ic('cloud-upload', 12) + 'Enviando</span></span>')}
      <div class="aib">${mascot(30, 'var(--accent)', 'var(--tonal)', 'feliz')}<div class="col g8 grow"><span class="tx">Parece <b class="w6">iogurte com granola e banana</b>. Estimo <b class="w6">310 kcal</b>.</span><div class="col g6">${[['Proteína', '11 g', 30], ['Carboidratos', '52 g', 70], ['Gorduras', '7 g', 20]].map(([l, v, w]) => `<div style="display:grid;grid-template-columns:92px minmax(0,1fr) 40px;gap:8px;align-items:center;font-size:12.5px"><span>${l}</span>${G.bar(w, { cls: 'thin', fill: 'acc' })}<span class="ta-r w6">${v}</span></div>`).join('')}</div><span class="ac">É uma estimativa: corrija se precisar.</span></div></div></div>` : `<button class="card col ai-c center g8" data-act="state" data-v="foto" style="min-height:150px;box-shadow:inset 0 0 0 1.5px var(--border);background:transparent;border-radius:22px">${ic('camera', 28)}<span class="t-e" style="font-size:15px">Tirar ou escolher foto</span><span class="t-s c3">Opcional. A IA estima as calorias.</span></button>`}
    ${G.field('O que comeu', { html: `<textarea class="inp" rows="2" aria-label="O que comeu">${st === 'foto' ? 'Iogurte natural, granola e banana' : ''}</textarea>` })}
    <div class="f2">${G.select('Horário', '16:10', { act: 'noop', chev: 'clock' })}${G.field('kcal', { v: st === 'foto' ? '310' : '', ph: 'Opcional', mode: 'numeric' })}</div>
    <div class="li" style="min-height:56px;padding:0"><span class="col grow g2"><span class="tt">Foi delivery</span><span class="mm">Ligar a um gasto em Finanças</span></span>${G.sw(false, { on: 'deliverySw' })}</div>
    <div id="delivBox" hidden>${G.li({ tag: 'div', icon: 'utensils', h: 25, t: 'iFood · hoje', m: '− R$ 38,90 · Restaurantes', end: '<span class="tag ok">Ligado</span>' })}</div>`,
  fixed: () => `<div class="cta-bar"><button class="btn p" data-act="saveEvent">Registrar</button></div>`
});
G.act('deliverySw', (t, on) => { const b = $('#delivBox'); b.hidden = !on; if (on) { G.paint(); motion(b, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], 380, E.spring); } });
})();
