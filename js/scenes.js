'use strict';
/* ==========================================================================
   Cenas: título, como jogar, resumo de fase, quiz, escolhas de história e finais
   ========================================================================== */
const G = { scene: 'load', t: 0, w: null, summary: null, ending: null, menuSel: 0, snap: null, paused: false, howPage: 0 };

/* ---------------------------------------------------------------- utilidades */
function backdrop(bgKey, dim = 0.0, speed = 0.2) {
  const bg = IMG[bgKey];
  if (bg) { const off = -((G.t * speed) % 64); for (let x = off - 64; x < W; x += 64) for (let y = 0; y < H + 64; y += 64) ctx.drawImage(bg, Math.round(x), y - Math.round(((G.t * speed * 0.5) % 64))); }
  else rect(0, 0, W, H, '#7ab');
  if (dim) rect(0, 0, W, H, `rgba(6,14,22,${dim})`);
}
function bigTxt(s, x, y, color = '#ffd23f', align = 'center') {
  ctx.font = FONT(16); if (ctx.measureText(s).width > W - 40) ctx.font = FONT(8);
  txt(s, x, y, color, align); ctx.font = FONT(8);
}
function hint(s) { ctx.font = FONT(8); if (G.t % 60 < 40) txt(s, W / 2, H - 16, '#fff4d6', 'center'); }
function tapped(x, y, w, h) { return taps.some(t => t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h); }

/* ---------------------------------------------------------------- fluxo do jogo */
function startGame(phase = 0, cheats = {}) {
  RUN = newRun();
  if (phase > 0) { RUN.dream = 'negocio'; }
  Object.assign(RUN, cheats);
  startPhase(phase);
}
function startPhase(i) {
  RUN.phase = i; PS = newPS();
  if (i === 4 && !RUN.dream) RUN.dream = 'negocio';
  G.snap = JSON.stringify(RUN);
  const w = makeWorld(i); G.w = w; G.scene = 'play'; G.paused = false;
  w.cam.x = clamp(w.p.x - 100, 0, w.cols * TS - W);
  Sfx.play('start'); Sfx.startMusic(i);
  const intro = LEVEL_DEFS[i].intro.slice();
  if (i === 4) { const d = DREAMS.find(x => x.id === RUN.dream); intro.push(['mentor', `Seu sonho: ${d.name} (${fmt(d.cost)}). Bora buscar!`]); }
  if (w.extraNote > 0) intro.push(['mentor', `Atenção: as parcelas do passado voltaram! Há ${w.extraNote} inimigo(s) a mais nesta fase.`]);
  UI.modal = null;
  openDialog(intro);
}
function retryPhase() {
  const i = RUN.phase; RUN = JSON.parse(G.snap); UI.modal = null;
  startPhase(i);
}
function toTitle() {
  UI.modal = null; G.scene = 'title'; G.menuSel = 0; G.w = null; Sfx.stopMusic(); G.t = 0;
}

function finishPhase() {
  const w = G.w, i = w.idx;
  if (i < 4) {
    PS.interest = RUN.savings * 0.08; RUN.savings += PS.interest;
    PS.debtGrowth = RUN.debt * 0.20; RUN.debt += PS.debtGrowth;
    RUN.peakDebt = Math.max(RUN.peakDebt, RUN.debt);
  }
  G.summary = buildSummary(i); G.scene = 'summary'; G.t = 0;
  Sfx.startMusic(5);
}

