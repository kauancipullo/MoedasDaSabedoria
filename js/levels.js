'use strict';
/* ==========================================================================
   MOEDAS DA SABEDORIA — definição das fases
   Coordenadas em TILES (16px). "row" = linha onde a entidade fica em pé
   (o chão padrão tem o topo na linha 14, então quem anda no chão usa row 13).
   ========================================================================== */
const TS = 16;
const ROWS = 17;

function LB(cols) {
  const tiles = Array.from({ length: ROWS }, () => new Array(cols).fill(0));
  const ents = [];
  const b = {
    cols, tiles, ents,
    ground(x0, x1, top = 14) { for (let y = top; y < ROWS; y++) for (let x = x0; x <= x1; x++) tiles[y][x] = 1; return b; },
    block(x, y, w = 1, h = 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (tiles[j] && i >= 0 && i < cols) tiles[j][i] = 1; return b; },
    // x = coluna (esq), y = pixel do "pé" (base) da entidade
    e(t, x, row, p = {}) { ents.push(Object.assign({ t, x: x * TS, y: (row + 1) * TS }, p)); return b; },
    coins(x, row, n, dx = 1) { for (let i = 0; i < n; i++) b.e('coin', x + i * dx, row); return b; },
    arc(x, n, rowBase, h) { for (let i = 0; i < n; i++) b.e('coin', x + i, rowBase - Math.round(h * Math.sin(Math.PI * (n === 1 ? 0.5 : i / (n - 1))))); return b; },
    star(x, row) { return b.e('star', x, row); },
    want(x, row, p) { return b.e('want', x, row, p); },
    crate(x, row, p) { // caixa de conta obrigatória 2x2 tiles + pilar que fecha a passagem
      b.block(x, 0, 2, row - 1);
      return b.e('crate', x, row, p);
    },
    bank(x, row) { return b.e('bank', x, row); },
    mentor(x, row, hint) { return b.e('mentor', x, row, { hint }); },
    walker(x, row, type, a, c) { return b.e('walker', x, row, { type, min: a * TS, max: (c + 1) * TS }); },
    cannon(x, row, dir) { return b.e('cannon', x, row, { dir }); },
    flyer(x, row, a, c) { return b.e('flyer', x, row, { min: a * TS, max: (c + 1) * TS }); },
    saw(x, row, a, c) { return b.e('saw', x, row, { min: (a ?? x) * TS, max: ((c ?? x) + 1) * TS }); },
    spikes(x, row, n = 1) { for (let i = 0; i < n; i++) b.e('spikes', x + i, row); return b; },
    electric(x, row) { return b.e('electric', x, row); },
    chest(x, row, kind) { return b.e('chest', x, row, { kind }); },
    sign(x, row, text) { return b.e('sign', x, row, { text }); },
    finish(x, row) { return b.e('finish', x, row); },
    start(x, row) { b.start_ = { x: x * TS, y: (row + 1) * TS }; return b; },
    extra(x, row) { return b.e('extraSpot', x, row); },
    boss(x, row, a, c) { return b.e('boss', x, row, { min: a * TS, max: (c + 1) * TS }); },
  };
  return b;
}

/* ---------------------------------------------------------------- FASE 1 */
function level1() {
  const b = LB(132);
  b.ground(0, 30).ground(34, 58).ground(62, 88).ground(92, 131);
  b.start(3, 13); b.mentor(9, 13, 'f1');
  // A
  b.coins(13, 13, 4); b.block(19, 11, 5); b.coins(20, 10, 3); b.star(28, 10);
  b.arc(31, 3, 12, 1);
  // B
  b.bank(36, 13); b.coins(40, 13, 4); b.block(46, 11, 4); b.coins(47, 10, 2);
  b.block(52, 11, 3); b.block(55, 8, 3); b.coins(55, 7, 3);
  b.arc(59, 3, 12, 1);
  // C
  b.coins(64, 13, 3); b.block(70, 11, 4); b.coins(71, 10, 2);
  b.block(78, 11, 3); b.block(82, 8, 3); b.coins(82, 7, 3); b.star(85, 10); b.bank(87, 13);
  b.arc(89, 3, 12, 1);
  // D
  b.coins(94, 13, 4); b.block(100, 11, 4); b.coins(101, 10, 2); b.star(108, 10);
  b.block(111, 11, 3); b.block(115, 9, 3); b.coins(115, 8, 3); b.coins(120, 13, 2);
  b.bank(123, 13); b.finish(128, 13);
  b.sign(14, 13, 'COLETE MOEDAS');
  return b;
}

