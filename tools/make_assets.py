#!/usr/bin/env python3
"""기본 스프라이트(SVG)와 PWA 아이콘 생성기.
   python3 tools/make_assets.py  → assets/cards.svg, bells.svg, board.svg, icon.svg (+ PNG 아이콘은 playwright 사용)
   스프라이트를 직접 그린 이미지로 바꿀 때는 같은 격자 규격으로 assets/ 의 파일을 덮어쓰면 된다.
"""
import os, sys, math

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
os.makedirs(OUT, exist_ok=True)

CW, CH = 240, 336          # 카드 한 칸
COLS, ROWS = 5, 5          # 열: 과일 개수 1~5 / 행: 딸기·바나나·라임·자두·(뒷면)

# ---------- 과일 아이콘 (중심 0,0 / 100x100 박스) ----------
def strawberry():
    seeds = ''.join(
        f'<ellipse cx="{x}" cy="{y}" rx="2.6" ry="3.8" fill="#ffe28a" transform="rotate({r} {x} {y})"/>'
        for x, y, r in [(-18, -8, 15), (0, -12, 0), (18, -8, -15), (-26, 8, 25), (-9, 5, 8), (9, 5, -8),
                        (26, 8, -25), (-16, 22, 18), (0, 18, 0), (16, 22, -18), (0, 32, 0)])
    return ('<path d="M0,46 C-30,36 -46,10 -41,-14 C-37,-34 -14,-40 0,-30 C14,-40 37,-34 41,-14 C46,10 30,36 0,46 Z" '
            'fill="#e5383b" stroke="#8d0f14" stroke-width="3"/>'
            '<path d="M-24,-22 C-30,-6 -26,8 -20,16" fill="none" stroke="#ff8a8c" stroke-width="5" stroke-linecap="round" opacity=".7"/>'
            + seeds +
            '<path d="M0,-30 L-14,-44 L-6,-34 L-22,-36 L-8,-28 L-14,-20 L0,-26 L14,-20 L8,-28 L22,-36 L6,-34 L14,-44 Z" '
            'fill="#38b000" stroke="#1f6b00" stroke-width="2.5" stroke-linejoin="round"/>')

def banana():
    return ('<path d="M-44,-24 C-52,16 -16,50 42,34 C50,32 52,22 44,20 C8,24 -16,2 -22,-28 Z" '
            'fill="#ffd60a" stroke="#a87c00" stroke-width="3" stroke-linejoin="round"/>'
            '<path d="M-36,-12 C-34,12 -10,32 28,30" fill="none" stroke="#fff3a0" stroke-width="5" stroke-linecap="round" opacity=".8"/>'
            '<path d="M-44,-24 L-22,-28 L-24,-40 L-42,-38 Z" fill="#7a5a14" stroke="#4d3808" stroke-width="2.5" stroke-linejoin="round"/>'
            '<ellipse cx="44" cy="27" rx="4.5" ry="3.2" fill="#4d3808"/>')

def lime():
    wedges = ''
    for i in range(8):
        a = math.radians(i * 45 + 22.5)
        wedges += f'<line x1="{6*math.cos(a):.1f}" y1="{6*math.sin(a):.1f}" x2="{31*math.cos(a):.1f}" y2="{31*math.sin(a):.1f}" stroke="#f3fbd0" stroke-width="3.2" stroke-linecap="round"/>'
    return ('<circle r="44" fill="#3f8f12" stroke="#235c05" stroke-width="3"/>'
            '<circle r="37" fill="#b7e35a"/>'
            '<circle r="33" fill="#d9f27f"/>' + wedges +
            '<circle r="5" fill="#f3fbd0"/>')

def plum():
    return ('<circle r="42" cy="4" fill="#6a2c91" stroke="#3d1459" stroke-width="3"/>'
            '<path d="M0,-34 C-6,-14 -6,14 0,46" fill="none" stroke="#3d1459" stroke-width="2.5" opacity=".55"/>'
            '<ellipse cx="-17" cy="-10" rx="9" ry="14" fill="#b57ede" opacity=".6" transform="rotate(25 -17 -10)"/>'
            '<path d="M0,-36 C2,-44 4,-48 8,-52" fill="none" stroke="#6b4a1a" stroke-width="4" stroke-linecap="round"/>'
            '<path d="M6,-46 C16,-56 30,-52 32,-44 C22,-38 12,-40 6,-46 Z" fill="#38b000" stroke="#1f6b00" stroke-width="2.5" stroke-linejoin="round"/>')

FRUIT = [strawberry, banana, lime, plum]
FRUIT_COLOR = ['#c1121f', '#d4a000', '#3a8a0f', '#5b2380']