function buildSummary(i) {
  const rows = [], g = (l, v, c) => rows.push([l, v, c || '#fff4d6']);
  let lesson = '';
  if (i === 0) {
    g('Moedas coletadas', `${PS.coins}  (${fmt(PS.coinMoney)})`, '#ffd23f');
    g('Guardado na poupança', fmt(PS.saved), '#7dffb0');
    g('Gasto em lazer', fmt(PS.lazer));
    g('Juros da poupança (+8%)', '+' + fmt(PS.interest), '#7dffb0');
    g('Carteira  /  Poupança', `${fmt(RUN.wallet)}  /  ${fmt(RUN.savings)}`);
    if (RUN.savings > 0) g('Projeção (3 fases)', `${fmt(RUN.savings * 1.08)} > ${fmt(RUN.savings * 1.08 ** 2)} > ${fmt(RUN.savings * 1.08 ** 3)}`, '#7dffb0');
    g('Felicidade', Math.round(RUN.happy) + '%');
    lesson = PS.saved === 0
      ? 'Você não guardou nada, então a poupança não rendeu. Guardar uma parte do que ganha é o primeiro passo para o dinheiro crescer!'
      : `Sua poupança rendeu ${fmt(PS.interest)} sem você fazer nada. E na próxima fase os juros incidem sobre o total: juros sobre juros!${PS.lazer > 0 ? ' O lazer também importa: o segredo é equilíbrio.' : ''}`;
  } else if (i === 1) {
    g('Necessidades pagas', `${PS.needs} de 4  (${fmt(PS.needsSpent)})`, PS.needs === 4 ? '#7dffb0' : '#ff9f6b');
    g('Desejos realizados', PS.wants.length ? PS.wants.join(', ') : 'nenhum', '#ff8de0');
    g('Gasto com desejos', fmt(PS.wantSpent));
    if (PS.usedSavings > 0) g('Retirado da poupança', fmt(PS.usedSavings), '#ff9f6b');
    if (PS.overdraft > 0) g('Ficou no vermelho', fmt(PS.overdraft), '#ff6b6b');
    g('Juros da poupança (+8%)', '+' + fmt(PS.interest), '#7dffb0');
    g('Felicidade', Math.round(RUN.happy) + '%');
    lesson = PS.overdraft > 0
      ? 'Faltou dinheiro para pagar as contas e elas viraram dívida. O essencial sempre vem primeiro: planeje antes de comprar desejos!'
      : PS.wants.length === 0
        ? 'Você pagou o essencial e economizou tudo. Mas um desejo ou outro, com o que sobra, também faz bem para a felicidade!'
        : 'Muito bem! Necessidades pagas primeiro e desejos só com o que sobrou. Essa é a regra de ouro da prioridade.';
  } else if (i === 2) {
    g('Compras parceladas', String(PS.installments), PS.installments ? '#ff9f6b' : '#7dffb0');
    if (PS.installments) g('Total a pagar (com juros)', fmt(PS.creditTotal), '#ff6b6b');
    g('Juros da dívida (+20%)', PS.debtGrowth > 0 ? '+' + fmt(PS.debtGrowth) : 'nenhum', PS.debtGrowth > 0 ? '#ff6b6b' : '#7dffb0');
    g('Dívida atual', fmt(RUN.debt), RUN.debt > 0 ? '#ff6b6b' : '#7dffb0');
    if (RUN.debt > 0) g('Dívida em 3 fases', `${fmt(RUN.debt * 1.2)} > ${fmt(RUN.debt * 1.2 ** 2)} > ${fmt(RUN.debt * 1.2 ** 3)}`, '#ff6b6b');
    g('Inimigos derrotados', String(PS.stomps));
    g('Juros da poupança (+8%)', '+' + fmt(PS.interest), '#7dffb0');
    lesson = PS.installments > 0
      ? `Parcelar pareceu leve, mas você pagará mais do que o preço à vista, e a dívida cresce 20% por fase (contra 8% que a poupança rende!). Pisar nas parcelas ajuda a quitá-las.`
      : 'Você evitou o crédito! Quem junta e paga à vista economiza os juros e ainda não cria novos inimigos.';
  } else if (i === 3) {
    g('Caminho escolhido', PS.path === 'safe' ? 'Seguro (poupança)' : PS.path === 'risk' ? 'Arriscado (investimento)' : '-', PS.path === 'safe' ? '#7dffb0' : '#ff9f6b');
    g('Resultado do investimento', PS.riskResult >= 0 ? '+' + fmt(PS.riskResult) : '-' + fmt(-PS.riskResult), PS.riskResult >= 0 ? '#7dffb0' : '#ff6b6b');
    g('Juros da poupança (+8%)', '+' + fmt(PS.interest), '#7dffb0');
    g('Juros da dívida (+20%)', PS.debtGrowth > 0 ? '+' + fmt(PS.debtGrowth) : 'nenhum', PS.debtGrowth > 0 ? '#ff6b6b' : '#7dffb0');
    g('Carteira  /  Poupança', `${fmt(RUN.wallet)}  /  ${fmt(RUN.savings)}`);
    g('Felicidade', Math.round(RUN.happy) + '%');
    lesson = PS.path === 'safe'
      ? 'O caminho seguro rende pouco, mas garantido. Bom para quem não pode perder dinheiro. Risco baixo, retorno baixo.'
      : PS.riskResult >= 0
        ? 'Você arriscou e ganhou mais! Mas poderia ter perdido: retorno alto sempre vem acompanhado de risco alto.'
        : 'Você arriscou e perdeu parte do dinheiro. Investir com risco pode dar prejuízo, por isso diversifique e só arrisque o que pode perder.';
  } else {
    g('Moedas coletadas', `${PS.coins}  (${fmt(PS.coinMoney)})`, '#ffd23f');
    g('Carteira', fmt(RUN.wallet)); g('Poupança', fmt(RUN.savings), '#7dffb0');
    g('Dívida', fmt(RUN.debt), RUN.debt > 0 ? '#ff6b6b' : '#7dffb0');
    g('Felicidade', Math.round(RUN.happy) + '%');
    lesson = 'Você chegou ao fim da jornada! Agora vamos ver se o seu planejamento foi suficiente para realizar o sonho.';
  }
  return { title: `FASE ${i + 1} COMPLETA!`, sub: LEVEL_DEFS[i].name, rows, lesson };
}

