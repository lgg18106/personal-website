# Builds every page fragment that depends on the CV data, plus the CV PDFs.
#
#   Rscript _scripts/build_cv.R        (from the project root)
#
# Input : _data/cv.yml
# Output: _generated/*.md             (included by index, research, cv and es/ pages)
#         _cv/Gonzalo_Llamosas-Garcia_CV.tex     ->  cv/Gonzalo_Llamosas-Garcia_CV.pdf     (tectonic)
#         _cv/Gonzalo_Llamosas-Garcia_CV_es.tex  ->  cv/Gonzalo_Llamosas-Garcia_CV_es.pdf  (Spanish)

library(yaml)

cv <- read_yaml("_data/cv.yml")
dir.create("_generated", showWarnings = FALSE)
dir.create("_cv", showWarnings = FALSE)

write_utf8 <- function(lines, path) {
  con <- file(path, "w", encoding = "UTF-8")
  writeLines(lines, con)
  close(con)
}

`%||%` <- function(a, b) if (is.null(a)) b else a

# ---- escaping and inline markup ------------------------------------------
html_esc <- function(x) {
  x <- gsub("&", "&amp;", x, fixed = TRUE)
  x <- gsub("<", "&lt;", x, fixed = TRUE)
  gsub(">", "&gt;", x, fixed = TRUE)
}
html_inline <- function(x) gsub("\\*([^*]+)\\*", "<em>\\1</em>", html_esc(x))

tex_esc <- function(x) {
  x <- gsub("\\", "\\textbackslash{}", x, fixed = TRUE)
  for (ch in c("&", "%", "$", "#", "_", "{", "}")) x <- gsub(ch, paste0("\\", ch), x, fixed = TRUE)
  x
}
tex_inline <- function(x) gsub("\\*([^*]+)\\*", "\\\\emph{\\1}", tex_esc(x))

with_list <- function(names, and = "and") {
  n <- length(names)
  if (n == 0) return("")
  if (n == 1) return(names)
  paste(paste(names[-n], collapse = ", "), and, names[n])
}

# Spanish text of a field when asked for and present (field_es), the English one otherwise
tr <- function(x, field, lang = "en") {
  es <- x[[paste0(field, "_es")]]
  if (lang == "es" && !is.null(es)) es else x[[field]]
}

html_block <- function(...) c("```{=html}", ..., "```", "")

dated_list <- function(items, text_fun, lang = "en") {
  c('<ul class="dated">',
    vapply(items, function(it) sprintf('<li><span class="yr">%s</span><span>%s</span></li>',
                                       html_esc(tr(it, "years", lang)), text_fun(it)), ""),
    "</ul>")
}

# ---- papers ----------------------------------------------------------------
by_status <- function(status) Filter(function(p) identical(p$status %||% "review", status), cv$papers)

status_label <- function(p, lang = "en") {
  switch(p$status %||% "review",
         review  = if (lang == "en") "Under review" else "En evaluación",
         working = if (lang == "en") "Working paper" else "Documento de trabajo")
}

# coauthor names, each linked to its page in coauthor_links when there is one
coauthors_html <- function(names, lang = "en") {
  pages <- cv$coauthor_links %||% list()
  with_list(vapply(unlist(names), function(n) if (is.null(pages[[n]])) html_esc(n) else
    sprintf('<a href="%s">%s</a>', pages[[n]], html_esc(n)), "", USE.NAMES = FALSE), if (lang == "en") "and" else "y")
}

# status (left out where a section heading already says it), then the coauthors
paper_meta <- function(p, lang = "en", status = TRUE) {
  who <- if (length(p$coauthors)) paste(if (lang == "en") "with" else "con", coauthors_html(p$coauthors, lang)) else ""
  if (status) return(sprintf('<p class="paper-meta"><span class="status">%s</span>%s</p>', status_label(p, lang),
                             if (nzchar(who)) paste0(", ", who) else ""))
  if (nzchar(who)) sprintf('<p class="paper-meta">%s</p>', paste0(toupper(substr(who, 1, 1)), substr(who, 2, nchar(who))))
}

