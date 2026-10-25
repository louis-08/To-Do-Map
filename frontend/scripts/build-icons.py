"""Build all To Do Map app icons from one source of truth: public/icon.svg.

Outputs
  public/icon.png   512x512  full icon with padding (top bar, manifest, apple-icon)
  app/favicon.ico   16/32/48 tighter crop of the same SVG, so the glyph fills the
                             tiny browser-tab square instead of wasting it on padding

Usage (from frontend/):  pip install cairosvg pillow && python3 scripts/build-icons.py
"""
import io
import sys
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SVG = ROOT / "public" / "icon.svg"
PNG = ROOT / "public" / "icon.png"
ICO = ROOT / "app" / "favicon.ico"

FULL_VIEWBOX = 'viewBox="0 0 512 512"'
# Glyph spans x 96..416, y ~126..386 in the 512 canvas. A 400 px crop centred on
# 256 leaves 40 px margin, so the glyph fills 80 % of the favicon width.
FAVICON_VIEWBOX = 'viewBox="56 56 400 400"'


def render(svg_text: str, px: int) -> Image.Image:
    data = cairosvg.svg2png(bytestring=svg_text.encode(), output_width=px, output_height=px)
    return Image.open(io.BytesIO(data)).convert("RGBA")


def main() -> int:
    src = SVG.read_text()
    assert FULL_VIEWBOX in src, "icon.svg must use a 512x512 viewBox"

    render(src, 512).save(PNG, optimize=True)

    fav = src.replace(FULL_VIEWBOX, FAVICON_VIEWBOX)
    frames = {s: render(fav, s) for s in (16, 32, 48)}
    frames[48].save(ICO, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)],
                    append_images=[frames[16], frames[32]])

    # sanity checks
    assert Image.open(PNG).size == (512, 512)
    assert Image.open(ICO).info["sizes"] == {(16, 16), (32, 32), (48, 48)}
    print(f"wrote {PNG.relative_to(ROOT)} and {ICO.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
