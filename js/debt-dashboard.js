// Public-debt dashboard on debt.html and es/deuda.html. Apache ECharts (js/vendor/echarts.min.js) draws
// data/debt-dashboard.json, which _scripts/make_debt_data.py writes; colours come from the .dash rules
// in html/styles.scss.
(function () {
  "use strict";

  var root = document.getElementById("debt-dashboard");
  if (!root || !window.echarts) return;

  var lang = document.documentElement.lang === "es" ? "es" : "en";
  var T = {
    en: {
      none: "No comparison",
      periods: { all: "All years", "2008": "Since 2008", "10": "Last 10 years" },
      versus: " compared with ",
      primary: "Primary balance",
      snowball: "Snowball effect",
      sfa: "Stock-flow adjustments",
      change: "Change in debt",
      interest: "interest",
      growth: "growth",
      rate: "interest rate",
      nominal: "nominal growth",
      debtIn: "Debt in {y}",
      ofGdp: "per cent of GDP",
      changeSince: "Change since {y}",
      points: "points of GDP",
      whereFrom: "Where the change came from",
      rg: "Interest rate minus growth",
      average: "average, {a}–{b}, points",
      table: ["Year", "Debt", "Change", "Primary balance", "Interest", "Growth", "Stock-flow", "Interest rate", "Nominal growth", "r − g"],
      csv: ["country_code", "country", "year", "debt_pct_gdp", "change_in_debt", "primary_balance_contribution", "interest", "growth_effect", "snowball_effect", "stock_flow_adjustments", "implicit_interest_rate", "nominal_gdp_growth", "r_minus_g"],
      file: "public-debt-",
      all: "EU27",
      ariaDebt: "Public debt of {c}, per cent of GDP: {v1} in {a} and {v2} in {b}.",
      ariaParts: "Contributions to the annual change in the debt of {c}, {a}–{b}, in points of GDP. The figures are in the table below.",
      ariaRg: "Implicit interest rate minus nominal growth in {c}, {a}–{b}, in points. The figures are in the table below.",
      error: "The data could not be loaded. Please reload the page."
    },
    es: {
      none: "Sin comparar",
      periods: { all: "Todos los años", "2008": "Desde 2008", "10": "Últimos 10 años" },
      versus: " frente a ",
      primary: "Saldo primario",
      snowball: "Efecto bola de nieve",
      sfa: "Ajustes stock-flujo",
      change: "Cambio en la deuda",
      interest: "intereses",
      growth: "crecimiento",
      rate: "tipo de interés",
      nominal: "crecimiento nominal",
      debtIn: "Deuda en {y}",
      ofGdp: "en % del PIB",
      changeSince: "Cambio desde {y}",
      points: "puntos del PIB",
      whereFrom: "De dónde viene el cambio",
      rg: "Interés menos crecimiento",
      average: "media de {a} a {b}, en puntos",
      table: ["Año", "Deuda", "Cambio", "Saldo primario", "Intereses", "Crecimiento", "Stock-flujo", "Tipo de interés", "Crecimiento nominal", "r − g"],
      csv: ["codigo_pais", "pais", "año", "deuda_pct_pib", "cambio_deuda", "contribucion_saldo_primario", "intereses", "efecto_crecimiento", "efecto_bola_de_nieve", "ajustes_stock_flujo", "tipo_interes_implicito", "crecimiento_nominal", "r_menos_g"],
      file: "deuda-publica-",
      all: "UE27",
      ariaDebt: "Deuda pública de {c}, en % del PIB: {v1} en {a} y {v2} en {b}.",
      ariaParts: "Contribuciones al cambio anual de la deuda de {c}, {a}–{b}, en puntos del PIB. Las cifras están en la tabla de abajo.",
      ariaRg: "Tipo de interés implícito menos crecimiento nominal en {c}, {a}–{b}, en puntos. Las cifras están en la tabla de abajo.",
      error: "No se han podido cargar los datos. Vuelve a cargar la página."
    }
  }[lang];

  var $ = function (id) { return document.getElementById(id); };
  var ui = {
    country: $("dd-country"), compare: $("dd-compare"), period: $("dd-period"), heading: $("dd-heading"),
    kpis: $("dd-kpis"), table: $("dd-table"), csvOne: $("dd-csv-one"), csvAll: $("dd-csv-all"),
    legendDebt: $("dd-legend-debt"), legendParts: $("dd-legend-parts"), legendRg: $("dd-legend-rg")
  };
  var boxes = { debt: $("dd-chart-debt"), parts: $("dd-chart-parts"), rg: $("dd-chart-rg") };

  var style = getComputedStyle(root);
  var prop = function (name) { return style.getPropertyValue(name).trim(); };
  var pal = {
    ink: prop("--dash-ink"), ink2: prop("--dash-ink-2"), muted: prop("--dash-muted"), grid: prop("--dash-grid"),
    axis: prop("--dash-axis"), surface: prop("--dash-surface"), country: prop("--dash-country"),
    compare: prop("--dash-compare"), s1: prop("--dash-s1"), s2: prop("--dash-s2"), s3: prop("--dash-s3")
  };
  var FONT = getComputedStyle(document.body).fontFamily;
  var motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var data, byCode = {}, charts = {};
  var state = { country: "ESP", compare: "", period: "all" };


  // ─── numbers and text ────────────────────────────────────

  var locale = lang === "es" ? "es-ES" : "en-GB", formats = {};
  function fmt(v, digits, signed) {
    if (v === null || v === undefined || isNaN(v)) return "–";
    var key = digits + (signed ? "s" : "");
    formats[key] = formats[key] || new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: signed ? "exceptZero" : "auto"
    });
    return formats[key].format(v).replace("-", "−");
  }
  function pct(v) { return v === null || v === undefined ? "–" : fmt(v, 1) + (lang === "es" ? " %" : "%"); }
  function tick(v) { return fmt(v, Number.isInteger(v) ? 0 : 1); }
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function round2(v) { return Math.round(v * 100) / 100; }
  // one decimal each, adjusted so that the shown parts add up to the shown total
  function roundParts(parts, total) {
    var shown = parts.map(function (v) { return Math.round(v * 10) / 10; });
    var diff = Math.round(total * 10) - Math.round(shown.reduce(function (a, v) { return a + v; }, 0) * 10);
    if (diff) {
      var j = 0;
      parts.forEach(function (v, i) { if (Math.abs(v - shown[i]) > Math.abs(parts[j] - shown[j])) j = i; });
      shown[j] = (Math.round(shown[j] * 10) + diff) / 10;
    }
    return shown;
  }
  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }


  // ─── data access ─────────────────────────────────────────

  function at(c, key, y) {
    var i = y - c.first;
    if (key === "snowball") {
      var a = at(c, "interest", y), b = at(c, "growth", y);
      return a === null || b === null ? null : round2(a + b);
    }
    if (key === "rg") {
      var r = at(c, "rate", y), g = at(c, "nominal", y);
      return r === null || g === null ? null : round2(r - g);
    }
    return i >= 0 && i < c[key].length && c[key][i] !== undefined ? c[key][i] : null;
  }
  function values(c, key, years) { return years.map(function (y) { return at(c, key, y); }); }
  function firstYear(c, key, years) {
    for (var i = 0; i < years.length; i++) if (at(c, key, years[i]) !== null) return years[i];
    return null;
  }
  function span() {
    var end = data.last;
    var start = state.period === "2008" ? 2008 : state.period === "10" ? end - 9 : data.first;
    var years = [];
    for (var y = start; y <= end; y++) years.push(y);
    return years;
  }


  // ─── start ───────────────────────────────────────────────

  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.all([
    fetch(root.getAttribute("data-src")).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fonts
  ]).then(function (res) { data = res[0]; start(); }).catch(function () {
    root.insertBefore(node("p", "dash-message", T.error), root.firstChild);
  });

  function start() {
    data.countries.forEach(function (c) { byCode[c.code] = c; });
    var sorted = data.countries.slice().sort(function (a, b) { return a[lang].localeCompare(b[lang], lang); });
    ui.compare.appendChild(new Option(T.none, ""));
    sorted.forEach(function (c) {
      ui.country.appendChild(new Option(c[lang], c.code));
      ui.compare.appendChild(new Option(c[lang], c.code));
    });
    Object.keys(T.periods).forEach(function (p) {
      var b = node("button", null, T.periods[p]);
      b.type = "button";
      b.setAttribute("data-period", p);
      ui.period.appendChild(b);
    });

    var q = new URLSearchParams(location.search);
    if (byCode[q.get("country")]) state.country = q.get("country");
    if (byCode[q.get("compare")] && q.get("compare") !== state.country) state.compare = q.get("compare");
    if (T.periods[q.get("years")]) state.period = q.get("years");
    ui.country.value = state.country;
    ui.compare.value = state.compare;

    ui.country.addEventListener("change", function () {
      state.country = ui.country.value;
      if (state.compare === state.country) state.compare = ui.compare.value = "";
      update();
    });
    ui.compare.addEventListener("change", function () {
      state.compare = ui.compare.value === state.country ? "" : ui.compare.value;
      ui.compare.value = state.compare;
      update();
    });
    ui.period.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      state.period = b.getAttribute("data-period");
      update();
    });
    ui.csvOne.addEventListener("click", function () { download([byCode[state.country]], state.country); });
    ui.csvAll.addEventListener("click", function () { download(data.countries, T.all); });

    Object.keys(boxes).forEach(function (k) { charts[k] = echarts.init(boxes[k], null, { renderer: "svg" }); });
    partsLegend();
    var timer;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { draw(); Object.keys(charts).forEach(function (k) { charts[k].resize(); }); }, 150);
    });
    draw();
  }

  function update() {
    var q = new URLSearchParams();
    q.set("country", state.country);
    if (state.compare) q.set("compare", state.compare);
    if (state.period !== "all") q.set("years", state.period);
    history.replaceState(null, "", "?" + q.toString() + location.hash);
    draw();
  }

  function draw() {
    var c = byCode[state.country], k = state.compare ? byCode[state.compare] : null, years = span();
    Array.prototype.forEach.call(ui.period.children, function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-period") === state.period));
    });
    ui.heading.textContent = c[lang] + (k ? T.versus + k[lang] : "") + ", " + years[0] + "–" + years[years.length - 1];
    drawKpis(c, k, years);
    drawDebt(c, k, years);
    drawParts(c, years);
    drawRg(c, k, years);
    drawTable(c, years);
  }


  // ─── figures above the charts ────────────────────────────

  function drawKpis(c, k, years) {
    var end = years[years.length - 1];
    function since(x) { return firstYear(x, "debt", years); }
    function change(x) { var a = since(x); return a === null ? null : round2(at(x, "debt", end) - at(x, "debt", a)); }
    function sums(x) {
      var a = since(x), out = [0, 0, 0];
      if (a === null) return out;
      for (var y = a + 1; y <= end; y++) PARTS.forEach(function (p, j) { out[j] += at(x, p[0], y) || 0; });
      return out;
    }
    function meanRg(x) {
      var v = values(x, "rg", years).filter(function (z) { return z !== null; });
      return v.length ? v.reduce(function (s, z) { return s + z; }, 0) / v.length : null;
    }
    var tiles = [
      { label: fill(T.debtIn, { y: end }), value: pct(at(c, "debt", end)), sub: T.ofGdp, cmp: k && pct(at(k, "debt", end)) },
      { label: fill(T.changeSince, { y: since(c) }), value: fmt(change(c), 1, true), sub: T.points, cmp: k && fmt(change(k), 1, true) },
      { label: T.whereFrom, parts: roundParts(sums(c), change(c)), sub: T.points },
      { label: T.rg, value: fmt(meanRg(c), 1, true), sub: fill(T.average, { a: firstYear(c, "rg", years), b: end }), cmp: k && fmt(meanRg(k), 1, true) }
    ];
    ui.kpis.replaceChildren.apply(ui.kpis, tiles.map(function (t) {
      var tile = node("div", "dash-kpi");
      tile.appendChild(node("p", "dash-kpi-label", t.label));
      if (t.parts) {
        var list = node("ul", "dash-kpi-parts");
        PARTS.forEach(function (p, j) {
          var item = node("li"), mark = node("span", "dash-mark");
          mark.style.background = pal[p[1]];
          item.appendChild(mark);
          item.appendChild(node("b", null, fmt(t.parts[j], 1, true)));
          item.appendChild(node("span", null, T[p[0]]));
          list.appendChild(item);
        });
        tile.appendChild(list);
      } else {
        tile.appendChild(node("p", "dash-kpi-value", t.value));
      }
      tile.appendChild(node("p", "dash-kpi-sub", t.sub));
      if (k && t.cmp) tile.appendChild(node("p", "dash-kpi-cmp", k[lang] + ": " + t.cmp));
      return tile;
    }));
  }


  // ─── chart pieces ────────────────────────────────────────

  function base(years, top) {
    return {
      animation: motion,
      animationDurationUpdate: 350,
      textStyle: { fontFamily: FONT, color: pal.ink2 },
      grid: { left: 46, right: 54, top: top, bottom: 28 },
      legend: { show: false },
      xAxis: {
        type: "category", data: years.map(String), boundaryGap: true,
        axisLine: { onZero: false, lineStyle: { color: pal.axis } }, axisTick: { show: false },
        axisLabel: { color: pal.muted, fontSize: 12, hideOverlap: true }
      },
      yAxis: {
        type: "value",
        axisLabel: { color: pal.muted, fontSize: 12, formatter: tick },
        splitLine: { lineStyle: { color: pal.grid, width: 1 } }
      }
    };
  }

  function tooltip(formatter, shadow) {
    return {
      trigger: "axis", confine: true, formatter: formatter,
      axisPointer: shadow
        ? { type: "shadow", shadowStyle: { color: "rgba(0, 51, 102, 0.06)" } }
        : { type: "line", lineStyle: { color: pal.muted, width: 1 } },
      backgroundColor: pal.surface, borderColor: pal.grid, borderWidth: 1, padding: [8, 12],
      textStyle: { color: pal.ink, fontFamily: FONT, fontSize: 13 },
      extraCssText: "border-radius: 8px; box-shadow: 0 6px 18px rgba(0, 51, 102, 0.12);"
    };
  }

  function tipRow(color, value, label, mark) {
    return '<div class="dd-tip-row"><span class="dd-key' + (mark ? " " + mark : "") + '" style="background:' + color +
      '"></span><b>' + esc(value) + "</b><span>" + esc(label) + "</span></div>";
  }

  function zeroLine() {
    return { silent: true, symbol: "none", label: { show: false }, data: [{ yAxis: 0 }],
             lineStyle: { color: pal.axis, width: 1, type: "solid" } };
  }

  // no draw-in animation: with empty first years it would place the end label at NaN
  function line(id, name, color, data, labelColor, showLabel) {
    return {
      id: id, name: name, type: "line", data: data, color: color, connectNulls: false, animationDuration: 0,
      lineStyle: { width: 2, cap: "round", join: "round" },
      symbol: "circle", symbolSize: 8, showSymbol: false,
      itemStyle: { borderColor: pal.surface, borderWidth: 2 },
      endLabel: { show: showLabel, color: labelColor, fontWeight: 700, fontSize: 12, formatter: function (p) { return fmt(p.value, 1); } }
    };
  }

  // end labels only when the two lines end apart; otherwise the legend and the tooltip carry them
  function apart(a, b, all) {
    if (a === null || b === null) return true;
    var v = all.filter(function (z) { return z !== null; });
    var range = Math.max.apply(null, v) - Math.min.apply(null, v) || 1;
    return Math.abs(a - b) / range > 0.08;
  }

  function lineLegend(box, c, k) {
    box.replaceChildren();
    if (!k) return;
    [[c, pal.country], [k, pal.compare]].forEach(function (p) {
      var key = node("span", "dash-key");
      var mark = node("span", "dash-mark line");
      mark.style.background = p[1];
      key.appendChild(mark);
      key.appendChild(document.createTextNode(p[0][lang]));
      box.appendChild(key);
    });
  }


  // ─── debt ratio ──────────────────────────────────────────

  function drawDebt(c, k, years) {
    var main = values(c, "debt", years), other = k ? values(k, "debt", years) : [];
    var showOther = k && apart(main[main.length - 1], other[other.length - 1], main.concat(other));
    var series = [line("main", c[lang], pal.country, main, pal.ink, true)];
    series[0].z = 3;
    if (k) series.push(line("other", k[lang], pal.compare, other, pal.muted, showOther));
    var option = base(years, 16);
    option.yAxis.min = 0;
    option.tooltip = tooltip(function (params) {
      var y = +params[0].axisValue, html = '<div class="dd-tip-year">' + y + "</div>";
      html += tipRow(pal.country, pct(at(c, "debt", y)), c[lang], "line");
      if (k) html += tipRow(pal.compare, pct(at(k, "debt", y)), k[lang], "line");
      return html;
    });
    option.series = series;
    charts.debt.setOption(option, { replaceMerge: ["series"] });
    lineLegend(ui.legendDebt, c, k);
    boxes.debt.setAttribute("aria-label", fill(T.ariaDebt, {
      c: c[lang], a: firstYear(c, "debt", years), b: years[years.length - 1],
      v1: pct(at(c, "debt", firstYear(c, "debt", years))), v2: pct(at(c, "debt", years[years.length - 1]))
    }));
  }


  // ─── what moved the debt ─────────────────────────────────

  var PARTS = [["primary", "s1"], ["snowball", "s2"], ["sfa", "s3"]];

  function partsLegend() {
    PARTS.concat([["change", "ink"]]).forEach(function (p) {
      var key = node("button", "dash-key");
      key.type = "button";
      key.setAttribute("aria-pressed", "true");
      var mark = node("span", "dash-mark" + (p[0] === "change" ? " dot" : ""));
      mark.style.background = pal[p[1]];
      key.appendChild(mark);
      key.appendChild(document.createTextNode(T[p[0]]));
      key.addEventListener("click", function () {
        key.setAttribute("aria-pressed", String(key.getAttribute("aria-pressed") !== "true"));
        charts.parts.dispatchAction({ type: "legendToggleSelect", name: T[p[0]] });
      });
      ui.legendParts.appendChild(key);
    });
  }

  // round only the outer end of each stack: the last part with the same sign
  function radius(rows, i, j) {
    var v = rows[j][i];
    if (!v) return 0;
    for (var m = j + 1; m < rows.length; m++) if (rows[m][i] && (rows[m][i] > 0) === (v > 0)) return 0;
    return v > 0 ? [4, 4, 0, 0] : [0, 0, 4, 4];
  }

  function drawParts(c, years) {
    var rows = PARTS.map(function (p) { return values(c, p[0], years); });
    var gap = boxes.parts.clientWidth < 640 ? 1 : 2;
    var series = PARTS.map(function (p, j) {
      return {
        id: p[0], name: T[p[0]], type: "bar", stack: "parts", color: pal[p[1]],
        barMaxWidth: 24, barCategoryGap: "28%",
        itemStyle: { borderColor: pal.surface, borderWidth: gap },
        emphasis: { disabled: true },
        data: rows[j].map(function (v, i) { return { value: v, itemStyle: { borderRadius: radius(rows, i, j) } }; })
      };
    });
    series[0].markLine = zeroLine();
    series.push({
      id: "change", name: T.change, type: "line", data: values(c, "change", years), z: 5,
      symbol: "circle", symbolSize: 8, showSymbol: true, lineStyle: { opacity: 0 }, emphasis: { disabled: true },
      itemStyle: { color: pal.ink, borderColor: pal.surface, borderWidth: 2 }
    });
    var option = base(years, 12);
    option.legend = { show: false, data: series.map(function (s) { return s.name; }) };
    option.tooltip = tooltip(function (params) {
      var y = +params[0].axisValue, html = '<div class="dd-tip-year">' + y + "</div>";
      if (at(c, "change", y) === null) return html;
      html += tipRow(pal.ink, fmt(at(c, "change", y), 1, true), T.change, "dot");
      html += tipRow(pal.s1, fmt(at(c, "primary", y), 1, true), T.primary);
      html += tipRow(pal.s2, fmt(at(c, "snowball", y), 1, true), T.snowball);
      html += '<div class="dd-tip-sub">' + esc(T.interest + " " + fmt(at(c, "interest", y), 1, true) + ", " +
              T.growth + " " + fmt(at(c, "growth", y), 1, true)) + "</div>";
      html += tipRow(pal.s3, fmt(at(c, "sfa", y), 1, true), T.sfa);
      return html;
    }, true);
    option.series = series;
    charts.parts.setOption(option, { replaceMerge: ["series"] });
    boxes.parts.setAttribute("aria-label", fill(T.ariaParts, { c: c[lang], a: firstYear(c, "change", years), b: years[years.length - 1] }));
  }


  // ─── interest rate minus growth ──────────────────────────

  function drawRg(c, k, years) {
    var main = values(c, "rg", years), other = k ? values(k, "rg", years) : [];
    var showOther = k && apart(main[main.length - 1], other[other.length - 1], main.concat(other));
    var series = [line("main", c[lang], pal.country, main, pal.ink, true)];
    series[0].markLine = zeroLine();
    series[0].z = 3;
    if (k) series.push(line("other", k[lang], pal.compare, other, pal.muted, showOther));
    var option = base(years, 16);
    option.tooltip = tooltip(function (params) {
      var y = +params[0].axisValue, html = '<div class="dd-tip-year">' + y + "</div>";
      [[c, pal.country]].concat(k ? [[k, pal.compare]] : []).forEach(function (p) {
        html += tipRow(p[1], fmt(at(p[0], "rg", y), 1, true), p[0][lang], "line");
        html += '<div class="dd-tip-sub">' + esc(T.rate + " " + pct(at(p[0], "rate", y)) + ", " + T.nominal + " " + pct(at(p[0], "nominal", y))) + "</div>";
      });
      return html;
    });
    option.series = series;
    charts.rg.setOption(option, { replaceMerge: ["series"] });
    lineLegend(ui.legendRg, c, k);
    boxes.rg.setAttribute("aria-label", fill(T.ariaRg, { c: c[lang], a: firstYear(c, "rg", years), b: years[years.length - 1] }));
  }


  // ─── table and downloads ─────────────────────────────────

  function drawTable(c, years) {
    var table = node("table"), head = node("thead"), body = node("tbody"), tr = node("tr");
    T.table.forEach(function (h) { var th = node("th", null, h); th.scope = "col"; tr.appendChild(th); });
    head.appendChild(tr);
    years.forEach(function (y) {
      if (at(c, "debt", y) === null) return;
      var row = node("tr"), th = node("th", null, String(y));
      th.scope = "row";
      row.appendChild(th);
      [fmt(at(c, "debt", y), 1), fmt(at(c, "change", y), 1, true), fmt(at(c, "primary", y), 1, true),
       fmt(at(c, "interest", y), 1, true), fmt(at(c, "growth", y), 1, true), fmt(at(c, "sfa", y), 1, true),
       fmt(at(c, "rate", y), 1), fmt(at(c, "nominal", y), 1), fmt(at(c, "rg", y), 1, true)].forEach(function (v) { row.appendChild(node("td", null, v)); });
      body.appendChild(row);
    });
    table.appendChild(head);
    table.appendChild(body);
    ui.table.replaceChildren(table);
  }

  function download(list, name) {
    var sep = lang === "es" ? ";" : ",";
    var number = function (v) { return v === null ? "" : lang === "es" ? String(v).replace(".", ",") : String(v); };
    var text = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var lines = [T.csv.join(sep)];
    list.forEach(function (c) {
      c.debt.forEach(function (_, i) {
        var y = c.first + i;
        lines.push([text(c.code), text(c[lang]), y].concat(
          ["debt", "change", "primary", "interest", "growth", "snowball", "sfa", "rate", "nominal", "rg"]
            .map(function (key) { return number(at(c, key, y)); })).join(sep));
      });
    });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" }));
    link.download = T.file + name + ".csv";
    document.body.appendChild(link);
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 0);
  }
})();
