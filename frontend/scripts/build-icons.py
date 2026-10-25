"""Build all To Do Map app icons from one source of truth.

Outputs
  public/icon.png   512x512  rendered from public/icon.svg (top bar, manifest, apple-icon)
  app/favicon.ico   16/32/48 16 + 32 are hand-hinted pixel art, 48 is rendered from the SVG

Why hand-hinted small sizes: three checkboxes with check marks cannot be resolved
at 16 px. Small sizes therefore use: filled box = done, outlined box = open.

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

BLACK = (0, 0, 0, 255)
WHITE = (255, 255, 255, 255)


def render_svg(px: int) -> Image.Image:
    data = cairosvg.svg2png(url=str(SVG), output_width=px, output_height=px)
    return Image.open(io.BytesIO(data)).convert("RGBA")


def pixel_icon(size: int, box: int, gap: int, ring: int, bar_h: int, bar_gap: int, x0: int) -> Image.Image:
    """Grid-aligned checklist: rows 0,1 done (filled), row 2 open (ring)."""
    img = Image.new("RGBA", (size, size), WHITE)
    px = img.load()
    total = 3 * box + 2 * gap
    y0 = (size - total) // 2
    bar_x0 = x0 + box + bar_gap
    bar_x1 = size - x0  # exclusive, mirrors left margin
    for r in range(3):
        top = y0 + r * (box + gap)
        for y in range(top, top + box):
            for x in range(x0, x0 + box):
                edge = min(x - x0, x0 + box - 1 - x, y - top, top + box - 1 - y)
                corner = (x in (x0, x0 + box - 1)) and (y in (top, top + box - 1))
                if corner and box >= 6:
                    continue  # rounded corners only where there is room
                if r < 2 or edge < ring:
                    px[x, y] = BLACK
        bar_top = top + (box - bar_h) // 2
        for y in range(bar_top, bar_top + bar_h):
            for x in range(bar_x0, bar_x1):
                px[x, y] = BLACK
    return img


def main() -> int:
    big = render_svg(512)
    big.save(PNG, optimize=True)

    ico16 = pixel_icon(16, box=4, gap=1, ring=1, bar_h=2, bar_gap=2, x0=2)
    ico32 = pixel_icon(32, box=8, gap=3, ring=2, bar_h=4, bar_gap=4, x0=4)
    ico48 = render_svg(48)
    ico48.save(ICO, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[ico16, ico32])

    # sanity checks
    assert Image.open(PNG).size == (512, 512)
    assert Image.open(ICO).info["sizes"] == {(16, 16), (32, 32), (48, 48)}
    print(f"wrote {PNG.relative_to(ROOT)} and {ICO.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
