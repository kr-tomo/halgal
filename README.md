# 할리갈리 (PWA 웹 앱)

스마트폰을 가운데 두고 최대 4명이 둘러앉아 하는 터치용 할리갈리.

## 실행
정적 파일만 있으므로 아무 웹 서버(HTTPS 권장)에 올리면 됩니다. PWA 설치·오프라인·화면 켜짐 유지는 HTTPS(또는 localhost)에서만 동작합니다.

    python3 -m http.server 8000     # 로컬 테스트: http://localhost:8000

## 조작
- 1P·2P는 고정, 3P·4P는 첫 카드를 열기 전까지 `+` 버튼으로 추가(추가된 덱을 다시 터치하면 빠짐)
- 1P 덱 터치 = 게임 시작(1P 첫 카드 오픈). 이후 시계방향(1P → 4P → 2P → 3P)으로 자기 덱을 터치해 오픈
- 오픈된 맨 위 카드들에서 같은 과일이 정확히 5개면 자기 벨을 터치 → 오픈된 카드 전부 획득
- 오답이면 다른 플레이어에게 1장씩 지급, 덱이 비면 탈락, 마지막 1명이 승리
- 좌측 상단 ⚙ : 소리 / 전체 화면 / 새 게임

배치: 세로 = 1P 상, 2P 하, 3P 좌, 4P 우 / 가로 = 1P 좌, 2P 우, 3P 하, 4P 상 (진행 순서는 두 방향 모두 동일)

## 이미지·소리 교체
`js/assets.js` 에서 설정합니다. 같은 격자 규격으로 `assets/` 의 파일을 덮어쓰면 코드 수정 없이 바뀝니다 (PNG/WebP/SVG 가능).

| 스프라이트 | 격자 |
|---|---|
| `assets/cards.svg` | 5열×5행. 열 = 과일 개수 1~5, 행 = 딸기·바나나·라임·자두, 마지막 행 첫 칸 = 카드 뒷면 |
| `assets/bells.svg` | 4열×2행. 열 = 1P~4P, 행0 = 평상시, 행1 = 눌림 |
| `assets/board.svg` | 배경 1장 (cover) |

칸 크기·열/행 수·파일명을 바꿨다면 `SPRITES` 의 `src/cols/rows/w/h` 를 맞춰 주세요(카드 가로세로비는 w/h 로 자동 반영). 효과음은 `sounds` 의 값을 `null`(내장 합성음) 대신 mp3/ogg 경로로 지정합니다.
수정 후에는 `sw.js` 의 `VERSION` 을 올려야 설치된 앱에 반영됩니다.

기본 스프라이트·아이콘은 `python3 tools/make_assets.py` 로 다시 만들 수 있습니다(아이콘 PNG는 playwright 필요).

## 파일
`index.html` · `css/style.css` · `js/game.js`(규칙) · `js/layout.js`(좌석 배치 계산) · `js/sound.js` · `js/assets.js` · `js/app.js` · `manifest.webmanifest` · `sw.js`
규칙/배치 검증: `node tools/test.js`
