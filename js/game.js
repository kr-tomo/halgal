/* 할리갈리 규칙 엔진 (DOM 의존 없음, 브라우저/노드 공용)
 *
 * 카드: 정수 id = fruit*5 + (count-1)   fruit 0..3, count 1..5
 * 덱  : 배열, 맨 위 카드 = 마지막 원소 (뒤집힌 카드 더미)
 * 파일: 배열, 맨 위 카드 = 마지막 원소 (오픈된 카드 더미)
 */
(function (root) {
  'use strict';

  var FRUITS = 4;
  var COUNT_PER_FRUIT = [5, 3, 3, 2, 1]; // 과일 1~5개 카드 장수 (과일당 14장, 총 56장)
  var BELL_TOTAL = 5;
  // 시계방향 진행 순서 (세로/가로 배치 모두 동일하게 성립): 1P → 4P → 2P → 3P
  var CLOCKWISE = [0, 3, 1, 2];

  function cardFruit(id) { return Math.floor(id / 5); }
  function cardCount(id) { return (id % 5) + 1; }

  function buildDeck() {
    var cards = [];
    for (var f = 0; f < FRUITS; f++) {
      for (var n = 1; n <= 5; n++) {
        for (var k = 0; k < COUNT_PER_FRUIT[n - 1]; k++) cards.push(f * 5 + (n - 1));
      }
    }
    return cards;
  }

  function shuffle(arr, rng) {
    rng = rng || Math.random;
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function newState(seats) {
    return {
      phase: 'lobby',               // lobby | playing | over
      seats: (seats || [true, true, false, false]).slice(),
      decks: [[], [], [], []],
      piles: [[], [], [], []],
      out: [false, false, false, false],
      turn: -1,
      winner: -1
    };
  }

  function activePlayers(s) {
    var r = [];
    for (var p = 0; p < 4; p++) if (s.seats[p] && !s.out[p]) r.push(p);
    return r;
  }

  function order(s) {
    return CLOCKWISE.filter(function (p) { return s.seats[p]; });
  }

  function nextInOrder(s, from) {
    var o = order(s);
    var i = o.indexOf(from);
    for (var k = 1; k <= o.length; k++) {
      var p = o[(i + k) % o.length];
      if (!s.out[p]) return p;
    }
    return from;
  }

  /** 게임 시작: 56장을 참가자에게 균등 분배(나머지는 앞 순서부터 1장씩) */
  function start(s, rng) {
    var all = shuffle(buildDeck(), rng);
    var o = order(s);
    s.decks = [[], [], [], []];
    s.piles = [[], [], [], []];
    s.out = [false, false, false, false];
    var i = 0;
    while (all.length) { s.decks[o[i % o.length]].push(all.pop()); i++; }
    s.phase = 'playing';
    s.turn = 0; // 1P 부터
    s.winner = -1;
    return s;
  }

  /** 펼쳐진 맨 위 카드들의 과일별 합계 */
  function totals(s) {
    var t = [0, 0, 0, 0];
    for (var p = 0; p < 4; p++) {
      var pile = s.piles[p];
      if (pile.length) {
        var c = pile[pile.length - 1];
        t[cardFruit(c)] += cardCount(c);
      }
    }
    return t;
  }

  function bellFruit(s) {
    var t = totals(s);
    for (var f = 0; f < FRUITS; f++) if (t[f] === BELL_TOTAL) return f;
    return -1;
  }

  /** 아웃 처리 / 승자 판정. 턴 플레이어 덱이 비어 있으면 아웃시키고 다음으로 넘긴다. */
  function settle(s) {
    var guard = 8;
    var outs = [];
    while (s.phase === 'playing' && guard-- > 0) {
      if (activePlayers(s).length <= 1) break;
      if (s.decks[s.turn].length === 0) {
        s.out[s.turn] = true;
        outs.push(s.turn);
        s.turn = nextInOrder(s, s.turn);
        continue;
      }
      break;
    }
    var act = activePlayers(s);
    if (s.phase === 'playing' && act.length <= 1) {
      s.phase = 'over';
      s.winner = act.length ? act[0] : -1;
      s.turn = -1;
    }
    return outs;
  }

  /** 자기 차례 플레이어가 덱 맨 위를 오픈 */
  function flip(s, p) {
    if (s.phase !== 'playing' || s.turn !== p || s.out[p]) return null;
    if (!s.decks[p].length) return null;
    var card = s.decks[p].pop();
    s.piles[p].push(card);
    s.turn = nextInOrder(s, p);
    var outs = settle(s);
    return { card: card, player: p, outs: outs, bell: bellFruit(s) };
  }

  /** 벨. 5개면 모든 오픈 카드 획득, 아니면 다른 플레이어에게 1장씩 지급 */
  function ring(s, p, rng) {
    if (s.phase !== 'playing' || s.out[p] || !s.seats[p]) return null;
    var fruit = bellFruit(s);
    if (fruit >= 0) {
      var taken = [];
      var fromPiles = [0, 0, 0, 0];
      for (var q = 0; q < 4; q++) {
        fromPiles[q] = s.piles[q].length;
        taken = taken.concat(s.piles[q]);
        s.piles[q] = [];
      }
      shuffle(taken, rng);
      // 획득 카드는 덱 맨 아래로 (덱 배열 앞쪽에 삽입)
      s.decks[p] = taken.concat(s.decks[p]);
      var outs1 = settle(s);
      return { ok: true, player: p, fruit: fruit, gained: taken.length, fromPiles: fromPiles, outs: outs1 };
    }
    // 오답
    var payments = [];
    var recipients = order(s).filter(function (q) { return q !== p && !s.out[q]; });
    // 지급은 시계방향으로 가까운 사람부터
    var o = order(s);
    var start = o.indexOf(p);
    recipients.sort(function (a, b) {
      return ((o.indexOf(a) - start + o.length) % o.length) - ((o.indexOf(b) - start + o.length) % o.length);
    });
    for (var i = 0; i < recipients.length; i++) {
      if (!s.decks[p].length) break;
      var c = s.decks[p].pop();
      s.decks[recipients[i]].unshift(c);
      payments.push({ to: recipients[i], card: c });
    }
    var outs2 = [];
    if (!s.decks[p].length && payments.length < recipients.length) {
      // 낼 카드가 모자라면 즉시 탈락
      s.out[p] = true;
      outs2.push(p);
      if (s.turn === p) s.turn = nextInOrder(s, p);
    }
    outs2 = outs2.concat(settle(s));
    return { ok: false, player: p, payments: payments, outs: outs2 };
  }

  var api = {
    FRUITS: FRUITS, BELL_TOTAL: BELL_TOTAL, CLOCKWISE: CLOCKWISE,
    cardFruit: cardFruit, cardCount: cardCount, buildDeck: buildDeck, shuffle: shuffle,
    newState: newState, start: start, flip: flip, ring: ring,
    totals: totals, bellFruit: bellFruit, activePlayers: activePlayers, order: order,
    nextInOrder: nextInOrder, settle: settle
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HG = api;
})(typeof window !== 'undefined' ? window : this);
