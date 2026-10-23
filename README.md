# gonzalollamosas.com

Personal academic website of Gonzalo Llamosas García, Assistant Professor in Public Finance at the University of Málaga. Built with [Quarto](https://quarto.org) and published with GitHub Pages at [gonzalollamosas.com](https://gonzalollamosas.com).

## Building the site

```bash
Rscript _scripts/build_cv.R       # research lists, news and CV pages from _data/cv.yml, and the CV PDFs
Rscript _scripts/blog_banners.R   # figures for the home page and the notes
quarto render                     # writes _site/
```

A push to `main` publishes the site through GitHub Actions (`.github/workflows/publish.yml`).

## Layout

- `_data/cv.yml`: papers, publications, positions, talks and news, in English and Spanish.
- `_scripts/`: the generators for `_generated/`, the CV PDFs, the logo, the figures and the post-render step.
- `index.qmd`, `about.qmd`, `research.qmd`, `teaching.qmd`, `contact.qmd` and `cv/`: the English pages.
- `es/`: the Spanish pages.
- `blog/posts/`: notes.
- `html/`: header, footer and styles.
- `fonts/`: the web fonts, served from the site; `python3 _scripts/make_webfonts.py` makes them from the TTF files in `_cv/fonts`.