function afterSummary() {
  const i = G.summary ? RUN.phase : 0;
  runQuiz(i, () => interlude(i));
}

function runQuiz(i, next) {
  const q = QUIZ[i]; G.scene = 'quiz';
  openChoice({
    title: `QUIZ DA DONA POUPANÇA  (${i + 1}/5)`, text: q.q,
    options: q.o.map((t, k) => ({ label: String.fromCharCode(65 + k) + ')  ' + t, fn: () => answerQuiz(i, k, next) })),
  });
}
function answerQuiz(i, k, next) {
  const q = QUIZ[i]; RUN.quizDone++;
  if (k === q.c) {
    RUN.quizOk++; RUN.wallet += 20; happy(5); Sfx.play('right');
    openDialog([['mentor', 'Correto! Você ganhou R$20 de bônus por aprender. ' + q.why]], next);
  } else {
    Sfx.play('bad');
    openDialog([['mentor', 'Quase! A resposta certa era: ' + q.o[q.c] + '.'], ['mentor', q.why]], next);
  }
}

function interlude(i) {
  G.scene = 'story'; G.t = 0;
  const go = () => { if (i >= 4) beginEnding(); else startPhase(i + 1); };
  const money = RUN.wallet + RUN.savings;
  if (i === 0) {
    openChoice({
      title: 'FIM DE SEMANA', who: 'hero',
      text: 'Seu amigo te chamou para uma festa (R$40). Você também viu um curso de qualificação (R$50) que pode aumentar sua renda. E agora?',
      options: [
        { label: 'Ir à festa (-R$40, +felicidade)', sub: 'Diversão e boas lembranças, mas o dinheiro vai embora.', disabled: money < 40, fn: () => { takeMoney(40); happy(25); RUN.choices.i1 = 'festa'; go(); } },
        { label: 'Fazer o curso (-R$50, moedas +30%)', sub: 'Investir em conhecimento aumenta o que você ganha.', disabled: money < 50, fn: () => { takeMoney(50); RUN.coinMult = 1.3; RUN.choices.i1 = 'curso'; go(); } },
        { label: 'Guardar o dinheiro (+R$30 na poupança)', sub: 'Foco na meta, mesmo abrindo mão de algo.', fn: () => { const n = Math.min(30, Math.floor(RUN.wallet)); RUN.wallet -= n; RUN.savings += n; RUN.totalSaved += n; happy(-3); RUN.choices.i1 = 'guardar'; go(); } },
      ],
    });
  } else if (i === 1) {
    openChoice({
      title: 'IMPREVISTOS ACONTECEM', who: 'hero',
      text: 'Uma torneira estourou e o vizinho contou que teve que pagar o conserto na hora. Você quer montar uma reserva de emergência?',
      options: [
        { label: 'Montar reserva (-R$60)', sub: 'Protege você de 2 imprevistos nas próximas fases.', disabled: money < 60, fn: () => { takeMoney(60); RUN.shield = 2; RUN.choices.i2 = 'reserva'; go(); } },
        { label: 'Me dar um presente (-R$30, +felicidade)', sub: 'Um mimo de vez em quando não faz mal.', disabled: money < 30, fn: () => { takeMoney(30); happy(20); RUN.choices.i2 = 'presente'; go(); } },
        { label: 'Seguir em frente sem mudar nada', sub: 'Fica tudo como está.', fn: () => { RUN.choices.i2 = 'nada'; go(); } },
      ],
    });
  } else if (i === 2) {
    if (RUN.debt > 0) {
      const pay = Math.min(money, RUN.debt), half = Math.min(money, Math.ceil(RUN.debt / 2));
      openChoice({
        title: 'A DÍVIDA NÃO PERDOA', who: 'divida',
        text: `Sr. Dívida bateu na porta: você deve ${fmt(RUN.debt)} e essa dívida cresce 20% a cada fase. Você tem ${fmt(money)} (carteira + poupança).`,
        options: [
          { label: `Quitar o máximo possível (${fmt(pay)})`, sub: 'Dívida paga primeiro: o Sr. Dívida encolhe!', disabled: pay < 1, fn: () => { takeMoney(pay); RUN.debt -= pay; RUN.choices.i3 = 'quitou'; go(); } },
          { label: `Pagar metade da dívida (${fmt(half)})`, sub: 'Reduz o problema sem zerar o caixa.', disabled: half < 1, fn: () => { takeMoney(half); RUN.debt -= half; RUN.choices.i3 = 'metade'; go(); } },
          { label: 'Deixar para depois', sub: 'A dívida vira uma bola de neve...', fn: () => { RUN.choices.i3 = 'ignorou'; go(); } },
        ],
      });
    } else {
      RUN.choices.i3 = 'limpo';
      openDialog([['mentor', 'Você não tem nenhuma dívida! Sem o Sr. Dívida no seu pé, todo o seu dinheiro trabalha só por você.']], go);
    }
  } else if (i === 3) {
    openChoice({
      title: 'QUAL É O SEU SONHO?', who: 'hero',
      text: `Na última fase, seu dinheiro (${fmt(money)} agora, e dívida de ${fmt(RUN.debt)}) será usado para realizar um sonho. Quanto maior o sonho, maior o planejamento!`,
      options: DREAMS.map(d => ({ label: `${d.name} (${fmt(d.cost)})`, sub: d.desc, fn: () => { RUN.dream = d.id; go(); } })),
    });
  } else go();
}