/* ---------------------------------------------------------------- FASE 2 */
function level2() {
  const b = LB(140);
  b.ground(0, 43).ground(47, 99).ground(103, 139);
  b.start(3, 13); b.sign(6, 13, 'NECESSIDADE x DESEJO'); b.mentor(9, 13, 'f2');
  b.coins(12, 13, 5); b.block(16, 11, 4); b.coins(17, 10, 2); b.coins(22, 13, 3); b.bank(26, 13);
  // gate 1
  b.crate(30, 13, { name: 'Aluguel', price: 50, box: 1 });
  b.coins(34, 13, 4);
  b.block(38, 11, 3); b.want(39, 10, { name: 'Tênis novo', price: 60, happy: 20, gem: 4 });
  b.arc(44, 3, 12, 1);
  b.coins(49, 13, 4); b.walker(53, 13, 'conta', 51, 56);
  // gate 2
  b.crate(58, 13, { name: 'Comida', price: 30, box: 2 });
  b.coins(62, 13, 5);
  b.block(66, 11, 3); b.want(67, 10, { name: 'Fone de ouvido', price: 40, happy: 15, gem: 5 });
  b.coins(72, 13, 4); b.block(76, 11, 4); b.block(80, 8, 3); b.coins(80, 7, 3);
  b.walker(83, 13, 'conta', 82, 86); b.coins(84, 13, 2);
  // gate 3
  b.crate(88, 13, { name: 'Luz e água', price: 20, box: 3 });
  b.coins(92, 13, 4); b.block(94, 11, 3); b.coins(95, 10, 2);
  b.arc(100, 3, 12, 1);
  b.coins(105, 13, 4); b.block(108, 11, 3); b.block(111, 8, 3);
  b.want(112, 7, { name: 'Celular top', price: 120, happy: 30, gem: 6 });
  b.walker(108, 13, 'conta', 106, 113);
  // gate 4
  b.crate(116, 13, { name: 'Transporte', price: 25, box: 2 });
  b.coins(120, 13, 4); b.block(124, 11, 3); b.want(125, 10, { name: 'Roupa da moda', price: 50, happy: 18, gem: 3 });
  b.coins(128, 13, 3); b.bank(131, 13); b.finish(136, 13);
  return b;
}

/* ---------------------------------------------------------------- FASE 3 */
function level3() {
  const b = LB(150);
  b.ground(0, 34).ground(38, 66).ground(70, 98).ground(102, 149);
  b.start(3, 13); b.mentor(9, 13, 'f3'); b.bank(20, 13);
  b.coins(12, 13, 4); b.block(15, 11, 4); b.coins(16, 10, 2);
  b.coins(24, 13, 3); b.walker(27, 13, 'parcela', 25, 32);
  b.block(29, 11, 3);
  b.want(30, 10, { name: 'Videogame', price: 90, happy: 25, gem: 6, credit: true });
  b.arc(35, 3, 12, 1);
  b.bank(40, 13); b.coins(42, 13, 3); b.walker(46, 13, 'juros', 44, 54);
  b.saw(58, 13); b.arc(57, 3, 11, 2); b.block(62, 11, 3); b.coins(62, 10, 2);
  b.arc(67, 3, 12, 1);
  b.coins(72, 13, 2); b.cannon(75, 13, -1);
  b.block(78, 11, 4); b.block(82, 8, 3);
  b.want(83, 7, { name: 'Smartphone', price: 150, happy: 30, gem: 5, credit: true });
  b.walker(88, 13, 'parcela', 86, 92); b.walker(92, 13, 'juros', 90, 96); b.bank(95, 13);
  b.arc(99, 3, 12, 1);
  b.flyer(108, 10, 104, 116); b.coins(106, 13, 3); b.walker(112, 13, 'parcela', 108, 118);
  b.saw(120, 13, 120, 128);
  b.block(124, 11, 3); b.block(127, 8, 3);
  b.want(128, 7, { name: 'Moto nova', price: 300, happy: 40, gem: 4, credit: true });
  b.cannon(137, 13, -1); b.coins(130, 13, 3); b.bank(140, 13); b.finish(146, 13);
  return b;
}

