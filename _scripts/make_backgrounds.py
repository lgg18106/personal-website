"""Background art for gonzalollamosas.com: navy field, faint grid and one fan chart of the
cross-country distribution of the debt-to-GDP ratio in the EU-27, 1996-2024 (median line,
interquartile band and 10th-90th percentile band).

Data: debt_gdp (AMECO) in the panel of the fiscal-consolidation paper
(PAPER_v2_Economic_Modelling/data/fiscal_panel_v2.csv); percentiles across countries by
year, linear interpolation; 25-26 countries in 1996-1999, 27 afterwards.

    python3 _scripts/make_backgrounds.py      (from the project root; standard library only)
"""
NAVY, NAVY_DARK, CYAN, MAGENTA = "#003366", "#00284f", "#0099cc", "#cc0066"

YEARS = list(range(1996, 2025))
P10 = [11.0, 11.5, 11.6, 13.8, 15.1, 19.2, 18.7, 18.1, 17.2, 14.5, 11.7, 10.7, 13.9, 19.2, 25.0,
       26.8, 29.6, 31.6, 34.3, 33.0, 33.4, 30.3, 27.9, 26.7, 31.9, 31.8, 30.3, 29.0, 29.2]
P25 = [21.6, 22.7, 22.7, 25.1, 30.8, 30.0, 29.3, 28.9, 28.2, 26.6, 24.9, 23.4, 25.0, 35.7, 38.6,
       41.3, 43.9, 43.0, 44.4, 43.4, 41.7, 40.2, 38.4, 36.8, 46.1, 44.6, 42.8, 42.9, 42.1]
P50 = [55.4, 56.8, 53.5, 56.0, 52.2, 51.4, 49.8, 47.7, 45.3, 42.4, 40.2, 37.1, 39.6, 49.7, 56.8,
       61.2, 65.6, 67.2, 67.2, 68.8, 68.3, 64.0, 60.8, 55.9, 58.4, 60.2, 57.7, 55.6, 57.6]
P75 = [69.3, 64.2, 62.7, 61.3, 59.5, 58.7, 60.6, 64.2, 65.7, 67.7, 65.0, 64.6, 67.3, 75.3, 82.3,
       81.9, 86.6, 97.3, 98.7, 91.3, 90.8, 87.8, 86.6, 81.6, 98.9, 89.4, 79.7, 78.0, 81.9]
P90 = [90.8, 99.4, 84.1, 89.1, 85.9, 83.6, 82.6, 82.1, 81.6, 81.4, 80.8, 78.5, 82.6, 92.5, 100.0,
       111.3, 121.6, 122.8, 120.6, 119.4, 116.6, 111.9, 108.9, 105.3, 125.2, 119.0, 111.3, 107.0, 108.0]

def smooth(pts):
    """Catmull-Rom through pts as SVG cubic segments (without the initial M)."""
    d = []
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i else pts[i]; p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else pts[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f"C {c1[0]:.1f} {c1[1]:.1f}, {c2[0]:.1f} {c2[1]:.1f}, {p2[0]:.1f} {p2[1]:.1f}")
    return " ".join(d)

def art(w, h, box, veil, grid=40, strength=1.0):
    x0, x1, y_top, y_bot = box
    sx = lambda i: x0 + (x1 - x0) * i / (len(YEARS) - 1)
    sy = lambda v: y_bot - (y_bot - y_top) * (v - 0) / 130          # value range 0 .. 130
    pts = lambda series: [(sx(i), sy(v)) for i, v in enumerate(series)]
    def band(lo, hi, opacity):
        up, dn = pts(hi), pts(lo)[::-1]
        return (f'<path d="M {up[0][0]:.1f} {up[0][1]:.1f} {smooth(up)} L {dn[0][0]:.1f} {dn[0][1]:.1f} {smooth(dn)} Z" '
                f'fill="{CYAN}" fill-opacity="{opacity * strength:.3f}"/>')
    med = pts(P50)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid slice">',
           '<defs>'
           f'<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{NAVY}"/>'
           f'<stop offset="1" stop-color="{NAVY_DARK}"/></linearGradient>'
           f'<linearGradient id="veil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{NAVY}" stop-opacity="1"/>'
           f'<stop offset="{veil[0]}" stop-color="{NAVY}" stop-opacity="0.9"/>'
           f'<stop offset="{veil[1]}" stop-color="{NAVY}" stop-opacity="0"/></linearGradient></defs>',
           f'<rect width="{w}" height="{h}" fill="url(#bg)"/>',
           f'<g stroke="#ffffff" stroke-opacity="{0.04 * strength:.3f}" stroke-width="1">']
    out += [f'<line x1="{x}" y1="0" x2="{x}" y2="{h}"/>' for x in range(0, w + 1, grid)]
    out += [f'<line x1="0" y1="{y}" x2="{w}" y2="{y}"/>' for y in range(0, h + 1, grid)]
    out.append("</g>")
    out.append(band(P10, P90, 0.10))
    out.append(band(P25, P75, 0.16))
    out.append(f'<path d="M {med[0][0]:.1f} {med[0][1]:.1f} {smooth(med)}" fill="none" stroke="#ffffff" '
               f'stroke-opacity="{0.6 * strength:.3f}" stroke-width="2.5"/>')
    out.append(f'<circle cx="{med[-1][0]:.1f}" cy="{med[-1][1]:.1f}" r="6" fill="{MAGENTA}" fill-opacity="{0.9 * strength:.3f}"/>')
    out.append(f'<rect width="{w}" height="{h}" fill="url(#veil)"/>')
    out.append("</svg>")
    return "\n".join(out)

open("images/hero.svg", "w").write(art(1600, 560, (720, 1560, 40, 540), veil=(0.50, 0.72)))
open("images/banner.svg", "w").write(art(1600, 320, (1010, 1570, 80, 255), veil=(0.56, 0.72), strength=0.85))
print("images/hero.svg and images/banner.svg written")