# 카드 위 과일 배치 (x, y, scale, rotate)
LAYOUT = {
    1: [(120, 168, 1.35, -8)],
    2: [(88, 104, 1.0, -14), (152, 236, 1.0, 12)],
    3: [(120, 80, 0.9, -8), (70, 236, 0.9, 10), (170, 232, 0.9, -12)],
    4: [(72, 90, 0.82, -10), (168, 94, 0.82, 12), (70, 244, 0.82, 8), (170, 246, 0.82, -10)],
    5: [(68, 76, 0.72, -12), (172, 80, 0.72, 10), (120, 168, 0.72, 0), (68, 260, 0.72, 8), (172, 258, 0.72, -10)],
}

def card_face(f, n):
    parts = [f'<rect x="6" y="6" width="{CW-12}" height="{CH-12}" rx="24" fill="#fffaf0" stroke="{FRUIT_COLOR[f]}" stroke-width="6"/>',
             f'<rect x="16" y="16" width="{CW-32}" height="{CH-32}" rx="16" fill="none" stroke="{FRUIT_COLOR[f]}" stroke-width="1.5" opacity=".35"/>']
    for x, y, s, r in LAYOUT[n]:
        parts.append(f'<g transform="translate({x} {y}) rotate({r}) scale({s})">{FRUIT[f]()}</g>')
    return ''.join(parts)

def cards_svg():
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{CW*COLS}" height="{CH*ROWS}" viewBox="0 0 {CW*COLS} {CH*ROWS}">']
    for f in range(4):
        for n in range(1, 6):
            out.append(f'<g transform="translate({(n-1)*CW} {f*CH})">{card_face(f, n)}</g>')
    # 4행 0열: 카드 뒷면 (격자 선이 넘치지 않도록 clipPath)
    out.append(f'<defs><clipPath id="bk"><rect x="22" y="22" width="{CW-44}" height="{CH-44}" rx="14"/></clipPath></defs>')
    # 격자 path 들만 clip 하기 위해 간단히 전체를 감싸되, 바깥 테두리는 clip 영역 밖이라 별도 그룹으로 분리
    out.append(f'<g transform="translate(0 {4*CH})">')
    out.append(f'<rect x="6" y="6" width="{CW-12}" height="{CH-12}" rx="24" fill="#1d3557" stroke="#f1faee" stroke-width="6"/>')
    out.append(f'<rect x="22" y="22" width="{CW-44}" height="{CH-44}" rx="14" fill="#264b7a" stroke="#a8dadc" stroke-width="2"/>')
    out.append('<g clip-path="url(#bk)">')
    for i in range(-8, 12):
        x0 = 22 + i * 36
        out.append(f'<path d="M{x0},{CH-22} L{x0+(CH-44)},22" stroke="#a8dadc" stroke-width="1.4" opacity=".35"/>')
        out.append(f'<path d="M{x0},22 L{x0+(CH-44)},{CH-22}" stroke="#a8dadc" stroke-width="1.4" opacity=".35"/>')
    out.append('</g>')
    cx, cy = CW / 2, CH / 2
    out.append(f'<circle cx="{cx}" cy="{cy}" r="52" fill="#fffaf0" stroke="#f1faee" stroke-width="4"/>')
    for k, c in enumerate(['#e5383b', '#ffd60a', '#7ac70c', '#6a2c91']):
        a = math.radians(k * 90 - 135)
        out.append(f'<circle cx="{cx+22*math.cos(a):.1f}" cy="{cy+22*math.sin(a):.1f}" r="17" fill="{c}" stroke="#222" stroke-opacity=".35" stroke-width="2"/>')
    out.append('</g>')
    out.append('</svg>')
    return '\n'.join(out)

# ---------- 벨 (4열: 플레이어, 2행: 기본/눌림) ----------
BELL = 200
PLAYER_COLORS = ['#ef476f', '#118ab2', '#06d6a0', '#ff9f1c']

def bell_cell(i, pressed, color):
    cid = f'b{i}{int(pressed)}'
    k = 0.86 if pressed else 1.0
    knob = 17 if pressed else 22
    shadow = 4 if pressed else 9
    return (f'<defs><radialGradient id="{cid}" cx="38%" cy="32%" r="80%">'
            f'<stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".25" stop-color="{color}"/>'
            f'<stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>'
            f'<radialGradient id="{cid}k" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#d9d9d9"/><stop offset="1" stop-color="#777"/></radialGradient></defs>'
            f'<g transform="translate(100 100)">'
            f'<ellipse cx="0" cy="{shadow}" rx="92" ry="92" fill="#000" opacity=".28"/>'
            f'<circle r="90" fill="#2a2a2a"/>'
            f'<circle r="{82*k:.1f}" fill="{color}"/>'
            f'<circle r="{82*k:.1f}" fill="url(#{cid})"/>'
            f'<circle r="{56*k:.1f}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/>'
            f'<circle r="{knob+8}" fill="#3a3a3a"/>'
            f'<circle r="{knob}" fill="url(#{cid}k)" stroke="#555" stroke-width="2"/>'
            f'<path d="M-60,-36 A70,70 0 0 1 -24,-64" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".6"/>'
            f'</g>')