/* ---------------------------------------------------------------- FASE 4 */
function level4() {
  const b = LB(150);
  b.ground(0, 44).ground(45, 149);
  b.start(3, 13); b.mentor(9, 13, 'f4');
  b.coins(12, 13, 4); b.block(16, 11, 4); b.coins(17, 10, 2); b.bank(24, 13); b.coins(30, 13, 4);
  b.sign(35, 13, 'SEGURO: CIMA'); b.sign(46, 13, 'RISCO: BAIXO');
  // caminho de cima (seguro): plataforma-degrau + piso contínuo
  b.block(44, 11, 3);
  b.block(50, 9, 48, 1);
  b.coins(54, 8, 4); b.coins(66, 8, 4); b.coins(78, 8, 3);
  b.chest(93, 8, 'safe');
  // caminho de baixo (risco): túnel com perigos e mais moedas
  b.coins(50, 13, 3); b.saw(56, 13, 55, 60); b.coins(52, 12, 2);
  b.spikes(64, 13, 2); b.arc(63, 4, 11, 2);
  b.electric(72, 13); b.coins(69, 13, 2);
  b.saw(80, 13, 78, 84); b.coins(76, 13, 2);
  b.spikes(88, 13, 2); b.arc(87, 4, 11, 2);
  b.chest(95, 13, 'risk');
  // depois do encontro
  b.bank(104, 13); b.coins(108, 13, 4); b.block(112, 11, 4); b.coins(113, 10, 2);
  b.walker(118, 13, 'juros', 116, 124); b.coins(122, 13, 3); b.block(126, 11, 3); b.block(130, 8, 3); b.coins(130, 7, 3);
  b.bank(136, 13); b.finish(144, 13);
  b.extra(60, 8); b.extra(108, 13); b.extra(120, 13); b.extra(132, 13);
  return b;
}

/* ---------------------------------------------------------------- FASE 5 */
function level5() {
  const b = LB(132);
  b.ground(0, 40).ground(44, 80).ground(84, 131);
  b.start(3, 13); b.mentor(9, 13, 'f5'); b.coins(13, 13, 4); b.block(18, 11, 4); b.coins(19, 10, 2);
  b.bank(26, 13); b.coins(31, 13, 3); b.star(35, 10); b.walker(34, 13, 'juros', 32, 38);
  b.arc(41, 3, 12, 1);
  b.coins(46, 13, 3); b.block(50, 10, 5); b.coins(51, 9, 3);
  b.boss(66, 13, 47, 79);
  b.block(63, 10, 5); b.coins(64, 9, 3);
  b.coins(72, 13, 3); b.bank(78, 13);
  b.arc(81, 3, 12, 1);
  b.coins(86, 13, 3); b.block(90, 11, 4); b.coins(91, 10, 2); b.cannon(100, 13, -1);
  b.block(104, 11, 3); b.block(108, 8, 3); b.coins(108, 7, 3); b.saw(114, 13);
  b.coins(112, 13, 2); b.coins(118, 13, 3);
  b.finish(126, 13);
  b.extra(30, 13); b.extra(58, 13); b.extra(96, 13); b.extra(116, 13);
  return b;
}

