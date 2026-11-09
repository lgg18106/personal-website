// IRPF simulator on es/irpf.html: two taxpayers side by side, what each pays as the salary rises and their
// returns step by step. The tax rules are in js/irpf-2025.js; Apache ECharts (js/vendor/echarts.min.js) draws
// the charts with the colours of the .dash rules in html/styles.scss. The two cases live in the address, so a
// link brings back the same comparison.
(function () {
  "use strict";

  var root = document.getElementById("irpf");
  if (!root || !window.echarts || !window.IRPF2025) return;

  var liquidar = IRPF2025.liquidar, VACIO = IRPF2025.VACIO;
  var $ = function (id) { return document.getElementById(id); };
  var style = getComputedStyle(root);
  var prop = function (name) { return style.getPropertyValue(name).trim(); };
  var pal = {
    ink: prop("--dash-ink"), ink2: prop("--dash-ink-2"), muted: prop("--dash-muted"), grid: prop("--dash-grid"),
    axis: prop("--dash-axis"), surface: prop("--dash-surface"), a: prop("--dash-s1"), b: prop("--dash-s2")
  };
  var FONT = getComputedStyle(document.body).fontFamily;
  var motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var QUIENES = ["a", "b"];


  // ─── choices ─────────────────────────────────────────────

  var RENTAS = [["sueldo", "Un sueldo"], ["pension", "Una pensión"]];
  var EDADES = [["joven", "Menos de 35 años"], ["adulto", "De 35 a 64 años"], ["mayor", "De 65 a 74 años"], ["mayor75", "75 años o más"]];
  var SITUACIONES = [["sin", "Sin pareja"], ["pareja", "En pareja, cada uno hace su declaración"], ["conjunta", "En pareja, declaración conjunta"]];
  var DISCAPACIDADES = [["no", "Ninguna"], ["d33", "Del 33 al 64 %"], ["d65", "Del 65 % o más"]];
  var GASTOS = [
    ["alquiler", "Alquiler de la vivienda en el año"],
    ["deporte", "Gimnasio o club deportivo en el año"],
    ["educacion", "Academias de idiomas o informática de los hijos"],
    ["veterinario", "Veterinario de una mascota adquirida en 2025"],
    ["donativos", "Donativos a ONG"],
    ["retenciones", "Retenciones de 2025 en la nómina o la pensión"]
  ];
  var ANDALUZAS = {
    alquiler: "Alquiler de la vivienda habitual", nacimiento: "Nacimiento o adopción", numerosa: "Familia numerosa",
    monoparental: "Familia monoparental", discapacidad: "Contribuyente con discapacidad", educacion: "Gastos educativos",
    deporte: "Ejercicio físico y deporte", veterinario: "Gastos veterinarios"
  };
  var ESCALAS = [
    ["andalucia", "Andalucía", "La mitad autonómica con la escala y los mínimos de la Junta, y con sus deducciones."],
    ["clase", "Escala de clase", "La escala estatal dos veces, como en los apuntes, sin los mínimos ni las deducciones de Andalucía."]
  ];
  var EJES = [30000, 60000, 100000, 300000];
  var CASOS = [
    ["soltero", "Sin hijos", { bruto: 25000 }],
    ["familia", "Pareja con dos hijos, conjunta", { bruto: 25000, situacion: "conjunta", hijos: 2 }],
    ["joven", "Joven de alquiler", { bruto: 18000, edad: "joven", alquiler: 6000, deporte: 360 }],
    ["smi", "Salario mínimo de 2025", { bruto: 16576 }],
    ["madre", "Madre sola, hijo de 2 años", { bruto: 22000, hijos: 1, menores3: 1, madre: true }],
    ["numerosa", "Familia numerosa, por separado", { bruto: 40000, situacion: "pareja", hijos: 3, menores3: 1 }],
    ["pension", "Pensionista de 70 años", { bruto: 20000, renta: "pension", edad: "mayor" }],
    ["alto", "Sueldo alto", { bruto: 90000 }]
  ];
  var INICIO = { a: "soltero", b: "familia", escala: "andalucia", eje: 60000 };
  var MAX_SUELDO = 1000000, MAX_SLIDER = 150000;

  // short keys for the address
  var CLAVES = {
    bruto: "s", renta: "r", edad: "e", situacion: "f", discapacidad: "d", hijos: "h", menores3: "h3", nacidos: "hn",
    madre: "m", ascendientes: "as", ascendientes75: "as75", alquiler: "al", deporte: "dp", educacion: "ed",
    veterinario: "vt", donativos: "dn", retenciones: "rt", nombre: "n"
  };
  var OPCIONES = { renta: RENTAS, edad: EDADES, situacion: SITUACIONES, discapacidad: DISCAPACIDADES };

  var state = {}, forms = {}, charts = {}, boxes = {};


  // ─── numbers and text ────────────────────────────────────

  var formats = {};
  function fmt(v, digits, signed) {
    if (v === null || v === undefined || isNaN(v)) return "–";
    if (Math.abs(v) < 0.5 / Math.pow(10, digits)) v = 0;   // no "−0,00"
    var key = digits + (signed ? "s" : "");
    formats[key] = formats[key] || new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: signed ? "exceptZero" : "auto"
    });
    // es-ES leaves four-digit numbers ungrouped; the tables read better with every thousand marked
    return formats[key].format(v).replace("-", "−").replace(/^(−?\d)(\d{3})(?=,|$)/, "$1.$2");
  }
  function euros(v, digits) { return fmt(v, digits === undefined ? 2 : digits) + " €"; }
  function pct(v) { return fmt(v, 1) + " %"; }
  function round(v, n) { var k = Math.pow(10, n); return Math.round(v * k) / k; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  // amounts as people type them in Spain: 25.000, 25000 or 1.234,56
  function leer(texto) {
    var s = String(texto).replace(/[^\d.,]/g, "");
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    else if (/\.\d{3}(\.|$)/.test(s)) s = s.replace(/\./g, "");
    var v = parseFloat(s);
    return isFinite(v) ? v : 0;
  }
  function nombre(who) { return state[who].nombre.trim() || who.toUpperCase(); }


  // ─── cases and the address ───────────────────────────────

  function caso(id) {
    var c = CASOS.filter(function (x) { return x[0] === id; })[0];
    return ajustar(Object.assign({}, VACIO, c ? c[2] : {}, { caso: c ? id : "" }));
  }

  // children under 3 cannot outnumber the children, and so on
  function ajustar(p) {
    p.bruto = clamp(p.bruto, 0, MAX_SUELDO);
    p.hijos = clamp(p.hijos, 0, 6);
    p.menores3 = clamp(p.menores3, 0, p.hijos);
    p.nacidos = clamp(p.nacidos, 0, p.menores3);
    p.ascendientes = clamp(p.ascendientes, 0, 2);
    p.ascendientes75 = clamp(p.ascendientes75, 0, p.ascendientes);
    if (!p.menores3 || p.renta !== "sueldo") p.madre = false;
    return p;
  }

  function codificar(p) {
    return Object.keys(CLAVES).filter(function (k) { return p[k] !== VACIO[k]; }).map(function (k) {
      return CLAVES[k] + "-" + (k === "madre" ? "1" : k === "nombre" ? encodeURIComponent(p[k]) : p[k]);
    }).join("_");
  }

  function descodificar(texto) {
    var inversas = {}, p = Object.assign({}, VACIO, { caso: "" });
    Object.keys(CLAVES).forEach(function (k) { inversas[CLAVES[k]] = k; });
    texto.split("_").forEach(function (par) {
      var i = par.indexOf("-"), k = inversas[par.slice(0, i)], v = par.slice(i + 1);
      if (i < 1 || !k) return;
      if (k === "madre") p.madre = v === "1";
      else if (k === "nombre") p.nombre = v.slice(0, 24);
      else if (OPCIONES[k]) { if (OPCIONES[k].some(function (o) { return o[0] === v; })) p[k] = v; }
      else if (isFinite(parseFloat(v)) && parseFloat(v) >= 0) p[k] = k === "bruto" || GASTOS.some(function (g) { return g[0] === k; }) ? parseFloat(v) : Math.round(parseFloat(v));
    });
    return ajustar(p);
  }

  function guardar() {
    var partes = QUIENES.map(function (who) { return who + "=" + codificar(state[who]); });
    if (state.escala !== INICIO.escala) partes.push("escala=" + state.escala);
    if (state.eje !== INICIO.eje) partes.push("eje=" + state.eje);
    history.replaceState(null, "", location.pathname + "?" + partes.join("&") + location.hash);
  }

  function leerDireccion() {
    var q = new URLSearchParams(location.search);
    QUIENES.forEach(function (who) { state[who] = q.get(who) ? descodificar(q.get(who)) : caso(INICIO[who]); });
    state.escala = ESCALAS.some(function (e) { return e[0] === q.get("escala"); }) ? q.get("escala") : INICIO.escala;
    state.eje = EJES.indexOf(+q.get("eje")) >= 0 ? +q.get("eje") : INICIO.eje;
    ajustarEje();
  }

  // widen the charts when a salary would fall outside them
  function ajustarEje() {
    var mayor = Math.max(state.a.bruto, state.b.bruto);
    if (mayor > state.eje) state.eje = EJES.filter(function (e) { return e >= mayor; })[0] || EJES[EJES.length - 1];
  }


  // ─── the two forms ───────────────────────────────────────

  function campo(texto, control, cls) {
    var f = node("label", "dash-field" + (cls ? " " + cls : ""));
    f.appendChild(document.createTextNode(texto));
    f.appendChild(control);
    return f;
  }
  function lista(opciones) {
    var s = document.createElement("select");
    opciones.forEach(function (o) { s.appendChild(new Option(o[1], o[0])); });
    return s;
  }
  function cifras(s, n) {
    s.replaceChildren();
    for (var i = 0; i <= n; i++) s.appendChild(new Option(String(i), String(i)));
  }
  function importe() {
    var i = document.createElement("input");
    i.type = "text";
    i.inputMode = "decimal";
    i.autocomplete = "off";
    i.spellcheck = false;
    return i;
  }
  function plegable(texto) {
    var d = node("details", "irpf-more");
    d.appendChild(node("summary", null, texto));
    return d;
  }

  function construir(who) {
    var box = $("ir-" + who), f = {};
    var head = node("div", "irpf-person-head"), mark = node("span", "dash-mark");
    mark.style.background = pal[who];
    f.titulo = node("h3");
    f.titulo.id = "ir-" + who + "-title";
    head.appendChild(mark);
    head.appendChild(f.titulo);
    box.appendChild(head);

    var arriba = node("div", "irpf-grid irpf-top");
    f.caso = lista([["", "Personalizado"]].concat(CASOS.map(function (c) { return [c[0], c[1]]; })));
    arriba.appendChild(campo("Caso de partida", f.caso));
    f.nombre = document.createElement("input");
    f.nombre.type = "text";
    f.nombre.maxLength = 24;
    f.nombre.placeholder = who.toUpperCase();
    f.nombre.autocomplete = "off";
    arriba.appendChild(campo("Nombre", f.nombre));
    box.appendChild(arriba);

    var grid = node("div", "irpf-grid");
    f.bruto = importe();
    f.slider = document.createElement("input");
    f.slider.type = "range";
    f.slider.min = 0;
    f.slider.max = MAX_SLIDER;
    f.slider.step = 100;
    f.slider.setAttribute("aria-label", "Sueldo o pensión bruta al año");
    var sueldo = campo("Sueldo o pensión bruta al año, en euros", f.bruto, "irpf-wide irpf-salary");
    sueldo.appendChild(f.slider);
    grid.appendChild(sueldo);
    f.renta = lista(RENTAS);
    grid.appendChild(campo("Qué cobra", f.renta));
    f.edad = lista(EDADES);
    grid.appendChild(campo("Edad", f.edad));
    f.situacion = lista(SITUACIONES);
    grid.appendChild(campo("Pareja", f.situacion, "irpf-wide"));
    f.hijos = lista([]);
    cifras(f.hijos, 6);
    grid.appendChild(campo("Hijos que conviven, menores de 25", f.hijos));
    f.menores3 = lista([]);
    grid.appendChild(campo("De ellos, menores de 3 años", f.menores3));
    f.madreBox = node("label", "irpf-check irpf-wide");
    f.madre = document.createElement("input");
    f.madre.type = "checkbox";
    f.madreBox.appendChild(f.madre);
    f.madreBox.appendChild(document.createTextNode("Es la madre y trabaja: deducción por maternidad"));
    grid.appendChild(f.madreBox);
    box.appendChild(grid);

    f.mas = plegable("Más situaciones familiares");
    var otros = node("div", "irpf-grid");
    f.nacidos = lista([]);
    otros.appendChild(campo("Hijos nacidos en 2025", f.nacidos));
    f.discapacidad = lista(DISCAPACIDADES);
    otros.appendChild(campo("Discapacidad", f.discapacidad));
    f.ascendientes = lista([]);
    cifras(f.ascendientes, 2);
    otros.appendChild(campo("Padres o abuelos de 65 años o más que conviven", f.ascendientes));
    f.ascendientes75 = lista([]);
    otros.appendChild(campo("De ellos, de 75 o más", f.ascendientes75));
    f.mas.appendChild(otros);
    box.appendChild(f.mas);

    f.gastos = plegable("Gastos que desgravan y retenciones");
    f.notaClase = node("p", "irpf-note", "Con la escala de clase no se aplican las deducciones de Andalucía.");
    f.gastos.appendChild(f.notaClase);
    var gastos = node("div", "irpf-grid");
    GASTOS.forEach(function (g) {
      f[g[0]] = importe();
      gastos.appendChild(campo(g[1], f[g[0]]));
    });
    f.gastos.appendChild(gastos);
    box.appendChild(f.gastos);

    forms[who] = f;
    escuchar(who);
  }

  function escuchar(who) {
    var f = forms[who];
    function cambiar(k, v) {
      state[who][k] = v;
      state[who].caso = "";
      ajustar(state[who]);
      if (k === "bruto") ajustarEje();
      rellenar(who, k);
      update(true);
    }
    f.caso.addEventListener("change", function () {
      if (!f.caso.value) return;
      var guardado = state[who].nombre;
      state[who] = caso(f.caso.value);
      state[who].nombre = guardado;
      ajustarEje();
      rellenar(who);
      update(true);
    });
    f.nombre.addEventListener("input", function () {
      state[who].nombre = f.nombre.value.replace(/_/g, " ").slice(0, 24);
      update(true);
    });
    f.bruto.addEventListener("input", function () { cambiar("bruto", leer(f.bruto.value)); });
    f.bruto.addEventListener("blur", function () { f.bruto.value = fmt(state[who].bruto, state[who].bruto % 1 ? 2 : 0); });
    f.slider.addEventListener("input", function () { cambiar("bruto", +f.slider.value); });
    ["renta", "edad", "situacion", "discapacidad"].forEach(function (k) {
      f[k].addEventListener("change", function () { cambiar(k, f[k].value); });
    });
    ["hijos", "menores3", "nacidos", "ascendientes", "ascendientes75"].forEach(function (k) {
      f[k].addEventListener("change", function () { cambiar(k, +f[k].value); });
    });
    f.madre.addEventListener("change", function () { cambiar("madre", f.madre.checked); });
    GASTOS.forEach(function (g) {
      var k = g[0];
      f[k].addEventListener("input", function () { cambiar(k, Math.min(leer(f[k].value), MAX_SUELDO)); });
      f[k].addEventListener("blur", function () { f[k].value = state[who][k] ? fmt(state[who][k], state[who][k] % 1 ? 2 : 0) : ""; });
    });
  }

  // write the state into the form, except the field being typed in
  function rellenar(who, tecleando) {
    var p = state[who], f = forms[who];
    f.caso.value = p.caso || "";
    if (document.activeElement !== f.nombre) f.nombre.value = p.nombre;
    if (tecleando !== "bruto" || document.activeElement !== f.bruto) f.bruto.value = fmt(p.bruto, p.bruto % 1 ? 2 : 0);
    f.slider.value = Math.min(p.bruto, MAX_SLIDER);
    ["renta", "edad", "situacion", "discapacidad"].forEach(function (k) { f[k].value = p[k]; });
    cifras(f.menores3, p.hijos);
    cifras(f.nacidos, p.menores3);
    cifras(f.ascendientes75, p.ascendientes);
    ["hijos", "menores3", "nacidos", "ascendientes", "ascendientes75"].forEach(function (k) { f[k].value = String(p[k]); });
    f.madre.checked = p.madre;
    f.madreBox.hidden = !(p.menores3 > 0 && p.renta === "sueldo");
    GASTOS.forEach(function (g) {
      var k = g[0];
      if (tecleando !== k || document.activeElement !== f[k]) f[k].value = p[k] ? fmt(p[k], p[k] % 1 ? 2 : 0) : "";
    });
    // open a folded part when the case uses it
    if (p.nacidos || p.discapacidad !== "no" || p.ascendientes) f.mas.open = true;
    if (GASTOS.some(function (g) { return p[g[0]]; })) f.gastos.open = true;
    marcar(who);
  }

  function marcar(who) {
    var f = forms[who], clase = state.escala === "clase";
    f.titulo.textContent = nombre(who);
    f.notaClase.hidden = !clase;
    ["alquiler", "deporte", "educacion", "veterinario"].forEach(function (k) { f[k].disabled = clase; });
  }


  // ─── start ───────────────────────────────────────────────

  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fonts.then(start);

  function start() {
    leerDireccion();
    QUIENES.forEach(function (who) { construir(who); rellenar(who); });
    pastillas($("ir-escala"), ESCALAS.map(function (e) { return [e[0], e[1]]; }), function (v) { state.escala = v; });
    pastillas($("ir-eje"), EJES.map(function (e) { return [String(e), "Hasta " + fmt(e, 0) + " €"]; }), function (v) { state.eje = +v; });
    $("ir-link").addEventListener("click", copiar);
    $("ir-reset").addEventListener("click", function () {
      state = {};
      history.replaceState(null, "", location.pathname + location.hash);
      leerDireccion();
      QUIENES.forEach(function (who) { forms[who].mas.open = forms[who].gastos.open = false; rellenar(who); });
      update(false);
    });
    ["irpf", "marginal", "medio"].forEach(function (k) {
      boxes[k] = $("ir-chart-" + k);
      charts[k] = echarts.init(boxes[k], null, { renderer: "svg" });
    });
    var timer;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { Object.keys(charts).forEach(function (k) { charts[k].resize(); }); }, 150);
    });
    draw();
  }

  function pastillas(box, opciones, elegir) {
    opciones.forEach(function (o) {
      var b = node("button", null, o[1]);
      b.type = "button";
      b.setAttribute("data-value", o[0]);
      box.appendChild(b);
    });
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      elegir(b.getAttribute("data-value"));
      update(true);
    });
  }

  function copiar() {
    var boton = $("ir-link"), texto = boton.textContent;
    guardar();
    var hecho = function () {
      boton.textContent = "Enlace copiado";
      setTimeout(function () { boton.textContent = texto; }, 2000);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(hecho, function () {});
  }

  // redraw at most once a frame while the slider moves
  var pendiente = false;
  function update(conDireccion) {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () {
      pendiente = false;
      if (conDireccion) guardar();
      QUIENES.forEach(marcar);
      draw();
    });
  }

  function draw() {
    [["ir-escala", state.escala], ["ir-eje", String(state.eje)]].forEach(function (p) {
      Array.prototype.forEach.call($(p[0]).children, function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === p[1]));
      });
    });
    $("ir-escala-nota").textContent = ESCALAS.filter(function (e) { return e[0] === state.escala; })[0][2];
    var r = { a: liquidar(state.a, state.escala), b: liquidar(state.b, state.escala) };
    var c = curvas();
    drawKpis(r);
    drawIrpf(r, c);
    drawRate("marginal", c, r);
    drawRate("medio", c, r);
    drawTable(r);
  }


  // ─── figures above the charts ────────────────────────────

  // of 100 € more a month (1,200 € a year), what is left after IRPF and contributions
  function queda(who, r) {
    var mas = liquidar(Object.assign({}, state[who], { bruto: state[who].bruto + 1200 }), state.escala);
    return 100 - ((mas.irpf - r.irpf) + (mas.cotizaciones - r.cotizaciones)) / 12;
  }

  function drawKpis(r) {
    var tiles = [
      { label: "IRPF del año", value: function (w) { return euros(r[w].irpf, 0); }, sub: "después de todas las deducciones" },
      { label: "Tipo medio", value: function (w) { return pct(r[w].tipoMedio); }, sub: "el IRPF sobre el sueldo bruto" },
      { label: "De 100 € más al mes, le quedan", value: function (w) { return euros(queda(w, r[w]), 1); }, sub: "el resto se va en IRPF y cotizaciones" },
      { label: "Le queda al año", value: function (w) { return euros(r[w].neta, 0); }, sub: "después de cotizaciones e IRPF" }
    ];
    var box = $("ir-kpis");
    box.replaceChildren.apply(box, tiles.map(function (t) {
      var tile = node("div", "dash-kpi");
      tile.appendChild(node("p", "dash-kpi-label", t.label));
      var list = node("ul", "dash-kpi-parts irpf-kpi");
      QUIENES.forEach(function (w) {
        var item = node("li"), mark = node("span", "dash-mark");
        mark.style.background = pal[w];
        item.appendChild(mark);
        item.appendChild(node("b", null, t.value(w)));
        item.appendChild(node("span", null, nombre(w)));
        list.appendChild(item);
      });
      tile.appendChild(list);
      tile.appendChild(node("p", "dash-kpi-sub", t.sub));
      return tile;
    }));
  }


  // ─── charts ──────────────────────────────────────────────

  // each person's tax as the salary goes from 0 to the edge of the chart, everything else unchanged
  function curvas() {
    var pasos = 800, out = {};
    QUIENES.forEach(function (w) {
      var p = Object.assign({}, state[w]), irpf = [], marginal = [], medio = [];
      for (var i = 0; i <= pasos; i++) {
        var s = Math.round(state.eje * i / pasos);
        p.bruto = s;
        var t = liquidar(p, state.escala).irpf;
        p.bruto = s + 1;
        var t1 = liquidar(p, state.escala).irpf;
        irpf.push([s, round(t, 2)]);
        marginal.push([s, round((t1 - t) * 100, 1)]);
        medio.push([s, s >= 1000 ? round(100 * t / s, 2) : null]);
      }
      out[w] = { irpf: irpf, marginal: marginal, medio: medio };
    });
    return out;
  }

  function marginalEn(w, s) {
    var p = Object.assign({}, state[w], { bruto: s });
    var t = liquidar(p, state.escala).irpf;
    p.bruto = s + 1;
    return (liquidar(p, state.escala).irpf - t) * 100;
  }

  function base(top, yFormatter) {
    return {
      animation: motion,
      animationDurationUpdate: 250,
      textStyle: { fontFamily: FONT, color: pal.ink2 },
      grid: { left: 58, right: 22, top: top, bottom: 30 },
      legend: { show: false },
      xAxis: {
        type: "value", min: 0, max: state.eje, splitNumber: 6,
        axisLine: { lineStyle: { color: pal.axis } }, axisTick: { show: false }, splitLine: { show: false },
        axisLabel: { color: pal.muted, fontSize: 12, hideOverlap: true, formatter: function (v) { return fmt(v, 0); } }
      },
      yAxis: {
        type: "value",
        axisLabel: { color: pal.muted, fontSize: 12, formatter: yFormatter },
        splitLine: { lineStyle: { color: pal.grid, width: 1 } }
      }
    };
  }

  function tooltip(formatter) {
    return {
      trigger: "axis", confine: true, formatter: formatter,
      axisPointer: { type: "line", lineStyle: { color: pal.muted, width: 1 } },
      backgroundColor: pal.surface, borderColor: pal.grid, borderWidth: 1, padding: [8, 12],
      textStyle: { color: pal.ink, fontFamily: FONT, fontSize: 13 },
      extraCssText: "border-radius: 8px; box-shadow: 0 6px 18px rgba(0, 51, 102, 0.12);"
    };
  }

  function tipRow(color, value, label) {
    return '<div class="dd-tip-row"><span class="dd-key line" style="background:' + color + '"></span><b>' +
      esc(value) + "</b><span>" + esc(label) + "</span></div>";
  }

  function linea(w, data) {
    return {
      id: w, name: nombre(w), type: "line", data: data, color: pal[w], showSymbol: false, animationDuration: 0,
      lineStyle: { width: 2, cap: "round", join: "round" }, emphasis: { disabled: true }, z: w === "a" ? 3 : 2
    };
  }

  // a dot on each line at the person's own salary
  function punto(w, x, y) {
    return {
      id: "punto-" + w, type: "scatter", data: [[x, y]], symbolSize: 11, z: 5, silent: true, tooltip: { show: false },
      itemStyle: { color: pal[w], borderColor: pal.surface, borderWidth: 2 }
    };
  }

  function leyenda(id) {
    var box = $(id);
    box.replaceChildren();
    QUIENES.forEach(function (w) {
      var key = node("span", "dash-key"), mark = node("span", "dash-mark line");
      mark.style.background = pal[w];
      key.appendChild(mark);
      key.appendChild(document.createTextNode(nombre(w)));
      box.appendChild(key);
    });
  }

  function sueldoTip(params) {
    var lineas = params.filter(function (p) { return QUIENES.indexOf(p.seriesId) >= 0; });
    return lineas.length ? '<div class="dd-tip-year">Con ' + esc(euros(lineas[0].data[0], 0)) + " al año</div>" : "";
  }

  function drawIrpf(r, c) {
    var option = base(16, function (v) { return fmt(v, 0); });
    option.tooltip = tooltip(function (params) {
      var html = sueldoTip(params);
      params.forEach(function (p) {
        if (QUIENES.indexOf(p.seriesId) < 0) return;
        html += tipRow(pal[p.seriesId], euros(p.data[1], 0), nombre(p.seriesId));
      });
      return html;
    });
    option.series = QUIENES.map(function (w) { return linea(w, c[w].irpf); }).concat(
      QUIENES.map(function (w) { return punto(w, r[w].bruto, r[w].irpf); }));
    option.series[0].markLine = {
      silent: true, symbol: "none", label: { show: false }, data: [{ yAxis: 0 }],
      lineStyle: { color: pal.axis, width: 1, type: "solid" }
    };
    charts.irpf.setOption(option, { replaceMerge: ["series"] });
    leyenda("ir-legend-irpf");
    boxes.irpf.setAttribute("aria-label", "IRPF del año según el sueldo bruto, de 0 a " + euros(state.eje, 0) + ". " +
      QUIENES.map(function (w) { return nombre(w) + " paga " + euros(r[w].irpf, 0) + " con " + euros(r[w].bruto, 0); }).join(" y ") +
      ". Las cifras están en la tabla de abajo.");
  }

  // the marginal and the average rate; past the ends of the scale the lines are cut, not squeezed
  function drawRate(k, c, r) {
    var option = base(16, function (v) { return fmt(v, 0) + " %"; });
    option.yAxis.min = function (v) { return Math.max(Math.floor(v.min / 10) * 10, k === "marginal" ? -20 : -30); };
    option.yAxis.max = function (v) { return Math.min(Math.ceil(v.max / 10) * 10, 100); };
    option.tooltip = tooltip(function (params) {
      var html = sueldoTip(params);
      params.forEach(function (p) {
        var w = p.seriesId;
        if (QUIENES.indexOf(w) < 0 || p.data[1] === null) return;
        html += tipRow(pal[w], pct(p.data[1]), nombre(w));
        if (k === "marginal") {
          var t = liquidar(Object.assign({}, state[w], { bruto: p.data[0] }), state.escala);
          html += '<div class="dd-tip-sub">' + esc("tipo de su tramo en la escala: " + pct(t.tipoTramo)) + "</div>";
        }
      });
      return html;
    });
    option.series = QUIENES.map(function (w) { return linea(w, c[w][k]); }).concat(QUIENES.map(function (w) {
      return punto(w, r[w].bruto, k === "marginal" ? marginalEn(w, r[w].bruto) : r[w].tipoMedio);
    }));
    charts[k].setOption(option, { replaceMerge: ["series"] });
    leyenda("ir-legend-" + k);
    boxes[k].setAttribute("aria-label", (k === "marginal" ? "Tipo marginal" : "Tipo medio") + " del IRPF según el sueldo bruto, de 0 a " +
      euros(state.eje, 0) + ". Las cifras de cada uno están en la tabla de abajo.");
  }


  // ─── the return step by step ─────────────────────────────

  var FILAS = [
    { t: "Sueldo o pensión bruta", v: function (r) { return r.bruto; } },
    { t: "Cotizaciones a la Seguridad Social", v: function (r) { return -r.cotizaciones; }, opcional: true },
    { t: "Otros gastos deducibles", v: function (r) { return -r.otrosGastos; } },
    { t: "Reducción por rendimientos del trabajo", v: function (r) { return -r.reduccion; }, opcional: true },
    { t: "Base imponible", v: function (r) { return r.baseImponible; }, total: true },
    { t: "Reducción por tributación conjunta", v: function (r) { return -r.reduccionConjunta; }, opcional: true },
    { t: "Base liquidable", v: function (r) { return r.baseLiquidable; }, total: true },
    { t: "Mínimo personal y familiar estatal", v: function (r) { return r.minimoEstatal.total; }, nota: true },
    { t: "Escala estatal sobre la base liquidable", v: function (r) { return r.escalaBaseEstatal; } },
    { t: "Escala estatal sobre el mínimo", v: function (r) { return -r.escalaMinimoEstatal; } },
    { t: "Cuota íntegra estatal", v: function (r) { return r.cuotaEstatal; }, total: true },
    { t: "Mínimo personal y familiar autonómico", v: function (r) { return r.minimoAutonomico.total; }, nota: true },
    { t: "Escala autonómica sobre la base liquidable", v: function (r) { return r.escalaBaseAutonomica; } },
    { t: "Escala autonómica sobre el mínimo", v: function (r) { return -r.escalaMinimoAutonomico; } },
    { t: "Cuota íntegra autonómica", v: function (r) { return r.cuotaAutonomica; }, total: true },
    { t: "Deducción por donativos", v: function (r) { return -r.donativos; }, opcional: true },
    { t: "Deducciones de Andalucía", v: function (r) { return -r.andaluzasAplicadas; }, opcional: true, andaluzas: true },
    { t: "Cuota líquida", v: function (r) { return r.cuotaLiquida; }, total: true },
    { t: "Deducción para sueldos bajos", v: function (r) { return -r.sueldosBajos; }, opcional: true },
    { t: "Deducción por maternidad", v: function (r) { return -r.maternidad; }, opcional: true },
    { t: "Deducción por familia numerosa o monoparental", v: function (r) { return -r.familia; }, opcional: true },
    { t: "IRPF del año", v: function (r) { return r.irpf; }, total: true, final: true },
    { t: "Retenciones", v: function (r) { return -r.retenciones; }, opcional: true },
    { t: "Resultado de la declaración", resultado: true },
    { t: "Tipo medio", p: function (r) { return r.tipoMedio; } },
    { t: "Tipo de su tramo en la escala", p: function (r) { return r.tipoTramo; } }
  ];

  function resultado(v) {
    if (Math.abs(v) < 0.005) return "0,00 €";
    return v > 0 ? "a pagar " + euros(v) : "a devolver " + euros(-v);
  }

  function drawTable(r) {
    var table = node("table", "irpf-table"), head = node("thead"), body = node("tbody"), tr = node("tr");
    var th = node("th", null, "Paso");
    th.scope = "col";
    tr.appendChild(th);
    QUIENES.forEach(function (w) {
      var h = node("th"), mark = node("span", "dash-mark");
      h.scope = "col";
      mark.style.background = pal[w];
      h.appendChild(mark);
      h.appendChild(document.createTextNode(nombre(w)));
      tr.appendChild(h);
    });
    head.appendChild(tr);

    function fila(texto, celdas, cls) {
      var row = node("tr", cls), h = node("th", null, texto);
      h.scope = "row";
      row.appendChild(h);
      celdas.forEach(function (v) { row.appendChild(node("td", null, v)); });
      body.appendChild(row);
    }

    FILAS.forEach(function (f) {
      if (f.resultado) {
        if (r.a.retenciones || r.b.retenciones) fila(f.t, QUIENES.map(function (w) { return resultado(r[w].resultado); }), "irpf-total");
        return;
      }
      if (f.p) { fila(f.t, QUIENES.map(function (w) { return pct(f.p(r[w])); })); return; }
      var v = QUIENES.map(function (w) { return f.v(r[w]); });
      if (f.opcional && v.every(function (x) { return Math.abs(x) < 0.005; })) return;
      fila(f.t, v.map(function (x) { return euros(x); }),
           f.final ? "irpf-total irpf-final" : f.total ? "irpf-total" : f.nota ? "irpf-aside" : "");
      if (f.andaluzas) {
        Object.keys(ANDALUZAS).forEach(function (k) {
          var d = QUIENES.map(function (w) {
            var x = r[w].andaluzas.filter(function (a) { return a[0] === k; })[0];
            return x ? x[1] : 0;
          });
          if (d[0] || d[1]) fila(ANDALUZAS[k], d.map(function (x) { return x ? euros(-x) : ""; }), "irpf-sub");
        });
        var fuera = QUIENES.map(function (w) { return r[w].andaluzasTotal - r[w].andaluzasAplicadas; });
        if (fuera[0] > 0.005 || fuera[1] > 0.005) {
          fila("Lo que no cabe en la cuota autonómica", fuera.map(function (x) { return x > 0.005 ? euros(x) : ""; }), "irpf-sub");
        }
      }
    });
    table.appendChild(head);
    table.appendChild(body);
    $("ir-table").replaceChildren(table);
  }
})();
