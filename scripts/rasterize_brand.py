"""Rasteriza los SVG de marca a PNG transparentes e ICO multirresolucion reales."""
import io, pathlib
import pymupdf
from PIL import Image

BRAND = pathlib.Path("public/brand/flash-campaign")
DOCS = pathlib.Path("docs/marca"); DOCS.mkdir(parents=True, exist_ok=True)
PUB = pathlib.Path("public")

def render(svg_path: pathlib.Path, width: int) -> Image.Image:
    doc = pymupdf.open(str(svg_path))
    page = doc[0]
    zoom = width / page.rect.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=True)
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGBA")

# Logotipo horizontal en alta resolucion, fondo transparente
for name in ("logo_flash_campaign", "logo_flash_campaign_blanco"):
    img = render(BRAND / f"{name}.svg", 2400)
    img.save(DOCS / f"{name}.png")
    print(name, img.size)

# Icono 1000 x 1000 para uso audiovisual
icon = render(BRAND / "icono_flash_campaign.svg", 1000)
icon.save(DOCS / "icono_flash_campaign_1000x1000.png")
icon.save(PUB / "icono_flash_campaign_1000x1000.png")
print("icono 1000", icon.size)

# ICO multirresolucion real, a partir del favicon con fondo solido
fav = render(PUB / "favicon.svg", 256)
sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
fav.save(DOCS / "icono_flash_campaign.ico", format="ICO", sizes=sizes)
fav.save(PUB / "favicon.ico", format="ICO", sizes=sizes)
fav.resize((180, 180), Image.LANCZOS).save(PUB / "apple-touch-icon.png")
fav.resize((512, 512), Image.LANCZOS).save(PUB / "icono_flash_campaign_512.png")
fav.resize((192, 192), Image.LANCZOS).save(PUB / "icono_flash_campaign_192.png")
print("ICO y PNG de sistema listos")
