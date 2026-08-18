"""Extrae el logotipo oficial de Zurich desde el brandbook entregado en Info-Zurich."""
import io, pathlib
import numpy as np
import pymupdf
from PIL import Image

PDF = "Info-Zurich/Manual-Marca/Brandbook Zurich 2024.pdf"
OUT = pathlib.Path("public/brand/zurich"); OUT.mkdir(parents=True, exist_ok=True)
AZUL = (33, 103, 174)   # #2167AE

def crop(page_index, fx0, fy0, fx1, fy1, dpi=900):
    doc = pymupdf.open(PDF)
    page = doc[page_index]
    r = page.rect
    clip = pymupdf.Rect(r.width * fx0, r.height * fy0, r.width * fx1, r.height * fy1)
    pix = page.get_pixmap(dpi=dpi, clip=clip)
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")

def to_alpha(img: Image.Image, ink=AZUL) -> Image.Image:
    """Separa el trazo del fondo blanco resolviendo la cobertura real de cada pixel.

    El PDF compone el logotipo como tinta sobre blanco, asi que la cobertura se
    despeja canal a canal: a = (255 - c) / (255 - tinta). Se toma el maximo para
    conservar los bordes suavizados sin aclarar el color oficial.
    """
    arr = np.asarray(img).astype(np.float32)
    ink_arr = np.array(ink, dtype=np.float32)
    denom = np.maximum(255.0 - ink_arr, 1.0)
    cover = (255.0 - arr) / denom
    alpha = np.clip(cover.max(axis=2), 0.0, 1.0)
    alpha[alpha < 0.02] = 0.0
    out = np.zeros((img.height, img.width, 4), dtype=np.uint8)
    out[..., 0] = ink[0]; out[..., 1] = ink[1]; out[..., 2] = ink[2]
    out[..., 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def recolor(img: Image.Image, ink):
    arr = np.asarray(img).copy()
    arr[..., 0] = ink[0]; arr[..., 1] = ink[1]; arr[..., 2] = ink[2]
    return Image.fromarray(arr, "RGBA")

def trim(img: Image.Image, pad=6):
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad); y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))

# Logotipo horizontal (pie de pagina del brandbook, version vectorial limpia)
horiz = trim(to_alpha(crop(3, 0.822, 0.020, 0.960, 0.078)))
horiz.save(OUT / "zurich_logo_horizontal.png")
recolor(horiz, (255, 255, 255)).save(OUT / "zurich_logo_horizontal_blanco.png")

# Z sonriente (isotipo)
iso = trim(to_alpha(crop(3, 0.614, 0.700, 0.685, 0.845)))
iso.save(OUT / "zurich_isotipo.png")
recolor(iso, (255, 255, 255)).save(OUT / "zurich_isotipo_blanco.png")

for f in sorted(OUT.glob("*.png")):
    print(f, Image.open(f).size)