/* ---------------------------------------------------------------- final */
function beginEnding() {
  const dream = DREAMS.find(d => d.id === RUN.dream) || DREAMS[1];
  const avail = RUN.wallet + RUN.savings, debt0 = RUN.debt;
  const pay = Math.min(avail, debt0), after = avail - pay, debtLeft = debt0 - pay;
  let type;
  if (debtLeft > 0.5) type = 'debt';
  else if (after >= dream.cost) type = (debt0 <= 0.5 && RUN.happy >= 50) ? 'gold' : 'ok';
  else if (after >= dream.cost * 0.6) type = 'near';
  else type = 'far';
  const stars = { gold: 5, ok: 4, near: 3, far: 2, debt: 1 }[type];
  const c = RUN.choices, E = [];
  if (c.i1 === 'festa') E.push('Você curtiu uma festa e ganhou boas lembranças pelo caminho.');
  if (c.i1 === 'curso') E.push('O curso de qualificação abriu portas e aumentou a sua renda.');
  if (c.i1 === 'guardar') E.push('Você priorizou guardar dinheiro desde cedo.');
  if (c.i2 === 'reserva') E.push('A reserva de emergência protegeu você de imprevistos.');
  if (c.i2 === 'presente') E.push('Você se deu um presente e manteve a motivação lá em cima.');
  if (c.i3 === 'quitou') E.push('Você quitou dívidas rapidamente, e o Sr. Dívida encolheu.');
  if (c.i3 === 'metade') E.push('Você pagou parte da dívida antes que ela crescesse mais.');
  if (c.i3 === 'ignorou') E.push('Ignorar a dívida deixou o Sr. Dívida cada vez maior.');
  if (c.i3 === 'limpo') E.push('Você fugiu do crédito fácil e nunca teve dívidas.');
  if (c.path === 'safe') E.push('Nos investimentos, você preferiu a segurança.');
  if (c.path === 'risk') E.push(c.risk === 'win' ? 'Você arriscou nos investimentos e a sorte estava ao seu lado.' : 'Você arriscou nos investimentos e sentiu o gosto da perda.');
  if (RUN.tookCredit > 0) E.push(`Você parcelou ${RUN.tookCredit} compra(s), o que custou juros e trouxe inimigos.`);
  const texts = {
    gold: ['SONHO REALIZADO!', `Parabéns! Você usou o dinheiro que acumulou, sem dívidas e feliz, e realizou seu sonho: ${dream.name}. Planejamento, disciplina e equilíbrio fizeram a diferença!`],
    ok: ['SONHO REALIZADO!', `Você conquistou seu sonho: ${dream.name}! O caminho teve dívidas ou pouca alegria pelo meio. Da próxima vez, dá para chegar ainda melhor.`],
    near: ['QUASE LÁ!', `Você juntou ${fmt(after)} dos ${fmt(dream.cost)} do seu sonho (${dream.name}). Falta pouco! Mantendo o planejamento, em breve você chega lá.`],
    far: ['SONHO ADIADO', `Faltou dinheiro para ${dream.name}: você tem ${fmt(after)} de ${fmt(dream.cost)}. Sem problemas: com meta e disciplina, é só recomeçar o plano.`],
    debt: ['O SR. DÍVIDA VENCEU', `As dívidas consumiram tudo e ainda restam ${fmt(debtLeft)} para pagar. ${dream.name} ficou para depois. Evite o crédito fácil e comece a se reorganizar.`],
  };
  G.ending = { type, stars, dream, avail, pay, after, debt0, debtLeft, page: 0, epilogue: E, text: texts[type], t: 0 };
  G.scene = 'ending'; G.t = 0; Sfx.startMusic(type === 'debt' || type === 'far' ? 1 : 0); Sfx.play(type === 'debt' ? 'lose' : 'win');
}

