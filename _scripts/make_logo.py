"""Personal logo for gonzalollamosas.com: folded planes on a 30-degree grid, a navy outline with a
centred diamond counterform, a magenta face on the lower left and a cyan face on the upper right.

    python3 _scripts/make_logo.py        (from the project root; the PNG files need rsvg-convert)

Writes images/logo/logo-light.svg, logo-dark.svg (for dark backgrounds), logo-mono.svg and
logo-mono-white.svg (one ink), logo-badge.svg and images/favicon.svg (for browser tabs), the PNG icons
in images/, favicon.ico in the project root and the 1024 px PNG of the light and dark marks. The site
draws the light mark inline, in html/header.html (60 px; 50 px on phones) and html/footer.html (40 px,
on a white tile), so that the browser draws it as shapes at any zoom; this script rewrites those copies
too. Other sizes on the site should keep the vertical edges on whole pixels (see mark()). The
horizontal lockups (images/logo/identidad-horizontal*) set the name in Newsreader converted to outlines
and are not written here.
"""
from math import sqrt
from pathlib import Path
import re
import shutil
import struct
import subprocess

S = 1 / sqrt(3)                          # slope of the 30-degree edges
NAVY, CYAN, MAGENTA = "#003366", "#1488ae", "#b52b6c"
LOGO, ICONS = Path("images/logo"), Path("images")

# Outline, built from the first version of the mark, whose two opposing projections are three units
# shorter here
old_h = (40, 60 - 32 * S)
old_r = (88, old_h[1] + 48 * S)
A, B = (8, 35), (58, 35 - 50 * S)
D = (8, 60)
Q = (88, old_r[1] - 28)
T = (58, Q[1] - 30 * S)
R = (88, old_r[1] - 3)
N = (38, 60 + 30 * S)
K = (38, old_r[1] + 50 * S - 3)
CX, CY = 48, (B[1] + K[1]) / 2

# the two short vertical joins are six units, and the diamond is centred on the outline
P = (58, T[1] + 6)
I = (38, N[1] - 6)
CT, CB = P[1] + S * P[0], I[1] + S * I[0]
CR = R[1] - S * R[0]
CL = CT + CB - CR - 4 * S * CX
cross = lambda down, up: ((down - up) / (2 * S), (down + up) / 2)
L, H, J, M = cross(CT, CL), cross(CT, CR), cross(CB, CR), cross(CB, CL)
D2 = (8, CT - 8 * S)


def polygon(points):
    return "M " + " L ".join(f"{x:.6f} {y:.6f}" for x, y in points) + " Z"


def mark(navy=NAVY, cyan=CYAN, magenta=MAGENTA, mono=False, badge=False):
    outer = polygon([A, B, T, Q, R, K, N, D])
    hole = polygon([L, H, J, M])
    # one unit of the drawing per unit of the 100-unit square puts the vertical edges at x = 10, 40, 60
    # and 90, on whole pixels at 40, 50 and 60 px, so they stay sharp in the footer and the header;
    # the badge, at 35/32, fills its square and keeps the two long outer edges on whole pixels at 16,
    # 32 and 48 px, the sizes of a browser tab
    scale = 35 / 32 if badge else 1
    faces = "" if mono else (
        f'    <path fill="{magenta}" d="{polygon([D2, L, M, I, N, D])}"/>\n'
        f'    <path fill="{cyan}" d="{polygon([T, Q, R, H, P])}"/>\n')
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
        'role="img" aria-label="Gonzalo Llamosas García">\n'
        "  <title>Gonzalo Llamosas García</title>\n"
        "  <desc>Compact folded planes with a centred diamond counterform.</desc>\n"
        f'  <g transform="translate(50 50) scale({scale:.8f}) translate(-{CX} -{CY:.8f})">\n'
        f'    <path fill="{navy}" fill-rule="evenodd" d="{outer} {hole}"/>\n'
        f"{faces}"
        "  </g>\n</svg>\n")


def inline(css_class, size):
    """The light mark as inline SVG for the pages, with the drawing already moved into its square."""
    num = lambda v: f"{v:.3f}".rstrip("0").rstrip(".")
    path = lambda points: "M " + " L ".join(f"{num(x - CX + 50)} {num(y - CY + 50)}" for x, y in points) + " Z"
    return (f'<svg class="{css_class}" viewBox="0 0 100 100" width="{size}" height="{size}" '
            'aria-hidden="true" focusable="false">'
            f'<path fill="{NAVY}" fill-rule="evenodd" d="{path([A, B, T, Q, R, K, N, D])} {path([L, H, J, M])}"/>'
            f'<path fill="{MAGENTA}" d="{path([D2, L, M, I, N, D])}"/>'
            f'<path fill="{CYAN}" d="{path([T, Q, R, H, P])}"/></svg>')


def ico(sizes, out):
    """An .ico file holding the PNG icons of the given sizes."""
    pngs = [(ICONS / f"favicon-{n}.png").read_bytes() for n in sizes]
    offset, entries = 6 + 16 * len(sizes), b""
    for n, data in zip(sizes, pngs):
        entries += struct.pack("<BBBBHHII", n, n, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    Path(out).write_bytes(struct.pack("<HHH", 0, 1, len(sizes)) + entries + b"".join(pngs))


marks = {
    LOGO / "logo-light.svg": mark(),
    LOGO / "logo-dark.svg": mark("#ffffff", "#49b7d1", "#e570a4"),
    LOGO / "logo-mono.svg": mark(mono=True),
    LOGO / "logo-mono-white.svg": mark("#ffffff", mono=True),
    LOGO / "logo-badge.svg": mark(badge=True),
    ICONS / "favicon.svg": mark(badge=True),
}
for path, svg in marks.items():
    path.write_text(svg, encoding="utf-8")
for page, css_class, size in (("html/header.html", "site-logo", 60), ("html/footer.html", "footer-mark", 40)):
    html = Path(page).read_text(encoding="utf-8")
    html, n = re.subn(rf'<svg class="{css_class}".*?</svg>', inline(css_class, size), html, flags=re.S)
    assert n, f"no inline logo in {page}"
    Path(page).write_text(html, encoding="utf-8")

rsvg = shutil.which("rsvg-convert")
if rsvg:
    def png(svg, out, size, background=None):
        fill = ["-b", background] if background else []
        subprocess.run([rsvg, "-w", str(size), "-h", str(size), *fill, "-o", str(out), str(svg)], check=True)
    for name in ("logo-light", "logo-dark"):
        png(LOGO / f"{name}.svg", LOGO / f"{name}-1024.png", 1024)
    # transparent, except the Apple and app icons, which go on white
    for n in (16, 32, 48, 180, 192, 512):
        png(ICONS / "favicon.svg", ICONS / f"favicon-{n}.png", n, "#ffffff" if n in (180, 192) else None)
    ico((16, 32, 48), "favicon.ico")
    print("logo, icons and favicon.ico written")
else:
    print("SVG files written; the PNG icons and favicon.ico need rsvg-convert")
