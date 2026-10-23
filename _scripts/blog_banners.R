# Figures for gonzalollamosas.com, in the colours of the site (UMA 2026: text #243649, navy #003366,
# cyan #0099cc, magenta #cc0066, rules #e2e8f0) and in PT Sans, the text face of the site.
# Output: blog/posts/images/*.png (1200 x 630) and images/research/*.png
#
#   Rscript _scripts/blog_banners.R     (from the project root)

library(ggplot2)

# the PT Sans files in _cv/fonts, the web version the site serves (the copy that ships with macOS
# drops the regular weight below about 20 px in ragg)
font <- "PT Sans Web"
ttf <- function(style) file.path("_cv/fonts", sprintf("ptsans_PT_Sans-Web-%s.ttf", style))
systemfonts::register_font(font, plain = ttf("Regular"), bold = ttf("Bold"),
                           italic = ttf("Italic"), bolditalic = ttf("BoldItalic"))
save_png <- function(file, plot, ...) ggsave(file, plot, ..., bg = "#ffffff", device = ragg::agg_png)

dir.create("blog/posts/images", recursive = TRUE, showWarnings = FALSE)
dir.create("images/research", recursive = TRUE, showWarnings = FALSE)

ink    <- "#243649"
ink3   <- "#64748b"
accent <- "#003366"
cyan   <- "#0099cc"
paper  <- "#ffffff"
rule   <- "#e2e8f0"

theme_site <- function(base_size = 17) {
  theme_minimal(base_size = base_size, base_family = font) +
    theme(
      plot.background  = element_rect(fill = paper, colour = NA),
      panel.background = element_rect(fill = paper, colour = NA),
      panel.grid.minor = element_blank(),
      panel.grid.major.x = element_blank(),
      panel.grid.major.y = element_line(colour = rule, linewidth = 0.4),
      text             = element_text(colour = ink),
      axis.text        = element_text(colour = ink3),
      strip.text       = element_text(colour = ink, face = "bold", size = base_size * 0.9, hjust = 0),
      plot.title       = element_text(face = "bold", size = base_size * 1.2),
      plot.subtitle    = element_text(colour = ink3, size = base_size * 0.85),
      plot.caption     = element_text(colour = ink3, size = base_size * 0.65),
      panel.spacing    = unit(2.2, "lines"),
      plot.margin      = margin(26, 34, 18, 28)
    )
}

# ---------------------------------------------------------------------
# 1. Debt response to entering a consolidation. Estimates and
#    country-clustered SEs from the paper under review (table "Effect of
#    Entering Consolidation on the Debt-to-GDP Ratio", specifications (i)
#    and (ii)); 95% bands with t(26) critical values.
# ---------------------------------------------------------------------
irf_data <- function(labels) {
  data.frame(
    h    = rep(0:5, 2),
    spec = factor(rep(labels, each = 6), levels = labels),
    beta = c(0.87, 1.31, 1.20, 1.36, 2.28, 2.62,
             -0.15, -0.37, -0.54, -0.01, 1.72, 2.34),
    se   = c(0.34, 0.59, 0.85, 1.24, 1.56, 1.82,
             0.40, 0.66, 0.94, 1.59, 2.46, 2.83)
  )
}
tc <- qt(0.975, df = 26)

irf_plot <- function(d, xlab, ylab = NULL, line = 1.2, point = 3.2, ncol = 2) {
  ggplot(d, aes(h, beta)) +
    geom_hline(yintercept = 0, colour = ink3, linewidth = 0.45) +
    geom_ribbon(aes(ymin = beta - tc * se, ymax = beta + tc * se),
                fill = cyan, alpha = 0.16) +
    geom_line(colour = accent, linewidth = line) +
    geom_point(colour = accent, size = point) +
    facet_wrap(~ spec, ncol = ncol) +
    scale_x_continuous(breaks = 0:5) +
    scale_y_continuous(labels = scales::label_number(style_negative = "minus")) +
    labs(x = xlab, y = ylab)
}