function drawEnding() {
  const e = G.ending, dream = e.dream;
  backdrop(e.type === 'debt' ? 'bg5' : e.type === 'far' ? 'bg3' : 'bg6', 0.25, 0.15);
  panel(20, 14, W - 40, H - 28);
  ctx.font = FONT(8);
  const px = 44, right = W - 44;
  if (e.page === 0) {
    bigTxt('HORA DE REALIZAR O SONHO', W / 2, 32);
    txt(`Sonho escolhido: ${dream.name}`, W / 2, 58, '#fff4d6', 'center');
    txt(`Custo do sonho: ${fmt(dream.cost)}`, W / 2, 70, '#ffd23f', 'center');
    let y = 94;
    const row = (l, v, c) => { txt(l, px, y, '#fff4d6'); txt(v, right, y, c || '#fff', 'right'); y += 15; };
    row('Carteira', fmt(RUN.wallet), '#ffd23f'); row('Poupança (com juros)', fmt(RUN.savings), '#7dffb0');
    row('Total disponível', fmt(e.avail), '#fff');
    if (e.debt0 > 0.5) { row('Dívidas a pagar primeiro', '-' + fmt(e.debt0), '#ff6b6b'); row('Sobra depois de pagar', fmt(Math.max(0, e.avail - e.pay)), e.debtLeft > 0.5 ? '#ff6b6b' : '#fff'); }
    else row('Dívidas', 'nenhuma!', '#7dffb0');
    const frac = clamp(e.after / dream.cost, 0, 1);
    y += 6; txt('Progresso do sonho', px, y, '#fff4d6'); y += 14;
    bar(px, y, right - px, 12, Math.min(1, frac * clamp(G.t / 90, 0, 1)), frac >= 1 ? '#5be37d' : '#ffd23f');
    txt(Math.round(frac * 100 * clamp(G.t / 90, 0, 1)) + '%', W / 2, y + 2, '#0b1a24', 'center', null);
  } else if (e.page === 1) {
    const ttl = e.text[0], body = e.text[1];
    bigTxt(ttl, W / 2, 30, e.type === 'debt' ? '#ff6b6b' : '#ffd23f');
    // ilustração
    const cy = 62;
    if (e.type === 'gold' || e.type === 'ok') { spr('end_pressed', 64, 64, G.t / 8, W / 2 - 32 - 60, cy - 8, false, 1.4); spr('hero_jump', 32, 32, 0, W / 2 + 20, cy + 4, false, 2); }
    else if (e.type === 'near') { spr('hero_idle', 32, 32, G.t / 5, W / 2 - 32, cy + 4, false, 2); }
    else if (e.type === 'far') { spr('hero_hit', 32, 32, G.t / 6, W / 2 - 60, cy + 4, false, 2); spr('mentor_idle', 72, 48, G.t / 6, W / 2 - 10, cy + 10, false, 1.4); }
    else { spr('e1_idle', 48, 48, G.t / 5, W / 2 - 48, cy - 8, false, 2); }
    ctx.font = FONT(8);
    wrap(body, W - 110).forEach((l, i) => txt(l, W / 2, 158 + i * 11, '#fff4d6', 'center'));
  } else if (e.page === 2) {
    bigTxt('SUA HISTÓRIA', W / 2, 28);
    ctx.font = FONT(8);
    const list = e.epilogue.length ? e.epilogue : ['Você seguiu sua jornada do seu jeito.'];
    let y = 56;
    for (const s of list.slice(0, 7)) { const ls = wrap('• ' + s, W - 100); ls.forEach((l, i) => txt(l, 46, y + i * 11, '#fff4d6')); y += ls.length * 11 + 5; }
  } else {
    bigTxt('SUA NOTA FINANCEIRA', W / 2, 28);
    for (let i = 0; i < 5; i++) {
      const on = i < e.stars && G.t > 20 + i * 12;
      spr('gem1', 16, 16, 0, W / 2 - 65 + i * 26 - 8, 60 - (on ? Math.round(Math.abs(Math.sin(G.t / 15 + i)) * 2) : 0), false, 2, on ? 1 : 0.25);
    }
    ctx.font = FONT(8);
    let y = 112;
    const row = (l, v, c) => { txt(l, 64, y, '#fff4d6'); txt(v, W - 64, y, c || '#fff', 'right'); y += 14; };
    row('Patrimônio final', fmt(Math.max(0, e.after)), '#ffd23f');
    row('Dívida restante', fmt(e.debtLeft), e.debtLeft > 0.5 ? '#ff6b6b' : '#7dffb0');
    row('Felicidade final', Math.round(RUN.happy) + '%', RUN.happy >= 50 ? '#7dffb0' : '#ff9f6b');
    row('Acertos no quiz', `${RUN.quizOk} de ${RUN.quizDone}`, '#7dffb0');
    row('Compras parceladas', String(RUN.tookCredit), RUN.tookCredit ? '#ff9f6b' : '#7dffb0');
  }
  const last = e.page >= 3;
  if (last) {
    txt('Jogo por ' + CREDITS.autor + ' - UniSanta', W / 2, H - 56, 'rgba(255,244,214,.7)', 'center');
    if (G.t % 60 < 40) txt('ENTER ou toque na tela: jogar de novo', W / 2, H - 70, '#ffd23f', 'center');
  } else if (G.t % 60 < 40) {
    txt('ENTER ou toque para continuar', W / 2, H - 34, '#ffd23f', 'center');
  }
}
function updateEnding() {
  const e = G.ending;
  if (G.t > 20 && (inp.okP() || taps.length)) {
    if (e.page >= 3) { toTitle(); return; }
    e.page++; G.t = 0; Sfx.play('select');
  }
}