# PDF, slides and code when the paper has them, then the plain-language summary if there is one
paper_links_html <- function(p, lang = "en", prefix = "") {
  labels <- if (lang == "en") c(pdf = "PDF", slides = "Slides", code = "Code") else
    c(pdf = "PDF", slides = "Transparencias", code = "Código")
  links <- unlist(lapply(names(labels), function(k)
    if (!is.null(p[[k]])) sprintf('<a href="%s">%s</a>', p[[k]], labels[[k]])))
  if (!is.null(p$post))
    links <- c(links, sprintf('<a href="%s%s">%s</a>', prefix, p$post,
                              html_esc(if (lang == "en") p$post_label else p$post_label_es)))
  if (length(links)) sprintf('<p class="paper-links">%s</p>', paste(links, collapse = " "))
}

papers_html <- function(items, lang = "en", text_field = "summary", prefix = "") {
  unlist(lapply(items, function(p) {
    c(sprintf('<article class="paper" id="%s">', p$id),
      sprintf('<h3 class="paper-title">%s</h3>', html_esc(p$title)),
      paper_meta(p, lang, status = FALSE),
      sprintf('<p class="paper-summary">%s</p>', html_esc(p[[text_field]])),
      paper_links_html(p, lang, prefix),
      "</article>")
  }))
}

access_label <- function(p, lang = "en") {
  if (is.null(p$access)) return(NULL)
  labels <- list(open = c(en = "Open access", es = "Acceso abierto"),
                 free = c(en = "Free to read", es = "Lectura gratuita"))
  labels[[p$access]][[lang]]
}

publications_html <- function(lang = "en") {
  unlist(lapply(cv$publications, function(p) {
    who <- if (lang == "en") "with" else "con"
    meta <- sprintf("<em>%s</em>, %s (%s). %s %s.", html_esc(p$journal), html_esc(tr(p, "details", lang)), p$year,
                    if (lang == "en") "With" else "Con", coauthors_html(p$coauthors, lang))
    read <- if (p$link == "DOI") { if (lang == "en") "Read at the journal" else "Leer en la revista" } else
      { if (lang == "en") "Publication record" else "Ficha de la publicación" }
    acc <- access_label(p, lang)
    links <- paste(c(if (!is.null(acc)) sprintf('<span class="oa">%s</span>', acc),
                     sprintf('<a href="%s">%s</a>', p$url, read)), collapse = " ")
    c('<article class="paper">',
      sprintf('<h3 class="paper-title"><a href="%s">%s</a></h3>', p$url, html_esc(p$title)),
      sprintf('<p class="paper-meta">%s</p>', meta),
      sprintf('<p class="paper-links">%s</p>', links),
      "</article>")
  }))
}

wip_html <- function() c('<ul class="plain">',
                         vapply(cv$work_in_progress, function(t) sprintf("<li>%s</li>", html_esc(t)), ""),
                         "</ul>")

# talk title (original language) and the event
talk_html <- function(x, lang = "en") {
  event <- html_esc(tr(x, "text", lang))
  if (is.null(x$talk)) event else sprintf("<em>%s</em>. %s", html_esc(x$talk), event)
}

news_md <- function(lang) {
  html_block('<ul class="dated">',
             vapply(cv$news, function(n) sprintf('<li><span class="yr">%s</span><span>%s</span></li>',
                                                 n$year, html_inline(n[[lang]])), ""),
             "</ul>")
}

