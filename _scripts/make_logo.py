"""Personal logo for gonzalollamosas.com: folded planes on a 30-degree grid, a navy outline with a
centred diamond counterform, a magenta face on the lower left and a cyan face on the upper right.

    python3 _scripts/make_logo.py        (from the project root; the PNG files need rsvg-convert)

Writes images/logo/logo-light.svg (header), logo-dark.svg (navy footer), logo-mono.svg and
logo-mono-white.svg (one ink), logo-badge.svg and images/favicon.svg (the mark a little larger in its
square, for browser tabs), the PNG icons in images/, favicon.ico in the project root and the 1024 px
PNG of the light and dark marks. The horizontal lockups (images/logo/identidad-horizontal*) set the
name in Newsreader converted to outlines and are not written here.
"""
from math import sqrt
from pathlib import Path
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
    scale = (96 if badge else 92) / (K[1] - B[1])
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