# Spanish post banner
p1 <- irf_plot(irf_data(c("Controles habituales", "+ saldo primario inicial")),
               "Años desde la entrada") +
  labs(title    = "Deuda/PIB tras entrar en consolidación fiscal",
       subtitle = "Efecto estimado (puntos del PIB) e intervalo del 95 %",
       caption  = "UE-27, 1996–2024, 125 entradas. Estimación por LP-DiD.\ngonzalollamosas.com") +
  theme_site()
save_png("blog/posts/images/irf-deuda.png", p1, width = 12, height = 6.3, dpi = 100)

# Home page figure, no title or caption (the page gives them). Drawn at the size the page shows it,
# about 740 px wide on a computer, at twice that resolution; the narrow version stacks the panels
# for phones, where the wide one would shrink the text to a few pixels.
home_irf <- function(labels, xlab, ylab, file, narrow = FALSE) {
  p <- irf_plot(irf_data(labels), xlab, ylab, line = 0.8, point = 2.1, ncol = if (narrow) 1 else 2) +
    theme_site(base_size = 12) +
    theme(plot.margin = margin(6, 12, 4, 4), panel.spacing = unit(1.3, "lines"))
  save_png(file, p, width = if (narrow) 3 else 7.4, height = if (narrow) 4.7 else 3.1, dpi = 200)
}
for (narrow in c(FALSE, TRUE)) {
  end <- if (narrow) "-narrow.png" else ".png"
  home_irf(c("Baseline controls", "+ initial primary balance"), "Years since entry", "Debt/GDP, p.p.",
           paste0("images/research/consolidation-irf", end), narrow)
  home_irf(c("Controles habituales", "+ saldo primario inicial"), "Años desde la entrada", "Deuda/PIB, p. p.",
           paste0("images/research/consolidation-irf-es", end), narrow)
}

# ---------------------------------------------------------------------
# 2. Clean-controls schematic · who gets compared to whom
# ---------------------------------------------------------------------
countries <- LETTERS[1:6]
years     <- 1:9
grid_df   <- expand.grid(country = countries, year = years)

entry_t <- 4; h <- 2                    # treated unit C enters at t = 4, horizon 2
grid_df$role <- "panel"
grid_df$role[grid_df$country == "C" & grid_df$year == entry_t] <- "entry"
grid_df$role[grid_df$country == "C" & grid_df$year > entry_t &
             grid_df$year <= entry_t + h] <- "window"
grid_df$role[grid_df$country == "E" & grid_df$year == 5] <- "dirty"   # treats inside window
fill_map <- c(panel = "#edf2f7", entry = accent, window = cyan, dirty = "#94a3b8")

p2 <- ggplot(grid_df, aes(year, country)) +
  geom_tile(aes(fill = role), colour = paper, linewidth = 2.2,
            width = 0.92, height = 0.82) +
  scale_fill_manual(values = fill_map, guide = "none") +
  annotate("text", x = 5, y = 6.85, label = "treatment window [t, t+h]",
           colour = ink, size = 5, fontface = "italic", family = font) +
  annotate("segment", x = 3.6, xend = 6.4, y = 6.55, yend = 6.55,
           colour = ink, linewidth = 0.5) +
  annotate("text", x = 4, y = 4, label = "entry (t)", colour = paper,
           size = 4.4, fontface = "bold", family = font) +
  scale_y_discrete(limits = rev(countries)) +
  scale_x_continuous(breaks = years) +
  coord_cartesian(ylim = c(0.3, 7.1), clip = "off") +
  labs(
    title    = "Clean controls: who gets compared to whom",
    subtitle = "Unit C enters at t. Unit E is treated inside C's window, so it is left out; the rest are clean controls.",
    caption  = "Dube, Girardi, Jordà and Taylor (2025)\ngonzalollamosas.com",
    x = "year", y = NULL
  ) +
  theme_site() +
  theme(panel.grid.major = element_blank())

save_png("blog/posts/images/clean-controls.png", p2, width = 12, height = 6.3, dpi = 100)

cat("figures written to blog/posts/images/ and images/research/\n")