/* ---------------------------------------------------------------- título */
const MENU = ['JOGAR', 'COMO JOGAR', 'SOBRE O PROJETO'];
function updateTitle() {
  if (inp.downP() || inp.rP()) { G.menuSel = (G.menuSel + 1) % MENU.length; Sfx.play('select'); }
  if (inp.upP() || inp.lP()) { G.menuSel = (G.menuSel + MENU.length - 1) % MENU.length; Sfx.play('select'); }
  let pick = -1;
  if (inp.okP()) pick = G.menuSel;
  MENU.forEach((m, i) => { if (tapped(W / 2 - 80, 140 + i * 25, 160, 21)) pick = i; });
  if (pick === 0) { Sfx.play('ok'); startGame(0); }
  else if (pick === 1) { Sfx.play('ok'); G.scene = 'how'; G.howPage = 0; G.t = 0; }
  else if (pick === 2) { Sfx.play('ok'); G.scene = 'about'; G.aboutPage = 0; G.t = 0; }
}
/* ---------------------------------------------------------------- sobre o projeto */
function updateAbout() {
  if (inp.okP() || taps.length || inp.actP()) {
    if (G.aboutPage >= 1) { G.scene = 'title'; Sfx.play('select'); return; }
    G.aboutPage++; Sfx.play('select');
  }
}
function drawAbout() {
  backdrop('bg3', 0.2, 0.1);
  panel(14, 10, W - 28, H - 20);
  ctx.font = FONT(8);
  const L = (t, y, c) => txt(t, 30, y, c || '#fff4d6');
  bigTxt('SOBRE O PROJETO', W / 2, 24);
  ctx.font = FONT(8);
  if (G.aboutPage === 0) {
    L('Desenvolvido por:', 52, '#ffd23f'); L(CREDITS.autor, 66);
    L(CREDITS.curso, 82); L(CREDITS.faculdade, 96); L(CREDITS.projeto, 110);
    L('Objetivo:', 132, '#ffd23f');
    wrap('Levar educação financeira à comunidade de forma leve e divertida: gastar, poupar, crédito e investir.', 218).forEach((l, i) => L(l, 146 + i * 12));
    L('Público: ' + CREDITS.publico, 196, '#7dffb0');
  } else {
    L('O que o jogo ensina:', 44, '#ffd23f');
    ['1. Ganhar e guardar: gastar x poupar', '2. Necessidades x desejos', '3. Crédito, parcelas e juros da dívida', '4. Investir: risco x retorno', '5. Planejar o sonho a longo prazo']
      .forEach((l, i) => L(l, 62 + i * 16));
    L('Juros compostos: a poupança cresce', 152, '#7dffb0'); L('e a dívida também. Escolha bem!', 164, '#7dffb0');
    L('Sons: Wario Land III (GBC) - Nintendo', 190, 'rgba(255,244,214,.6)');
    L('Sprites: CraftPix', 202, 'rgba(255,244,214,.6)');
  }
  txt(G.aboutPage === 0 ? 'ENTER: próxima' : 'ENTER: voltar', W / 2, H - 22, '#ffd23f', 'center');
}
function drawTitle() {
  backdrop('bg3', 0.0, 0.25);
  rect(0, 214, W, 58, '#12303b');
  for (let x = 0; x < W; x += 16) { if (IMG.tileset) ctx.drawImage(IMG.tileset, 16, 0, 16, 16, x, 214, 16, 16); }
  for (let x = 0; x < W; x += 16) for (let y = 230; y < H; y += 16) if (IMG.tileset) ctx.drawImage(IMG.tileset, 16, 16, 16, 16, x, y, 16, 16);
  // personagens
  const t = G.t;
  const hx = ((t * 1.3) % (W + 80)) - 40;
  spr('hero_run', 32, 32, t / 3.5, hx, 182, false, 1);
  spr('e1_idle', 48, 48, t / 6, W - 96, 214 - 48 * 2 + 4, true, 2);
  spr('mentor_idle', 72, 48, t / 6, 6, 214 - 48 * 1.5 + 4, false, 1.5);
  for (let i = 0; i < 6; i++) spr('gem2', 16, 16, t / 6 + i, 60 + i * 60 + (i % 2) * 20, 30 + Math.sin(t / 30 + i) * 6 + 105);
  ctx.font = FONT(16);
  const bob = Math.sin(t / 20) * 3;
  txt('MOEDAS DA', W / 2, 40 + bob, '#ffd23f', 'center'); txt('SABEDORIA', W / 2, 64 + bob, '#ffd23f', 'center');
  ctx.font = FONT(8);
  txt('Aprenda educação financeira jogando!', W / 2, 96 + bob, '#fff4d6', 'center');
  MENU.forEach((m, i) => {
    const sel = i === G.menuSel, x = W / 2 - 80, y = 140 + i * 25;
    frame(x, y, 160, 21, sel ? '#ffd23f' : '#1f8a86', sel ? '#fff4d6' : '#0b3b44');
    txt(m, W / 2, y + 6, sel ? '#2b1b00' : '#fff', 'center', sel ? null : '#0b1a24');
  });
  txt(CREDITS.autor + ' - UniSanta', W / 2, H - 24, '#ffd23f', 'center', '#0b1a24');
  txt('ENTER: escolher   Setas: mover   M: som   F: tela cheia', W / 2, H - 11, 'rgba(255,255,255,.85)', 'center');
}