# ---- 1. home page fragments -------------------------------------------------
# cards for the unpublished papers, and the featured figure of the first one that has one
cards_html <- function(lang = "en", prefix = "") {
  c('<div class="paper-grid">',
    unlist(lapply(cv$papers, function(p) {
      topic <- if (lang == "en") p$topic else p$topic_es
      href <- sprintf("%sresearch.html#%s", prefix, p$id)
      more <- if (!is.null(p$post)) sprintf('<a class="card-link" href="%s%s">%s</a>', prefix, p$post,
                                             html_esc(if (lang == "en") p$post_label else p$post_label_es)) else ""
      c(sprintf('<article class="paper-card tone-%s">', p$tone),
        sprintf('<span class="badge">%s</span>', html_esc(topic)),
        sprintf('<h3 class="card-title"><a href="%s">%s</a></h3>', href, html_esc(p$title)),
        paper_meta(p, lang),
        sprintf('<p>%s</p>', html_esc(if (lang == "en") p$short else p$short_es)),
        more, "</article>")
    })),
    "</div>")
}
# the figure in the language of the page, with a stacked version for phones when there is one
feature_html <- function(lang = "en", prefix = "") {
  p <- Filter(function(x) !is.null(x$figure), cv$papers)[[1]]
  narrow <- tr(p, "figure_narrow", lang)
  c('<div class="feature">', "<picture>",
    if (!is.null(narrow)) sprintf('<source media="(max-width: 600px)" srcset="%s%s">', prefix, narrow),
    sprintf('<img src="%s%s" alt="%s" loading="lazy">', prefix, tr(p, "figure", lang), html_esc(tr(p, "figure_alt", lang))),
    "</picture>",
    sprintf('<p class="feature-caption">%s</p>', html_esc(if (lang == "en") p$feature else p$feature_es)),
    "</div>")
}
write_utf8(html_block(cards_html("en")), "_generated/selected_en.md")
write_utf8(html_block(cards_html("es", prefix = "../")), "_generated/selected_es.md")
write_utf8(html_block(feature_html("en")), "_generated/feature_en.md")
write_utf8(html_block(feature_html("es", prefix = "../")), "_generated/feature_es.md")
write_utf8(news_md("en"), "_generated/news_en.md")
write_utf8(news_md("es"), "_generated/news_es.md")

# ---- 2. research page (English) --------------------------------------------
research_en <- c(
  "## Under review", "", html_block(papers_html(by_status("review"), "en")),
  "## Working papers", "", html_block(papers_html(by_status("working"), "en")),
  "## Publications", "", html_block(publications_html("en")),
  "## Work in progress", "", html_block(wip_html()),
  "## Research projects", "",
  html_block(dated_list(cv$projects, function(p)
    sprintf("<em>%s</em>, %s. %s.", html_esc(p$title), html_esc(p$funder), html_esc(p$role)))),
  "## Talks", "", html_block(dated_list(cv$conferences, function(x) talk_html(x, "en"))),
  "## Awards", "", html_block(dated_list(cv$awards, function(a) html_esc(a$text))),
  "## Editorial work and refereeing", "",
  html_block(dated_list(cv$service, function(s) html_esc(s$text)))
)
write_utf8(research_en, "_generated/research_en.md")

# Spanish home: publications (titles stay in English)
write_utf8(html_block(publications_html("es")), "_generated/research_es.md")

# ---- 3. CV pages (HTML), English and Spanish ----------------------------------
heads <- list(
  en = c(positions = "Positions", education = "Education", review = "Papers under review",
         working = "Working papers", pubs = "Publications", wip = "Work in progress",
         projects = "Research projects", stays = "Research stays", awards = "Awards",
         service = "Editorial work and refereeing", conferences = "Conference presentations",
         teaching = "Teaching", other = "Other professional experience", skills = "Skills"),
  es = c(positions = "Trayectoria académica", education = "Formación", review = "Artículos en evaluación",
         working = "Documentos de trabajo", pubs = "Publicaciones", wip = "Trabajos en curso",
         projects = "Proyectos de investigación", stays = "Estancias de investigación", awards = "Premios",
         service = "Labor editorial y evaluación de artículos", conferences = "Comunicaciones en congresos",
         teaching = "Docencia", other = "Otra experiencia profesional", skills = "Idiomas e informática")
)
authors_in <- function(x, lang) if (lang == "es") gsub(" and ", " y ", x, fixed = TRUE) else x

