(function () {
  window.initLayout?.("escenarios", "Escenarios");
  window.initModalSystem?.();

  const escenarios = window.AppData?.escenarios || [];
  let filtro = "Todos";
  let actual = null;
  let simChart = null;
  let currentResult = null;
  let playbackHour = 8;
  let playbackTimer = null;
  let liveTimer = null;
  let simMapInstance = null;
  let simRunning = false;

  const tramoOptions = [
    "Av. Circunvalar Chía / Cra 11",
    "Variante Chía-Cajicá / Puente Piedra",
    "Entrada Unisabana Norte",
    "Cra 6 Cajicá / Cll 3",
    "Av. Boyacá / Chía",
    "Autonorte / Peaje Andes",
    "Anillo Vial Chía Centro",
    "Calle 1", "Calle 2", "Calle 3", "Calle 4", "Calle 5", "Calle 6", "Calle 7", "Calle 8",
  ];

  document.getElementById("f-tramo").innerHTML = tramoOptions.map(function (t) { return "<option>" + t + "</option>"; }).join("");

  function hourLabel(hour) {
    return String(hour).padStart(2, "0") + ":00";
  }

  function setExecConfidence(level) {
    const wrap = document.getElementById("exec-confidence");
    if (!wrap) return;
    if (!level) {
      wrap.innerHTML = '<span class="badge badge-gray">Sin ejecutar</span>';
      return;
    }
    const cls = level === "VERDE" ? "badge-green" : level === "AMARILLO" ? "badge-amber" : "badge-red";
    wrap.innerHTML = '<span class="badge ' + cls + '">' + level + "</span>";
  }

  function pushExecFeed(text) {
    const feed = document.getElementById("exec-feed");
    if (!feed) return;
    const li = document.createElement("li");
    li.textContent = hourLabel(new Date().getHours()) + " " + text;
    feed.prepend(li);
    while (feed.children.length > 7) {
      feed.removeChild(feed.lastChild);
    }
  }

  function setExecEngine(text) {
    const el = document.getElementById("exec-engine");
    if (el) el.textContent = text;
  }

  function refreshExecutiveHeader() {
    const esc = document.getElementById("exec-escenario");
    const upd = document.getElementById("exec-updated");
    if (esc) esc.textContent = actual ? (actual.id + " · " + actual.nombre) : "Sin seleccionar";
    if (upd) upd.textContent = window.formatDateTime?.(new Date().toISOString()) || new Date().toLocaleTimeString();
    setExecConfidence(actual?.confianza || "");
  }

  function startExecutiveFeed() {
    if (liveTimer) return;
    const corredores = window.AppData?.corredores || [];
    const fuentes = window.AppData?.fuentes || [];
    pushExecFeed("Sesion ejecutiva activa. Gemelo digital conectado.");
    liveTimer = setInterval(function () {
      const cor = corredores[Math.floor(Math.random() * corredores.length)];
      const src = fuentes[Math.floor(Math.random() * fuentes.length)];
      const speed = cor ? (cor.velocidadActual + (Math.random() - 0.5) * 1.6).toFixed(1) : "--";
      const fresh = src ? Math.max(12, Math.round((src.frescura || 40) + (Math.random() - 0.5) * 8)) : "--";
      pushExecFeed("" + (cor?.id || "COR") + " velocidad " + speed + " km/h | " + (src?.id || "SRC") + " frescura " + fresh + "s");
      refreshExecutiveHeader();
    }, 7000);
  }

  function stopPlayback() {
    if (playbackTimer) {
      clearInterval(playbackTimer);
      playbackTimer = null;
    }
    const playBtn = document.getElementById("sim-play");
    if (playBtn) playBtn.textContent = "Reproducir 24h";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, decimals) {
    return Number(value.toFixed(decimals));
  }

  function getBaselineKpi() {
    return { tiempo: 22.1, p90: 37.0, congestion: 0.83, velocidad: 22.0 };
  }

  function buildSeries(kpi) {
    const baseline = getBaselineKpi();
    const labels = Array.from({ length: 24 }, function (_, h) {
      return String(h).padStart(2, "0") + ":00";
    });
    const deltaCong = kpi.congestion - baseline.congestion;

    const base = labels.map(function (_, h) {
      const peak = (h >= 6 && h <= 9) || (h >= 17 && h <= 20) ? 1 : 0;
      return round(baseline.tiempo + (peak ? 8.4 : 2.9) + Math.sin(h / 3.2) * 1.4, 1);
    });
    const scenario = base.map(function (v, h) {
      const peakImpact = (h >= 6 && h <= 9) || (h >= 17 && h <= 20) ? 1.3 : 0.85;
      const ripple = Math.sin((h + 2) / 2.7) * (1 + Math.abs(deltaCong) * 4.2);
      return round(v + deltaCong * (10.8 * peakImpact) + ripple, 1);
    });
    return { labels: labels, baseline: base, scenario: scenario };
  }

  function mapForHour(result, hour, mode) {
    const source = JSON.parse(JSON.stringify(window.AppData?.mapaChia || {}));
    const rush = (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20);
    const hourFactor = rush ? 1.18 : 0.9;
    source.segmentos = (source.segmentos || []).map(function (seg) {
      const baseCong = seg.congestion;
      const simCong = typeof result.impactBySegment?.[seg.id] === "number" ? result.impactBySegment[seg.id] : baseCong;
      const scenValue = clamp(round(baseCong + (simCong - baseCong) * hourFactor, 2), 0.35, 0.99);
      if (mode === "baseline") return Object.assign({}, seg, { congestion: baseCong });
      if (mode === "delta") {
        const delta = scenValue - baseCong;
        return Object.assign({}, seg, { congestion: clamp(round(0.62 + delta * 2.1, 2), 0.35, 0.99) });
      }
      return Object.assign({}, seg, { congestion: scenValue });
    });
    return source;
  }

  function renderTimeSlice(result, hour, mode) {
    const hourBadge = document.getElementById("sim-hour-label");
    if (hourBadge) hourBadge.textContent = hourLabel(hour);

    const series = result.series || buildSeries(result.kpi);
    const basePoint = series.labels.map(function (_, idx) { return idx === hour ? 4 : 0; });
    const scenarioPoint = series.labels.map(function (_, idx) { return idx === hour ? 5 : 0; });
    const chartCanvas = document.getElementById("esc-sim-chart");
    if (!simChart) {
      simChart = window.ChartKit?.createLine(chartCanvas, series.labels, [
        {
          label: "Baseline",
          data: series.baseline,
          borderColor: "rgba(148, 163, 184, 0.9)",
          backgroundColor: "rgba(148, 163, 184, 0.16)",
          tension: 0.34,
          borderWidth: 2,
          pointRadius: basePoint,
          fill: true,
        },
        {
          label: "Escenario",
          data: series.scenario,
          borderColor: "rgba(96, 165, 250, 0.95)",
          backgroundColor: "rgba(96, 165, 250, 0.26)",
          tension: 0.34,
          borderWidth: 2.4,
          pointRadius: scenarioPoint,
          fill: true,
        },
      ]);
    } else {
      simChart.data.labels = series.labels;
      simChart.data.datasets[0].data = series.baseline.slice();
      simChart.data.datasets[0].pointRadius = basePoint;
      simChart.data.datasets[1].data = series.scenario.slice();
      simChart.data.datasets[1].pointRadius = scenarioPoint;
      simChart.update("none");
    }

    const mapData = mapForHour(result, hour, mode);
    if (!simMapInstance) {
      simMapInstance = window.initTwinMap?.({
        svgId: "esc-map-diff",
        data: mapData,
        interactive: true,
        onSegmentClick: function (seg) {
          const info = document.getElementById("sim-map-info");
          if (!info || !seg) return;
          info.innerHTML = '<strong>' + seg.id + "</strong> · " + seg.nombre + ' | Vel ' + seg.velocidad + ' km/h | Cola ' + seg.cola + ' | Demora ' + seg.demora;
        },
        onNodeClick: function (node) {
          const info = document.getElementById("sim-map-info");
          if (!info || !node) return;
          info.innerHTML = '<strong>' + node.id + "</strong> · " + node.tipo + ' | Estado ' + node.estado + ' | Coord ' + node.coord;
        },
      });
    } else {
      (mapData.segmentos || []).forEach(function (seg) {
        simMapInstance?.setCongestion(seg.id, seg.congestion);
      });
    }
  }

  function estimateSimulation() {
    const baseline = getBaselineKpi();
    const isSem = document.getElementById("form-cierre").style.display === "none";
    const desvio = document.getElementById("f-desvio")?.value || "Sin desvío";
    const carriles = Number(document.getElementById("f-carriles")?.value || "1");
    const ciclo = Number(document.getElementById("f-ciclo-num")?.value || "120");
    const iniRaw = document.getElementById("f-inicio")?.value;
    const finRaw = document.getElementById("f-fin")?.value;
    const ini = iniRaw ? new Date(iniRaw) : null;
    const fin = finRaw ? new Date(finRaw) : null;
    const durHours = ini && fin && fin > ini ? Math.max(1, (fin - ini) / 3600000) : 3;

    let deltaCong = 0;
    if (isSem) {
      const semFactor = clamp((120 - ciclo) / 120, -0.4, 0.35);
      deltaCong += -0.08 * semFactor;
    } else {
      const lanePenalty = carriles * 0.042;
      const durationPenalty = durHours > 6 ? 0.032 : durHours > 3 ? 0.018 : 0.008;
      const desvioBonus = desvio !== "Sin desvío" ? -0.07 : 0.028;
      deltaCong += lanePenalty + durationPenalty + desvioBonus;
    }

    deltaCong += (Math.random() - 0.5) * 0.018;

    const congestion = clamp(round(baseline.congestion + deltaCong, 2), 0.42, 0.98);
    const tiempo = clamp(round(baseline.tiempo + deltaCong * 20, 1), 16.0, 39.0);
    const p90 = clamp(round(baseline.p90 + deltaCong * 29, 1), 25.0, 56.0);
    const velocidad = clamp(round(baseline.velocidad - deltaCong * 23, 1), 12.0, 36.0);

    const quality = Math.abs(deltaCong);
    const confianza = quality < 0.045 ? "VERDE" : quality < 0.095 ? "AMARILLO" : "ROJO";

    const tramo = document.getElementById("f-tramo")?.value || "";
    const tramoKey = tramo.split("/")[0].trim().toLowerCase();
    const impactBySegment = {};
    (window.AppData?.mapaChia?.segmentos || []).forEach(function (seg) {
      const local = seg.nombre.toLowerCase().includes(tramoKey) ? 1.2 : 0.45;
      const segDelta = deltaCong * local + (Math.random() - 0.5) * 0.012;
      impactBySegment[seg.id] = clamp(round(seg.congestion + segDelta, 2), 0.35, 0.99);
    });

    return {
      baseline: baseline,
      kpi: { tiempo: tiempo, p90: p90, congestion: congestion, velocidad: velocidad },
      confianza: confianza,
      series: buildSeries({ tiempo: tiempo, p90: p90, congestion: congestion, velocidad: velocidad }),
      impactBySegment: impactBySegment,
    };
  }

  function estadoBadge(s) {
    const map = {
      Aprobado: "badge-green",
      Completado: "badge-blue",
      "En simulación": "badge-amber",
      Rechazado: "badge-red",
      Error: "badge-red",
      Borrador: "badge-gray",
    };
    return '<span class="badge ' + (map[s] || "badge-gray") + '">' + s + "</span>";
  }

  function renderLista() {
    const query = document.getElementById("search-esc").value.toLowerCase();
    const wrap = document.getElementById("lista-escenarios");
    const filtered = escenarios.filter(function (e) {
      const okEstado = filtro === "Todos" || e.estado === filtro;
      const okQ = e.id.toLowerCase().includes(query) || e.nombre.toLowerCase().includes(query);
      return okEstado && okQ;
    });

    if (!filtered.length) {
      wrap.innerHTML = '<div class="empty-state">No hay escenarios para este filtro.</div>';
      return;
    }

    wrap.innerHTML = filtered.map(function (e) {
      return (
        '<div class="card" style="margin-bottom:8px">' +
        '<div style="display:flex; justify-content:space-between"><strong>' + e.id + '</strong>' + estadoBadge(e.estado) + '</div>' +
        '<div>' + e.nombre + '</div>' +
        '<div class="kpi-sub">' + e.tipo + ' · ' + e.creador + ' · ' + window.formatDateTime?.(e.fecha) + '</div>' +
        '<div style="margin-top:8px; display:flex; gap:8px">' +
        '<button class="btn btn-secondary" data-open="' + e.id + '">Abrir</button>' +
        '<button class="btn btn-primary" data-export="' + e.id + '">Exportar</button>' +
        '</div></div>'
      );
    }).join("");

    wrap.querySelectorAll("button[data-open]").forEach(function (b) {
      b.addEventListener("click", function () {
        abrirEscenario(b.getAttribute("data-open"));
      });
    });

    wrap.querySelectorAll("button[data-export]").forEach(function (b) {
      b.addEventListener("click", function () {
        actual = escenarios.find(function (e) { return e.id === b.getAttribute("data-export"); }) || actual;
        window.showModal?.("modal-exportar");
      });
    });
  }

  function abrirEscenario(id) {
    const e = escenarios.find(function (x) { return x.id === id; });
    if (!e) return;
    actual = e;
    document.getElementById("detalle-titulo").textContent = e.id + " - " + e.nombre;
    document.getElementById("f-nombre").value = e.nombre;
    document.getElementById("f-motivo").value = "Intervención operativa controlada";
    document.getElementById("count-motivo").textContent = String(document.getElementById("f-motivo").value.length);

    const isSem = e.tipo.includes("Semaforización");
    document.getElementById("form-cierre").style.display = isSem ? "none" : "block";
    document.getElementById("form-semaforo").style.display = isSem ? "block" : "none";

    const conflicto = e.id !== "ESC-003" ? "" : '<div class="banner banner-warning">Conflicto con ESC-003 (07:00-10:00 del 15/04). Resuelve antes de continuar.</div>';
    document.getElementById("conflicto-banner").innerHTML = conflicto;
    refreshExecutiveHeader();
    renderResultado(e);
  }

  function ensureScenarioForSimulation() {
    if (!actual) {
      actual = {
        id: "ESC-" + String(escenarios.length + 1).padStart(3, "0"),
        version: 1,
        nombre: document.getElementById("f-nombre").value.trim() || "Escenario operativo",
        tipo: document.getElementById("form-cierre").style.display === "none" ? "Ajuste Semaforización" : "Cierre Vial",
        creador: window.getCurrentUser?.().nombre,
        fecha: new Date().toISOString(),
        estado: "En simulación",
        confianza: "AMARILLO",
        kpi: null,
      };
      escenarios.unshift(actual);
    }
    actual.nombre = document.getElementById("f-nombre").value.trim() || actual.nombre;
    actual.tipo = document.getElementById("form-cierre").style.display === "none" ? "Ajuste Semaforización" : "Cierre Vial";
    actual.estado = "En simulación";
    actual.fecha = new Date().toISOString();
  }

  function valida() {
    let ok = true;
    const nombre = document.getElementById("f-nombre").value.trim();
    document.getElementById("err-nombre").textContent = "";
    document.getElementById("err-carriles").textContent = "";
    document.getElementById("err-fechas").textContent = "";

    if (nombre.length < 5) {
      document.getElementById("err-nombre").textContent = "Mínimo 5 caracteres";
      ok = false;
    }

    if (document.getElementById("form-cierre").style.display !== "none") {
      const carriles = Number(document.getElementById("f-carriles").value || "0");
      if (carriles > 3) {
        document.getElementById("err-carriles").textContent = "Esta vía tiene solo 3 carriles registrados";
        ok = false;
      }

      const ini = new Date(document.getElementById("f-inicio").value);
      const fin = new Date(document.getElementById("f-fin").value);
      if (String(ini) !== "Invalid Date" && String(fin) !== "Invalid Date") {
        if (fin <= ini) {
          document.getElementById("err-fechas").textContent = "La fecha fin debe ser mayor que inicio";
          ok = false;
        } else {
          const diff = Math.floor((fin - ini) / 60000);
          document.getElementById("duracion").textContent = "Duración: " + Math.floor(diff / 60) + "h " + (diff % 60) + "min";
        }
      }
    } else {
      const ciclo = Number(document.getElementById("f-ciclo-num").value);
      const verdes = Array.from(document.querySelectorAll(".fase-verde")).reduce(function (acc, x) { return acc + Number(x.value || 0); }, 0);
      const txt = verdes + "s / " + ciclo + "s";
      document.getElementById("sum-verdes").textContent = verdes === ciclo ? "Suma de verdes correcta: " + txt : "Error: suma de verdes " + txt;
      if (verdes !== ciclo) ok = false;
    }

    return ok;
  }

  document.getElementById("f-motivo")?.addEventListener("input", function () {
    document.getElementById("count-motivo").textContent = String(this.value.length);
  });

  document.getElementById("f-ciclo")?.addEventListener("input", function () {
    document.getElementById("f-ciclo-num").value = this.value;
    valida();
  });
  document.getElementById("f-ciclo-num")?.addEventListener("input", function () {
    document.getElementById("f-ciclo").value = this.value;
    valida();
  });

  document.getElementById("guardar-borrador")?.addEventListener("click", function () {
    if (!window.checkPermission?.("crear_escenario")) {
      const rol = window.getCurrentUser?.().rol || "Sin rol";
      window.showToast?.("Permisos insuficientes. Tu rol (" + rol + ") no tiene acceso a esta función.", "error");
      window.registrarAuditoria?.("Intento bloqueado", "Permisos", "crear_escenario", "BLOQUEADO", { rol: rol });
      return;
    }
    if (!valida()) return;
    if (!actual) {
      actual = {
        id: "ESC-" + String(escenarios.length + 1).padStart(3, "0"),
        version: 1,
        nombre: document.getElementById("f-nombre").value.trim(),
        tipo: document.getElementById("form-cierre").style.display === "none" ? "Ajuste Semaforización" : "Cierre Vial",
        creador: window.getCurrentUser?.().nombre,
        fecha: new Date().toISOString(),
        estado: "Borrador",
        confianza: "AMARILLO",
      };
      escenarios.unshift(actual);
    } else {
      actual.version += 1;
      window.showToast?.("Se creó nueva versión del escenario", "info");
    }
    actual.nombre = document.getElementById("f-nombre").value.trim();
    actual.estado = "Borrador";
    window.saveAppData?.();
    renderLista();
    window.registrarAuditoria?.("Editar escenario", "Escenario", actual.id, "EXITOSO", { version: actual.version });
    window.showToast?.("Borrador guardado", "success");
  });

  function simulate() {
    if (!actual) return;
    if (simRunning) return;
    simRunning = true;
    const runBtn = document.getElementById("guardar-simular");
    if (runBtn) runBtn.disabled = true;
    stopPlayback();
    const steps = document.querySelectorAll("#sim-steps p");
    const bar = document.getElementById("sim-progress");
    bar.style.width = "0%";
    steps.forEach(function (s) {
      s.classList.remove("sim-step-done", "sim-step-running");
      s.textContent = "○ " + s.textContent.replace(/^.\s/, "");
    });
    window.showModal?.("modal-sim");
    setExecEngine("Simulando en tiempo real");
    pushExecFeed("Inicio de corrida para " + actual.id + ".");

    let i = 0;
    const texts = [
      "✓ Validando parámetros",
      "✓ Cargando red vial (847 nodos)",
      "⟳ Ejecutando modelo...",
      "✓ Calculando KPIs",
      "✓ Generando reporte",
    ];
    const timer = setInterval(function () {
      if (i > 0 && i - 1 < steps.length) {
        steps[i - 1].classList.remove("sim-step-running");
        steps[i - 1].classList.add("sim-step-done");
      }
      if (i < steps.length) {
        steps[i].classList.add("sim-step-running");
        steps[i].textContent = texts[i];
      }
      bar.style.width = (i + 1) * 20 + "%";
      i += 1;
      if (i >= 5) {
        clearInterval(timer);
        window.closeModal?.("modal-sim");
        document.getElementById("sim-sla").textContent = "✓ Completado en 4m 32s (dentro del SLA de 10 min)";
        actual.estado = "Completado";
        const sim = estimateSimulation();
        actual.confianza = sim.confianza;
        actual.kpi = sim.kpi;
        actual.baseline = sim.baseline;
        actual.series = sim.series;
        actual.impactBySegment = sim.impactBySegment;
        window.saveAppData?.();
        renderLista();
        renderResultado(actual);
        setExecEngine("Resultado listo para decision");
        pushExecFeed("Simulacion finalizada para " + actual.id + " con confianza " + actual.confianza + ".");
        refreshExecutiveHeader();
        simRunning = false;
        if (runBtn) runBtn.disabled = false;
        window.registrarAuditoria?.("Ejecutar simulación", "Escenario", actual.id, "EXITOSO", {});
      }
    }, 700);

    document.getElementById("cancelar-sim").onclick = function () {
      clearInterval(timer);
      window.closeModal?.("modal-sim");
      window.showToast?.("Simulación cancelada", "warning");
      setExecEngine("Simulacion detenida");
      pushExecFeed("Corrida cancelada manualmente.");
      simRunning = false;
      if (runBtn) runBtn.disabled = false;
    };
  }

  document.getElementById("guardar-simular")?.addEventListener("click", function () {
    if (!window.checkPermission?.("ejecutar_simulacion")) {
      const rol = window.getCurrentUser?.().rol || "Sin rol";
      window.showToast?.("Permisos insuficientes. Tu rol (" + rol + ") no tiene acceso a esta función.", "error");
      window.registrarAuditoria?.("Intento bloqueado", "Permisos", "ejecutar_simulacion", "BLOQUEADO", { rol: rol });
      return;
    }
    if (!valida()) return;
    ensureScenarioForSimulation();
    window.saveAppData?.();
    renderLista();
    refreshExecutiveHeader();
    document.getElementById("connectivity").innerHTML = '<div class="banner banner-info">Verificando conectividad...</div>';
    setTimeout(function () {
      const sinDesvio = document.getElementById("f-desvio").value === "Sin desvío";
      if (sinDesvio) {
        document.getElementById("connectivity").innerHTML = '<div class="banner banner-error">Red desconectada. Agrega un desvío para continuar.</div>';
        setExecEngine("Esperando ajustes");
        pushExecFeed("Validacion fallida: se requiere desvio para mantener conectividad.");
      } else {
        document.getElementById("connectivity").innerHTML = '<div class="banner banner-success">Red permanece conectada ✓</div>';
        simulate();
      }
    }, 1500);
  });

  function renderResultado(e) {
    const empty = document.getElementById("resultado-sim");
    const shell = document.getElementById("sim-shell");
    const kpiWrap = document.getElementById("sim-kpis");
    const insights = document.getElementById("sim-insights");
    const hourInput = document.getElementById("sim-hour");
    const mapMode = document.getElementById("sim-map-mode");
    const playBtn = document.getElementById("sim-play");

    if (!e.kpi) {
      empty.style.display = "block";
      empty.className = "empty-state";
      empty.textContent = "Aún no hay simulaciones en esta vista.";
      shell.style.display = "none";
      currentResult = null;
      stopPlayback();
      if (simChart) {
        simChart.destroy();
        simChart = null;
      }
      if (simMapInstance) {
        simMapInstance.destroy?.();
        simMapInstance = null;
      }
      return;
    }

    const base = e.baseline || getBaselineKpi();
    const delta = {
      tiempo: round(e.kpi.tiempo - base.tiempo, 1),
      p90: round(e.kpi.p90 - base.p90, 1),
      congestion: round(e.kpi.congestion - base.congestion, 2),
      velocidad: round(e.kpi.velocidad - base.velocidad, 1),
    };

    empty.style.display = "none";
    shell.style.display = "block";
    currentResult = e;
    stopPlayback();
    if (simMapInstance) {
      simMapInstance.destroy?.();
      simMapInstance = null;
    }

    kpiWrap.innerHTML =
      '<div class="sim-kpi-card"><div class="sim-kpi-title">Tiempo promedio</div><div class="sim-kpi-value">' + e.kpi.tiempo + ' min</div><div class="sim-kpi-delta ' + (delta.tiempo <= 0 ? "sim-delta-good" : "sim-delta-bad") + '">' + (delta.tiempo <= 0 ? "↓" : "↑") + Math.abs(delta.tiempo).toFixed(1) + ' vs baseline</div></div>' +
      '<div class="sim-kpi-card"><div class="sim-kpi-title">Percentil 90</div><div class="sim-kpi-value">' + e.kpi.p90 + ' min</div><div class="sim-kpi-delta ' + (delta.p90 <= 0 ? "sim-delta-good" : "sim-delta-bad") + '">' + (delta.p90 <= 0 ? "↓" : "↑") + Math.abs(delta.p90).toFixed(1) + ' min</div></div>' +
      '<div class="sim-kpi-card"><div class="sim-kpi-title">Indice de congestion</div><div class="sim-kpi-value">' + e.kpi.congestion.toFixed(2) + '</div><div class="sim-kpi-delta ' + (delta.congestion <= 0 ? "sim-delta-good" : "sim-delta-bad") + '">' + (delta.congestion <= 0 ? "↓" : "↑") + Math.abs(delta.congestion).toFixed(2) + '</div></div>' +
      '<div class="sim-kpi-card"><div class="sim-kpi-title">Velocidad media</div><div class="sim-kpi-value">' + e.kpi.velocidad + ' km/h</div><div class="sim-kpi-delta ' + (delta.velocidad >= 0 ? "sim-delta-good" : "sim-delta-bad") + '">' + (delta.velocidad >= 0 ? "↑" : "↓") + Math.abs(delta.velocidad).toFixed(1) + ' km/h</div></div>';

    if (hourInput) hourInput.value = String(playbackHour);
    renderTimeSlice(e, playbackHour, mapMode?.value || "escenario");

    insights.innerHTML =
      '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px">' +
      '<div class="badge ' + (e.confianza === "VERDE" ? "badge-green" : e.confianza === "AMARILLO" ? "badge-amber" : "badge-red") + '">Confianza ' + e.confianza + '</div>' +
      '<div class="kpi-sub">Modelo: macroflujo + microcuellos de botella</div>' +
      '</div>' +
      '<ul class="sim-insight-list">' +
      '<li>El impacto maximo estimado ocurre en hora pico PM, con variacion de ' + Math.abs(delta.tiempo).toFixed(1) + ' min en tiempo promedio.</li>' +
      '<li>La red conserva conectividad operacional y mantiene trazabilidad completa en auditoria.</li>' +
      '<li>Se recomienda seguimiento de corredores criticos durante los primeros 45 minutos de despliegue.</li>' +
      '</ul>' +
      '<div style="display:flex; gap:8px; margin-top:10px"><button id="aprob" class="btn btn-primary">Aprobar</button><button id="rech" class="btn btn-danger">Rechazar</button><button id="exp" class="btn btn-secondary">Exportar</button></div>';

    hourInput.oninput = function () {
      playbackHour = Number(hourInput.value || "0");
      renderTimeSlice(e, playbackHour, mapMode?.value || "escenario");
    };

    mapMode.onchange = function () {
      renderTimeSlice(e, Number(hourInput.value || playbackHour), mapMode.value);
    };

    playBtn.onclick = function () {
      if (simRunning) return;
      if (playbackTimer) {
        stopPlayback();
        return;
      }
      playBtn.textContent = "Pausar";
      playbackTimer = setInterval(function () {
        playbackHour = (playbackHour + 1) % 24;
        hourInput.value = String(playbackHour);
        renderTimeSlice(e, playbackHour, mapMode?.value || "escenario");
      }, 850);
    };

    setExecEngine("Tablero listo para decision");
    refreshExecutiveHeader();

    document.getElementById("aprob")?.addEventListener("click", function () {
      if (!window.checkPermission?.("aprobar_escenario")) {
        const rol = window.getCurrentUser?.().rol || "Sin rol";
        window.showToast?.("Permisos insuficientes. Tu rol (" + rol + ") no tiene acceso a esta función.", "error");
        window.registrarAuditoria?.("Intento bloqueado", "Permisos", "aprobar_escenario", "BLOQUEADO", { rol: rol });
        return;
      }
      e.estado = "Aprobado";
      window.registrarAuditoria?.("Aprobar", "Escenario", e.id, "EXITOSO", {});
      window.saveAppData?.();
      renderLista();
      window.showToast?.("Escenario aprobado", "success");
    });

    document.getElementById("rech")?.addEventListener("click", function () {
      e.estado = "Rechazado";
      window.registrarAuditoria?.("Rechazar", "Escenario", e.id, "EXITOSO", {});
      window.saveAppData?.();
      renderLista();
      window.showToast?.("Escenario rechazado", "warning");
    });

    document.getElementById("exp")?.addEventListener("click", function () {
      window.showModal?.("modal-exportar");
    });
  }

  document.getElementById("run-export")?.addEventListener("click", function () {
    if (!actual) return;
    window.exportarReporte?.(actual.id, document.getElementById("export-format").value);
  });

  document.getElementById("nuevo-escenario")?.addEventListener("click", function () {
    if (!window.checkPermission?.("crear_escenario")) {
      const rol = window.getCurrentUser?.().rol || "Sin rol";
      window.showToast?.("Permisos insuficientes. Tu rol (" + rol + ") no tiene acceso a esta función.", "error");
      window.registrarAuditoria?.("Intento bloqueado", "Permisos", "crear_escenario", "BLOQUEADO", { rol: rol });
      return;
    }
    window.showModal?.("modal-nuevo");
  });

  document.querySelectorAll("#modal-nuevo [data-tipo]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const tipo = btn.getAttribute("data-tipo");
      if (tipo === "Incidente" && !["Administrador", "Operador de Tráfico"].includes(window.getCurrentUser?.().rol)) {
        window.showToast?.("Permisos insuficientes.", "error");
        window.registrarAuditoria?.("Intento bloqueado", "Escenario", "Nuevo incidente", "BLOQUEADO", {});
        return;
      }
      document.getElementById("form-cierre").style.display = tipo === "Ajuste Semaforización" ? "none" : "block";
      document.getElementById("form-semaforo").style.display = tipo === "Ajuste Semaforización" ? "block" : "none";
      window.closeModal?.("modal-nuevo");
      window.showToast?.("Tipo seleccionado: " + tipo, "info");
    });
  });

  document.getElementById("search-esc")?.addEventListener("input", renderLista);
  document.querySelectorAll("#tabs-estados .tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll("#tabs-estados .tab").forEach(function (x) { x.classList.remove("active"); });
      t.classList.add("active");
      filtro = t.getAttribute("data-estado");
      renderLista();
    });
  });

  const idQ = window.getQueryParam?.("id") || window.getQueryParam?.("corredor");
  startExecutiveFeed();
  renderLista();
  if (idQ) {
    const escById = escenarios.find(function (e) { return e.id === idQ; });
    if (escById) abrirEscenario(escById.id);
  } else {
    const latest = escenarios.find(function (e) { return !!e.kpi; }) || escenarios[0];
    if (latest) abrirEscenario(latest.id);
  }
  refreshExecutiveHeader();

  window.addEventListener("beforeunload", function () {
    if (liveTimer) clearInterval(liveTimer);
    stopPlayback();
    if (simMapInstance) simMapInstance.destroy?.();
  });
})();
