// IRPF 2025, the return filed in the spring of 2026, worked out as Renta WEB does it, for someone who lives in a
// common-regime region (Andalusia unless told otherwise) and has a salary or a pension and, if any, savings
// income, a home let out and a business taxed by the simplified direct method. A joint return can add the
// partner's salary. It can also start from the taxable base, as the exercises in class do.
// js/irpf-simulador.js uses it on es/irpf.html.
//
// Sources: Ley 35/2006 del IRPF (arts. 18.2, 19, 20, 23.2, 32.2, 51, 52, 56 to 61, 63, 66, 68.3, 74, 76, 81, 81 bis,
// 82 and 84, art. 68.1 as worded in 2012 with the 18th transitional provision, and the 61st additional provision
// added by Ley 5/2025), its regulation (art. 30.2), the Ley General de la Seguridad Social (art. 19 bis and the
// 42nd and 43rd transitional provisions) with the contribution order for 2025 (Orden PJC/178/2025), the
// Andalusian Ley 5/2021 de tributos cedidos (arts. 10, 11, 13 to 19, 22 bis to 22 quater, 23 and 23 bis) and the
// scales and minimums of the other regions, as the Agencia Tributaria explains them in its Manual práctico de
// Renta 2025.
(function (root) {
  "use strict";

  // [upper limit of the band, rate in per cent]
  var ESCALA_ESTATAL = [[12450, 9.5], [20200, 12], [35200, 15], [60000, 18.5], [300000, 22.5], [Infinity, 24.5]];
  // the one used in class: the state scale twice, with 22.5 % instead of 24.5 % above 300,000 € in the regional half
  var ESCALA_CLASE = [[12450, 9.5], [20200, 12], [35200, 15], [60000, 18.5], [Infinity, 22.5]];
  // savings income, the same in each half and in every region (arts. 66 and 76)
  var ESCALA_AHORRO = [[6000, 9.5], [50000, 10.5], [200000, 11.5], [300000, 13.5], [Infinity, 15]];

  var MINIMOS_ESTATALES = {
    personal: 5550, mas65: 1150, mas75: 1400, descendientes: [2400, 2700, 4000, 4500], menor3: 2800,
    ascendiente: 1150, ascendiente75: 1400, discapacidad33: 3000, discapacidad65: 9000, asistencia: 3000
  };
  // a region's minimums where they differ from the state ones (art. 56.3): personal65 is the personal minimum
  // from 65 on, and discapacidadHijos33 and 65 apply to disabled children only
  function minimos(cambios) {
    var m = {};
    Object.keys(MINIMOS_ESTATALES).forEach(function (k) { m[k] = MINIMOS_ESTATALES[k]; });
    Object.keys(cambios || {}).forEach(function (k) { m[k] = cambios[k]; });
    return m;
  }
  var MINIMOS_AMPLIOS = {   // Asturias and the Valencian Community have the same ones
    personal: 6105, mas65: 1265, mas75: 1540, descendientes: [2640, 2970, 4400, 4950], menor3: 3080,
    ascendiente: 1265, ascendiente75: 1540, discapacidad33: 3300, discapacidad65: 9900, asistencia: 3300
  };

  // the regions in the order of Renta WEB, with their scales of 2025 and their minimums
  var COMUNIDADES = [
    ["andalucia", "Andalucía", [[13000, 9.5], [21100, 12], [35200, 15], [60000, 18.5], [Infinity, 22.5]], {
      personal: 5790, mas65: 1200, mas75: 1460, descendientes: [2510, 2820, 4170, 4700], menor3: 2920,
      ascendiente: 1200, ascendiente75: 1460, discapacidad33: 3130, discapacidad65: 9390, asistencia: 3130 }],
    ["aragon", "Aragón", [[13072.5, 9.5], [21210, 12], [36960, 15], [52500, 18.5], [60000, 20.5], [80000, 23], [90000, 24],
      [130000, 25], [Infinity, 25.5]]],
    ["asturias", "Principado de Asturias", [[12450, 9], [17707.2, 12], [33007.2, 14], [53407.2, 19.2], [70000, 21.5],
      [90000, 22.5], [175000, 25], [Infinity, 26]], MINIMOS_AMPLIOS],
    ["baleares", "Illes Balears", [[10000, 9], [18000, 11.25], [30000, 14.25], [48000, 17.5], [70000, 19], [90000, 21.75],
      [120000, 22.75], [175000, 23.75], [Infinity, 24.75]], {
      personal65: 6105, mas65: 1265, mas75: 1540, descendientes: [2400, 2970, 4400, 4950], ascendiente: 1265,
      ascendiente75: 1540, discapacidad33: 3300, discapacidad65: 9900, asistencia: 3300 }],
    ["canarias", "Canarias", [[13748, 9], [19422, 11.5], [35924, 14], [57566, 18.5], [93268, 23.5], [123745, 25],
      [Infinity, 26]], {
      personal: 5606, mas65: 1162, mas75: 1414, descendientes: [2424, 2727, 4040, 4545], menor3: 2828,
      ascendiente: 1162, ascendiente75: 1414, discapacidad33: 3030, discapacidad65: 9090, asistencia: 3030 }],
    ["cantabria", "Cantabria", [[13000, 8.5], [21000, 11], [35200, 14.5], [60000, 18], [90000, 22.5], [Infinity, 24.5]]],
    ["castillaLaMancha", "Castilla-La Mancha", [[12450, 9.5], [20200, 12], [35200, 15], [60000, 18.5], [Infinity, 22.5]]],
    ["castillaLeon", "Castilla y León", [[12450, 9], [20200, 12], [35200, 14], [53407.2, 18.5], [Infinity, 21.5]]],
    ["cataluna", "Cataluña", [[12500, 9.5], [22000, 12.5], [33000, 16], [53000, 19], [90000, 21.5], [120000, 23.5],
      [175000, 24.5], [Infinity, 25.5]]],
    ["extremadura", "Extremadura", [[12450, 8], [20200, 10], [24200, 16], [35200, 17.5], [60000, 21], [80200, 23.5],
      [99200, 24], [120200, 24.5], [Infinity, 25]]],
    ["galicia", "Galicia", [[12985.35, 9], [21068.6, 11.65], [35200, 14.9], [60000, 18.4], [Infinity, 22.5]], {
      personal: 5789, mas65: 1199, mas75: 1460, descendientes: [2503, 2816, 4172, 4694], menor3: 2920,
      ascendiente: 1199, ascendiente75: 1460, discapacidad33: 3129, discapacidad65: 9387, asistencia: 3129 }],
    ["madrid", "Comunidad de Madrid", [[13362.22, 8.5], [19004.63, 10.7], [35425.68, 12.8], [57320.4, 17.4],
      [Infinity, 20.5]], {
      personal: 5956.65, mas65: 1234.26, mas75: 1502.58, descendientes: [2575.85, 2897.83, 4400, 4950], menor3: 3005.16,
      ascendiente: 1234.26, ascendiente75: 1502.58, discapacidad33: 3219.81, discapacidad65: 9659.44,
      asistencia: 3219.81 }],
    ["murcia", "Región de Murcia", [[12450, 9.5], [20200, 11.2], [34000, 13.3], [60000, 17.9], [Infinity, 22.5]]],
    ["rioja", "La Rioja", [[12450, 8], [20200, 10.6], [35200, 13.6], [40000, 17.8], [50000, 18.3], [60000, 19],
      [120000, 24.5], [Infinity, 27]], { discapacidadHijos33: 3300, discapacidadHijos65: 9900 }],
    ["valencia", "Comunitat Valenciana", [[12000, 9], [22000, 12], [32000, 15], [42000, 17.5], [52000, 20], [62000, 22.5],
      [72000, 25], [100000, 26.5], [150000, 27.5], [200000, 28.5], [Infinity, 29.5]], MINIMOS_AMPLIOS],
    ["clase", "Escala de clase", ESCALA_CLASE]
  ];
  var REGIONES = {};
  COMUNIDADES.forEach(function (c) { REGIONES[c[0]] = { nombre: c[1], escala: c[2], minimos: minimos(c[3]) }; });

  var COTIZACION = { indefinido: 0.0648, temporal: 0.0653 };  // the worker's share in 2025: 4.70 + 1.55 or 1.60 + 0.10 + 0.13 (MEI)
  var COTIZACION_EMPRESA = 0.3207;  // the employer's, for a permanent office job; only for the limit of art. 81 bis
  var BASE_MAXIMA = 58914;      // 4,909.50 € a month
  // the solidarity contribution on pay above the maximum base, [upper limit of the band as a multiple of the
  // base, rate in per cent]; the worker pays the same share as of common contingencies, 4.70 of 28.30
  var SOLIDARIDAD = [[1.1, 0.92], [1.5, 1], [Infinity, 1.17]];
  var SOLIDARIDAD_TRABAJADOR = 4.7 / 28.3;
  var OTROS_GASTOS = 2000;      // art. 19.2.f, raised for workers with a disability
  var GASTOS_DISCAPACIDAD = { d33: 3500, d65: 7750 };
  var IRREGULAR = 0.3, IRREGULAR_MAXIMO = 300000;   // art. 18.2
  var PLAN_MAXIMO = 1500, PLAN_PARTE = 0.3;          // art. 52.1, for the taxpayer's own contributions
  var MATERNIDAD_MES = 100, GUARDERIA_MES = 1000 / 12;  // art. 81
  // art. 23.2, by the date and kind of the lease of a home
  var REDUCCIONES_ALQUILER = { "60": 0.6, "50": 0.5, rehabilitada: 0.6, "70": 0.7, "90": 0.9, "0": 0 };
  var VIVIENDA_MAXIMO = 9040, VIVIENDA_PARTE = 0.075;  // housing bought before 2013, in each half
  var RENTAS_DISTINTAS = 6500;  // other income that rules out the art. 20 reduction and the low-wage deduction

  // a person with nothing: the simulator fills in the rest. irregular is the part of bruto generated over more
  // than two years and received at once; mayores, the children aged 18 or more; nacidos and mes, the children born
  // in the year and their month; cumplen3 and mesTres, those who turned 3 in the year and the month they did;
  // cotizacionesDadas, the contributions on the employer's certificate, worked out here when left at 0; ahorro,
  // interest, dividends and gains; alquilerCobrado and alquilerGastos, the rent of a home let out and its costs
  var VACIO = {
    nombre: "", bruto: 0, irregular: 0, renta: "sueldo", edad: "adulto", discapacidad: "no", situacion: "sin",
    sueldoPareja: 0, hijos: 0, menores3: 0, mayores: 0, nacidos: 0, mes: 1, cumplen3: 0, mesTres: 12, madre: false,
    hijosDiscapacidad: 0, gradoHijos: "d33", ascendientes: 0, ascendientes75: 0, ascendientesDiscapacidad: 0,
    gradoAscendientes: "d33", celiacos: 0, municipioPequeno: false,
    ahorro: 0, alquilerCobrado: 0, alquilerGastos: 0, alquilerReduccion: "60", actividadIngresos: 0, actividadGastos: 0,
    alquiler: 0, hipoteca: 0, plan: 0, guarderia: 0, empleadaHogar: 0, deporte: 0, veterinario: 0, educacion: 0,
    donativos: 0, contrato: "indefinido", cotizacionesDadas: 0, retenciones: 0
  };

  // every box of the return holds euros and cents, and Renta WEB rounds each one before it uses it in the next
  function centimos(v) {
    return (v < 0 ? -1 : 1) * Math.round(Math.abs(v) * 100 + 1e-6) / 100;
  }

  function escala(tramos, base) {
    var total = 0, desde = 0;
    for (var i = 0; i < tramos.length && base > desde; i++) {
      total += (Math.min(base, tramos[i][0]) - desde) * tramos[i][1] / 100;
      desde = tramos[i][0];
    }
    return centimos(total);
  }

  // rate of the band that the next euro of base falls in
  function tipoTramo(tramos, base) {
    for (var i = 0; i < tramos.length; i++) if (base < tramos[i][0]) return tramos[i][1];
    return tramos[tramos.length - 1][1];
  }

  // what a worker paid to the Social Security in 2025 on a year's gross pay
  function cotizar(bruto, contrato) {
    var total = (COTIZACION[contrato] || COTIZACION.indefinido) * Math.min(bruto, BASE_MAXIMA), desde = BASE_MAXIMA;
    SOLIDARIDAD.forEach(function (t) {
      var hasta = BASE_MAXIMA * t[0];
      if (bruto > desde) total += (Math.min(bruto, hasta) - desde) * t[1] / 100 * SOLIDARIDAD_TRABAJADOR;
      desde = hasta;
    });
    return centimos(total);
  }

  // art. 20, on the net income before the 2,000 € of other expenses
  function reduccionTrabajo(neto) {
    if (neto <= 14852) return 7302;
    if (neto <= 17673.52) return centimos(7302 - 1.75 * (neto - 14852));
    if (neto <= 19747.5) return centimos(2364.34 - 1.14 * (neto - 17673.52));
    return 0;
  }

  // 61st additional provision, for salaries only: a pension counts as other income. Renta WEB looks at the gross
  // pay once the 30 % reduction is taken off
  function deduccionSueldosBajos(integro) {
    if (integro <= 16576) return 340;
    if (integro < 18276) return centimos(340 - 0.2 * (integro - 16576));
    return 0;
  }

  // in a joint return the spouse is taken to be the same age as the taxpayer, so the age increase counts twice.
  // Children with a disability share the minimum like the others; parents or grandparents with one are counted whole
  function minimo(m, p, reparto) {
    var personas = p.situacion === "conjunta" ? 2 : 1;
    var mayor = p.edad === "mayor" || p.edad === "mayor75";
    var contribuyente = mayor && m.personal65 ? m.personal65 : m.personal;
    if (mayor) contribuyente += m.mas65 * personas;
    if (p.edad === "mayor75") contribuyente += m.mas75 * personas;
    var descendientes = 0;
    for (var i = 0; i < p.hijos; i++) descendientes += m.descendientes[Math.min(i, 3)];
    descendientes = (descendientes + m.menor3 * p.menores3) * reparto;
    var ascendientes = m.ascendiente * p.ascendientes + m.ascendiente75 * p.ascendientes75;
    var propia = p.discapacidad === "d33" ? m.discapacidad33 : p.discapacidad === "d65" ? m.discapacidad65 + m.asistencia : 0;
    var hijos = p.hijosDiscapacidad * reparto * (p.gradoHijos === "d65" ?
      (m.discapacidadHijos65 || m.discapacidad65) + m.asistencia : (m.discapacidadHijos33 || m.discapacidad33));
    var padres = p.ascendientesDiscapacidad * (p.gradoAscendientes === "d65" ? m.discapacidad65 + m.asistencia : m.discapacidad33);
    var discapacidad = propia + hijos + padres;
    return {
      contribuyente: contribuyente, descendientes: descendientes, ascendientes: ascendientes,
      discapacidad: discapacidad, total: centimos(contribuyente + descendientes + ascendientes + discapacidad)
    };
  }

  // Andalusian deductions as [key, amount]; the income limits look at the sum of the general and savings bases.
  // trabajan says whether the household has the work or business income that domestic help asks for
  function deduccionesAndalucia(p, baseImponible, conjunta, monoparental, reparto, trabajan) {
    var hasta25 = baseImponible <= (conjunta ? 30000 : 25000);
    var hasta80 = baseImponible <= (conjunta ? 100000 : 80000);
    var discapacidad = p.discapacidad !== "no";
    var lista = [];
    var puedeAlquiler = p.edad === "joven" || p.edad === "mayor" || p.edad === "mayor75" || discapacidad;
    if (p.alquiler > 0 && puedeAlquiler && hasta25) {
      lista.push(["alquiler", centimos(Math.min(0.15 * p.alquiler, discapacidad ? 1500 : 1200))]);
    }
    // birth and large family cannot be combined: the larger one is applied. It is 400 € a child in a town of
    // fewer than 3,000 people, and a birth of twins or more adds 200 € a child; children born in the same year are
    // taken to come from the same birth
    var nacimiento = ((p.municipioPequeno ? 400 : 200) + (p.nacidos > 1 ? 200 : 0)) * p.nacidos * reparto;
    var numerosa = p.hijos >= 3 && hasta25 ? (p.hijos >= 5 ? 400 : 200) * reparto : 0;
    if (nacimiento > 0 && nacimiento >= numerosa) lista.push(["nacimiento", nacimiento]);
    else if (numerosa > 0) lista.push(["numerosa", numerosa]);
    if (monoparental && hasta80) lista.push(["monoparental", 100 + 100 * p.ascendientes75]);
    if (discapacidad && hasta25) lista.push(["discapacidad", 150]);
    // 100 € for each child, parent or grandparent who gives the minimum for a disability
    var asistencia = 100 * (p.hijosDiscapacidad * reparto + p.ascendientesDiscapacidad);
    if (asistencia > 0 && hasta80) lista.push(["asistencia", asistencia]);
    // 20 % of the Social Security paid for a domestic worker, up to 500 €, for parents who both work or for
    // someone aged 75 or more
    if (p.empleadaHogar > 0 && ((p.hijos > 0 && trabajan) || p.edad === "mayor75")) {
      lista.push(["ayudaDomestica", centimos(Math.min(0.2 * p.empleadaHogar, 500))]);
    }
    if (p.educacion > 0 && p.hijos > 0 && hasta80) lista.push(["educacion", centimos(Math.min(0.15 * p.educacion, 150 * p.hijos))]);
    if (p.deporte > 0) lista.push(["deporte", centimos(Math.min(0.15 * p.deporte, 100))]);
    if (p.veterinario > 0 && hasta80) lista.push(["veterinario", centimos(Math.min(0.3 * p.veterinario, 100))]);
    if (p.celiacos > 0) lista.push(["celiaca", 100 * p.celiacos * reparto]);
    return lista;
  }

  // partida "base" reads bruto as the general taxable base and ahorro as the savings one, already net of
  // contributions, expenses and reductions, the joint one and the pension plan included; the person is taken to
  // be a worker
  function liquidar(persona, region, partida) {
    var p = {};
    Object.keys(VACIO).forEach(function (k) { p[k] = persona[k] === undefined ? VACIO[k] : persona[k]; });
    var comunidad = REGIONES[region] || REGIONES.andalucia;
    var andalucia = comunidad === REGIONES.andalucia;
    var deBase = partida === "base";
    var sueldo = deBase || p.renta === "sueldo";
    var bruto = Math.max(0, p.bruto);

    // art. 18.2: work income generated over more than two years and received at once counts 70 %, on up to
    // 300,000 € a year; pensions are left out. The reduction comes before the expenses, so the art. 20 one is
    // worked out on what is left
    var irregular = sueldo ? Math.min(Math.max(0, p.irregular), bruto) : 0;
    var reduccionIrregular = centimos(IRREGULAR * Math.min(irregular, IRREGULAR_MAXIMO));
    var integro = centimos(bruto - reduccionIrregular);

    var cotizaciones = sueldo && !deBase ? Math.min(integro, centimos(p.cotizacionesDadas > 0 ? p.cotizacionesDadas : cotizar(bruto, p.contrato))) : 0;
    var previo = centimos(integro - cotizaciones);

    // a joint return adds the partner's salary, and amounts and limits are not doubled (art. 84.2): one set of
    // 2,000 € of expenses and one art. 20 reduction for both. A parent living alone with the children files jointly
    // with them (2,150 €), which never costs more; that joint return needs a child under 18
    var sinPareja = p.situacion === "sin" && p.hijos > 0;
    var monoparental = sinPareja && p.hijos > p.mayores;
    var conjunta = p.situacion === "conjunta" || monoparental;
    var parejaBruto = p.situacion === "conjunta" && !deBase ? Math.max(0, p.sueldoPareja) : 0;
    var parejaCotizaciones = parejaBruto > 0 ? cotizar(parejaBruto, "indefinido") : 0;
    var previos = centimos(previo + parejaBruto - parejaCotizaciones);   // box 0018
    // the 2,000 € (box 0019) and the increase for a worker with a disability (0021), together no more than what is left
    var gastosGenerales = deBase ? 0 : Math.min(previos, OTROS_GASTOS);
    var gastosDiscapacidad = deBase || !sueldo || p.discapacidad === "no" ? 0 :
      Math.min(centimos(previos - gastosGenerales), previo, GASTOS_DISCAPACIDAD[p.discapacidad]);
    var otrosGastos = gastosGenerales + gastosDiscapacidad;
    var neto = centimos(previos - otrosGastos);

    // other income: savings go to the savings base; a home let out has the reduction of art. 23.2 and a business
    // in the simplified direct method takes off 5 % for provisions and costs hard to prove, up to 2,000 €
    var ahorro = Math.max(0, p.ahorro);
    var alquilerNeto = deBase ? 0 : Math.max(0, centimos(p.alquilerCobrado - p.alquilerGastos));
    var alquilerReduccion = centimos(alquilerNeto * (REDUCCIONES_ALQUILER[p.alquilerReduccion] || 0));
    var actividadPrevio = deBase ? 0 : centimos(p.actividadIngresos - p.actividadGastos);
    var actividadDificil = actividadPrevio > 0 ? Math.min(centimos(0.05 * actividadPrevio), 2000) : 0;
    var actividadNeto = centimos(actividadPrevio - actividadDificil);
    // income other than work, net and before reductions, for the 6,500 € conditions; a pension counts here for
    // the low-wage deduction
    var otrasRentas = deBase ? 0 : centimos(ahorro + alquilerNeto + actividadNeto);
    var reduccion = deBase || otrasRentas > RENTAS_DISTINTAS ? 0 : Math.min(neto, reduccionTrabajo(previos));
    var trabajoReducido = centimos(neto - reduccion);   // box 0025
    // art. 32.2.3.º: someone with income below 12,000 €, the business's included, takes 1,620 € off it, less above
    // 8,000 €, and no more than 3,700 € together with the art. 20 reduction
    var rentas = centimos(neto + otrasRentas);
    var reduccionActividad = 0;
    if (actividadNeto > 0 && rentas < 12000) {
      reduccionActividad = rentas <= 8000 ? 1620 : centimos(1620 - 0.405 * (rentas - 8000));
      reduccionActividad = Math.max(0, Math.min(reduccionActividad, actividadNeto, centimos(3700 - reduccion)));
    }
    var alquilerReducido = centimos(alquilerNeto - alquilerReduccion);
    var actividadReducido = centimos(actividadNeto - reduccionActividad);
    // a loss of the business is taken to be offset in later years, so the base does not go below zero here
    var baseImponible = Math.max(0, centimos(trabajoReducido + alquilerReducido + actividadReducido));   // box 0435
    var baseAhorro = ahorro;   // box 0460

    // the joint reduction goes to the general base first and what is left to the savings base (art. 84.2.3.º
    // and 4.º); then the pension plan, the taxpayer's own contributions (arts. 51 and 52), up to 1,500 € and 30 %
    // of the net income from work and business
    var reduccionConjunta = conjunta && !deBase ? (monoparental ? 2150 : 3400) : 0;
    var conjuntaGeneral = Math.min(baseImponible, reduccionConjunta);
    var conjuntaAhorro = Math.min(baseAhorro, reduccionConjunta - conjuntaGeneral);
    var netoPropio = Math.max(0, centimos(previo - Math.min(previo, OTROS_GASTOS) - gastosDiscapacidad));
    var plan = deBase ? 0 : Math.max(0, centimos(Math.min(p.plan, PLAN_MAXIMO,
      PLAN_PARTE * Math.max(0, netoPropio + Math.max(0, actividadNeto)), baseImponible - conjuntaGeneral)));
    var baseLiquidable = centimos(baseImponible - conjuntaGeneral - plan);   // box 0500
    var baseLiquidableAhorro = centimos(baseAhorro - conjuntaAhorro);       // box 0510

    // a couple filing separately share the minimum and the deductions for their children
    var reparto = p.situacion === "pareja" ? 0.5 : 1;
    var minimoEstatal = minimo(MINIMOS_ESTATALES, p, reparto);
    var minimoAutonomico = minimo(comunidad.minimos, p, reparto);
    var tramosAutonomicos = comunidad.escala;
    // each quota is the scale on the base minus the same scale on the part of the base the minimum covers; the
    // minimum goes to the general base first and what is left to the savings base (arts. 56, 63, 66, 74 and 76)
    function cuotas(tramos, m) {
      var general = Math.min(m, baseLiquidable), delAhorro = Math.min(m - general, baseLiquidableAhorro);
      var c = {
        base: escala(tramos, baseLiquidable), minimo: escala(tramos, general),
        ahorroBase: escala(ESCALA_AHORRO, baseLiquidableAhorro), ahorroMinimo: escala(ESCALA_AHORRO, delAhorro)
      };
      c.cuota = centimos(c.base - c.minimo + c.ahorroBase - c.ahorroMinimo);
      return c;
    }
    var estatal = cuotas(ESCALA_ESTATAL, minimoEstatal.total);
    var autonomica = cuotas(tramosAutonomicos, minimoAutonomico.total);
    var cuotaEstatal = estatal.cuota, cuotaAutonomica = autonomica.cuota;

    // housing bought before 2013 (18th transitional provision): 15 % of up to 9,040 € paid in the year, half in
    // each quota
    var viviendaBase = Math.min(Math.max(0, p.hipoteca), VIVIENDA_MAXIMO);
    var viviendaEstatal = Math.min(centimos(VIVIENDA_PARTE * viviendaBase), cuotaEstatal);
    var viviendaAutonomica = Math.min(centimos(VIVIENDA_PARTE * viviendaBase), cuotaAutonomica);
    // donations (art. 68.3): half from each quota, with a base of up to 10 % of the taxable base
    var baseDonativos = Math.min(p.donativos, 0.1 * (baseLiquidable + baseLiquidableAhorro));
    var donativos = 0.8 * Math.min(baseDonativos, 250) + 0.4 * Math.max(0, baseDonativos - 250);
    var donativosEstatal = Math.min(centimos(donativos / 2), centimos(cuotaEstatal - viviendaEstatal));
    var donativosAutonomico = Math.min(centimos(donativos / 2), centimos(cuotaAutonomica - viviendaAutonomica));

    var trabajan = (sueldo && bruto > 0) || p.actividadIngresos > 0;
    if (p.situacion === "conjunta") trabajan = trabajan && parejaBruto > 0;
    var andaluzas = andalucia ? deduccionesAndalucia(p, baseImponible + baseAhorro, conjunta, monoparental, reparto, trabajan) : [];
    var andaluzasTotal = centimos(andaluzas.reduce(function (s, d) { return s + d[1]; }, 0));
    var andaluzasAplicadas = Math.min(andaluzasTotal, centimos(cuotaAutonomica - viviendaAutonomica - donativosAutonomico));

    var cuotaLiquidaEstatal = centimos(cuotaEstatal - viviendaEstatal - donativosEstatal);
    var cuotaLiquidaAutonomica = centimos(cuotaAutonomica - viviendaAutonomica - donativosAutonomico - andaluzasAplicadas);
    var cuotaLiquida = centimos(cuotaLiquidaEstatal + cuotaLiquidaAutonomica);

    // the low-wage deduction looks at the pay from work after the 30 % reduction, the partner's too in a joint
    // return, so it is left out when starting from the base. With other income it may not exceed the part of the
    // gross quotas that the net pay from work accounts for; here it does not leave the tax below zero either
    var sueldosBajos = 0;
    if (!deBase) {
      var deTrabajo = (p.renta === "sueldo" ? integro : 0) + parejaBruto;
      var distintas = otrasRentas + (p.renta === "sueldo" ? 0 : previo);
      if (deTrabajo > 0 && distintas <= RENTAS_DISTINTAS) {
        var netoTrabajo = (p.renta === "sueldo" ? previo : 0) + (previos - previo);
        var parte = netoTrabajo > 0 ? Math.min(1, netoTrabajo / Math.max(netoTrabajo, previos + otrasRentas)) : 0;
        sueldosBajos = Math.min(deduccionSueldosBajos(deTrabajo), centimos((cuotaEstatal + cuotaAutonomica) * parte), cuotaLiquida);
      }
    }
    var cuotaResultante = centimos(cuotaLiquida - sueldosBajos);

    // these can turn the tax negative: they are paid even without tax to deduct them from.
    // Maternity (art. 81) is 100 € a month for each child under 3, counting the month of birth and not the month of
    // the third birthday, for a mother who was registered with the Social Security or drew unemployment benefit at
    // the birth. Nursery fees that no grant paid add up to 83.33 € a month for each child, 1,000 € a year, and in the
    // year a child turns 3 they count until August, before the next school stage
    var meses = 12 * (p.menores3 - p.nacidos) + (13 - p.mes) * p.nacidos + (p.mesTres - 1) * p.cumplen3;
    var mesesGuarderia = 12 * (p.menores3 - p.nacidos) + (13 - p.mes) * p.nacidos + 8 * p.cumplen3;
    var madre = sueldo && p.madre;
    var maternidad = madre ? MATERNIDAD_MES * meses : 0;
    var guarderia = madre ? centimos(Math.min(p.guarderia, GUARDERIA_MES * mesesGuarderia)) : 0;
    // large or single-parent family and dependants with a disability (art. 81 bis), for someone who works or has a
    // pension, 1,200 € each. For a worker, each general 1,200 € may not exceed the total contributions, the
    // employer's included; the increases for a special or larger family are outside the limit. From the base or
    // with a business the contributions are unknown and the limit is left out.
    var trabaja = bruto > 0 || parejaBruto > 0 || p.actividadIngresos > 0;
    var limite = sueldo && !deBase && !(p.actividadIngresos > 0) ?
      centimos((COTIZACION_EMPRESA + (COTIZACION[p.contrato] || COTIZACION.indefinido)) * (Math.min(bruto, BASE_MAXIMA) + Math.min(parejaBruto, BASE_MAXIMA))) : Infinity;
    var general = 0, aumento = 0;
    if (p.hijos >= 3) {
      general = 1200 * reparto;
      aumento = (p.hijos >= 5 ? 1200 + 600 * (p.hijos - 5) : 600 * (p.hijos - 3)) * reparto;
    } else if (sinPareja && p.hijos === 2) {
      general = 1200;
    }
    var familia = trabaja ? Math.min(general, limite) + aumento : 0;
    var discapacidadHijos = trabaja ? p.hijosDiscapacidad * Math.min(1200 * reparto, limite) : 0;
    var discapacidadAscendientes = trabaja ? p.ascendientesDiscapacidad * Math.min(1200, limite) : 0;
    var irpf = centimos(cuotaResultante - maternidad - guarderia - discapacidadHijos - discapacidadAscendientes - familia);

    var ingresos = bruto + parejaBruto + ahorro + alquilerNeto + Math.max(0, actividadPrevio);
    return {
      bruto: bruto, deBase: deBase, irregular: irregular, reduccionIrregular: reduccionIrregular, integro: integro,
      sueldo: sueldo, cotizaciones: cotizaciones, previo: previo, parejaBruto: parejaBruto,
      parejaCotizaciones: parejaCotizaciones, previos: previos, otrosGastos: otrosGastos,
      gastosGenerales: gastosGenerales, gastosDiscapacidad: gastosDiscapacidad, neto: neto, reduccion: reduccion,
      trabajoReducido: trabajoReducido, alquilerNeto: alquilerNeto, alquilerReduccion: alquilerReduccion,
      actividadPrevio: actividadPrevio, actividadDificil: actividadDificil, reduccionActividad: reduccionActividad,
      otrasRentas: otrasRentas, baseImponible: baseImponible, baseAhorro: baseAhorro, conjunta: conjunta,
      monoparental: monoparental, reduccionConjunta: centimos(conjuntaGeneral + conjuntaAhorro), plan: plan,
      baseLiquidable: baseLiquidable, baseLiquidableAhorro: baseLiquidableAhorro,
      minimoEstatal: minimoEstatal, minimoAutonomico: minimoAutonomico,
      escalaBaseEstatal: estatal.base, escalaMinimoEstatal: estatal.minimo,
      ahorroBaseEstatal: estatal.ahorroBase, ahorroMinimoEstatal: estatal.ahorroMinimo,
      escalaBaseAutonomica: autonomica.base, escalaMinimoAutonomico: autonomica.minimo,
      ahorroBaseAutonomica: autonomica.ahorroBase, ahorroMinimoAutonomico: autonomica.ahorroMinimo,
      cuotaEstatal: cuotaEstatal, cuotaAutonomica: cuotaAutonomica,
      vivienda: centimos(viviendaEstatal + viviendaAutonomica), donativos: centimos(donativosEstatal + donativosAutonomico),
      andaluzas: andaluzas, andaluzasTotal: andaluzasTotal, andaluzasAplicadas: andaluzasAplicadas,
      cuotaLiquida: cuotaLiquida, sueldosBajos: sueldosBajos, cuotaResultante: cuotaResultante,
      maternidad: maternidad, guarderia: guarderia, discapacidadHijos: discapacidadHijos,
      discapacidadAscendientes: discapacidadAscendientes, familia: familia, familiaNumerosa: p.hijos >= 3,
      irpf: irpf, retenciones: p.retenciones, resultado: centimos(irpf - p.retenciones), ingresos: ingresos,
      tipoMedio: ingresos > 0 ? 100 * irpf / ingresos : 0,
      tipoTramo: tipoTramo(ESCALA_ESTATAL, baseLiquidable) + tipoTramo(tramosAutonomicos, baseLiquidable),
      neta: centimos(ingresos - cotizaciones - parejaCotizaciones - irpf)
    };
  }

  root.IRPF2025 = {
    VACIO: VACIO, liquidar: liquidar, cotizar: cotizar,
    COMUNIDADES: COMUNIDADES.map(function (c) { return [c[0], c[1]]; })
  };
})(typeof window !== "undefined" ? window : this);