/* ---------------------------------------------------------------- como jogar */
function updateHow() {
  if (inp.okP() || taps.length || inp.actP()) {
    if (G.howPage >= 1) { G.scene = 'title'; return; }
    G.howPage++; Sfx.play('select');
  }
}
function drawHow() {
  backdrop('bg3', 0.2, 0.1);
  panel(14, 10, W - 28, H - 20);
  ctx.font = FONT(8); const t = G.t;
  if (G.howPage === 0) {
    bigTxt('COMO JOGAR', W / 2, 24);
    let y = 54;
    const row = (fn, text, sub) => { fn(34, y); txt(text, 72, y + 2, '#ffd23f'); txt(sub, 72, y + 14, '#fff4d6'); y += 34; };
    row((x, y) => spr('gem2', 16, 16, t / 6, x - 2, y - 2, false, 2), 'MOEDAS = SEU DINHEIRO', 'Cada moeda vale R$5. Use com sabedoria!');
    row((x, y) => spr('gem1', 16, 16, t / 6, x - 2, y - 2, false, 2), 'ESTRELA = LAZER (R$15)', 'Dá felicidade e turbo, mas gasta dinheiro.');
    row((x, y) => spr('gem4', 16, 16, t / 6, x - 2, y - 2, false, 2), 'GEMA BRILHANTE = DESEJO', 'Traz muita felicidade, mas custa caro.');
    row((x, y) => spr('box1', 32, 32, 0, x - 2, y - 8, false, 1), 'CAIXA = NECESSIDADE', 'Aluguel, comida... é preciso pagar para passar.');
    row((x, y) => spr('flag', 48, 48, t / 8, x - 14, y - 22, false, 1), 'COFRINHO = POUPANÇA', 'Guarde moedas: rendem juros a cada fase.');
    hint('ENTER para continuar');
  } else {
    bigTxt('COMO JOGAR', W / 2, 24);
    let y = 54;
    const row = (fn, text, sub) => { fn(34, y); txt(text, 96, y + 2, '#ffd23f'); txt(sub, 96, y + 14, '#fff4d6'); y += 36; };
    row((x, y) => spr('e3_walk', 48, 48, t / 5, x - 14, y - 22, false, 1), 'INIMIGOS = ARMADILHAS', 'Parcelas, juros, cartão... custam dinheiro!');
    row((x, y) => spr('hero_run', 32, 32, t / 4, x - 2, y - 6, false, 1), 'SETAS / A-D: ANDAR', 'ESPAÇO ou SETA CIMA: pular (2x no ar)');
    row((x, y) => { rect(x, y + 4, 22, 16, '#1f8a86'); txt('E', x + 11, y + 8, '#fff', 'center'); }, 'E ou ENTER: INTERAGIR', 'Cofrinho, Dona Poupança e decisões.');
    row((x, y) => spr('end_idle', 64, 64, t / 8, x - 20, y - 24, false, 0.75), 'OBJETIVO', 'Chegar ao SEU SONHO no fim de cada fase!');
    txt('Pise nos inimigos para derrotá-los. Cuidado com quedas!', W / 2, 200, '#fff4d6', 'center');
    hint('ENTER para voltar');
  }
}

