"""Genera el sistema de identidad de Flash Campaign: SVG de logotipo, isotipo y favicon."""
import pathlib
from build_wordmark import word_paths

AZUL = "#040764"
AZUL_SEC = "#1C73CB"
TURQUESA = "#20B6B6"
BLANCO = "#FFFFFF"

OUT_BRAND = pathlib.Path("public/brand/flash-campaign")
OUT_BRAND.mkdir(parents=True, exist_ok=True)

# --- Isotipo -----------------------------------------------------------------
# Dos planos: el lienzo replicado (turquesa, detras) y el lienzo base (azul, delante)
# con el rayo que da nombre al producto.
BOLT = ("M30.6 25.2 L18.4 42.1 H25.9 L23.4 53.4 L35.6 36.0 H28.1 Z")

def isotipo(front=AZUL, back=TURQUESA, bolt=BLANCO):
    return (
        f'<rect x="18" y="6" width="40" height="40" rx="7" fill="{back}"/>'
        f'<rect x="6" y="18" width="40" height="40" rx="7" fill="{front}"/>'
        f'<path d="{BOLT}" fill="{bolt}"/>'
    )

def svg(width, height, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" role="img" aria-label="{title}">'
        f'<title>{title}</title>{body}</svg>\n'
    )

# Isotipo suelto
(OUT_BRAND / "icono_flash_campaign.svg").write_text(
    svg(64, 64, isotipo(), "Flash Campaign"), encoding="utf8")
(OUT_BRAND / "icono_flash_campaign_blanco.svg").write_text(
    svg(64, 64, isotipo(front=BLANCO, back=TURQUESA, bolt=AZUL), "Flash Campaign"), encoding="utf8")

# --- Logotipo horizontal -----------------------------------------------------
FS = 100.0
CAP = 1456 / 2048 * FS          # altura de mayuscula de Roboto SemiBold
SYM = 128.0                     # lado del isotipo en el lockup
GAP = 34.0
PAD = 10.0

def lockup(color_a, color_b, front, back, bolt):
    glyphs, adv = word_paths("Flash Campaign", FS)
    sym_y = (200 - SYM) / 2
    base_y = 100 + CAP / 2
    text_x = PAD + SYM + GAP
    total_w = text_x + adv + PAD
    parts = [f'<g transform="translate({PAD},{sym_y}) scale({SYM/64:.5f})">{isotipo(front, back, bolt)}</g>']
    parts.append(f'<g transform="translate({text_x:.2f},{base_y:.2f})">')
    for i, (d, x, scale) in enumerate(glyphs):
        fill = color_a if i < 5 else color_b
        parts.append(f'<path fill="{fill}" transform="translate({x:.2f},0) scale({scale:.5f},-{scale:.5f})" d="{d}"/>')
    parts.append("</g>")
    return round(total_w), "".join(parts)

w, body = lockup(AZUL, AZUL_SEC, AZUL, TURQUESA, BLANCO)
(OUT_BRAND / "logo_flash_campaign.svg").write_text(
    svg(w, 200, body, "Flash Campaign"), encoding="utf8")

w, body = lockup(BLANCO, "#B1F1F1", BLANCO, TURQUESA, AZUL)
(OUT_BRAND / "logo_flash_campaign_blanco.svg").write_text(
    svg(w, 200, body, "Flash Campaign"), encoding="utf8")

# --- Favicon (fondo solido para que se lea a 16 px) ---------------------------
fav = (
    f'<rect width="64" height="64" rx="10" fill="{AZUL}"/>'
    f'<rect x="30" y="10" width="24" height="24" rx="5" fill="{TURQUESA}"/>'
    f'<path d="M32.6 15.2 L20.4 34.1 H27.9 L25.4 47.4 L37.6 28.0 H30.1 Z" fill="{BLANCO}"/>'
)
pathlib.Path("public/favicon.svg").write_text(svg(64, 64, fav, "Flash Campaign"), encoding="utf8")
print("SVG de marca generados en", OUT_BRAND)