def bells_svg():
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{BELL*4}" height="{BELL*2}" viewBox="0 0 {BELL*4} {BELL*2}">']
    for r in range(2):
        for c in range(4):
            out.append(f'<g transform="translate({c*BELL} {r*BELL})">{bell_cell(c, bool(r), PLAYER_COLORS[c])}</g>')
    out.append('</svg>')
    return '\n'.join(out)

# ---------- 보드(배경) ----------
def board_svg():
    S = 1200
    dots = ''.join(f'<circle cx="{x}" cy="{y}" r="2" fill="#fff" opacity=".06"/>' for x in range(30, S, 60) for y in range(30, S, 60))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}">'
            '<defs><radialGradient id="g" cx="50%" cy="50%" r="75%"><stop offset="0" stop-color="#2f8f6a"/>'
            '<stop offset=".6" stop-color="#1d6a4e"/><stop offset="1" stop-color="#0d3b2c"/></radialGradient></defs>'
            f'<rect width="{S}" height="{S}" fill="url(#g)"/>' + dots +
            f'<circle cx="{S/2}" cy="{S/2}" r="470" fill="none" stroke="#f4d58d" stroke-opacity=".28" stroke-width="6"/>'
            f'<circle cx="{S/2}" cy="{S/2}" r="440" fill="none" stroke="#f4d58d" stroke-opacity=".16" stroke-width="2"/>'
            f'<circle cx="{S/2}" cy="{S/2}" r="150" fill="none" stroke="#f4d58d" stroke-opacity=".18" stroke-width="4"/>'
            '</svg>')

# ---------- 앱 아이콘 ----------
def icon_svg(maskable=False):
    pad = 0 if maskable else 0
    r = 0 if maskable else 112
    scale = 0.74 if maskable else 1.0
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'
            '<defs><radialGradient id="bg" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#2f8f6a"/><stop offset="1" stop-color="#0d3b2c"/></radialGradient>'
            '<radialGradient id="bl" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#fff6c2"/><stop offset=".35" stop-color="#ffd23f"/><stop offset="1" stop-color="#b8860b"/></radialGradient></defs>'
            f'<rect width="512" height="512" rx="{r}" fill="url(#bg)"/>'
            f'<g transform="translate(256 256) scale({scale}) translate(-256 -256)">'
            '<circle cx="150" cy="150" r="46" fill="#e5383b" stroke="#8d0f14" stroke-width="6"/>'
            '<circle cx="362" cy="150" r="46" fill="#ffd60a" stroke="#a87c00" stroke-width="6"/>'
            '<circle cx="150" cy="362" r="46" fill="#7ac70c" stroke="#3a6a00" stroke-width="6"/>'
            '<circle cx="362" cy="362" r="46" fill="#6a2c91" stroke="#3d1459" stroke-width="6"/>'
            '<ellipse cx="256" cy="300" rx="118" ry="22" fill="#000" opacity=".3"/>'
            '<path d="M138,290 C138,196 188,150 256,150 C324,150 374,196 374,290 Z" fill="url(#bl)" stroke="#7a5a00" stroke-width="8" stroke-linejoin="round"/>'
            '<rect x="124" y="286" width="264" height="26" rx="13" fill="#e0a800" stroke="#7a5a00" stroke-width="8"/>'
            '<circle cx="256" cy="136" r="16" fill="#ffd23f" stroke="#7a5a00" stroke-width="7"/>'
            '<path d="M190,232 C196,200 216,182 240,176" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=".7"/>'
            '</g></svg>')

def write(name, data):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as fh:
        fh.write(data)
    print('wrote', name)

write('cards.svg', cards_svg())
write('bells.svg', bells_svg())
write('board.svg', board_svg())
write('icon.svg', icon_svg(False))
write('icon-maskable.svg', icon_svg(True))

# PNG 아이콘 (headless chromium)
try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, svg, size in [('icon-192.png', 'icon.svg', 192), ('icon-512.png', 'icon.svg', 512),
                                ('icon-maskable-512.png', 'icon-maskable.svg', 512), ('apple-touch-icon.png', 'icon-maskable.svg', 180)]:
            ctx = b.new_context(viewport={'width': 512, 'height': 512}, device_scale_factor=size / 512)
            pg = ctx.new_page()
            pg.goto('file://' + os.path.abspath(os.path.join(OUT, svg)))
            pg.screenshot(path=os.path.join(OUT, name), omit_background=True)
            ctx.close()
            print('wrote', name)
        b.close()
except Exception as e:
    print('PNG 아이콘 생성 실패:', e, file=sys.stderr)