/* ---------------------------------------------------------------- resumo */
function updateSummary() {
  if (G.t > 25 && (inp.okP() || taps.length)) { Sfx.play('ok'); afterSummary(); }
}
function drawSummary() {
  const s = G.summary; backdrop(LEVEL_DEFS[RUN.phase].bg, 0.2, 0.2);
  panel(20, 10, W - 40, H - 20);
  ctx.font = FONT(8);
  bigTxt(s.title, W / 2, 24); txt(s.sub, W / 2, 48, '#fff4d6', 'center');
  let y = 66;
  s.rows.forEach((r, i) => {
    const a = clamp((G.t - i * 6) / 12, 0, 1); ctx.globalAlpha = a;
    txt(r[0], 44, y, '#c9f5e6'); txt(r[1], W - 44, y, r[2], 'right'); y += 14; ctx.globalAlpha = 1;
  });
  y += 6; rect(44, y, W - 88, 1, 'rgba(255,255,255,.3)'); y += 8;
  let left = Math.floor(Math.max(0, G.t - 30) * 1.4);
  txt('LIÇÃO:', 44, y, '#ffd23f'); y += 13;
  wrap(s.lesson, W - 96).forEach((l, i) => { txt(l.slice(0, Math.max(0, left)), 44, y + i * 11, '#fff4d6'); left -= l.length + 1; });
  if (G.t > 25 && G.t % 60 < 40) txt('ENTER ou toque para continuar', W / 2, H - 32, '#ffd23f', 'center');
}
