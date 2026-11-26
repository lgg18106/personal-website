// IRPF simulator on es/irpf.html: two taxpayers side by side, what each pays as the salary rises and their
// returns step by step. The tax rules are in js/irpf-2025.js; Apache ECharts (js/vendor/echarts.min.js) draws
// the charts with the colours of the .dash rules in html/styles.scss. The two cases live in the address, so a
// link brings back the same comparison.
(function () {
  "use strict";

  var root = document.getElementById("irpf");
  if (!root || !window.echarts || !window.IRPF2025) return;

  var liquidar = IRPF2025.liquidar, cotizar = IRPF2025.cotizar, VACIO = IRPF2025.VACIO;
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
  var GRADOS = DISCAPACIDADES.slice(1);
  var CONTRATOS = [["indefinido", "Indefinido"], ["temporal", "Temporal"]];
  // art. 23.2, by the date and the kind of the lease
  var REDUCCIONES = [
    ["60", "Contrato anterior al 26-5-2023: 60 %"],
    ["50", "Contrato posterior, en general: 50 %"],
    ["rehabilitada", "Posterior, vivienda rehabilitada: 60 %"],
    ["70", "Posterior, inquilino de 18 a 35 años en zona tensionada: 70 %"],
    ["90", "Posterior, renta rebajada en zona tensionada: 90 %"],
    ["0", "No es una vivienda: sin reducción"]
  ];
  var OTRAS = [
    ["ahorro", "Intereses, dividendos y ganancias por ventas"],
    ["alquilerCobrado", "Alquiler cobrado por una vivienda"],
    ["alquilerGastos", "Gastos de esa vivienda (IBI, comunidad, intereses, amortización)"],
    ["actividadIngresos", "Ingresos de una actividad como autónomo"],
    ["actividadGastos", "Gastos de la actividad, con la cuota de autónomo"]
  ];
  var GASTOS = [
    ["alquiler", "Alquiler de la vivienda en el año"],
    ["hipoteca", "Hipoteca de una vivienda comprada antes de 2013, pagado en el año"],
    ["plan", "Aportaciones a su plan de pensiones"],
    ["guarderia", "Guardería de los menores de 3 años, sin contar las ayudas"],
    ["empleadaHogar", "Seguridad Social pagada por una empleada del hogar"],
    ["deporte", "Gimnasio o club deportivo en el año"],
    ["educacion", "Academias de idiomas o informática de los hijos"],
    ["veterinario", "Veterinario de una mascota adquirida en 2025"],
    ["donativos", "Donativos a ONG"]
  ];
  // as on the employer's certificate; the contributions are worked out when left empty
  var NOMINA = [
    ["cotizacionesDadas", "Cotizaciones a la Seguridad Social del año"],
    ["retenciones", "Retenciones de 2025 en la nómina o la pensión"]
  ];
  // what only the Andalusian deductions use
  var SOLO_ANDALUCIA = ["alquiler", "empleadaHogar", "deporte", "educacion", "veterinario", "celiacos", "municipioPequeno"];
  var MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  // [text, box in Renta WEB 2025]
  var ANDALUZAS = {
    alquiler: ["Alquiler de la vivienda habitual", "0853"], nacimiento: ["Nacimiento o adopción", "0850"],
    numerosa: ["Familia numerosa", "0816"], monoparental: ["Familia monoparental", "0857"],
    discapacidad: ["Contribuyente con discapacidad", "0856"], asistencia: ["Asistencia a personas con discapacidad", "0858"],
    ayudaDomestica: ["Ayuda doméstica", "0862"], educacion: ["Gastos educativos", "0849"],
    deporte: ["Ejercicio físico y deporte", "0921"], veterinario: ["Gastos veterinarios", "0995"],
    celiaca: ["Familias con celiaquía", "1476"]
  };
  var ESCALAS = IRPF2025.COMUNIDADES;
  function notaEscala(id) {
    if (id === "andalucia") return "La mitad autonómica con la escala y los mínimos de la Junta, y con sus deducciones.";
    if (id === "clase") return "La escala estatal dos veces, como en los apuntes, sin los mínimos ni las deducciones de Andalucía.";
    var c = ESCALAS.filter(function (e) { return e[0] === id; })[0];
    return "La mitad autonómica con la escala y los mínimos de " + c[1] + ". Sus deducciones propias no están: " +
      "el simulador solo calcula las de Andalucía.";
  }
  var PARTIDAS = [
    ["sueldo", "Sueldo bruto", ""],
    ["base", "Base liquidable", "Se escribe la base liquidable, como en los ejercicios de clase. Ya lleva restadas las cotizaciones, " +
      "los gastos y las reducciones, también la de la declaración conjunta, y no se aplica la deducción para sueldos bajos, que depende del sueldo."]
  ];
  var EJES = [30000, 60000, 100000, 300000];
  var CASOS = [
    ["soltero", "Sin hijos", { bruto: 25000 }],
    ["familia", "Pareja con dos hijos, conjunta", { bruto: 25000, situacion: "conjunta", hijos: 2 }],
    ["joven", "Joven de alquiler", { bruto: 18000, edad: "joven", alquiler: 6000, deporte: 360 }],
    ["smi", "Salario mínimo de 2025", { bruto: 16576 }],
    ["madre", "Madre sola, hijo de 2 años", { bruto: 22000, hijos: 1, menores3: 1, madre: true }],
    ["bebe", "Bebé nacido en julio de 2025", { bruto: 28000, situacion: "pareja", hijos: 1, menores3: 1, nacidos: 1, mes: 7, madre: true }],
    ["numerosa", "Familia numerosa, por separado", { bruto: 40000, situacion: "pareja", hijos: 3, menores3: 1 }],
    ["pension", "Pensionista de 70 años", { bruto: 20000, renta: "pension", edad: "mayor" }],
    ["alto", "Sueldo alto", { bruto: 90000 }],
    ["plan", "Con plan de pensiones", { bruto: 45000, plan: 1500 }],
    ["golpe", "Tres años cobrados de una vez", { bruto: 60000, irregular: 60000 }],
    ["dosSueldos", "Pareja con dos sueldos, conjunta", { bruto: 30000, situacion: "conjunta", sueldoPareja: 20000, hijos: 2 }],
    ["discapacidad", "Hijo con discapacidad", { bruto: 30000, situacion: "conjunta", hijos: 2, hijosDiscapacidad: 1 }],
    ["rentas", "Sueldo, ahorros y un piso alquilado", { bruto: 35000, ahorro: 2000, alquilerCobrado: 9000, alquilerGastos: 3000 }],
    ["autonomo", "Autónomo sin sueldo", { bruto: 0, actividadIngresos: 40000, actividadGastos: 14000 }]
  ];
  var INICIO = { a: "soltero", b: "familia", partida: "sueldo", escala: "andalucia", eje: 60000 };
  var MAX_SUELDO = 1000000, MAX_SLIDER = 150000;
  var IMPORTES = GASTOS.concat(NOMINA, OTRAS).map(function (g) { return g[0]; }).concat(["irregular", "sueldoPareja"]);
  var CIFRAS = ["hijos", "menores3", "mayores", "nacidos", "mes", "cumplen3", "mesTres", "hijosDiscapacidad",
    "ascendientes", "ascendientes75", "ascendientesDiscapacidad", "celiacos"];
  var CASILLAS = ["madre", "municipioPequeno"];

  // short keys for the address
  var CLAVES = {
    bruto: "s", irregular: "ir", renta: "r", edad: "e", situacion: "f", sueldoPareja: "sp", discapacidad: "d", hijos: "h",
    menores3: "h3", mayores: "h18", nacidos: "hn", mes: "mn", cumplen3: "h3c", mesTres: "mt", madre: "m",
    hijosDiscapacidad: "hd", gradoHijos: "gh", ascendientes: "as", ascendientes75: "as75", ascendientesDiscapacidad: "ad",
    gradoAscendientes: "ga", celiacos: "ce", municipioPequeno: "mp", ahorro: "ah", alquilerCobrado: "ac",
    alquilerGastos: "ag", alquilerReduccion: "ar", actividadIngresos: "ai", actividadGastos: "ae", alquiler: "al",
    hipoteca: "hi", plan: "pp", guarderia: "gu", empleadaHogar: "eh", deporte: "dp", educacion: "ed", veterinario: "vt",
    donativos: "dn", contrato: "ct", cotizacionesDadas: "ss", retenciones: "rt", nombre: "n"
  };
  var OPCIONES = {
    renta: RENTAS, edad: EDADES, situacion: SITUACIONES, discapacidad: DISCAPACIDADES, gradoHijos: GRADOS,
    gradoAscendientes: GRADOS, alquilerReduccion: REDUCCIONES, contrato: CONTRATOS
  };

  var state = {}, forms = {}, charts = {}, boxes = {};
  // texts that change when the calculation starts from the base (data-base in es/irpf.qmd)
  var variables = [];


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
  function deBase() { return state.partida === "base"; }
  function calc(p) { return liquidar(p, state.escala, state.partida); }


  // ─── cases and the address ───────────────────────────────

  function caso(id) {
    var c = CASOS.filter(function (x) { return x[0] === id; })[0];
    return ajustar(Object.assign({}, VACIO, c ? c[2] : {}, { caso: c ? id : "" }));
  }

  // children under 3 cannot outnumber the children, and so on
  function ajustar(p) {
    p.bruto = clamp(p.bruto, 0, MAX_SUELDO);
    p.irregular = clamp(p.irregular, 0, MAX_SUELDO);   // the engine takes no more than the salary itself
    p.sueldoPareja = clamp(p.sueldoPareja, 0, MAX_SUELDO);
    p.hijos = clamp(p.hijos, 0, 6);
    p.menores3 = clamp(p.menores3, 0, p.hijos);
    p.mayores = clamp(p.mayores, 0, p.hijos - p.menores3);
    p.cumplen3 = clamp(p.cumplen3, 0, p.hijos - p.menores3 - p.mayores);
    p.nacidos = clamp(p.nacidos, 0, p.menores3);
    p.mes = clamp(p.mes, 1, 12);
    p.mesTres = clamp(p.mesTres, 1, 12);
    p.hijosDiscapacidad = clamp(p.hijosDiscapacidad, 0, p.hijos);
    p.ascendientes = clamp(p.ascendientes, 0, 2);
    p.ascendientes75 = clamp(p.ascendientes75, 0, p.ascendientes);
    p.ascendientesDiscapacidad = clamp(p.ascendientesDiscapacidad, 0, p.ascendientes);
    p.celiacos = clamp(p.celiacos, 0, 6);
    if (!(p.menores3 || p.cumplen3) || (p.renta !== "sueldo" && !deBase())) p.madre = false;
    return p;
  }

  function codificar(p) {
    return Object.keys(CLAVES).filter(function (k) { return p[k] !== VACIO[k]; }).map(function (k) {
      return CLAVES[k] + "-" + (CASILLAS.indexOf(k) >= 0 ? "1" : k === "nombre" ? encodeURIComponent(p[k]) : p[k]);
    }).join("_");
  }

  function descodificar(texto) {
    var inversas = {}, p = Object.assign({}, VACIO, { caso: "" });
    Object.keys(CLAVES).forEach(function (k) { inversas[CLAVES[k]] = k; });
    texto.split("_").forEach(function (par) {
      var i = par.indexOf("-"), k = inversas[par.slice(0, i)], v = par.slice(i + 1);
      if (i < 1 || !k) return;
      if (CASILLAS.indexOf(k) >= 0) p[k] = v === "1";
      else if (k === "nombre") p.nombre = v.slice(0, 24);
      else if (OPCIONES[k]) { if (OPCIONES[k].some(function (o) { return o[0] === v; })) p[k] = v; }
      else if (isFinite(parseFloat(v)) && parseFloat(v) >= 0) p[k] = k === "bruto" || IMPORTES.indexOf(k) >= 0 ? parseFloat(v) : Math.round(parseFloat(v));
    });
    return ajustar(p);
  }

  function guardar() {
    var partes = QUIENES.map(function (who) { return who + "=" + codificar(state[who]); });
    if (state.partida !== INICIO.partida) partes.push("partida=" + state.partida);
    if (state.escala !== INICIO.escala) partes.push("escala=" + state.escala);
    if (state.eje !== INICIO.eje) partes.push("eje=" + state.eje);
    history.replaceState(null, "", location.pathname + "?" + partes.join("&") + location.hash);
  }

  function leerDireccion() {
    var q = new URLSearchParams(location.search);
    state.partida = PARTIDAS.some(function (e) { return e[0] === q.get("partida"); }) ? q.get("partida") : INICIO.partida;
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
  // a grid of amount fields; each one's label is kept as f[key + "Box"] to hide it
  function importes(f, campos) {
    var grid = node("div", "irpf-grid");
    campos.forEach(function (g) {
      f[g[0]] = importe();
      f[g[0] + "Box"] = campo(g[1], f[g[0]]);
      grid.appendChild(f[g[0] + "Box"]);
    });
    return grid;
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
    f.sueldoTexto = sueldo.firstChild;
    f.irregular = importe();
    f.irregularBox = campo("", f.irregular, "irpf-wide irpf-irregular");
    f.irregularTexto = f.irregularBox.firstChild;
    f.irregularBox.appendChild(node("span", "irpf-hint", "Solo cuenta el 70 %."));
    grid.appendChild(f.irregularBox);
    f.renta = lista(RENTAS);
    f.rentaBox = campo("Qué cobra", f.renta);
    grid.appendChild(f.rentaBox);
    f.edad = lista(EDADES);
    grid.appendChild(campo("Edad", f.edad));
    f.situacion = lista(SITUACIONES);
    grid.appendChild(campo("Pareja", f.situacion, "irpf-wide"));
    f.sueldoPareja = importe();
    f.sueldoParejaBox = campo("Sueldo bruto de la pareja, en euros", f.sueldoPareja, "irpf-wide irpf-irregular");
    f.sueldoParejaBox.appendChild(node("span", "irpf-hint", "Vacío si no tiene ingresos."));
    grid.appendChild(f.sueldoParejaBox);
    f.hijos = lista([]);
    cifras(f.hijos, 6);
    grid.appendChild(campo("Hijos que conviven, menores de 25", f.hijos));
    f.menores3 = lista([]);
    grid.appendChild(campo("De ellos, menores de 3 años", f.menores3));
    f.madreBox = casilla(f, "madre", "");
    f.madreTexto = f.madreBox.lastChild;
    grid.appendChild(f.madreBox);
    box.appendChild(grid);

    f.mas = plegable("Más situaciones familiares");
    var otros = node("div", "irpf-grid");
    var meses = MESES.map(function (m, i) { return [String(i + 1), m]; });
    f.nacidos = lista([]);
    otros.appendChild(campo("Hijos nacidos en 2025", f.nacidos));
    f.mes = lista(meses);
    f.mesBox = campo("Mes del nacimiento", f.mes);
    otros.appendChild(f.mesBox);
    f.cumplen3 = lista([]);
    otros.appendChild(campo("Hijos que cumplieron 3 años en 2025", f.cumplen3));
    f.mesTres = lista(meses);
    f.mesTresBox = campo("Mes del cumpleaños", f.mesTres);
    otros.appendChild(f.mesTresBox);
    f.mayores = lista([]);
    otros.appendChild(campo("Hijos mayores de edad", f.mayores));
    f.hijosDiscapacidad = lista([]);
    otros.appendChild(campo("Hijos con discapacidad", f.hijosDiscapacidad));
    f.gradoHijos = lista(GRADOS);
    f.gradoHijosBox = campo("Grado de su discapacidad", f.gradoHijos);
    otros.appendChild(f.gradoHijosBox);
    f.discapacidad = lista(DISCAPACIDADES);
    otros.appendChild(campo("Discapacidad propia", f.discapacidad));
    f.ascendientes = lista([]);
    cifras(f.ascendientes, 2);
    otros.appendChild(campo("Padres o abuelos de 65 años o más que conviven", f.ascendientes));
    f.ascendientes75 = lista([]);
    otros.appendChild(campo("De ellos, de 75 o más", f.ascendientes75));
    f.ascendientesDiscapacidad = lista([]);
    otros.appendChild(campo("De ellos, con discapacidad", f.ascendientesDiscapacidad));
    f.gradoAscendientes = lista(GRADOS);
    f.gradoAscendientesBox = campo("Grado de su discapacidad", f.gradoAscendientes);
    otros.appendChild(f.gradoAscendientesBox);
    f.celiacos = lista([]);
    cifras(f.celiacos, 6);
    f.celiacosBox = campo("Personas de la familia con celiaquía", f.celiacos);
    otros.appendChild(f.celiacosBox);
    f.municipioPequenoBox = casilla(f, "municipioPequeno", "Vive en un municipio andaluz de menos de 3.000 habitantes");
    otros.appendChild(f.municipioPequenoBox);
    f.mas.appendChild(otros);
    box.appendChild(f.mas);

    f.otras = plegable("Otras rentas");
    f.otras.appendChild(importes(f, OTRAS));
    f.ahorroTexto = f.ahorroBox.firstChild;
    f.alquilerReduccion = lista(REDUCCIONES);
    f.alquilerReduccionBox = campo("Tipo de alquiler", f.alquilerReduccion, "irpf-wide");
    f.alquilerGastosBox.parentNode.insertBefore(f.alquilerReduccionBox, f.alquilerGastosBox.nextSibling);
    box.appendChild(f.otras);

    f.gastos = plegable("Gastos que desgravan");
    f.notaClase = node("p", "irpf-note", "Las deducciones de Andalucía solo se calculan con la comunidad de Andalucía.");
    f.gastos.appendChild(f.notaClase);
    f.gastos.appendChild(importes(f, GASTOS));
    box.appendChild(f.gastos);

    f.nomina = plegable("Cotizaciones y retenciones");
    var nomina = importes(f, NOMINA);
    f.contrato = lista(CONTRATOS);
    f.contratoBox = campo("Tipo de contrato", f.contrato);
    nomina.insertBefore(f.contratoBox, nomina.firstChild);
    f.nomina.appendChild(nomina);
    f.cotizacionesDadasBox.appendChild(node("span", "irpf-hint", "Si lo dejas vacío, se calculan con los tipos de 2025."));
    box.appendChild(f.nomina);

    forms[who] = f;
    escuchar(who);
  }

  // a checkbox with its text, kept as f[key]
  function casilla(f, clave, texto) {
    var b = node("label", "irpf-check irpf-wide");
    f[clave] = document.createElement("input");
    f[clave].type = "checkbox";
    b.appendChild(f[clave]);
    b.appendChild(document.createTextNode(texto));
    return b;
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
    Object.keys(OPCIONES).forEach(function (k) {
      f[k].addEventListener("change", function () { cambiar(k, f[k].value); });
    });
    CIFRAS.forEach(function (k) {
      f[k].addEventListener("change", function () { cambiar(k, +f[k].value); });
    });
    CASILLAS.forEach(function (k) {
      f[k].addEventListener("change", function () { cambiar(k, f[k].checked); });
    });
    IMPORTES.forEach(function (k) {
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
    Object.keys(OPCIONES).forEach(function (k) { f[k].value = p[k]; });
    cifras(f.menores3, p.hijos);
    cifras(f.mayores, p.hijos - p.menores3);
    cifras(f.cumplen3, p.hijos - p.menores3 - p.mayores);
    cifras(f.nacidos, p.menores3);
    cifras(f.hijosDiscapacidad, p.hijos);
    cifras(f.ascendientes75, p.ascendientes);
    cifras(f.ascendientesDiscapacidad, p.ascendientes);
    CIFRAS.forEach(function (k) { f[k].value = String(p[k]); });
    CASILLAS.forEach(function (k) { f[k].checked = p[k]; });
    IMPORTES.forEach(function (k) {
      if (tecleando !== k || document.activeElement !== f[k]) f[k].value = p[k] ? fmt(p[k], p[k] % 1 ? 2 : 0) : "";
    });
    // open a folded part when the case uses it
    if (p.nacidos || p.cumplen3 || p.mayores || p.hijosDiscapacidad || p.discapacidad !== "no" || p.ascendientes ||
        p.celiacos || p.municipioPequeno) f.mas.open = true;
    if (OTRAS.some(function (g) { return p[g[0]]; })) f.otras.open = true;
    if (GASTOS.some(function (g) { return p[g[0]]; })) f.gastos.open = true;
    if (NOMINA.some(function (g) { return p[g[0]]; }) || p.contrato !== "indefinido") f.nomina.open = true;
    marcar(who);
  }

  function marcar(who) {
    var f = forms[who], p = state[who], andalucia = state.escala === "andalucia", base = deBase();
    var trabajador = base || p.renta === "sueldo";
    f.titulo.textContent = nombre(who);
    f.notaClase.hidden = andalucia;
    SOLO_ANDALUCIA.forEach(function (k) { f[k].disabled = !andalucia; });
    f.sueldoTexto.nodeValue = base ? "Base liquidable general del año, en euros" : "Sueldo o pensión bruta al año, en euros";
    f.slider.setAttribute("aria-label", base ? "Base liquidable general del año" : "Sueldo o pensión bruta al año");
    f.irregularTexto.nodeValue = base ? "De ella, renta generada en más de dos años y cobrada de una vez" :
      "De él, lo generado en más de dos años y cobrado de una vez";
    f.ahorroTexto.nodeValue = base ? "Base liquidable del ahorro" : OTRAS[0][1];
    f.madreTexto.nodeValue = p.situacion === "conjunta" ? "La madre tiene derecho a la deducción por maternidad" :
      "Es la madre: deducción por maternidad";
    // the base is a worker's, already net of contributions, other income, the joint reduction and the pension
    // plan; pensions do not have the 30 % reduction
    f.rentaBox.hidden = base;
    f.irregularBox.hidden = !trabajador;
    f.sueldoParejaBox.hidden = base || p.situacion !== "conjunta";
    f.madreBox.hidden = !((p.menores3 > 0 || p.cumplen3 > 0) && trabajador);
    f.mesBox.hidden = !p.nacidos;
    f.mesTresBox.hidden = !p.cumplen3;
    f.gradoHijosBox.hidden = !p.hijosDiscapacidad;
    f.gradoAscendientesBox.hidden = !p.ascendientesDiscapacidad;
    f.guarderiaBox.hidden = !p.madre;
    ["alquilerCobrado", "alquilerGastos", "alquilerReduccion", "actividadIngresos", "actividadGastos", "plan"].forEach(function (k) {
      f[k + "Box"].hidden = base;
    });
    f.contratoBox.hidden = f.cotizacionesDadasBox.hidden = base || p.renta !== "sueldo";
    f.cotizacionesDadas.placeholder = fmt(cotizar(p.bruto, p.contrato), 2);
  }


  // ─── start ───────────────────────────────────────────────

  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fonts.then(start);

  function start() {
    leerDireccion();
    variables = Array.prototype.slice.call(root.querySelectorAll("[data-base]"));
    variables.forEach(function (n) { n.setAttribute("data-sueldo", n.textContent); });
    QUIENES.forEach(function (who) { construir(who); rellenar(who); });
    pastillas($("ir-partida"), PARTIDAS.map(function (e) { return [e[0], e[1]]; }), function (v) {
      state.partida = v;
      QUIENES.forEach(function (who) { ajustar(state[who]); rellenar(who); });
    });
    var region = $("ir-escala");
    ESCALAS.forEach(function (e) { region.appendChild(new Option(e[0] === "clase" ? "Escala de clase (la estatal dos veces)" : e[1], e[0])); });
    region.addEventListener("change", function () {
      state.escala = region.value;
      QUIENES.forEach(function (who) { rellenar(who); });
      update(true);
    });
    pastillas($("ir-eje"), EJES.map(function (e) { return [String(e), "Hasta " + fmt(e, 0) + " €"]; }), function (v) { state.eje = +v; });
    $("ir-link").addEventListener("click", copiar);
    $("ir-reset").addEventListener("click", function () {
      state = {};
      history.replaceState(null, "", location.pathname + location.hash);
      leerDireccion();
      QUIENES.forEach(function (who) {
        ["mas", "otras", "gastos", "nomina"].forEach(function (k) { forms[who][k].open = false; });
        rellenar(who);
      });
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
    $("ir-escala").value = state.escala;
    [["ir-partida", state.partida], ["ir-eje", String(state.eje)]].forEach(function (p) {
      Array.prototype.forEach.call($(p[0]).children, function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === p[1]));
      });
    });
    $("ir-escala-nota").textContent = notaEscala(state.escala);
    $("ir-partida-nota").textContent = PARTIDAS[1][2];
    $("ir-partida-nota").hidden = !deBase();
    variables.forEach(function (n) { n.textContent = n.getAttribute(deBase() ? "data-base" : "data-sueldo"); });
    var r = { a: calc(state.a), b: calc(state.b) };
    // what the 30 % reduction saves, for the table
    QUIENES.forEach(function (w) {
      r[w].sinReduccion = r[w].reduccionIrregular > 0 ? calc(Object.assign({}, state[w], { irregular: 0 })).irpf : null;
    });
    var c = curvas();
    drawKpis(r);
    drawIrpf(r, c);
    drawRate("marginal", c, r);
    drawRate("medio", c, r);
    drawTable(r);
  }


  // ─── figures above the charts ────────────────────────────

  // the person with another salary and everything else unchanged; contributions typed from the certificate
  // move in step with the ones the simulator works out
  function conSueldo(who, s) {
    var p = Object.assign({}, state[who], { bruto: s }), propias = cotizar(state[who].bruto, p.contrato);
    if (p.cotizacionesDadas > 0) p.cotizacionesDadas = propias > 0 ? p.cotizacionesDadas * cotizar(s, p.contrato) / propias : 0;
    return p;
  }

  // of 100 € more a month (1,200 € a year), what is left after IRPF and contributions
  function queda(who, r) {
    var mas = calc(conSueldo(who, state[who].bruto + 1200));
    return 100 - ((mas.irpf - r.irpf) + (mas.cotizaciones - r.cotizaciones)) / 12;
  }

  function drawKpis(r) {
    // the exercises from the base work to the cent
    var base = deBase(), cents = base ? 2 : 0;
    // with other income or a partner's salary the rate is over everything coming in
    var masRentas = QUIENES.some(function (w) { return r[w].ingresos > r[w].bruto; });
    var tiles = [
      { label: "IRPF del año", value: function (w) { return euros(r[w].irpf, cents); }, sub: "después de todas las deducciones" },
      { label: "Tipo medio", value: function (w) { return pct(r[w].tipoMedio); },
        sub: base ? (masRentas ? "el IRPF sobre las bases" : "el IRPF sobre la base") : masRentas ? "el IRPF sobre todo lo que se cobra" : "el IRPF sobre el sueldo bruto" },
      { label: "De 100 € más al mes, le quedan", value: function (w) { return euros(queda(w, r[w]), 1); }, sub: base ? "el resto se va en IRPF" : "el resto se va en IRPF y cotizaciones" },
      { label: "Le queda al año", value: function (w) { return euros(r[w].neta, cents); }, sub: base ? "la base menos el IRPF" : "después de cotizaciones e IRPF" }
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
      var irpf = [], marginal = [], medio = [];
      for (var i = 0; i <= pasos; i++) {
        var s = Math.round(state.eje * i / pasos);
        var res = calc(conSueldo(w, s)), t = res.irpf;
        var t1 = calc(conSueldo(w, s + 1)).irpf;
        irpf.push([s, round(t, 2)]);
        marginal.push([s, round((t1 - t) * 100, 1)]);
        medio.push([s, res.ingresos >= 1000 ? round(res.tipoMedio, 2) : null]);
      }
      out[w] = { irpf: irpf, marginal: marginal, medio: medio };
    });
    return out;
  }

  function marginalEn(w, s) {
    return (calc(conSueldo(w, s + 1)).irpf - calc(conSueldo(w, s)).irpf) * 100;
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
    if (!lineas.length) return "";
    var cifra = esc(euros(lineas[0].data[0], 0));
    return '<div class="dd-tip-year">' + (deBase() ? "Con una base de " + cifra : "Con " + cifra + " al año") + "</div>";
  }
  function que() { return deBase() ? "la base liquidable" : "el sueldo bruto"; }

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
    boxes.irpf.setAttribute("aria-label", "IRPF del año según " + que() + ", de 0 a " + euros(state.eje, 0) + ". " +
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
          var t = calc(conSueldo(w, p.data[0]));
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
    boxes[k].setAttribute("aria-label", (k === "marginal" ? "Tipo marginal" : "Tipo medio") + " del IRPF según " + que() + ", de 0 a " +
      euros(state.eje, 0) + ". Las cifras de cada uno están en la tabla de abajo.");
  }


  // ─── the return step by step ─────────────────────────────

  // The steps and their names are those of the return, and c is the box in Renta WEB 2025, which the rows
  // marked desdeSueldo only show when starting from the salary. tb is the text when the calculation starts from
  // the base; a subtotal (sub) only shows when something was taken off since the row before it (si)
  var FILAS = [
    { t: "Sueldo o pensión bruta", tb: "Base liquidable de partida", c: "0003", desdeSueldo: true, v: function (r) { return r.bruto; } },
    { t: "Reducción del 30 % por renta de más de dos años", c: "0011", desdeSueldo: true, v: function (r) { return -r.reduccionIrregular; }, opcional: true },
    { t: "Total ingresos computables", c: "0012", v: function (r) { return r.integro; }, sub: true, sueldo: true, si: function (r) { return r.reduccionIrregular > 0; } },
    { t: "Cotizaciones a la Seguridad Social", c: "0013", v: function (r) { return -r.cotizaciones; }, opcional: true },
    { t: "Rendimiento neto previo", c: "0017", v: function (r) { return r.previo; }, sub: true, sueldo: true, si: function (r) { return r.cotizaciones > 0; } },
    { t: "Sueldo bruto de la pareja", v: function (r) { return r.parejaBruto; }, opcional: true, sueldo: true },
    { t: "Cotizaciones de la pareja", v: function (r) { return -r.parejaCotizaciones; }, opcional: true, sueldo: true },
    { t: "Suma de rendimientos netos previos", c: "0018", v: function (r) { return r.previos; }, sub: true, sueldo: true, si: function (r) { return r.parejaBruto > 0; } },
    { t: "Otros gastos deducibles", c: "0019", v: function (r) { return -r.gastosGenerales; }, opcional: true },
    { t: "Incremento para trabajadores activos con discapacidad", c: "0021", v: function (r) { return -r.gastosDiscapacidad; }, opcional: true },
    { t: "Rendimiento neto", c: "0022", v: function (r) { return r.neto; }, sub: true, sueldo: true, si: function (r) { return r.otrosGastos > 0; } },
    { t: "Reducción por obtención de rendimientos del trabajo", c: "0023", v: function (r) { return -r.reduccion; }, opcional: true },
    { t: "Rendimiento neto reducido del trabajo", c: "0025", v: function (r) { return r.trabajoReducido; }, sub: true, sueldo: true,
      si: function (r) { return r.alquilerNeto > 0 || r.actividadPrevio !== 0; } },
    { t: "Alquiler cobrado menos sus gastos", v: function (r) { return r.alquilerNeto; }, opcional: true, sueldo: true },
    { t: "Reducción por alquiler de vivienda", v: function (r) { return -r.alquilerReduccion; }, opcional: true, sueldo: true },
    { t: "Actividad: ingresos menos gastos", v: function (r) { return r.actividadPrevio; }, opcional: true, sueldo: true },
    { t: "Provisiones y gastos de difícil justificación (5 %)", v: function (r) { return -r.actividadDificil; }, opcional: true, sueldo: true },
    { t: "Reducción de la actividad por rentas bajas", v: function (r) { return -r.reduccionActividad; }, opcional: true, sueldo: true },
    { t: "Base imponible general", c: "0435", v: function (r) { return r.baseImponible; }, total: true, sueldo: true },
    { t: "Base imponible del ahorro", c: "0460", v: function (r) { return r.baseAhorro; }, total: true, opcional: true, sueldo: true },
    { t: "Reducción por tributación conjunta", c: "0461", v: function (r) { return -r.reduccionConjunta; }, opcional: true },
    { t: "Reducción por aportaciones a planes de pensiones", v: function (r) { return -r.plan; }, opcional: true },
    { t: "Base liquidable general", c: "0500", v: function (r) { return r.baseLiquidable; }, total: true },
    { t: "Base liquidable del ahorro", c: "0510", v: function (r) { return r.baseLiquidableAhorro; }, total: true, opcional: true },
    { t: "Mínimo personal y familiar estatal", c: "0519", v: function (r) { return r.minimoEstatal.total; }, nota: true },
    { t: "Escala estatal sobre la base liquidable general", c: "0528", v: function (r) { return r.escalaBaseEstatal; } },
    { t: "Escala estatal sobre el mínimo", c: "0530", v: function (r) { return -r.escalaMinimoEstatal; } },
    { t: "Escala del ahorro sobre la base liquidable del ahorro", c: "0536", v: function (r) { return r.ahorroBaseEstatal; }, opcional: true },
    { t: "Escala del ahorro sobre el mínimo que pasa al ahorro", c: "0538", v: function (r) { return -r.ahorroMinimoEstatal; }, opcional: true },
    { t: "Cuota íntegra estatal", c: "0545", v: function (r) { return r.cuotaEstatal; }, total: true },
    { t: "Mínimo personal y familiar autonómico", c: "0520", v: function (r) { return r.minimoAutonomico.total; }, nota: true },
    { t: "Escala autonómica sobre la base liquidable general", c: "0529", v: function (r) { return r.escalaBaseAutonomica; } },
    { t: "Escala autonómica sobre el mínimo", c: "0531", v: function (r) { return -r.escalaMinimoAutonomico; } },
    { t: "Escala del ahorro sobre la base liquidable del ahorro", c: "0537", v: function (r) { return r.ahorroBaseAutonomica; }, opcional: true },
    { t: "Escala del ahorro sobre el mínimo que pasa al ahorro", c: "0539", v: function (r) { return -r.ahorroMinimoAutonomico; }, opcional: true },
    { t: "Cuota íntegra autonómica", c: "0546", v: function (r) { return r.cuotaAutonomica; }, total: true },
    { t: "Deducción por inversión en vivienda habitual", c: "0547 y 0548", v: function (r) { return -r.vivienda; }, opcional: true },
    { t: "Deducción por donativos", c: "0552 y 0553", v: function (r) { return -r.donativos; }, opcional: true },
    { t: "Deducciones de Andalucía", c: "0564", v: function (r) { return -r.andaluzasAplicadas; }, opcional: true, andaluzas: true },
    { t: "Cuota líquida", c: "0587", v: function (r) { return r.cuotaLiquida; }, total: true },
    { t: "Deducción por obtención de rendimientos del trabajo (sueldos bajos)", c: "0414", v: function (r) { return -r.sueldosBajos; }, opcional: true },
    { t: "Cuota resultante de la autoliquidación", c: "0595", v: function (r) { return r.cuotaResultante; }, total: true, si: function (r) { return r.sueldosBajos > 0; } },
    { t: "Deducción por maternidad", c: "0611", v: function (r) { return -r.maternidad; }, opcional: true },
    { t: "Incremento por gastos de guardería", c: "0613", v: function (r) { return -r.guarderia; }, opcional: true },
    { t: "Deducción por descendientes con discapacidad", c: "0623", v: function (r) { return -r.discapacidadHijos; }, opcional: true },
    { t: "Deducción por ascendientes con discapacidad", c: "0636", v: function (r) { return -r.discapacidadAscendientes; }, opcional: true },
    { t: "Deducción por familia numerosa o monoparental", c: "0660 o 0662", v: function (r) { return -r.familia; }, opcional: true },
    { t: "IRPF del año", v: function (r) { return r.irpf; }, total: true, final: true },
    { t: "Sin la reducción del 30 %, pagaría", sin: true },
    { t: "Retenciones", c: "0609", v: function (r) { return -r.retenciones; }, opcional: true },
    { t: "Resultado de la declaración", c: "0670", resultado: true },
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

    function fila(texto, celdas, cls, casilla) {
      var row = node("tr", cls), h = node("th", null, texto);
      h.scope = "row";
      if (casilla) {
        var c = node("span", "irpf-casilla", casilla);
        c.title = "Casilla de Renta WEB 2025";
        h.appendChild(c);
      }
      row.appendChild(h);
      celdas.forEach(function (v) { row.appendChild(node("td", null, v)); });
      body.appendChild(row);
    }

    var base = deBase();
    FILAS.forEach(function (f) {
      var casilla = base && f.desdeSueldo ? "" : f.c;
      if (f.resultado) {
        if (r.a.retenciones || r.b.retenciones) fila(f.t, QUIENES.map(function (w) { return resultado(r[w].resultado); }), "irpf-total", casilla);
        return;
      }
      if (f.sin) {
        if (r.a.sinReduccion !== null || r.b.sinReduccion !== null) {
          fila(f.t, QUIENES.map(function (w) { return r[w].sinReduccion === null ? "" : euros(r[w].sinReduccion); }), "irpf-aside");
        }
        return;
      }
      if (f.sueldo && base) return;
      if (f.si && !QUIENES.some(function (w) { return f.si(r[w]); })) return;
      if (f.p) { fila(f.t, QUIENES.map(function (w) { return pct(f.p(r[w])); })); return; }
      var v = QUIENES.map(function (w) { return f.v(r[w]); });
      if (f.opcional && v.every(function (x) { return Math.abs(x) < 0.005; })) return;
      fila(base && f.tb ? f.tb : f.t, v.map(function (x) { return euros(x); }),
           f.final ? "irpf-total irpf-final" : f.total ? "irpf-total" : f.sub ? "irpf-subtotal" : f.nota ? "irpf-aside" : "", casilla);
      if (f.andaluzas) {
        Object.keys(ANDALUZAS).forEach(function (k) {
          var d = QUIENES.map(function (w) {
            var x = r[w].andaluzas.filter(function (a) { return a[0] === k; })[0];
            return x ? x[1] : 0;
          });
          if (d[0] || d[1]) fila(ANDALUZAS[k][0], d.map(function (x) { return x ? euros(-x) : ""; }), "irpf-sub", ANDALUZAS[k][1]);
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
