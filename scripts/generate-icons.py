#!/usr/bin/env python3
"""Generate favicon, PWA and Android launcher/splash images from the JF monogram master image."""

import base64
import io
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
MASTER = ROOT / "scripts" / "icon-master.png"
BRAND_BLUE = (59, 130, 246)
# The PWA manifest's background_color, so the Android splash matches the web app's.
SPLASH_BACKGROUND = (248, 250, 252)
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"

# Legacy launcher icon size per density; the adaptive foreground is 108/48 of it.
ANDROID_DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
# Android keeps only the central 66/108 of an adaptive icon's foreground visible on every mask.
ADAPTIVE_SAFE_ZONE = 66 / 108
# The master's rounded square has a light anti-aliased rim. Android draws its own
# mask, so its icons use the square's interior on the interior's own blue.
ANDROID_INSET = 0.08
ANDROID_BLUE = (40, 127, 252)

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
    sizes = (16, 32, 48)
    images = [resize_square(src, s) for s in sizes]
    # PIL embeds multiple sizes only when the largest image is saved first.
    images[-1].save(
        dest,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=images[:-1],
    )


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


def make_round(src: Image.Image, size: int) -> Image.Image:
    icon = resize_square(src, size).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    icon.putalpha(mask)
    return icon


def make_adaptive_foreground(src: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon_size = int(size * ADAPTIVE_SAFE_ZONE)
    offset = (size - icon_size) // 2
    canvas.paste(resize_square(src, icon_size), (offset, offset))
    return canvas


def make_splash(src: Image.Image, width: int, height: int) -> Image.Image:
    canvas = Image.new("RGB", (width, height), SPLASH_BACKGROUND)
    icon_size = min(width, height) // 3
    mask = Image.new("L", (icon_size, icon_size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, icon_size - 1, icon_size - 1), radius=icon_size // 5, fill=255)
    canvas.paste(resize_square(src, icon_size), ((width - icon_size) // 2, (height - icon_size) // 2), mask)
    return canvas


def android_glyph(master: Image.Image) -> Image.Image:
    """The monogram on a solid square of the master's own blue, without its rounded rim."""
    side = master.size[0]
    inset = int(side * ANDROID_INSET)
    interior = master.crop((inset, inset, side - inset, side - inset))
    canvas = Image.new("RGB", master.size, ANDROID_BLUE)
    canvas.paste(interior, (inset, inset))
    return canvas


def write_android_icons(master: Image.Image) -> None:
    """Launcher icons per density, and every splash redrawn at the size the Android template uses."""
    if not ANDROID_RES.exists():
        print("skipped Android images (no android/ project)")
        return
    master = android_glyph(master)
    for density, size in ANDROID_DENSITIES.items():
        folder = ANDROID_RES / f"mipmap-{density}"
        resize_square(master, size).save(folder / "ic_launcher.png", optimize=True)
        make_round(master, size).save(folder / "ic_launcher_round.png", optimize=True)
        foreground = size * 108 // 48
        make_adaptive_foreground(master, foreground).save(folder / "ic_launcher_foreground.png", optimize=True)
    for splash in sorted(ANDROID_RES.glob("drawable*/splash.png")):
        width, height = Image.open(splash).size
        make_splash(master, width, height).save(splash, optimize=True)
    (ANDROID_RES / "values" / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        '    <color name="ic_launcher_background">#%02X%02X%02X</color>\n</resources>\n' % ANDROID_BLUE,
        encoding="utf-8",
    )
    print("wrote Android launcher icons and splash screens")


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

    write_android_icons(master)


if __name__ == "__main__":
    main()
