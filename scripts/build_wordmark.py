"""Convierte el texto del logotipo Flash Campaign a trazados SVG usando Roboto."""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
import sys

SRC = "node_modules/@fontsource/roboto/files/roboto-latin-600-normal.woff2"

def word_paths(text, font_size=100.0):
    f = TTFont(SRC)
    upem = f["head"].unitsPerEm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f["hmtx"]
    scale = font_size / upem
    x = 0.0
    out = []
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            x += font_size * 0.3
            continue
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}")
        gs[gname].draw(pen)
        d = pen.getCommands()
        if d:
            out.append((d, x, scale))
        x += hmtx[gname][0] * scale
    return out, x

if __name__ == "__main__":
    text = sys.argv[1] if len(sys.argv) > 1 else "Flash Campaign"
    paths, width = word_paths(text)
    print(f"<!-- ancho total: {width:.2f} -->")
    for d, x, scale in paths:
        print(f'<path transform="translate({x:.2f},0) scale({scale:.5f},-{scale:.5f})" d="{d}"/>')
