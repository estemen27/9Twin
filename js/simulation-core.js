(function (root) {
  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, decimals) {
    return Number(value.toFixed(decimals));
  }

  function getBaselineKpi() {
    return {
      tiempo: 22.1,
      p90: 37.0,
      congestion: 0.83,
      velocidad: 22.0,
    };
  }

  function estimateScenario(params, segmentos) {
    const baseline = params.baseline || getBaselineKpi();
    const tipo = params.tipo || "Cierre Vial";
    const isSemaforo = tipo === "Ajuste Semaforización";

    const desvio = params.desvio || "Sin desvío";
    const carriles = toNumber(params.carriles, 1);
    const ciclo = toNumber(params.ciclo, 120);
    const duracionHoras = Math.max(1, toNumber(params.duracionHoras, 3));

    let deltaCongestion = 0;

    if (isSemaforo) {
      const factorSemaforo = clamp((120 - ciclo) / 120, -0.4, 0.35);
      deltaCongestion -= 0.08 * factorSemaforo;
    } else {
      const penalidadCarriles = carriles * 0.042;
      const penalidadDuracion = duracionHoras > 6 ? 0.032 : duracionHoras > 3 ? 0.018 : 0.008;
      const beneficioDesvio = desvio !== "Sin desvío" ? -0.07 : 0.028;

      deltaCongestion += penalidadCarriles + penalidadDuracion + beneficioDesvio;
    }

    const congestion = clamp(round(baseline.congestion + deltaCongestion, 2), 0.42, 0.98);
    const tiempo = clamp(round(baseline.tiempo + deltaCongestion * 20, 1), 16.0, 39.0);
    const p90 = clamp(round(baseline.p90 + deltaCongestion * 29, 1), 25.0, 56.0);
    const velocidad = clamp(round(baseline.velocidad - deltaCongestion * 23, 1), 12.0, 36.0);

    const calidad = Math.abs(deltaCongestion);
    const confianza = calidad < 0.045 ? "VERDE" : calidad < 0.095 ? "AMARILLO" : "ROJO";

    const tramoKey = String(params.tramo || "").split("/")[0].trim().toLowerCase();
    const impactBySegment = {};

    (segmentos || []).forEach(function (seg) {
      const nombreSegmento = String(seg.nombre || "").toLowerCase();
      const impactoLocal = nombreSegmento.includes(tramoKey) ? 1.2 : 0.45;
      const nuevoValor = seg.congestion + deltaCongestion * impactoLocal;

      impactBySegment[seg.id] = clamp(round(nuevoValor, 2), 0.35, 0.99);
    });

    return {
      baseline: baseline,
      kpi: {
        tiempo: tiempo,
        p90: p90,
        congestion: congestion,
        velocidad: velocidad,
      },
      confianza: confianza,
      impactBySegment: impactBySegment,
    };
  }

  const api = {
    clamp: clamp,
    round: round,
    getBaselineKpi: getBaselineKpi,
    estimateScenario: estimateScenario,
  };

  root.SimulationCore = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);