const LEVEL_DEFS = [
  {
    id: 1, name: 'Ganhar & Guardar', theme: 0, bg: 'bg4', build: level1,
    intro: [
      ['mentor', 'Olá! Eu sou a Dona Poupança e vou te guiar rumo ao seu sonho!'],
      ['mentor', 'Colete moedas e, nos COFRINHOS, guarde uma parte na poupança. Ela rende juros a cada fase!'],
      ['mentor', 'As ESTRELAS são lazer: custam R$15, dão felicidade e um turbo. Mas cuidado com o saldo!'],
      ['hero', 'Bora! Setas ou A/D andam, ESPAÇO pula (dá pra pular 2 vezes!).'],
    ],
    hint: ['Cada real guardado hoje vira mais amanhã: são os juros compostos!', 'Guardar uma parte de tudo o que ganha é o primeiro passo.'],
  },
  {
    id: 2, name: 'Necessidades vs Desejos', theme: 1, bg: 'bg2', build: level2,
    intro: [
      ['mentor', 'Agora as contas chegaram! Aluguel, comida, luz... são NECESSIDADES: não dá para fugir delas.'],
      ['mentor', 'As gemas brilhantes são DESEJOS. Dão muita felicidade, mas custam caro!'],
      ['mentor', 'Regra de ouro: pague o essencial primeiro. Só depois escolha um desejo com o que sobrar.'],
    ],
    hint: ['Se faltar dinheiro para uma conta, você usa a poupança ou entra no vermelho.', 'Dá pra ser feliz sem comprar tudo: escolha 1 ou 2 desejos!'],
  },
  {
    id: 3, name: 'Armadilhas do Crédito', theme: 2, bg: 'bg5', build: level3,
    intro: [
      ['mentor', 'Cuidado! Aqui moram o Cartão, o Juros e as Parcelas. Todos querem morder seu dinheiro!'],
      ['mentor', 'Nas ofertas você pode PARCELAR. Parece leve, mas o total fica bem mais caro.'],
      ['mentor', 'E toda compra parcelada cria novos inimigos nas próximas fases. Pise neles para quitar parcelas!'],
    ],
    hint: ['Parcelar em 10x pode custar 30% a mais. Isso é o preço dos juros!', 'Juros de dívida crescem mais rápido do que os da poupança.'],
  },
  {
    id: 4, name: 'Investimentos', theme: 5, bg: 'bg6', build: level4,
    intro: [
      ['mentor', 'Hora de investir! Adiante o caminho se divide.'],
      ['mentor', 'EM CIMA: caminho seguro, retorno pequeno e garantido. EMBAIXO: arriscado, pode render mais... ou perder!'],
      ['mentor', 'Risco e retorno andam juntos. Quanto maior a chance de ganhar muito, maior a de perder.'],
    ],
    hint: ['Nenhum investimento sério promete lucro sem risco. Desconfie!', 'Diversificar é não colocar todos os ovos na mesma cesta.'],
  },
  {
    id: 5, name: 'Realizar o Sonho', theme: 1, bg: 'bg1', build: level5,
    intro: [
      ['mentor', 'Chegamos à reta final! Seu sonho está logo ali, no fim da fase.'],
      ['mentor', 'O Sr. Dívida está por aqui: quanto maior a dívida, maior ele fica!'],
      ['mentor', 'No final, o dinheiro acumulado será usado para pagar as dívidas e realizar o sonho.'],
    ],
    hint: ['Planejar a longo prazo é definir uma meta e guardar aos poucos.', 'Dívida paga primeiro, sonho depois!'],
  },
];

const QUIZ = [
  { q: 'Qual atitude ajuda o dinheiro a crescer com o tempo?',
    o: ['Gastar tudo assim que ganha', 'Guardar uma parte e deixar render juros', 'Esconder o dinheiro no colchão'], c: 1,
    why: 'Guardar uma parte regularmente faz o dinheiro render juros. Com o tempo, juros sobre juros: os juros compostos!' },
  { q: 'Ao receber o salário, o que vem primeiro?',
    o: ['Comprar um desejo', 'Pagar as necessidades (moradia, comida, contas)', 'Parcelar algo em 12x'], c: 1,
    why: 'Necessidades primeiro! Com o que sobra, você escolhe desejos e ainda guarda uma parte.' },
  { q: 'Por que parcelar pode sair caro?',
    o: ['Porque o total pago costuma incluir juros', 'Porque a parcela é sempre grátis', 'Porque o banco paga por você'], c: 0,
    why: 'Parcelas com juros deixam o produto bem mais caro. Sempre compare o valor total com o preço à vista.' },
  { q: 'O que é verdade sobre investimentos?',
    o: ['Não existe investimento que perde', 'Quanto maior o retorno esperado, maior costuma ser o risco', 'A poupança sempre rende mais que tudo'], c: 1,
    why: 'Risco e retorno andam juntos. Conheça o risco e não invista dinheiro que você vai precisar logo.' },
  { q: 'Qual a melhor forma de realizar um sonho grande?',
    o: ['Torcer para ganhar na loteria', 'Definir uma meta, planejar e guardar aos poucos', 'Fazer um empréstimo sem planejar'], c: 1,
    why: 'Meta clara, prazo e disciplina: planejamento é o que transforma sonho em realidade.' },
];

const DREAMS = [
  { id: 'viagem', name: 'Viagem dos sonhos', cost: 400, desc: 'Conhecer o mundo. O sonho mais acessível.' },
  { id: 'negocio', name: 'Negócio próprio', cost: 650, desc: 'Abrir sua própria loja. Exige mais planejamento.' },
  { id: 'casa', name: 'Casa própria', cost: 900, desc: 'O maior sonho, e o que exige mais disciplina.' },
];
