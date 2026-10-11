const HG = require('../js/game.js');
const L = require('../js/layout.js');
let fail = 0;
const assert = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };

// --- 규칙 시뮬레이션 ---
for (const seats of [[1,1,0,0],[1,1,1,0],[1,1,0,1],[1,1,1,1],[1,1,1,0]]) {
  for (let g = 0; g < 300; g++) {
    const s = HG.newState(seats.map(Boolean));
    HG.start(s);
    let steps = 0;
    const total = () => s.decks.concat(s.piles).reduce((a, d) => a + d.length, 0);
    assert(total() === 56, 'deal total');
    while (s.phase === 'playing' && steps++ < 20000) {
      // 가끔 아무나 벨 (정답이면 정확히, 아니면 잘못 눌러 보기)
      const bf = HG.bellFruit(s);
      if (bf >= 0) {
        const act = HG.activePlayers(s);
        HG.ring(s, act[Math.floor(Math.random() * act.length)]);
      } else if (Math.random() < 0.03) {
        const act = HG.activePlayers(s);
        HG.ring(s, act[Math.floor(Math.random() * act.length)]);
      }
      if (s.phase !== 'playing') break;
      assert(total() === 56, 'conservation');
      const r = HG.flip(s, s.turn);
      assert(r, 'flip works for turn player');
      if (!r) break;
    }
    assert(s.phase === 'over' || steps >= 20000, 'game ended');
    if (steps >= 20000) console.log('long game', seats, g);
  }
}
// 시계방향 순서
const s4 = HG.newState([true,true,true,true]); HG.start(s4);
let seq = []; for (let i=0;i<5;i++){ seq.push(s4.turn); HG.flip(s4, s4.turn); }
assert(seq.join()==='0,3,1,2,0', 'clockwise order '+seq);
// 오답 벌칙
const s2 = HG.newState([true,true,false,false]); HG.start(s2);
const d0 = s2.decks[0].length, d1 = s2.decks[1].length;
HG.ring(s2, 0);   // 펼친 카드 없음 -> 오답
assert(s2.decks[0].length === d0-1 && s2.decks[1].length === d1+1, 'penalty');
// 5개 정답
const s3 = HG.newState([true,true,false,false]); HG.start(s3);
s3.piles[0] = [2]; s3.piles[1] = [2]; // strawberry 3 + 3 = 6? (2 -> fruit0,count3)
assert(HG.bellFruit(s3) === -1, 'six not bell');
s3.piles[0] = [1]; s3.piles[1] = [2]; // 2 + 3 = 5
assert(HG.bellFruit(s3) === 0, 'five bell');
const rr = HG.ring(s3, 1); assert(rr.ok && rr.gained === 2, 'collect');
console.log('game tests done, fail =', fail);

// --- 레이아웃 검증 ---
const sizes = [[390,844],[360,640],[430,932],[844,390],[640,360],[932,430],[768,1024],[1024,768],[820,1180],[1180,820],[600,600],[320,568],[568,320]];
const sets = [[1,1,0,0],[1,1,1,0],[1,1,0,1],[1,1,1,1]];
let lf = 0;
for (const [W,H] of sizes) for (const st of sets) for (const lobby of [false,true]) {
  const r = L.compute({W,H,seats:st.map(Boolean),lobby,inset:{t:0,r:0,b:0,l:0}});
  const rects = [];
  r.seats.forEach(s => { rects.push(['pile'+s.p, s.pileG]); rects.push(['strip'+s.p, s.stripG]); });
  r.adds.forEach(a => rects.push(['add'+a.p, {x:a.x,y:a.y,w:a.size,h:a.size}]));
  for (let i=0;i<rects.length;i++){
    const q = rects[i][1];
    if (q.x < -0.5 || q.y < -0.5 || q.x+q.w > W+0.5 || q.y+q.h > H+0.5) { lf++; console.log('OOB', W,H,st,rects[i][0]); }
    for (let j=i+1;j<rects.length;j++){
      if (rects[i][0].slice(-1)===rects[j][0].slice(-1) && rects[i][0].slice(0,4)!=='add'+'') {}
      if (L.overlap(rects[i][1], rects[j][1], 0) && !(rects[i][0].slice(-1)===rects[j][0].slice(-1))) { lf++; console.log('OVERLAP', W,H,st,lobby,rects[i][0],rects[j][0]); }
    }
  }
  if (!lobby) console.log(`${W}x${H} seats=${st.join('')} cw=${r.cw} ch=${Math.round(r.ch)}`);
}
console.log('layout failures =', lf);
