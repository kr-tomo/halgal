/* 교체 가능한 리소스 설정
 *
 * ■ 이미지(스프라이트)
 *   assets/ 폴더의 이미지를 같은 격자 규격으로 덮어쓰거나, 아래 src/cols/rows/w/h 를 바꾸면 된다.
 *   - cards : 열 = 과일 개수(1~5), 행 = 딸기·바나나·라임·자두, 마지막 행(4행) 0열 = 카드 뒷면
 *   - bells : 열 = 플레이어(1P~4P), 행 0 = 평상시, 행 1 = 눌린 상태
 *   - board : 배경 한 장 (cover 로 채움)
 *   PNG/WebP/SVG 모두 가능. w/h 는 "한 칸"의 픽셀 크기(가로세로비 계산에만 쓰임).
 *
 * ■ 효과음
 *   sounds 의 값이 null 이면 내장 합성음, 파일 경로(mp3/ogg/wav)를 넣으면 그 파일을 쓴다.
 */
window.HG_ASSETS = {
  sprites: {
    cards: { src: 'assets/cards.svg', cols: 5, rows: 5, w: 240, h: 336, back: { col: 0, row: 4 } },
    bells: { src: 'assets/bells.svg', cols: 4, rows: 2, w: 200, h: 200 },
    board: { src: 'assets/board.svg' }
  },
  players: [
    { name: '1P', color: '#ef476f', bell: 'bell0' },
    { name: '2P', color: '#118ab2', bell: 'bell1' },
    { name: '3P', color: '#06d6a0', bell: 'bell2' },
    { name: '4P', color: '#ff9f1c', bell: 'bell3' }
  ],
  sounds: {
    flip: null,      // 카드 오픈 '샤샥'
    bell0: null,     // 1P 경적
    bell1: null,     // 2P 오리
    bell2: null,     // 3P 환호성
    bell3: null,     // 4P 딩동
    correct: null,   // 정답
    wrong: null,     // 오답
    win: null,       // 승리
    out: null        // 탈락
  }
};
