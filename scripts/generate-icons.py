#!/usr/bin/env python3
"""Generate favicon and PWA PNG sizes from the JF monogram master image."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
MASTER = Path(
    "/home/jk/.cursor/projects/home-jk-projects-JobFlowTracker/assets/icon-option-2-jf-monogram.png"
)

SIZES = {
    "pwa-64x64.png": 64,
    "pwa-192x192.png": 192,
    "pwa-512x512.png": 512,
    "apple-touch-icon-180x180.png": 180,
}


def resize_square(src: Image.Image, size: int) -> Image.Image:
    return src.resize((size, size), Image.Resampling.LANCZOS)


def make_maskable(src: Image.Image, size: int = 512, scale: float = 0.72) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (59, 130, 246, 255))
    icon_size = int(size * scale)
    icon = resize_square(src, icon_size)
    offset = (size - icon_size) // 2
    canvas.paste(icon, (offset, offset), icon if icon.mode == "RGBA" else None)
    return canvas.convert("RGB")


def make_favicon_ico(src: Image.Image, dest: Path) -> None:
    images = [resize_square(src, s) for s in (16, 32, 48)]
    images[0].save(dest, format="ICO", sizes=[(s, s) for s in (16, 32, 48)])


def main() -> None:
    if not MASTER.exists():
        raise SystemExit(f"Master icon not found: {MASTER}")

    master = Image.open(MASTER).convert("RGBA")

    for filename, size in SIZES.items():
        out = PUBLIC / filename
        resize_square(master, size).convert("RGB").save(out, optimize=True)
        print(f"wrote {out.name} ({size}x{size})")

    maskable = make_maskable(master)
    maskable_path = PUBLIC / "maskable-icon-512x512.png"
    maskable.save(maskable_path, optimize=True)
    print(f"wrote {maskable_path.name} (512x512 maskable)")

    ico_path = PUBLIC / "favicon.ico"
    make_favicon_ico(master, ico_path)
    print(f"wrote {ico_path.name}")

    github_path = PUBLIC / "github-repo-icon.png"
    resize_square(master, 512).convert("RGB").save(github_path, optimize=True)
    print(f"wrote {github_path.name} (for GitHub repo avatar)")


if __name__ == "__main__":
    main()
