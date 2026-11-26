"""Personal logo for gonzalollamosas.com: folded planes, a navy outline with a centred diamond
counterform, a magenta face on the lower left and a cyan face on the upper right.

    python3 _scripts/make_logo.py        (from the project root; the PNG files need rsvg-convert)

The diagonals run two units across for one down, the slope of isometric pixel art, and every corner
sits on a grid of 5 units in a 100-unit square, the mark filling the square from 10 to 90. Wherever 5
units make whole pixels (the mark alone at 16, 32 or 48 px, or the 100-unit square at 40, 60 or
180 px), every edge lands on the pixel grid and the diagonals step evenly, so the mark stays sharp on
low-resolution screens too.

Writes images/logo/logo-light.svg, logo-dark.svg (for dark backgrounds), logo-mono.svg and
logo-mono-white.svg (one ink), all in the 100-unit square; logo-badge.svg and images/favicon.svg (the
mark alone, edge to edge, for browser tabs); the PNG icons in images/, favicon.ico in the project root
and the 1024 px PNG of the light and dark marks. It also puts the mark in the horizontal lockups
(images/logo/identidad-horizontal*), which keep the name, set in Newsreader and converted to outlines,
and in html/header.html (48 px) and html/footer.html (32 px, on a white tile), where the site draws it
inline so that the browser draws it as shapes at any zoom. images/og-image.png carries the mark too and
is not written here.
"""
from pathlib import Path
import re
import shutil
import struct
import subprocess

NAVY, CYAN, MAGENTA = "#003366", "#1488ae", "#b52b6c"
LOGO, ICONS = Path("images/logo"), Path("images")
SQUARE, MARK = "0 0 100 100", "10 10 80 80"     # the mark with its margin, and the mark alone

OUTLINE = [(10, 35), (60, 10), (60, 25), (90, 40), (90, 65), (40, 90), (40, 75), (10, 60)]
HOLE = [(30, 45), (40, 40), (70, 55), (60, 60)]
MAGENTA_FACE = [(10, 55), (30, 45), (60, 60), (40, 70), (40, 75), (10, 60)]
CYAN_FACE = [(60, 25), (90, 40), (90, 65), (40, 40), (60, 30)]


def path(points):
    return "M " + " L ".join(f"{x} {y}" for x, y in points) + " Z"


def shapes(navy=NAVY, cyan=CYAN, magenta=MAGENTA, mono=False):
    out = f'<path fill="{navy}" fill-rule="evenodd" d="{path(OUTLINE)} {path(HOLE)}"/>'
    if not mono:
        out += f'<path fill="{magenta}" d="{path(MAGENTA_FACE)}"/><path fill="{cyan}" d="{path(CYAN_FACE)}"/>'
    return out


def mark(view=SQUARE, **colours):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" role="img" '
            'aria-label="Gonzalo Llamosas García">\n'
            "  <title>Gonzalo Llamosas García</title>\n"
            "  <desc>Folded planes with a centred diamond counterform.</desc>\n"
            f"  {shapes(**colours)}\n</svg>\n")


def inline(css_class, size):
    """The mark alone as inline SVG for the pages."""
    return (f'<svg class="{css_class}" viewBox="{MARK}" width="{size}" height="{size}" '
            f'aria-hidden="true" focusable="false">{shapes()}</svg>')


def ico(sizes, out):
    """An .ico file holding the PNG icons of the given sizes."""
    pngs = [(ICONS / f"favicon-{n}.png").read_bytes() for n in sizes]
    offset, entries = 6 + 16 * len(sizes), b""
    for n, data in zip(sizes, pngs):
        entries += struct.pack("<BBBBHHII", n, n, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    Path(out).write_bytes(struct.pack("<HHH", 0, 1, len(sizes)) + entries + b"".join(pngs))


DARK = dict(navy="#ffffff", cyan="#49b7d1", magenta="#e570a4")
files = {
    LOGO / "logo-light.svg": mark(),
    LOGO / "logo-dark.svg": mark(**DARK),
    LOGO / "logo-mono.svg": mark(mono=True),
    LOGO / "logo-mono-white.svg": mark(navy="#ffffff", mono=True),
    LOGO / "logo-badge.svg": mark(MARK),
    ICONS / "favicon.svg": mark(MARK),
}
for file, svg in files.items():
    file.write_text(svg, encoding="utf-8")

# the lockups keep their name and take the mark at the height the first one had there, 92 units
for name, colours in (("identidad-horizontal", {}), ("identidad-horizontal-oscura", DARK)):
    file = LOGO / f"{name}.svg"
    if file.exists():
        group = f'<g transform="translate(50 50) scale(1.15) translate(-50 -50)">{shapes(**colours)}</g>'
        svg, n = re.subn(r'<g[^>]*>\s*<path fill="[^"]*" fill-rule="evenodd".*?</g>', group,
                         file.read_text(encoding="utf-8"), count=1, flags=re.S)
        assert n, f"no mark in {file}"
        file.write_text(svg, encoding="utf-8")

for page, css_class, size in (("html/header.html", "site-logo", 48), ("html/footer.html", "footer-mark", 32)):
    html = Path(page).read_text(encoding="utf-8")
    html, n = re.subn(rf'<svg class="{css_class}".*?</svg>', inline(css_class, size), html, flags=re.S)
    assert n, f"no inline logo in {page}"
    Path(page).write_text(html, encoding="utf-8")

rsvg = shutil.which("rsvg-convert")
if rsvg:
    def png(svg, out, width, height=None, background=None):
        fill = ["-b", background] if background else []
        size = ["-w", str(width)] + (["-h", str(height)] if height else [])
        subprocess.run([rsvg, *size, *fill, "-o", str(out), str(svg)], check=True)
    for name in ("logo-light", "logo-dark"):
        png(LOGO / f"{name}.svg", LOGO / f"{name}-1024.png", 1024, 1024)
    png(LOGO / "identidad-horizontal.svg", LOGO / "identidad-horizontal-2400.png", 2400)
    # tab icons edge to edge and transparent; the Apple and app icons keep the margin and go on white
    for n in (16, 32, 48, 512):
        png(ICONS / "favicon.svg", ICONS / f"favicon-{n}.png", n, n)
    for n in (180, 192):
        png(LOGO / "logo-light.svg", ICONS / f"favicon-{n}.png", n, n, "#ffffff")
    ico((16, 32, 48), "favicon.ico")
    print("logo, lockups, icons and favicon.ico written")
else:
    print("SVG files written; the PNG files and favicon.ico need rsvg-convert")
