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


def main() -> int:
    if not OUTPUT_DIR.is_dir():
        print(f"[post-render] _site/ not found at {OUTPUT_DIR}; skipping.")
        return 0

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
