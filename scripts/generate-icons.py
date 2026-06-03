#!/usr/bin/env python3
"""Generate favicon and PWA PNG sizes from the JF monogram master image."""

import base64
import io
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
MASTER = ROOT / "scripts" / "icon-master.png"
BRAND_BLUE = (59, 130, 246)

SIZES = {
    "pwa-64x64.png": 64,
    "pwa-192x192.png": 192,
    "pwa-512x512.png": 512,
    "apple-touch-icon-180x180.png": 180,
}


def crop_to_square(src: Image.Image) -> Image.Image:
    rgb = src.convert("RGB")
    w, h = rgb.size
    left, top, right, bottom = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = rgb.getpixel((x, y))
            if b > 200 and r < 100 and g < 180:
                left = min(left, x)
                top = min(top, y)
                right = max(right, x)
                bottom = max(bottom, y)
    cropped = rgb.crop((left, top, right + 1, bottom + 1))
    cw, ch = cropped.size
    side = max(cw, ch)
    square = Image.new("RGB", (side, side), BRAND_BLUE)
    square.paste(cropped, ((side - cw) // 2, (side - ch) // 2))
    return square


def resize_square(src: Image.Image, size: int) -> Image.Image:
    return src.resize((size, size), Image.Resampling.LANCZOS)


def make_maskable(src: Image.Image, size: int = 512, scale: float = 0.72) -> Image.Image:
    canvas = Image.new("RGB", (size, size), BRAND_BLUE)
    icon_size = int(size * scale)
    icon = resize_square(src, icon_size)
    offset = (size - icon_size) // 2
    canvas.paste(icon, (offset, offset))
    return canvas


def make_favicon_ico(src: Image.Image, dest: Path) -> None:
    images = [resize_square(src, s) for s in (16, 32, 48)]
    images[0].save(dest, format="ICO", sizes=[(s, s) for s in (16, 32, 48)])


def write_favicon_svg(src: Image.Image, dest: Path) -> None:
    png = resize_square(src, 512)
    buf = io.BytesIO()
    png.save(buf, format="PNG", optimize=True)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    dest.write_text(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\" "
        "role=\"img\" aria-label=\"JobFlow\">\n"
        f"  <image width=\"512\" height=\"512\" href=\"data:image/png;base64,{encoded}\"/>\n"
        "</svg>\n",
        encoding="utf-8",
    )


def main() -> None:
    if not MASTER.exists():
        raise SystemExit(f"Master icon not found: {MASTER}")

    master = crop_to_square(Image.open(MASTER))

    for filename, size in SIZES.items():
        out = PUBLIC / filename
        resize_square(master, size).save(out, optimize=True)
        print(f"wrote {out.name} ({size}x{size})")

    maskable_path = PUBLIC / "maskable-icon-512x512.png"
    make_maskable(master).save(maskable_path, optimize=True)
    print(f"wrote {maskable_path.name} (512x512 maskable)")

    ico_path = PUBLIC / "favicon.ico"
    make_favicon_ico(master, ico_path)
    print(f"wrote {ico_path.name}")

    github_path = PUBLIC / "github-repo-icon.png"
    resize_square(master, 512).save(github_path, optimize=True)
    print(f"wrote {github_path.name} (for GitHub repo avatar)")

    svg_path = PUBLIC / "favicon.svg"
    write_favicon_svg(master, svg_path)
    print(f"wrote {svg_path.name}")


if __name__ == "__main__":
    main()
