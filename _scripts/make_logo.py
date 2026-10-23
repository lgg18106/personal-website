"""Personal logo for gonzalollamosas.com: a roundel. A thick navy ring, a thin white line and a disc
split on the vertical and horizontal axes into four quarters, cyan and magenta on one diagonal and
white on the other.

    python3 _scripts/make_logo.py        (from the project root; standard library only)

Writes images/logo/logo-light.svg (header and Open Graph image), logo-dark.svg (the same with a thin
white outer edge, so that the ring still reads on the navy footer) and logo-badge.svg (favicon).
"""
NAVY, CYAN, MAGENTA, WHITE = "#003366", "#0099cc", "#cc0066", "#ffffff"
R_OUT, R_IN, R_DISC = 47, 36.5, 34.5     # ring from R_IN to R_OUT, white line, then the disc

def quarter(corner, colour):
    r = R_DISC
    ends = {"tl": (f"{50 - r} 50", f"50 {50 - r}"), "tr": (f"50 {50 - r}", f"{50 + r} 50"),
            "br": (f"{50 + r} 50", f"50 {50 + r}"), "bl": (f"50 {50 + r}", f"{50 - r} 50")}
    start, end = ends[corner]
    return f'<path d="M 50 50 L {start} A {r} {r} 0 0 1 {end} Z" fill="{colour}"/>'

def mark(edge=False):
    ring = (f'<circle cx="50" cy="50" r="{(R_OUT + R_IN) / 2}" fill="none" stroke="{NAVY}" '
            f'stroke-width="{R_OUT - R_IN}"/>')
    outer = f'<circle cx="50" cy="50" r="{R_OUT}" fill="none" stroke="{WHITE}" stroke-width="1.6"/>' if edge else ""
    disc = (f'<circle cx="50" cy="50" r="{R_IN}" fill="{WHITE}"/>' + quarter("tl", CYAN) + quarter("tr", WHITE) +
            quarter("br", MAGENTA) + quarter("bl", WHITE))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Gonzalo Llamosas García">'
            f'<title>Gonzalo Llamosas García</title>{ring}{outer}{disc}</svg>\n')

open("images/logo/logo-light.svg", "w").write(mark())
open("images/logo/logo-dark.svg", "w").write(mark(edge=True))
open("images/logo/logo-badge.svg", "w").write(mark())
print("images/logo/logo-light.svg, logo-dark.svg and logo-badge.svg written")