cv_body_md <- function(lang) {
  h <- heads[[lang]]
  t <- function(x, field) tr(x, field, lang)
  section <- function(key) c(paste("##", h[[key]]), "")
  entry_html <- function(items, fun) html_block(dated_list(items, fun, lang))
  with_word <- if (lang == "en") "with" else "con"
  paper_list <- function(items) html_block('<ul class="plain">',
    vapply(items, function(p) sprintf("<li>%s%s</li>", html_esc(p$title),
      if (length(p$coauthors)) sprintf(' <span class="note">(%s %s)</span>', with_word,
        html_esc(with_list(unlist(p$coauthors), if (lang == "en") "and" else "y"))) else ""), ""),
    "</ul>")
  c(
    section("positions"),
    entry_html(cv$positions, function(p) sprintf("%s, %s", html_esc(t(p, "title")), html_esc(t(p, "place")))),
    section("education"),
    entry_html(cv$education, function(e) paste0(html_esc(t(e, "title")), ", ", html_esc(t(e, "place")),
                                                 if (!is.null(e$note)) paste0('<br><span class="note">', html_esc(t(e, "note")), "</span>") else "")),
    section("review"), paper_list(by_status("review")),
    section("working"), paper_list(by_status("working")),
    section("pubs"),
    html_block('<ul class="plain">',
               vapply(cv$publications, function(p) {
                 acc <- access_label(p, lang)
                 sprintf('<li>%s (%s). <a href="%s">%s</a>. <em>%s</em>, %s.%s</li>',
                         html_esc(authors_in(p$authors, lang)), p$year, p$url, html_esc(p$title), html_esc(p$journal),
                         html_esc(t(p, "details")), if (!is.null(acc)) sprintf(' <span class="note">%s.</span>', acc) else "")
               }, ""),
               "</ul>"),
    section("wip"), html_block(wip_html()),
    section("projects"),
    entry_html(cv$projects, function(p) sprintf("<em>%s</em>, %s. %s.", html_esc(p$title), html_esc(t(p, "funder")), html_esc(t(p, "role")))),
    section("stays"), entry_html(cv$stays, function(x) html_esc(t(x, "text"))),
    section("awards"), entry_html(cv$awards, function(a) html_esc(t(a, "text"))),
    section("service"), entry_html(cv$service, function(s) html_esc(t(s, "text"))),
    section("conferences"), entry_html(cv$conferences, function(x) talk_html(x, lang)),
    section("teaching"),
    entry_html(cv$teaching, function(x) sprintf("<strong>%s</strong><br>%s", html_esc(t(x, "place")), html_esc(t(x, "text")))),
    section("other"),
    entry_html(cv$other_experience, function(o) sprintf("%s, %s<br><span class=\"note\">%s</span>",
                                                        html_esc(t(o, "title")), html_esc(t(o, "place")), html_esc(t(o, "note")))),
    section("skills"),
    html_block('<ul class="plain">',
               vapply(cv$skills, function(s) sprintf("<li><strong>%s.</strong> %s</li>", t(s, "label"), html_esc(t(s, "text"))), ""),
               "</ul>")
  )
}
write_utf8(cv_body_md("en"), "_generated/cv_body.md")
write_utf8(cv_body_md("es"), "_generated/cv_body_es.md")

# ---- 4. CV PDFs, English and Spanish --------------------------------------------
tex_entries <- function(items, fun, lang = "en") {
  c(vapply(items, function(it) sprintf("\\entry{%s}{%s}", tex_esc(tr(it, "years", lang)), fun(it)), ""), "")
}
fonts_dir <- "fonts"   # relative to _cv/; Zilla Slab and PT Sans (SIL OFL)

