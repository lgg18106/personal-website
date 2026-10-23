"""Web fonts for gonzalollamosas.com, served from the site itself instead of Google Fonts, so that
visitors' browsers do not contact Google. Same faces and character ranges as the Google Fonts request
the site used before (Newsreader 500 and 600 roman and 400 italic; PT Sans 400, 700 and 400 italic),
each split into a "latin" and a "latin-ext" file so a page only downloads what it uses.

The PT Sans licence reserves the name "PT Sans", and a subset counts as a modified version, so the
subsets are renamed "Site Sans". Newsreader has no reserved name. As Google Fonts does, the italic
Newsreader is fixed at weight 400 (the only italic weight the site uses), and the files carry no
TrueType hinting, which is how Google serves them to Mac, Linux and Android.

    python3 _scripts/make_webfonts.py     (from the project root; needs fontTools)
"""
from pathlib import Path
import shutil

from fontTools import subset
from fontTools.varLib import instancer

SRC = Path("_cv/fonts")
OUT = Path("fonts")

# Google Fonts' ranges for the two subsets
LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,"
         "U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")
LATIN_EXT = ("U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,"
             "U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF")

FACES = [  # source, output name, new family name (None keeps the original), axes to fix
    ("newsreader_Newsreader-VF.ttf", "newsreader", None, None),
    ("newsreader_Newsreader-Italic-VF.ttf", "newsreader-italic", None, {"wght": 400}),
    ("ptsans_PT_Sans-Web-Regular.ttf", "site-sans-regular", "Site Sans", None),
    ("ptsans_PT_Sans-Web-Bold.ttf", "site-sans-bold", "Site Sans", None),
    ("ptsans_PT_Sans-Web-Italic.ttf", "site-sans-italic", "Site Sans", None),
]


def rename(font, family):
    """Give the font a new family name in every naming record that carries it."""
    name = font["name"]
    style = name.getDebugName(2) or "Regular"
    new = {1: family, 3: f"{family.replace(' ', '')}-{style}", 4: f"{family} {style}",
           6: f"{family.replace(' ', '')}-{style}", 16: family, 18: f"{family} {style}", 21: family}
    for rec in name.names:
        if rec.nameID in new:
            rec.string = new[rec.nameID]


def make(src, unicodes, out, family, fix):
    options = subset.Options()
    options.flavor = "woff"            # zlib; no brotli here for woff2
    options.layout_features = ["*"]    # keep every OpenType feature (kerning, ligatures, figures)
    options.hinting = False
    options.name_IDs = ["*"]           # keep copyright, licence and the variable-font names
    options.name_languages = ["*"]
    options.notdef_outline = True
    font = subset.load_font(str(src), options)
    if fix:
        font = instancer.instantiateVariableFont(font, fix)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=subset.parse_unicodes(unicodes))
    subsetter.subset(font)
    if family:
        rename(font, family)
    subset.save_font(font, str(out), options)


OUT.mkdir(exist_ok=True)
for src, stem, family, fix in FACES:
    for part, unicodes in (("latin", LATIN), ("latin-ext", LATIN_EXT)):
        out = OUT / f"{stem}-{part}.woff"
        make(SRC / src, unicodes, out, family, fix)
        print(f"{out}  {out.stat().st_size / 1024:.0f} KB")

shutil.copy(SRC / "newsreader_OFL.txt", OUT / "OFL-Newsreader.txt")
shutil.copy(SRC / "ptsans_OFL.txt", OUT / "OFL-PT-Sans.txt")
