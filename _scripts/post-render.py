#!/usr/bin/env python3
"""Post-render hook for Quarto.

Adds <link rel="canonical"> and <meta property="og:url"> to every .html
file in the rendered _site/ directory. Quarto does not generate these
automatically as of Quarto 1.5, so we add them ourselves so search
engines (Google, Bing) can de-duplicate URLs and Open Graph clients
(LinkedIn, Twitter, Slack, WhatsApp) can resolve the canonical URL.

Idempotent: safe to run multiple times. If the tags already exist for
the page, the script leaves the file untouched.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

SITE_URL = "https://gonzalollamosas.com"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "_site"


def file_to_url(html_path: Path) -> str:
    """Map _site/foo/bar.html → https://gonzalollamosas.com/foo/bar.html.

    /index.html and /foo/index.html collapse to the directory URL.
    """
    rel = html_path.relative_to(OUTPUT_DIR).as_posix()
    if rel == "index.html":
        return f"{SITE_URL}/"
    if rel.endswith("/index.html"):
        return f"{SITE_URL}/{rel[:-len('index.html')]}"
    return f"{SITE_URL}/{rel}"


def inject_meta(html: str, url: str) -> tuple[str, bool]:
    """Insert canonical + og:url after <head>. Returns (new_html, modified)."""
    has_canonical = re.search(r'<link[^>]+rel=["\']canonical["\']', html, re.I)
    has_og_url = re.search(r'<meta[^>]+property=["\']og:url["\']', html, re.I)

    if has_canonical and has_og_url:
        return html, False

    inject = ""
    if not has_canonical:
        inject += f'\n<link rel="canonical" href="{url}">'
    if not has_og_url:
        inject += f'\n<meta property="og:url" content="{url}">'

    # Insert right after the opening <head> tag (case-insensitive).
    new_html, n = re.subn(
        r"(<head[^>]*>)",
        lambda m: m.group(1) + inject,
        html,
        count=1,
        flags=re.I,
    )
    if n == 0:
        return html, False
    return new_html, True


# English/Spanish counterparts (paths relative to _site/), for hreflang links.
LANG_PAIRS = {
    "index.html": "es/index.html",
    "about.html": "es/sobre-mi.html",
    "teaching.html": "es/docencia.html",
    "blog/index.html": "es/divulgacion.html",
    "cv/index.html": "es/cv.html",
}


def inject_hreflang(html: str, rel: str) -> tuple[str, bool]:
    """Add <link rel="alternate" hreflang> for pages that exist in both languages."""
    pairs = {**LANG_PAIRS, **{v: k for k, v in LANG_PAIRS.items()}}
    if rel not in pairs or 'rel="alternate" hreflang' in html:
        return html, False
    en, es = (rel, pairs[rel]) if rel in LANG_PAIRS else (pairs[rel], rel)
    to_url = lambda r: file_to_url(OUTPUT_DIR / r)
    links = (f'\n<link rel="alternate" hreflang="en" href="{to_url(en)}">'
             f'\n<link rel="alternate" hreflang="es" href="{to_url(es)}">'
             f'\n<link rel="alternate" hreflang="x-default" href="{to_url(en)}">')
    new_html, n = re.subn(r"(<head[^>]*>)", lambda m: m.group(1) + links, html, count=1, flags=re.I)
    return new_html, n > 0


def fix_sitemap() -> int:
    """List index pages in sitemap.xml by their directory URL, the same URL as their canonical tag."""
    path = OUTPUT_DIR / "sitemap.xml"
    if not path.exists():
        return 0
    text = path.read_text(encoding="utf-8")
    new_text, n = re.subn(rf"<loc>{re.escape(SITE_URL)}/((?:[^<]*/)?)index\.html</loc>",
                          lambda m: f"<loc>{SITE_URL}/{m.group(1)}</loc>", text)
    if n:
        path.write_text(new_text, encoding="utf-8")
    return n


def main() -> int:
    if not OUTPUT_DIR.is_dir():
        print(f"[post-render] _site/ not found at {OUTPUT_DIR}; skipping.")
        return 0

    print(f"[post-render] sitemap: {fix_sitemap()} index URL(s) set to their directory form.")

    touched = 0
    skipped = 0
    for html_path in OUTPUT_DIR.rglob("*.html"):
        try:
            text = html_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            skipped += 1
            continue
        url = file_to_url(html_path)
        new_text, modified = inject_meta(text, url)
        new_text, alt = inject_hreflang(new_text, html_path.relative_to(OUTPUT_DIR).as_posix())
        modified = modified or alt
        if modified:
            html_path.write_text(new_text, encoding="utf-8")
            touched += 1
        else:
            skipped += 1

    print(f"[post-render] canonical + og:url injected into {touched} HTML "
          f"file(s); {skipped} already had them.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
