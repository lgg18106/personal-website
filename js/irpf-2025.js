// IRPF 2025, the return filed in the spring of 2026, for someone who lives in Andalusia and has a salary or
// a pension and no other income. js/irpf-simulador.js uses it on es/irpf.html.
//
// Sources: Ley 35/2006 del IRPF (arts. 19, 20, 56 to 61, 63, 68.3, 81, 81 bis and 84, and the 61st additional
// provision added by Ley 5/2025) and the Andalusian Ley 5/2021 de tributos cedidos (arts. 10, 11, 13 to 16,
// 22 bis, 22 ter, 23 and 23 bis), as the Agencia Tributaria explains them in its Manual práctico de Renta 2025.
(function (root) {
  "use strict";

  // [upper limit of the band, rate in per cent]
  var ESCALA_ESTATAL = [[12450, 9.5], [20200, 12], [35200, 15], [60000, 18.5], [300000, 22.5], [Infinity, 24.5]];
  var ESCALA_ANDALUCIA = [[13000, 9.5], [21100, 12], [35200, 15], [60000, 18.5], [Infinity, 22.5]];
  // the one used in class: the state scale twice, with 22.5 % instead of 24.5 % above 300,000 € in the regional half
  var ESCALA_CLASE = [[12450, 9.5], [20200, 12], [35200, 15], [60000, 18.5], [Infinity, 22.5]];

  var MINIMOS_ESTATALES = {
    personal: 5550, mas65: 1150, mas75: 1400, descendientes: [2400, 2700, 4000, 4500], menor3: 2800,
    ascendiente: 1150, ascendiente75: 1400, discapacidad33: 3000, discapacidad65: 9000, asistencia: 3000
  };
  var MINIMOS_ANDALUCIA = {
    personal: 5790, mas65: 1200, mas75: 1460, descendientes: [2510, 2820, 4170, 4700], menor3: 2920,
    ascendiente: 1200, ascendiente75: 1460, discapacidad33: 3130, discapacidad65: 9390, asistencia: 3130
  };

  var COTIZACION = 0.0648;      // the worker's share in 2025: 4.70 + 1.55 + 0.10 + 0.13 (MEI)
  var COTIZACION_EMPRESA = 0.3207;  // the employer's, for a permanent office job; only for the limit of art. 81 bis
  var BASE_MAXIMA = 58914;      // 4,909.50 € a month
  var OTROS_GASTOS = 2000;      // art. 19.2.f, raised for workers with a disability
  var GASTOS_DISCAPACIDAD = { d33: 3500, d65: 7750 };

  // a person with nothing: the simulator fills in the rest
  var VACIO = {
    nombre: "", bruto: 0, renta: "sueldo", edad: "adulto", discapacidad: "no", situacion: "sin",
    hijos: 0, menores3: 0, nacidos: 0, madre: false, ascendientes: 0, ascendientes75: 0,
    alquiler: 0, deporte: 0, veterinario: 0, educacion: 0, donativos: 0, retenciones: 0
  };

  function escala(tramos, base) {
    var total = 0, desde = 0;
    for (var i = 0; i < tramos.length && base > desde; i++) {
      total += (Math.min(base, tramos[i][0]) - desde) * tramos[i][1] / 100;
      desde = tramos[i][0];
    }
    return total;
  }

  // rate of the band that the next euro of base falls in
  function tipoTramo(tramos, base) {
    for (var i = 0; i < tramos.length; i++) if (base < tramos[i][0]) return tramos[i][1];
    return tramos[tramos.length - 1][1];
  }

  // art. 20, on the net income before the 2,000 € of other expenses
  function reduccionTrabajo(neto) {
    if (neto <= 14852) return 7302;
    if (neto <= 17673.52) return 7302 - 1.75 * (neto - 14852);
    if (neto <= 19747.5) return 2364.34 - 1.14 * (neto - 17673.52);
    return 0;
  }

  // 61st additional provision, for salaries only
  function deduccionSueldosBajos(bruto) {
    if (bruto <= 16576) return 340;
    if (bruto < 18276) return 340 - 0.2 * (bruto - 16576);
    return 0;
  }

  // in a joint return the spouse is taken to be the same age as the taxpayer, so the age increase counts twice
  function minimo(m, p, reparto) {
    var personas = p.situacion === "conjunta" ? 2 : 1;
    var contribuyente = m.personal;
    if (p.edad === "mayor" || p.edad === "mayor75") contribuyente += m.mas65 * personas;
    if (p.edad === "mayor75") contribuyente += m.mas75 * personas;
    var descendientes = 0;
    for (var i = 0; i < p.hijos; i++) descendientes += m.descendientes[Math.min(i, 3)];
    descendientes = (descendientes + m.menor3 * p.menores3) * reparto;
    var ascendientes = m.ascendiente * p.ascendientes + m.ascendiente75 * p.ascendientes75;
    var discapacidad = p.discapacidad === "d33" ? m.discapacidad33 :
      p.discapacidad === "d65" ? m.discapacidad65 + m.asistencia : 0;
    return {
      contribuyente: contribuyente, descendientes: descendientes, ascendientes: ascendientes,
      discapacidad: discapacidad, total: contribuyente + descendientes + ascendientes + discapacidad
    };
  }

  // Andalusian deductions as [key, amount]; the income limits look at the sum of the general and savings bases
  function deduccionesAndalucia(p, baseImponible, conjunta, monoparental, reparto) {
    var hasta25 = baseImponible <= (conjunta ? 30000 : 25000);
    var hasta80 = baseImponible <= (conjunta ? 100000 : 80000);
    var discapacidad = p.discapacidad !== "no";
    var lista = [];
    var puedeAlquiler = p.edad === "joven" || p.edad === "mayor" || p.edad === "mayor75" || discapacidad;
    if (p.alquiler > 0 && puedeAlquiler && hasta25) {
      lista.push(["alquiler", Math.min(0.15 * p.alquiler, discapacidad ? 1500 : 1200)]);
    }
    // birth and large family cannot be combined: the larger one is applied
    var nacimiento = 200 * p.nacidos * reparto;
    var numerosa = p.hijos >= 3 && hasta25 ? (p.hijos >= 5 ? 400 : 200) * reparto : 0;
    if (nacimiento > 0 && nacimiento >= numerosa) lista.push(["nacimiento", nacimiento]);
    else if (numerosa > 0) lista.push(["numerosa", numerosa]);
    if (monoparental && hasta80) lista.push(["monoparental", 100 + 100 * p.ascendientes75]);
    if (discapacidad && hasta25) lista.push(["discapacidad", 150]);
    if (p.educacion > 0 && p.hijos > 0 && hasta80) lista.push(["educacion", Math.min(0.15 * p.educacion, 150 * p.hijos)]);
    if (p.deporte > 0) lista.push(["deporte", Math.min(0.15 * p.deporte, 100)]);
    if (p.veterinario > 0 && hasta80) lista.push(["veterinario", Math.min(0.3 * p.veterinario, 100)]);
    return lista;
  }

  function liquidar(persona, escalaAutonomica) {
    var p = {};
    Object.keys(VACIO).forEach(function (k) { p[k] = persona[k] === undefined ? VACIO[k] : persona[k]; });
    var andalucia = escalaAutonomica !== "clase";
    var sueldo = p.renta === "sueldo";
    var bruto = Math.max(0, p.bruto);

    var cotizaciones = sueldo ? COTIZACION * Math.min(bruto, BASE_MAXIMA) : 0;
    var previo = bruto - cotizaciones;
    var otrosGastos = Math.min(previo, OTROS_GASTOS + (sueldo && p.discapacidad !== "no" ? GASTOS_DISCAPACIDAD[p.discapacidad] : 0));
    var neto = previo - otrosGastos;
    var reduccion = Math.min(neto, reduccionTrabajo(previo));
    var baseImponible = neto - reduccion;

    // a parent living alone with the children files jointly with them (2,150 €), which never costs more
    var monoparental = p.situacion === "sin" && p.hijos > 0;
    var conjunta = p.situacion === "conjunta" || monoparental;
    var reduccionConjunta = conjunta ? Math.min(baseImponible, monoparental ? 2150 : 3400) : 0;
    var baseLiquidable = baseImponible - reduccionConjunta;

    // a couple filing separately share the minimum and the deductions for their children
    var reparto = p.situacion === "pareja" ? 0.5 : 1;
    var minimoEstatal = minimo(MINIMOS_ESTATALES, p, reparto);
    var minimoAutonomico = minimo(andalucia ? MINIMOS_ANDALUCIA : MINIMOS_ESTATALES, p, reparto);
    var tramosAutonomicos = andalucia ? ESCALA_ANDALUCIA : ESCALA_CLASE;
    // each quota is the scale on the base minus the same scale on the part of the base the minimum covers (art. 63.1)
    var escalaBaseEstatal = escala(ESCALA_ESTATAL, baseLiquidable);
    var escalaMinimoEstatal = escala(ESCALA_ESTATAL, Math.min(minimoEstatal.total, baseLiquidable));
    var escalaBaseAutonomica = escala(tramosAutonomicos, baseLiquidable);
    var escalaMinimoAutonomico = escala(tramosAutonomicos, Math.min(minimoAutonomico.total, baseLiquidable));
    var cuotaEstatal = escalaBaseEstatal - escalaMinimoEstatal;
    var cuotaAutonomica = escalaBaseAutonomica - escalaMinimoAutonomico;

    // donations (art. 68.3): half from each quota, with a base of up to 10 % of the taxable base
    var baseDonativos = Math.min(p.donativos, 0.1 * baseLiquidable);
    var donativos = 0.8 * Math.min(baseDonativos, 250) + 0.4 * Math.max(0, baseDonativos - 250);
    var donativosEstatal = Math.min(donativos / 2, cuotaEstatal);
    var donativosAutonomico = Math.min(donativos / 2, cuotaAutonomica);

    var andaluzas = andalucia ? deduccionesAndalucia(p, baseImponible, conjunta, monoparental, reparto) : [];
    var andaluzasTotal = andaluzas.reduce(function (s, d) { return s + d[1]; }, 0);
    var andaluzasAplicadas = Math.min(andaluzasTotal, cuotaAutonomica - donativosAutonomico);

    var cuotaLiquidaEstatal = cuotaEstatal - donativosEstatal;
    var cuotaLiquidaAutonomica = cuotaAutonomica - donativosAutonomico - andaluzasAplicadas;
    var cuotaLiquida = cuotaLiquidaEstatal + cuotaLiquidaAutonomica;

    // it may not exceed the gross quotas; here it does not leave the tax below zero either
    var sueldosBajos = sueldo ? Math.min(deduccionSueldosBajos(bruto), cuotaEstatal + cuotaAutonomica, cuotaLiquida) : 0;
    var cuotaResultante = cuotaLiquida - sueldosBajos;

    // these two can turn the tax negative: they are paid even without tax to deduct them from, to someone
    // who works or has a pension. For a worker, the general 1,200 € of art. 81 bis may not exceed the total
    // contributions, the employer's included; the increases for a special or larger family are outside the limit.
    var maternidad = sueldo && p.madre && bruto > 0 ? 1200 * p.menores3 : 0;
    var general = 0, aumento = 0;
    if (p.hijos >= 3) {
      general = 1200 * reparto;
      aumento = (p.hijos >= 5 ? 1200 + 600 * (p.hijos - 5) : 600 * (p.hijos - 3)) * reparto;
    } else if (monoparental && p.hijos === 2) {
      general = 1200;
    }
    if (sueldo) general = Math.min(general, (COTIZACION + COTIZACION_EMPRESA) * Math.min(bruto, BASE_MAXIMA));
    var familia = bruto > 0 ? general + aumento : 0;
    var irpf = cuotaResultante - maternidad - familia;

    return {
      bruto: bruto, sueldo: sueldo, cotizaciones: cotizaciones, otrosGastos: otrosGastos, neto: neto,
      reduccion: reduccion, baseImponible: baseImponible, conjunta: conjunta, monoparental: monoparental,
      reduccionConjunta: reduccionConjunta, baseLiquidable: baseLiquidable,
      minimoEstatal: minimoEstatal, minimoAutonomico: minimoAutonomico,
      escalaBaseEstatal: escalaBaseEstatal, escalaMinimoEstatal: escalaMinimoEstatal,
      escalaBaseAutonomica: escalaBaseAutonomica, escalaMinimoAutonomico: escalaMinimoAutonomico,
      cuotaEstatal: cuotaEstatal, cuotaAutonomica: cuotaAutonomica,
      donativos: donativosEstatal + donativosAutonomico, andaluzas: andaluzas, andaluzasTotal: andaluzasTotal,
      andaluzasAplicadas: andaluzasAplicadas, cuotaLiquida: cuotaLiquida, sueldosBajos: sueldosBajos,
      cuotaResultante: cuotaResultante, maternidad: maternidad, familia: familia, familiaNumerosa: p.hijos >= 3,
      irpf: irpf, retenciones: p.retenciones, resultado: irpf - p.retenciones,
      tipoMedio: bruto > 0 ? 100 * irpf / bruto : 0,
      tipoTramo: tipoTramo(ESCALA_ESTATAL, baseLiquidable) + tipoTramo(tramosAutonomicos, baseLiquidable),
      neta: bruto - cotizaciones - irpf
    };
  }

  root.IRPF2025 = { VACIO: VACIO, liquidar: liquidar };
})(typeof window !== "undefined" ? window : this);
