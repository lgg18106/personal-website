# Blog banner figures · gonzalollamosas.com
# Brand palette: gold #E6AA04 · wave gold #D9A12C · ink #373a3c · warm white #FBFAF7
# Output: blog/posts/images/*.png (1200 x 630)

library(ggplot2)

dir.create("blog/posts/images", recursive = TRUE, showWarnings = FALSE)

gold      <- "#E6AA04"
gold_soft <- "#D9A12C"
ink       <- "#373a3c"
paper     <- "#FBFAF7"
grey_soft <- "#E9E5DC"

theme_brand <- function(base_size = 17) {
  theme_minimal(base_size = base_size) +
    theme(
      plot.background  = element_rect(fill = paper, colour = NA),
      panel.background = element_rect(fill = paper, colour = NA),
      panel.grid.minor = element_blank(),
      panel.grid.major = element_line(colour = grey_soft, linewidth = 0.4),
      text             = element_text(colour = ink),
      axis.text        = element_text(colour = ink),
      plot.title       = element_text(face = "bold", size = base_size * 1.25),
      plot.subtitle    = element_text(colour = "#8a8378", size = base_size * 0.85),
      plot.caption     = element_text(colour = "#8a8378", size = base_size * 0.65),
      plot.margin      = margin(28, 36, 20, 30)
    )
}

# ---------------------------------------------------------------------
# 1. IRF of the debt ratio · actual point estimates from the paper
# ---------------------------------------------------------------------
irf <- data.frame(
  h    = 0:5,
  beta = c(0.86, 1.35, 1.45, 1.54, 2.37, 2.56),
  sig  = c(TRUE, TRUE, FALSE, FALSE, FALSE, FALSE)
)

p1 <- ggplot(irf, aes(h, beta)) +
  geom_hline(yintercept = 0, colour = "#c9c2b4", linewidth = 0.6) +
  geom_line(colour = gold, linewidth = 1.4) +
  geom_point(aes(fill = sig), shape = 21, size = 5.5,
             colour = gold, stroke = 1.6) +
  scale_fill_manual(values = c(`TRUE` = gold, `FALSE` = paper), guide = "none") +
  scale_x_continuous(breaks = 0:5) +
  scale_y_continuous(limits = c(-0.5, 3.2)) +
  labs(
    title    = "Entrar en consolidación no reduce la deuda",
    subtitle = "Respuesta del ratio deuda/PIB (p.p.) · puntos rellenos = significativo al 5%",
    caption  = "UE-27 · 1996-2024 · 126 episodios · LP-DiD  |  gonzalollamosas.com",
    x = "Horizonte (años desde la entrada)", y = expression(beta[h])
  ) +
  theme_brand()

ggsave("blog/posts/images/irf-deuda.png", p1,
       width = 12, height = 6.3, dpi = 100, bg = paper)

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
fill_map <- c(panel = "#F1EDE3", entry = gold, window = "#F3D484", dirty = "#b9b2a6")

p2 <- ggplot(grid_df, aes(year, country)) +
  geom_tile(aes(fill = role), colour = paper, linewidth = 2.2,
            width = 0.92, height = 0.82) +
  scale_fill_manual(values = fill_map, guide = "none") +
  annotate("text", x = 5, y = 6.85, label = "treatment window [t, t+h]",
           colour = ink, size = 5, fontface = "italic") +
  annotate("segment", x = 3.6, xend = 6.4, y = 6.55, yend = 6.55,
           colour = ink, linewidth = 0.5) +
  annotate("text", x = 4, y = 4, label = "entry (t)", colour = paper,
           size = 4.4, fontface = "bold") +
  scale_y_discrete(limits = rev(countries)) +
  scale_x_continuous(breaks = years) +
  coord_cartesian(ylim = c(0.3, 7.1), clip = "off") +
  labs(
    title    = "Clean controls: who gets compared to whom",
    subtitle = paste0(
      "Gold: treated unit (entry and window) · grey: treats inside the ",
      "window, excluded · rest: clean controls"),
    caption  = "Dube, Girardi, Jordà & Taylor (2025)  |  gonzalollamosas.com",
    x = "year", y = NULL
  ) +
  theme_brand() +
  theme(panel.grid.major = element_blank())

ggsave("blog/posts/images/clean-controls.png", p2,
       width = 12, height = 6.3, dpi = 100, bg = paper)

# ---------------------------------------------------------------------
# 3. Welcome banner · brand wave motif
# ---------------------------------------------------------------------
x <- seq(0, 12, length.out = 600)
waves <- do.call(rbind, lapply(1:5, function(i) {
  data.frame(x = x,
             y = sin(x / 1.6 + i * 0.9) * (0.55 + 0.08 * i) - i * 0.85,
             grp = i)
}))

p3 <- ggplot(waves, aes(x, y, group = grp)) +
  geom_line(colour = gold_soft, linewidth = 1.5, alpha = 0.85, lineend = "round") +
  annotate("text", x = 6, y = -6.4,
           label = "economics · data · human decisions",
           colour = "#8a8378", size = 6.5, fontface = "italic") +
  coord_cartesian(ylim = c(-7.2, 0.8)) +
  theme_void() +
  theme(plot.background = element_rect(fill = paper, colour = NA),
        plot.margin = margin(10, 10, 10, 10))

ggsave("blog/posts/images/welcome-waves.png", p3,
       width = 12, height = 6.3, dpi = 100, bg = paper)

cat("banners written to blog/posts/images/\n")
