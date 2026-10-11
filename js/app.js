/* 할리갈리 UI/입력 */
(function () {
  'use strict';

  var A = window.HG_ASSETS, SP = A.sprites;
  var $ = function (s) { return document.querySelector(s); };
  var stage = $('#stage'), addsEl = $('#adds'), boardEl = $('#board'), menuBtn = $('#menuBtn');
  var EDGE_ROT = { bottom: 0, left: 90, top: 180, right: 270 };

  var state = HG.newState();
  var layout = null;
  var ui = {
    seats: [], piles: [], slots: [], hints: [], decks: [], counts: [], tags: [], bells: [], msgs: [],
    nodes: [[], [], [], []],
    hold: [false, false, false, false],
    frozen: null,
    flipLockUntil: 0, ringLockUntil: 0,
    rot: [0, 0, 0, 0]
  };

  /* ───────── 스프라이트 ───────── */
  function sprite(el, sheet, col, row) {
    el.style.backgroundImage = 'url("' + sheet.src + '")';
    el.style.backgroundSize = (sheet.cols * 100) + '% ' + (sheet.rows * 100) + '%';
    el.style.backgroundPosition = (sheet.cols > 1 ? col / (sheet.cols - 1) * 100 : 0) + '% ' +
                                  (sheet.rows > 1 ? row / (sheet.rows - 1) * 100 : 0) + '%';
  }
  function cardSprite(el, id) { sprite(el, SP.cards, HG.cardCount(id) - 1, HG.cardFruit(id)); }
  function backSprite(el) { sprite(el, SP.cards, SP.cards.back.col, SP.cards.back.row); }

  if (SP.board && SP.board.src) boardEl.style.backgroundImage = 'url("' + SP.board.src + '")';

  /* ───────── 좌석 DOM ───────── */
  function buildSeat(p) {
    var pl = A.players[p];
    var el = document.createElement('div');
    el.className = 'seat';
    el.dataset.p = p;
    el.style.setProperty('--pc', pl.color);
    el.innerHTML =
      '<div class="pile"><div class="slot"><div class="hint"></div></div></div>' +
      '<div class="msg"><span></span></div>' +
      '<div class="deck"><div class="face"></div><span class="count"></span><span class="tag"></span></div>' +
      '<div class="bell"></div>';
    stage.appendChild(el);
    ui.seats[p] = el;
    ui.piles[p] = el.querySelector('.pile');
    ui.slots[p] = el.querySelector('.slot');
    ui.hints[p] = el.querySelector('.hint');
    ui.decks[p] = el.querySelector('.deck');
    ui.counts[p] = el.querySelector('.count');
    ui.tags[p] = el.querySelector('.tag');
    ui.bells[p] = el.querySelector('.bell');
    ui.msgs[p] = el.querySelector('.msg');
    backSprite(ui.decks[p].querySelector('.face'));
    sprite(ui.bells[p], SP.bells, p, 0);
    ui.tags[p].textContent = pl.name;
    press(ui.decks[p], function () { onDeck(p); });
    press(ui.bells[p], function () { doRing(p); });
  }
  function press(el, fn) {
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); fn(e); });
  }
  for (var p0 = 0; p0 < 4; p0++) buildSeat(p0);

  /* ───────── 레이아웃 적용 ───────── */
  function insets() {
    var cs = getComputedStyle($('#probe'));
    return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  }

  function applyLayout() {
    var W = window.innerWidth, H = window.innerHeight;
    var L = HGLayout.compute({
      W: W, H: H, inset: insets(), seats: state.seats, lobby: state.phase === 'lobby',
      ratio: SP.cards.w / SP.cards.h
    });
    layout = L;
    var vars = { Lw: L.Lw, Lh: L.Lh, cw: L.cw, ch: L.ch, dw: L.dw, dh: L.dh, bd: L.bd, sd: L.sd, sw: L.sw, g: L.g, gapS: L.gapS };
    Object.keys(vars).forEach(function (k) { stage.style.setProperty('--' + k, vars[k] + 'px'); });

    var shown = [false, false, false, false];
    L.seats.forEach(function (s) {
      shown[s.p] = true;
      var el = ui.seats[s.p];
      el.style.display = '';
      el.style.width = s.Lw + 'px';
      el.style.height = s.Lh + 'px';
      el.style.left = (s.cx - s.Lw / 2) + 'px';
      el.style.top = (s.cy - s.Lh / 2) + 'px';
      el.style.transform = 'rotate(' + s.rot + 'deg)';
      ui.rot[s.p] = s.rot;
    });
    for (var p = 0; p < 4; p++) if (!shown[p]) ui.seats[p].style.display = 'none';

    addsEl.textContent = '';
    L.adds.forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'add';
      b.style.left = a.x + 'px'; b.style.top = a.y + 'px';
      b.style.width = a.size + 'px'; b.style.height = a.size + 'px';
      b.style.fontSize = (a.size * 0.3) + 'px';
      b.style.borderColor = A.players[a.p].color;
      b.setAttribute('aria-label', A.players[a.p].name + ' 추가');
      b.innerHTML = '<span class="in" style="transform:rotate(' + EDGE_ROT[a.edge] + 'deg)"><b>+</b><small>' + A.players[a.p].name + '</small></span>';
      press(b, function () { HGSound.unlock(); setSeat(a.p, true); });
      addsEl.appendChild(b);
    });

    menuBtn.style.left = L.menu.x + 'px'; menuBtn.style.top = L.menu.y + 'px';
    menuBtn.style.width = L.menu.size + 'px'; menuBtn.style.height = L.menu.size + 'px';
    menuBtn.style.fontSize = (L.menu.size * 0.55) + 'px';
  }

  var resizeTimer = 0;
  function scheduleLayout(delay) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { applyLayout(); render(); }, delay || 0);
  }
  window.addEventListener('resize', function () { scheduleLayout(30); });
  window.addEventListener('orientationchange', function () { scheduleLayout(150); });

  /* ───────── 렌더 ───────── */
  function deckCount(p) { return ui.frozen ? ui.frozen[p] : state.decks[p].length; }
  function holdAny() { return ui.hold.some(Boolean); }

  function hintHTML(p) {
    var n = A.players[p].name;
    if (p === 0) return '<b>' + n + '</b><small>덱을 터치하면<br>게임 시작</small>';
    if (p === 1) return '<b>' + n + '</b><small>참가 중</small>';
    return '<b>' + n + '</b><small>덱을 터치하면<br>빠집니다</small>';
  }

  function renderSeat(p) {
    if (!state.seats[p]) return;
    var lobby = state.phase === 'lobby';
    var seat = ui.seats[p];
    seat.classList.toggle('out', !!state.out[p]);

    // 덱
    var cnt = lobby ? (p === 0 ? '▶' : '') : (state.out[p] ? 'OUT' : String(deckCount(p)));
    ui.counts[p].textContent = cnt;
    ui.counts[p].classList.toggle('small', cnt === 'OUT');
    var n = lobby ? 24 : deckCount(p);
    ui.decks[p].style.setProperty('--dd', n <= 0 ? 0 : Math.min(7, 1 + Math.ceil(n / 8)));
    ui.decks[p].classList.toggle('turn', (lobby && p === 0) || (state.phase === 'playing' && state.turn === p && !state.out[p] && !holdAny()));

    // 오픈 카드 더미
    syncPile(p);
    ui.hints[p].innerHTML = lobby ? hintHTML(p) : '';
    ui.slots[p].style.visibility = ui.nodes[p].length ? 'hidden' : 'visible';
  }

  function render() {
    for (var p = 0; p < 4; p++) renderSeat(p);
    $('#over').hidden = !(state.phase === 'over' && !holdAny());
  }

  /* ───────── 오픈 카드 더미 ───────── */
  function makeCardEl(id) {
    var c = document.createElement('div'); c.className = 'card';
    var f = document.createElement('div'); f.className = 'front'; cardSprite(f, id);
    var b = document.createElement('div'); b.className = 'back'; backSprite(b);
    c.appendChild(f); c.appendChild(b);
    return c;
  }

  function addPileNode(p, id, animate) {
    var el = makeCardEl(id);
    var rot = Math.random() * 5 - 2.5;
    el.style.transform = 'rotate(' + rot + 'deg)';
    ui.piles[p].appendChild(el);
    ui.nodes[p].push({ id: id, el: el, rot: rot });
    while (ui.nodes[p].length > 3) ui.nodes[p].shift().el.remove();
    ui.piles[p].style.setProperty('--pd', Math.min(5, Math.max(1, state.piles[p].length)));
    if (animate && layout && el.animate) {
      var L = layout;
      var dx = -L.sw / 2 + L.dw / 2;                    // 덱 중심 - 더미 중심 (local)
      var dy = (L.ch + L.g + L.sd / 2) - L.ch / 2;
      var sc = L.dw / L.cw;
      el.animate([
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ') rotateY(180deg) rotate(0deg)' },
        { transform: 'translate(0,0) scale(1) rotateY(0deg) rotate(' + rot + 'deg)' }
      ], { duration: 260, easing: 'cubic-bezier(.2,.75,.25,1)' });
    }
  }

  function syncPile(p) {
    if (ui.hold[p]) return;
    var want = state.piles[p].slice(-3);
    var cur = ui.nodes[p].map(function (n) { return n.id; });
    if (cur.join() !== want.join()) {
      ui.nodes[p].forEach(function (n) { n.el.remove(); });
      ui.nodes[p] = [];
      want.forEach(function (id) { addPileNode(p, id, false); });
    }
    ui.piles[p].style.setProperty('--pd', Math.min(5, Math.max(1, state.piles[p].length)));
  }

  function clearNodes(p) {
    ui.nodes[p].forEach(function (n) { n.el.remove(); });
    ui.nodes[p] = [];
  }

  /* ───────── 효과 ───────── */
  function showMsg(p, text, kind) {
    var m = ui.msgs[p];
    m.firstChild.textContent = text;
    m.className = 'msg ' + (kind || '');
    void m.offsetWidth;
    m.classList.add('show');
  }

  function shake(p) {
    var d = ui.decks[p];
    d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake');
  }

  function pressBell(p) {
    var b = ui.bells[p];
    sprite(b, SP.bells, p, 1);
    b.classList.add('down');
    b.classList.remove('ringing'); void b.offsetWidth; b.classList.add('ringing');
    setTimeout(function () { sprite(b, SP.bells, p, 0); b.classList.remove('down'); }, 140);
  }

  function flyGhost(srcEl, dstEl, o) {
    var sRect = srcEl.getBoundingClientRect(), dRect = dstEl.getBoundingClientRect();
    var sp = +srcEl.closest('.seat').dataset.p, dp = +dstEl.closest('.seat').dataset.p;
    var w = srcEl.offsetWidth, h = srcEl.offsetHeight;
    var g = document.createElement('div');
    g.className = 'ghost';
    g.style.width = w + 'px'; g.style.height = h + 'px';
    g.style.left = (sRect.left + sRect.width / 2 - w / 2) + 'px';
    g.style.top = (sRect.top + sRect.height / 2 - h / 2) + 'px';
    g.style.borderRadius = (w * 0.1) + 'px';
    if (o.id != null) cardSprite(g, o.id); else backSprite(g);
    document.body.appendChild(g);
    var r0 = ui.rot[sp] + (o.rot0 || 0);
    var diff = ((ui.rot[dp] - r0) % 360 + 540) % 360 - 180;
    var r1 = r0 + diff;
    var dx = (dRect.left + dRect.width / 2) - (sRect.left + sRect.width / 2);
    var dy = (dRect.top + dRect.height / 2) - (sRect.top + sRect.height / 2);
    var sx = dstEl.offsetWidth / w, sy = dstEl.offsetHeight / h;
    if (!g.animate) { setTimeout(function () { g.remove(); }, (o.dur || 380) + (o.delay || 0)); return; }
    var a = g.animate([
      { transform: 'translate(0,0) rotate(' + r0 + 'deg) scale(1)' },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + r1 + 'deg) scale(' + sx + ',' + sy + ')' }
    ], { duration: o.dur || 380, delay: o.delay || 0, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
    a.onfinish = function () { g.remove(); };
  }

  /* ───────── 게임 흐름 ───────── */
  function setSeat(p, on) {
    if (state.phase !== 'lobby' || p < 2) return;
    state.seats[p] = !!on;
    state.out[p] = false;
    applyLayout(); render();
  }

  function startGame() {
    HG.start(state);
    for (var p = 0; p < 4; p++) { clearNodes(p); ui.hold[p] = false; ui.msgs[p].className = 'msg'; }
    ui.frozen = null;
    acquireWake();
    applyLayout(); render();
    doFlip(0);
  }

  function resetToLobby() {
    var seats = state.seats.slice();
    state = HG.newState(seats);
    for (var p = 0; p < 4; p++) { clearNodes(p); ui.hold[p] = false; ui.msgs[p].className = 'msg'; }
    ui.frozen = null;
    ui.flipLockUntil = ui.ringLockUntil = 0;
    applyLayout(); render();
  }

  function onDeck(p) {
    HGSound.unlock();
    if (state.phase === 'lobby') {
      if (p === 0) startGame();
      else if (p >= 2) setSeat(p, false);
      return;
    }
    if (state.phase === 'playing') doFlip(p);
  }

  function handleOuts(outs) {
    outs.forEach(function (q) { HGSound.play('out', 0.05); showMsg(q, '탈락', 'bad'); });
  }

  function onOver() {
    var w = state.winner;
    HGSound.play('win', 0.1);
    if (w >= 0) {
      var m = ui.msgs[w];
      m.firstChild.textContent = '🏆 승리!';
      m.className = 'msg stay';
    }
    releaseWake();
    render();
  }

  function doFlip(p) {
    if (state.phase !== 'playing') return;
    if (performance.now() < ui.flipLockUntil) return;
    if (state.turn !== p || state.out[p]) { shake(p); return; }
    var res = HG.flip(state, p);
    if (!res) { shake(p); return; }
    HGSound.play('flip');
    addPileNode(p, res.card, true);
    handleOuts(res.outs);
    render();
    if (state.phase === 'over') onOver();
  }

  function doRing(p) {
    HGSound.unlock();
    pressBell(p);
    HGSound.play(A.players[p].bell);
    if (state.phase !== 'playing' || state.out[p]) return;
    var now = performance.now();
    if (now < ui.ringLockUntil) return;          // 정답 처리 중 동시에 눌린 벨은 벌칙 없이 무시

    var before = state.decks.map(function (d) { return d.length; });
    var res = HG.ring(state, p);
    if (!res) return;

    if (res.ok) {
      ui.frozen = before;
      var delay = 480, n = 0;
      for (var q = 0; q < 4; q++) {
        if (res.fromPiles[q] > 0) {
          ui.hold[q] = true;
          var top = ui.nodes[q][ui.nodes[q].length - 1];
          if (top && HG.cardFruit(top.id) === res.fruit) top.el.classList.add('hit');
          n += ui.nodes[q].length;
        }
      }
      HGSound.play('correct', 0.12);
      showMsg(p, '정답! +' + res.gained, 'good');
      var total = delay + 380 + n * 45 + 80;
      ui.ringLockUntil = ui.flipLockUntil = now + total;
      render();
      setTimeout(function () {
        var target = ui.decks[p], i = 0;
        for (var q2 = 0; q2 < 4; q2++) {
          if (!ui.hold[q2]) continue;
          ui.nodes[q2].forEach(function (nd) {
            nd.el.classList.remove('hit');
            flyGhost(nd.el, target, { id: nd.id, rot0: nd.rot, delay: i * 45, dur: 380 });
            nd.el.style.visibility = 'hidden';
            i++;
          });
        }
        setTimeout(function () {
          for (var q3 = 0; q3 < 4; q3++) { if (ui.hold[q3]) clearNodes(q3); ui.hold[q3] = false; }
          ui.frozen = null;
          handleOuts(res.outs);
          render();
          if (state.phase === 'over') onOver();
        }, 380 + i * 45 + 40);
      }, delay);
    } else {
      HGSound.play('wrong', 0.14);
      showMsg(p, '오답! −' + res.payments.length, 'bad');
      res.payments.forEach(function (pay, i) {
        flyGhost(ui.decks[p], ui.decks[pay.to], { delay: i * 90, dur: 340 });
      });
      handleOuts(res.outs);
      render();
      if (state.phase === 'over') onOver();
    }
  }

  /* ───────── 메뉴 ───────── */
  var menu = $('#menu'), muteBtn = $('#muteBtn'), fsBtn = $('#fsBtn'), newBtn = $('#newBtn');
  var armTimer = 0;
  function openMenu() { menu.hidden = false; disarm(); }
  function closeMenu() { menu.hidden = true; disarm(); }
  function disarm() { clearTimeout(armTimer); newBtn.classList.remove('armed'); newBtn.textContent = '새 게임'; }
  function paintMute() { muteBtn.textContent = HGSound.isMuted() ? '소리 꺼짐' : '소리 켜짐'; }

  try { HGSound.setMuted(localStorage.getItem('hg-muted') === '1'); } catch (e) { /* 무시 */ }
  paintMute();

  press(menuBtn, function () { HGSound.unlock(); openMenu(); });
  press($('#closeBtn'), closeMenu);
  menu.addEventListener('pointerdown', function (e) { if (e.target === menu) closeMenu(); });
  press(muteBtn, function () {
    HGSound.setMuted(!HGSound.isMuted()); paintMute();
    try { localStorage.setItem('hg-muted', HGSound.isMuted() ? '1' : '0'); } catch (e) { /* 무시 */ }
  });
  if (!document.documentElement.requestFullscreen) fsBtn.style.display = 'none';
  press(fsBtn, function () {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () {});
  });
  press(newBtn, function () {
    if (state.phase === 'lobby' || newBtn.classList.contains('armed')) { closeMenu(); resetToLobby(); return; }
    newBtn.classList.add('armed'); newBtn.textContent = '한 번 더 누르면 새 게임';
    armTimer = setTimeout(disarm, 3000);
  });
  press($('#again'), function () { resetToLobby(); });

  /* ───────── 화면 고정(스크롤/확대 방지) ───────── */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) {
    document.addEventListener(t, function (e) { e.preventDefault(); });
  });
  document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    var t = Date.now();
    if (t - lastTouchEnd < 350) e.preventDefault();
    lastTouchEnd = t;
  }, { passive: false });
  document.addEventListener('pointerdown', function () { HGSound.unlock(); }, { passive: true });

  /* ───────── 화면 켜짐 유지 ───────── */
  var wake = null;
  function acquireWake() {
    try {
      if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
    } catch (e) { /* 무시 */ }
  }
  function releaseWake() { try { if (wake) wake.release(); } catch (e) { /* 무시 */ } wake = null; }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && state.phase === 'playing') acquireWake();
  });

  /* ───────── PWA ───────── */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  /* ───────── 시작 ───────── */
  applyLayout();
  render();
  requestAnimationFrame(function () { requestAnimationFrame(function () { document.body.classList.add('ready'); }); });

  // 테스트/디버그용 훅
  window.__hg = { state: function () { return state; }, layout: function () { return layout; }, flip: doFlip, ring: doRing };
})();
