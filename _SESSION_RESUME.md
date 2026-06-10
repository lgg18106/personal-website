# Session resume — personal-website (gonzalollamosas.com)

**Última actualización:** 10 junio 2026 (cierre de sesión) · **empieza por aquí.**
**Stack:** Quarto website · tema pulse + `html/styles.scss` · deploy automático a GitHub Pages
vía Actions al hacer push a `main` (~2 min) · dominio `gonzalollamosas.com`.

---

## Estado en una línea

Web revisada a fondo, corregida, rediseñada (blog + pasada fina global) y publicada el
10-jun-2026. Todo desplegado y verificado en producción. Un único fleco pendiente (tokens
GSC/Bing, ver abajo).

## Lo que se hizo el 10-jun-2026 (commits `417f4ef` → `ffac43d`)

1. **Contenido** (`417f4ef`): fechas vencidas del lanzamiento del canal eliminadas (ya no
   promete "May 2026"); Contact añadido al navbar (estaba huérfano); News ordenadas; About
   completado con el CV real — OJO: el puesto UMA Ayudante Doctor empieza en **2025**, no
   2026; MSc = **Universidad de Valladolid** (confirmado por Gonzalo); PhD UC 2015–2019
   (programa interuniversitario con Oviedo y País Vasco).
2. **SEO/técnico** (`c8540b2`): 404.qmd personalizada; eliminado SearchAction falso del
   schema; locale `en_GB`; robots.txt con permiso explícito a crawlers de IA (GPTBot,
   ClaudeBot, PerplexityBot, CCBot, etc. — decisión de Gonzalo: PERMITIR); script de
   **GoatCounter** en todas las páginas.
3. **Rendimiento** (`0b6672c`): ~150 ficheros de branding sin uso movidos a
   `assets-archive/` (fuera del deploy, conservados en repo; incluye branding de YouTube y
   originales del CV); PNGs del CV comprimidos 63% (1,9 MB → 0,7 MB, paleta 256 colores,
   calidad verificada); lazy-loading en CV págs. 2–7; aria-hidden en SVG decorativo.
4. **Blog: dos posts nuevos** (`a0147fb`): `consolidacion-fiscal-deuda.qmd` (ES,
   divulgación del paper LP-DiD con los números verificados del CLAUDE.md del proyecto
   paper) y `lp-did-clean-controls.qmd` (EN, nota metodológica con el estimador en R).
   El post "welcome" se eliminó después (`4cdea4d`) por decisión de Gonzalo.
5. **Rediseño del blog** (`d787214`): listado en grid de tarjetas; **cabeceras generadas
   con R/ggplot2** (script reproducible `_scripts/blog_banners.R` → `blog/posts/images/`):
   IRF con las estimaciones reales del paper, esquema de clean controls, ondas de marca;
   bloques de código con acento dorado (`highlight-style: github`); firma de ondas
   reutilizable `blog/posts/_signature.qmd` (incluir con `{{< include _signature.qmd >}}`).
6. **Pasada fina de diseño** (`ffac43d`): sidebar de categorías del blog eliminada
   (`categories: false`); grid a 2 columnas con imagen 240px; News de la home como
   timeline con puntos dorados; publicaciones de Research como tarjetas crema; barra
   dorada corta bajo los h2 (sustituye a la línea gris); página activa en dorado en el
   navbar; anillo dorado sutil en la foto de perfil; enlace RSS en el footer; ondas en
   la 404.

## Analítica

- **GoatCounter activo**: cuenta registrada por Gonzalo con código `gonzalollamosas`
  (panel: `gonzalollamosas.goatcounter.com`). Probado end-to-end el 10-jun (hit de test
  devolvió 200). Sin cookies, sin banner RGPD. Los adblockers bloquean `gc.zgo.at`
  (las visitas propias pueden no aparecer).

## ⚠️ Pendiente

1. **Tokens de verificación GSC y Bing** — Gonzalo ya se dio de alta en ambos; falta
   verificar la propiedad. Si elige etiqueta HTML, descomentar las dos líneas marcadas
   `TOKEN_GSC` / `TOKEN_BING` en `_quarto.yml` (include-in-header) y pegar los tokens;
   si verificó por DNS, no hay que tocar nada. Después: **enviar el sitemap**
   `https://gonzalollamosas.com/sitemap.xml` en ambas consolas (Bing puede importar
   desde GSC directamente).
2. **Aviso Node.js 24 en GitHub Actions**: a partir del **16-jun-2026** Actions fuerza
   Node 24 y avisó de que `actions/deploy-pages@v4` podría fallar. Si un deploy posterior
   a esa fecha rompe, ese es el motivo (arreglo: actualizar versión de la action o
   `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` en `publish.yml`).
3. **Cuando lance el canal (Outlook Project)**: actualizar `outlook-project.qmd`
   (URL real de YouTube en "Subscribe") y el ítem "Coming soon" de News en `index.qmd`.

## Cómo trabajar en esta web

```bash
cd ~/Documents/Cloude/personal-website
quarto preview          # vista previa local en http://localhost:XXXX
quarto render           # render completo a _site/
Rscript _scripts/blog_banners.R   # regenerar cabeceras del blog (misma estética)
git push origin main    # publica (GitHub Actions despliega en ~2 min)
```

- Posts nuevos: `blog/posts/nombre.qmd` con front matter `image:`/`image-alt:` y cerrar
  con `{{< include _signature.qmd >}}`. Banner nuevo → añadirlo al script de banners.
- Ficheros `.md`/carpetas con prefijo `_` no se renderizan (este fichero es seguro).
- Reglas de estilo del dueño: **sin marcas de IA** en los textos (sin em-dashes, sin
  "etiqueta: texto"), inglés británico, tono directo sin tertulianismo.
