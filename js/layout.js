/* 할리갈리 레이아웃 계산 (DOM 의존 없음, 브라우저/노드 공용)
 *
 * 각 플레이어 좌석은 "자기 기준 좌표계"(local)로 정의한다.
 *   - local 위쪽 = 화면 중심 방향
 *   - 위: 오픈 카드 더미(pile)  / 아래: 남은 덱(왼쪽) + 개인 벨(오른쪽)
 * 좌석 전체를 화면 가장자리에 붙이고, 회전(0/90/180/270)으로 중심을 바라보게 한다.
 * 카드 더미가 가장 크게 보이도록, 겹치지 않는 범위에서 카드 폭(cw)을 최대화한다.
 * 세로/가로 모두 중앙 정렬이 기본이고, 4인일 때만 옆 좌석을 엇갈려(바람개비) 더 크게 만든다.
 */
(function (root) {
  'use strict';

  var ROT = { bottom: 0, left: 90, top: 180, right: 270 };
  var EDGES_PORTRAIT = ['top', 'bottom', 'left', 'right'];    // 1P 상, 2P 하, 3P 좌, 4P 우
  var EDGES_LANDSCAPE = ['left', 'right', 'bottom', 'top'];   // 1P 좌, 2P 우, 3P 하, 4P 상

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function rotPoint(x, y, rot) {
    switch (rot) {
      case 90: return [-y, x];
      case 180: return [-x, -y];
      case 270: return [y, -x];
      default: return [x, y];
    }
  }

  /** local 사각형 -> 전역 사각형 (좌석 박스 중심 기준 회전) */
  function toGlobal(seat, r) {
    var ox = r.x - seat.Lw / 2, oy = r.y - seat.Lh / 2;
    var pts = [[ox, oy], [ox + r.w, oy], [ox, oy + r.h], [ox + r.w, oy + r.h]].map(function (q) {
      var v = rotPoint(q[0], q[1], seat.rot);
      return [seat.cx + v[0], seat.cy + v[1]];
    });
    var xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
    var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
    return { x: x0, y: y0, w: Math.max.apply(null, xs) - x0, h: Math.max.apply(null, ys) - y0 };
  }

  function overlap(a, b, gap) {
    return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
  }

  function compute(o) {
    var W = o.W, H = o.H;
    var inset = o.inset || { t: 0, r: 0, b: 0, l: 0 };
    var ratio = o.ratio || 240 / 336;            // 카드 가로/세로
    var present = o.seats || [true, true, false, false];
    var lobby = !!o.lobby;                       // 로비면 빈 좌석에 + 버튼 자리를 예약
    var portrait = H >= W;
    var edges = portrait ? EDGES_PORTRAIT : EDGES_LANDSCAPE;
    var u = Math.min(W, H);

    var base = Math.max(6, Math.round(u * 0.02));
    var M = { top: base + inset.t, right: base + inset.r, bottom: base + inset.b, left: base + inset.l };

    var dw = Math.round(clamp(u * 0.17, 50, 104));
    var dh = Math.round(dw / ratio);
    var bd = Math.round(dh * 0.9);
    var gapS = Math.round(dw * 0.2);
    var sw = dw + gapS + bd;
    var pad = 5;
    var sd = dh + pad * 2;
    var g = Math.max(8, Math.round(u * 0.022));
    var bleed = 4;
    var ab = Math.max(52, Math.round(dw * 0.85));     // + 버튼 크기
    var mb = Math.max(40, Math.round(u * 0.095));     // 메뉴 버튼 크기

    var areaL = M.left, areaR = W - M.right, areaT = M.top, areaB = H - M.bottom;
    var cxMid = (areaL + areaR) / 2, cyMid = (areaT + areaB) / 2;

    function isHoriz(edge) { return edge === 'top' || edge === 'bottom'; } // 가장자리를 따라 x 방향으로 놓임
    // 세로모드: 상/하는 가운데 고정, 좌/우는 자유 / 가로모드: 좌/우는 가운데 고정, 상/하는 자유
    function isFixed(edge) { return portrait ? isHoriz(edge) : !isHoriz(edge); }

    var seatsIn = [];     // 실제 좌석
    var addsIn = [];      // + 버튼
    for (var p = 0; p < 4; p++) {
      if (present[p]) seatsIn.push({ p: p, edge: edges[p], rot: ROT[edges[p]] });
      else if (lobby) addsIn.push({ p: p, edge: edges[p] });
    }

    var fixedRects = [];
    // + 버튼 자리: 가장자리 한가운데
    var adds = addsIn.map(function (a) {
      var x, y;
      if (a.edge === 'top') { x = cxMid - ab / 2; y = M.top; }
      else if (a.edge === 'bottom') { x = cxMid - ab / 2; y = H - M.bottom - ab; }
      else if (a.edge === 'left') { x = M.left; y = cyMid - ab / 2; }
      else { x = W - M.right - ab; y = cyMid - ab / 2; }
      var r = { x: x, y: y, w: ab, h: ab };
      fixedRects.push(r);
      return { p: a.p, edge: a.edge, x: r.x, y: r.y, size: ab };
    });
    var menu = { x: M.left, y: M.top, size: mb };
    fixedRects.push({ x: menu.x, y: menu.y, w: mb, h: mb });

    function placeSeat(s, cw, t) {
      var ch = cw / ratio;
      var Lw = Math.max(cw, sw), Lh = ch + g + sd;
      var cx, cy;
      if (s.edge === 'bottom') { cx = t; cy = H - M.bottom - Lh / 2; }
      else if (s.edge === 'top') { cx = t; cy = M.top + Lh / 2; }
      else if (s.edge === 'left') { cx = M.left + Lh / 2; cy = t; }
      else { cx = W - M.right - Lh / 2; cy = t; }
      var seat = { p: s.p, edge: s.edge, rot: s.rot, cx: cx, cy: cy, Lw: Lw, Lh: Lh, t: t };
      var pile = { x: (Lw - cw) / 2 - bleed, y: -bleed, w: cw + bleed * 2, h: ch + bleed * 2 };
      var strip = { x: (Lw - sw) / 2, y: ch + g, w: sw, h: sd };
      seat.pileG = toGlobal(seat, pile);
      seat.stripG = toGlobal(seat, strip);
      return seat;
    }

    function inBounds(r) {
      return r.x >= areaL - 0.5 && r.y >= areaT - 0.5 && r.x + r.w <= areaR + 0.5 && r.y + r.h <= areaB + 0.5;
    }

    function axisRange(s, cw) {
      var Lw = Math.max(cw, sw);
      var lo, hi;
      if (isHoriz(s.edge)) { lo = areaL + Lw / 2; hi = areaR - Lw / 2; }
      else { lo = areaT + Lw / 2; hi = areaB - Lw / 2; }
      return [lo, hi];
    }

    function centerT(s) { return isHoriz(s.edge) ? cxMid : cyMid; }

    var GRID = 17;
    function tryCw(cw) {
      var free = [], placed = [];
      seatsIn.forEach(function (s) { (isFixed(s.edge) ? placed : free).push(s); });
      var fixedSeats = placed.map(function (s) { return placeSeat(s, cw, centerT(s)); });
      for (var i = 0; i < fixedSeats.length; i++) {
        if (!inBounds(fixedSeats[i].pileG) || !inBounds(fixedSeats[i].stripG)) return null;
      }
      function ok(list) {
        for (var a = 0; a < list.length; a++) {
          if (!inBounds(list[a].pileG) || !inBounds(list[a].stripG)) return false;
          for (var f = 0; f < fixedRects.length; f++) {
            if (overlap(list[a].pileG, fixedRects[f], 2) || overlap(list[a].stripG, fixedRects[f], 2)) return false;
          }
          for (var b = a + 1; b < list.length; b++) {
            if (overlap(list[a].pileG, list[b].pileG, g * 0.5) || overlap(list[a].pileG, list[b].stripG, 2) ||
                overlap(list[a].stripG, list[b].pileG, 2) || overlap(list[a].stripG, list[b].stripG, 2)) return false;
          }
        }
        return true;
      }
      var ranges = free.map(function (s) { return axisRange(s, cw); });
      var best = null, bestCost = Infinity;
      var idx = free.map(function () { return 0; });
      function rec(k, cur, cost) {
        if (cost >= bestCost) return;
        if (k === free.length) {
          var list = fixedSeats.concat(cur);
          if (ok(list)) { best = list; bestCost = cost; }
          return;
        }
        var r = ranges[k];
        if (r[1] < r[0]) return;
        for (var gi = 0; gi < GRID; gi++) {
          var t = r[0] + (r[1] - r[0]) * (gi / (GRID - 1));
          if (GRID === 1) t = (r[0] + r[1]) / 2;
          rec(k + 1, cur.concat([placeSeat(free[k], cw, t)]), cost + Math.abs(t - centerT(free[k])));
        }
      }
      // 중앙에 가까운 후보부터 보도록 가운데 값도 반드시 포함
      rec(0, [], 0);
      return best;
    }

    var hi = Math.floor(u * 0.85), lo = 34;
    var result = tryCw(lo);
    var cwBest = lo;
    if (result) {
      var a = lo, b = hi;
      while (b - a > 1) {
        var mid = (a + b) >> 1;
        var r = tryCw(mid);
        if (r) { a = mid; result = r; } else b = mid;
      }
      cwBest = a;
      result = tryCw(cwBest) || result;
    } else {
      // 극단적으로 작은 화면: 겹침을 감수하고 가운데 배치
      result = seatsIn.map(function (s) { return placeSeat(s, lo, centerT(s)); });
    }

    var ch = cwBest / ratio;
    return {
      portrait: portrait, W: W, H: H, ratio: ratio,
      cw: cwBest, ch: ch, dw: dw, dh: dh, bd: bd, gapS: gapS, sw: sw, sd: sd, g: g,
      Lw: Math.max(cwBest, sw), Lh: ch + g + sd,
      seats: result.map(function (s) {
        return { p: s.p, edge: s.edge, rot: s.rot, cx: s.cx, cy: s.cy, Lw: s.Lw, Lh: s.Lh, t: s.t, pileG: s.pileG, stripG: s.stripG };
      }),
      adds: adds, menu: menu
    };
  }

  var api = { compute: compute, toGlobal: toGlobal, overlap: overlap, EDGES_PORTRAIT: EDGES_PORTRAIT, EDGES_LANDSCAPE: EDGES_LANDSCAPE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HGLayout = api;
})(typeof window !== 'undefined' ? window : this);
