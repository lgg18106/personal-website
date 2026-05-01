# gonzalollamosas.com

Personal academic website built with [Quarto](https://quarto.org), deployed via GitHub Pages to `gonzalollamosas.com`.

## Author

Gonzalo Llamosas-García · Assistant Professor in Public Finance · University of Málaga.

- Web: [gonzalollamosas.com](https://gonzalollamosas.com) (pending DNS)
- Email: [gonzalo.llamosas@uma.es](mailto:gonzalo.llamosas@uma.es)
- UMA: [portaldelainvestigacion.uma.es/investigadores/2208701/detalle](https://portaldelainvestigacion.uma.es/investigadores/2208701/detalle)

## Stack

- **Quarto** (static site generator).
- **GitHub Pages** (hosting, free).
- **GitHub Actions** (auto-deploy on push to `main`).
- Custom domain via DNS CNAME to `lgg18106.github.io`.

## Structure

```
.
├── _quarto.yml          # site configuration
├── index.qmd            # landing page
├── about.qmd            # bio
├── research.qmd         # publications and working papers
├── teaching.qmd         # UMA courses (Spanish)
├── outlook-project.qmd  # YouTube channel
├── contact.qmd          # contact info
├── cv/
│   ├── index.qmd        # web CV
│   └── *.pdf            # downloadable CVs
├── blog/
│   ├── index.qmd        # blog listing
│   ├── _metadata.yml    # blog defaults
│   └── posts/           # individual posts
├── images/              # profile photo, logo, favicon
├── styles.css           # custom styles
└── .github/workflows/publish.yml
```

## Local development

```bash
# Render the site locally
quarto render

# Serve with live reload
quarto preview
```

The rendered site goes to `_site/` (gitignored).

## Bilingual policy

The site uses a **pragmatic bilingual approach**, not full mirroring:

| Section | Language |
|---|---|
| Home, About, Research, Outlook Project, CV, Contact | English (with Spanish summary at the end) |
| Teaching | Spanish (UMA students) |
| Blog | Per-post (each post in its target audience's language) |

## Deployment

Auto-deployed via GitHub Actions on every push to `main`. See `.github/workflows/publish.yml`.

## License

Content © 2026 Gonzalo Llamosas-García. Code under MIT license.