cv_tex <- function(lang) {
  p <- cv$person
  h <- heads[[lang]]
  t <- function(x, field) tr(x, field, lang)
  entries <- function(items, fun) tex_entries(items, fun, lang)
  section <- function(key) sprintf("\\section{%s}", h[[key]])
  # English quotes with the full stop inside; Spanish angle quotes with the full stop outside
  quoted <- function(x) if (lang == "en") sprintf("``%s.''", x) else sprintf("«%s».", x)
  paper_entries <- function(items) entries(lapply(items, function(x) c(x, years = "")), function(x)
    paste0(tex_esc(x$title), if (length(x$coauthors)) paste0("\\\\{\\small\\color{muted}", if (lang == "en") "with " else "con ",
                                                               tex_esc(with_list(unlist(x$coauthors), if (lang == "en") "and" else "y")), "}") else ""))
  c(
    "\\documentclass[11pt,a4paper]{article}",
    "\\usepackage[a4paper,left=2.3cm,right=2.3cm,top=2cm,bottom=2.2cm]{geometry}",
    "\\usepackage{fontspec}",
    sprintf("\\setmainfont{PT_Sans-Web}[Path=%s/, Extension=.ttf, UprightFont=ptsans_*-Regular, BoldFont=ptsans_*-Bold, ItalicFont=ptsans_*-Italic, BoldItalicFont=ptsans_*-BoldItalic]", fonts_dir),
    sprintf("\\setsansfont{PT_Sans-Web}[Path=%s/, Extension=.ttf, UprightFont=ptsans_*-Regular, BoldFont=ptsans_*-Bold, ItalicFont=ptsans_*-Italic, BoldItalicFont=ptsans_*-BoldItalic]", fonts_dir),
    sprintf("\\newfontfamily\\slab{ZillaSlab}[Path=%s/, Extension=.ttf, UprightFont=zillaslab_*-SemiBold, BoldFont=zillaslab_*-SemiBold]", fonts_dir),
    "\\usepackage{xcolor}",
    "\\definecolor{accent}{HTML}{003366}",
    "\\definecolor{magenta}{HTML}{CC0066}",
    "\\definecolor{muted}{HTML}{64748B}",
    "\\color[HTML]{243649}",
    "\\usepackage[hidelinks]{hyperref}",
    sprintf("\\hypersetup{pdftitle={%s, %s}, pdfauthor={%s}, pdflang={%s}}", p$name,
            if (lang == "en") "CV" else "currículum", p$name, lang),
    "\\usepackage{titlesec}",
    "\\usepackage{fancyhdr}",
    "\\usepackage{calc}",
    "\\setlength{\\parindent}{0pt}",
    "\\setlength{\\parskip}{0pt}",
    "\\titleformat{\\section}{\\slab\\color{accent}\\Large}{{\\color{magenta}\\rule[-0.15em]{3pt}{1em}}\\hspace{0.5em}}{0pt}{}",
    "\\titlespacing*{\\section}{0pt}{14pt}{6pt}",
    "\\newcommand{\\entry}[2]{\\begin{minipage}[t]{2.6cm}\\sffamily\\small\\textcolor{muted}{#1}\\end{minipage}%",
    "  \\begin{minipage}[t]{\\linewidth-2.6cm}\\raggedright #2\\end{minipage}\\par\\vspace{4pt}}",
    "\\pagestyle{fancy}\\fancyhf{}\\renewcommand{\\headrulewidth}{0pt}",
    sprintf("\\fancyfoot[L]{\\sffamily\\footnotesize\\color{muted}%s, %s}", tex_esc(p$name),
            tex_esc(if (lang == "en") paste("CV, updated in", cv$updated) else paste("currículum actualizado en", cv$updated_es))),
    "\\fancyfoot[R]{\\sffamily\\footnotesize\\color{muted}\\thepage}",
    "\\begin{document}",
    sprintf("{\\slab\\color{accent}\\fontsize{26}{30}\\selectfont %s}\\par\\vspace{6pt}", tex_esc(p$name)),
    sprintf("{\\sffamily\\large %s}\\par\\vspace{2pt}", tex_esc(t(p, "position"))),
    sprintf("{\\sffamily %s, %s}\\par\\vspace{6pt}", tex_esc(t(p, "department")), tex_esc(t(p, "university"))),
    sprintf("{\\sffamily\\small\\color{muted}%s\\\\", tex_esc(t(p, "address"))),
    sprintf("\\href{mailto:%s}{%s} \\quad \\href{https://%s}{%s} \\quad ORCID \\href{https://orcid.org/%s}{%s}}\\par",
            p$email, p$email, p$web, p$web, p$orcid, p$orcid),
    sprintf("\\vspace{4pt}{\\sffamily\\small %s}\\par", tex_esc(t(p, "accreditation"))),
    section("positions"),
    entries(cv$positions, function(x) sprintf("%s\\\\{\\small\\color{muted}%s}", tex_esc(t(x, "title")), tex_esc(t(x, "place")))),
    section("education"),
    entries(cv$education, function(x) paste0(tex_esc(t(x, "title")), ", ", tex_esc(t(x, "place")),
                                             if (!is.null(x$note)) paste0("\\\\{\\small\\color{muted}", tex_esc(t(x, "note")), "}") else "")),
    section("review"), paper_entries(by_status("review")),
    section("working"), paper_entries(by_status("working")),
    section("pubs"),
    entries(lapply(cv$publications, function(x) c(x, years = as.character(x$year))), function(x) {
      acc <- access_label(x, lang)
      sprintf("%s %s \\emph{%s}, %s. \\href{%s}{\\color{accent}%s}%s", tex_esc(authors_in(x$authors, lang)),
              quoted(tex_esc(x$title)), tex_esc(x$journal), tex_esc(t(x, "details")), x$url, t(x, "link"),
              if (!is.null(acc)) paste0(" (", tolower(acc), ")") else "")
    }),
    section("wip"),
    entries(lapply(cv$work_in_progress, function(w) list(years = "", w = w)), function(x) tex_esc(x$w)),
    section("projects"),
    entries(cv$projects, function(x) sprintf("\\emph{%s}, %s. %s.", tex_esc(x$title), tex_esc(t(x, "funder")), tex_esc(t(x, "role")))),
    section("stays"), entries(cv$stays, function(x) tex_esc(t(x, "text"))),
    section("awards"), entries(cv$awards, function(x) tex_esc(t(x, "text"))),
    section("service"), entries(cv$service, function(x) tex_esc(t(x, "text"))),
    section("conferences"),
    entries(cv$conferences, function(x) if (is.null(x$talk)) tex_esc(t(x, "text")) else
      sprintf("\\emph{%s}. %s", tex_esc(x$talk), tex_esc(t(x, "text")))),
    section("teaching"),
    entries(cv$teaching, function(x) sprintf("%s\\\\{\\small\\color{muted}%s}", tex_esc(t(x, "place")), tex_esc(t(x, "text")))),
    section("other"),
    entries(cv$other_experience, function(x) sprintf("%s, %s\\\\{\\small\\color{muted}%s}", tex_esc(t(x, "title")),
                                                     tex_esc(t(x, "place")), tex_esc(t(x, "note")))),
    section("skills"),
    entries(lapply(cv$skills, function(s) list(years = t(s, "label"), text = t(s, "text"))), function(x) tex_esc(x$text)),
    "\\end{document}"
  )
}
for (lang in c("en", "es")) {
  tex_path <- sprintf("_cv/Gonzalo_Llamosas-Garcia_CV%s.tex", if (lang == "en") "" else "_es")
  write_utf8(cv_tex(lang), tex_path)
  status <- system2("tectonic", c("--chatter", "minimal", "--outdir", "cv", tex_path))
  if (status != 0) stop("tectonic failed for ", tex_path)
}
cat("CV data built: _generated/*.md, cv/Gonzalo_Llamosas-Garcia_CV.pdf and cv/Gonzalo_Llamosas-Garcia_CV_es.pdf\n")
