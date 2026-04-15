(function () {
  window.initLayout?.("dashboard", "Dashboard");
  window.initModalSystem?.();

  const kpiByFiltro = {
    "tiempo-real": { t: 18.4, d1: -2.1, v: 24.7, d2: 3.2, c: 0.74, ca: "ALTO", a: "12/14" },
    manana: { t: 22.6, d1: -0.8, v: 20.2, d2: 1.1, c: 0.81, ca: "ALTO", a: "11/14" },
    tarde: { t: 25.4, d1: 1.2, v: 18.6, d2: -0.9, c: 0.88, ca: "CRÍTICO", a: "10/14" },
    personalizado: null,
  };

  let zoom = 1;
  let lineChart;
  let barChart;
  let refresh = 30;
  let mapApi;

  function animCounter(el, end, suffix) {
    if (!el) return;
    const start = Number(el.getAttribute("data-current") || end);
    const steps = 12;
    let i = 0;
    const delta = (end - start) / steps;
    const id = setInterval(function () {
      i += 1;
      const val = start + delta * i;
      el.textContent = val.toFixed(1) + (suffix || "");
      el.setAttribute("data-current", String(val));
      if (i >= steps) clearInterval(id);
    }, 35);
  }

  function renderKpi(filtro) {
    const k = kpiByFiltro[filtro];
    const grid = document.getElementById("kpi-grid");
    if (!grid) return;
    if (!k) {
      grid.innerHTML = "";
      return;
    }
    grid.innerHTML =
      '<div class="card"><div>Tiempo promedio viaje</div><div id="kpi-t" class="kpi-value">' + k.t + ' min</div><div class="kpi-sub">↓' + Math.abs(k.d1) + ' vs ayer</div></div>' +
      '<div class="card"><div>Velocidad promedio</div><div id="kpi-v" class="kpi-value">' + k.v + ' km/h</div><div class="kpi-sub">↑' + k.d2 + '</div></div>' +
      '<div class="card"><div>Índice de congestión</div><div id="kpi-c" class="kpi-value">' + k.c + '</div><span class="badge badge-amber">' + k.ca + '</span></div>' +
      '<div class="card"><div>Corredores activos</div><div id="kpi-a" class="kpi-value">' + k.a + '</div><div class="kpi-sub">Telemetría en línea</div></div>';

    animCounter(document.getElementById("kpi-t"), k.t, " min");
    animCounter(document.getElementById("kpi-v"), k.v, " km/h");
    animCounter(document.getElementById("kpi-c"), k.c, "");
  }

  function renderBottlenecks() {
    const rows = (window.AppData?.corredores || [])
      .slice()
      .sort(function (a, b) { return b.congestion - a.congestion; })
      .slice(0, 5)
      .map(function (c) {
        const icon = c.congestion > 0.85 ? "🔴" : c.congestion > 0.7 ? "🟠" : "🟡";
        const delta = Math.max(2, Math.round(c.tiempoPromedio - (c.tiempoPromedio * (1 - c.congestion) * 0.7)));
        return {
          text: icon + " " + c.nombre + " — " + c.congestion.toFixed(2) + " | +" + delta + "min",
          id: c.id,
        };
      });

    const wrap = document.getElementById("bottlenecks");
    if (!wrap) return;
    wrap.innerHTML = rows
      .map(function (r, i) {
        return '<div class="card" style="margin-bottom:8px; padding:10px"><strong>' + (i + 1) + '. ' + r.text + '</strong><br><button class="btn btn-secondary" data-cor="' + r.id + '">Ver escenario</button></div>';
      })
      .join("");
    wrap.querySelectorAll("button[data-cor]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.location.href = "escenarios.html?corredor=" + encodeURIComponent(btn.getAttribute("data-cor"));
      });
    });
  }

  function renderCharts(filtro) {
    const empty = document.getElementById("dashboard-empty");
    if (filtro === "personalizado") {
      if (lineChart) {
        lineChart.destroy();
        lineChart = null;
      }
      if (barChart) {
        barChart.destroy();
        barChart = null;
      }
      const flow = document.getElementById("chart-flujo");
      const travel = document.getElementById("chart-viaje");
      if (flow) {
        const fctx = flow.getContext("2d");
        fctx?.clearRect(0, 0, flow.width, flow.height);
      }
      if (travel) {
        const tctx = travel.getContext("2d");
        tctx?.clearRect(0, 0, travel.width, travel.height);
      }
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";

    const labels = Array.from({ length: 24 }, function (_, i) { return i + ":00"; });
    const selected = (window.AppData?.corredores || []).slice(0, 5);
    const colors = ["#4ADE80", "#60A5FA", "#FACC15", "#C9916B", "#F87171"];
    const factor = filtro === "manana" ? 1.15 : filtro === "tarde" ? 1.2 : filtro === "personalizado" ? 0.95 : 1;

    const ds = selected.map(function (c, i) {
      return {
        label: c.nombre,
        data: c.historico.map(function (v) { return Math.round(v * factor); }),
        borderColor: colors[i],
        backgroundColor: colors[i] + "33",
        tension: 0.3,
      };
    });

    if (lineChart) lineChart.destroy();
    if (barChart) barChart.destroy();

    lineChart = window.ChartKit?.createLine(document.getElementById("chart-flujo"), labels, ds);

    const cNames = selected.map(function (c) { return c.id; });
    barChart = window.ChartKit?.createBar(document.getElementById("chart-viaje"), cNames, [
      { label: "Hoy", data: [22, 27, 20, 19, 18], backgroundColor: "#C9916B" },
      { label: "Ayer", data: [24, 29, 22, 21, 19], backgroundColor: "#60A5FA" },
      { label: "Promedio semanal", data: [23, 28, 21, 20, 18.6], backgroundColor: "#4ADE80" },
    ]);
  }

  function bindMap() {
    mapApi = window.initTwinMap?.({
      svgId: "map-svg",
      data: window.AppData?.mapaChia,
      zoomInId: "zoom-in",
      zoomOutId: "zoom-out",
      layers: {
        nodos: "toggle-nodos",
        segmentos: "toggle-segmentos",
        poligono: "toggle-poligono",
        semaforos: "toggle-semaforos",
      },
      onSegmentClick: function (seg) {
        const pop = document.getElementById("seg-popover");
        if (!pop || !seg) return;
        pop.style.display = "block";
        pop.innerHTML =
          "<strong>" + seg.nombre + "</strong>" +
          '<div class="grid grid-2" style="margin-top:8px">' +
          "<div><span class='kpi-sub'>Velocidad</span><div>" + seg.velocidad + " km/h</div></div>" +
          "<div><span class='kpi-sub'>Congestión</span><div>" + seg.congestion.toFixed(2) + "</div></div>" +
          "<div><span class='kpi-sub'>Cola</span><div>" + seg.cola + "</div></div>" +
          "<div><span class='kpi-sub'>Demora</span><div>" + seg.demora + "</div></div>" +
          "</div>" +
          "<p class='kpi-sub' style='margin-top:8px'>Frescura: " + seg.frescura + " | Zona: Chía, Cundinamarca</p>";
      },
    });
  }

  function updateMapByFilter(filtro) {
    const base = window.AppData?.mapaChia?.segmentos || [];
    let delta = 0;
    if (filtro === "manana") delta = 0.03;
    if (filtro === "tarde") delta = 0.07;
    if (filtro === "tiempo-real") delta = 0;

    base.forEach(function (s) {
      const v = Math.min(0.96, Math.max(0.25, s.congestion + delta));
      mapApi?.setCongestion(s.id, v);
    });
  }

  function initTabs() {
    document.querySelectorAll("#tabs-tiempo .tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        const filtro = tab.getAttribute("data-filtro");
        document.querySelectorAll("#tabs-tiempo .tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        window.updateAppState?.({ filtroHorario: filtro });
        renderKpi(filtro);
        renderCharts(filtro);
        updateMapByFilter(filtro);
      });
    });
  }

  function refreshTicker() {
    refresh -= 1;
    if (refresh < 0) refresh = 30;
    document.getElementById("refresh-text").textContent = "Actualizado hace " + (30 - refresh) + "s — próxima actualización en " + refresh + "s";
    document.getElementById("refresh-progress").style.width = ((30 - refresh) / 30) * 100 + "%";
  }

  function onboardingAdmin() {
    const user = window.getCurrentUser?.();
    if (!user || user.rol !== "Administrador") return;
    if (localStorage.getItem("city9twin_onboarding_done") === "1") return;

    const steps = [
      { selector: '.nav-item[href="dashboard.html"]', title: "1/5 Dashboard", text: "Monitorea KPIs y cuellos de botella en tiempo real." },
      { selector: '.nav-item[href="zona-piloto.html"]', title: "2/5 Zona Piloto", text: "Configura cobertura, polígono y datos geoespaciales." },
      { selector: '.nav-item[href="fuentes-datos.html"]', title: "3/5 Fuentes", text: "Supervisa frescura, completitud y fallback de datos." },
      { selector: '.nav-item[href="escenarios.html"]', title: "4/5 Escenarios", text: "Crea, simula y aprueba planes de acción operativa." },
      { selector: '.nav-item[href="auditoria.html"]', title: "5/5 Auditoría", text: "Rastrea trazabilidad completa e intentos bloqueados." },
    ];

    let idx = 0;
    const overlay = document.createElement("div");
    overlay.className = "tour-overlay";
    const highlight = document.createElement("div");
    highlight.className = "tour-highlight";
    const box = document.createElement("div");
    box.className = "tour-box";
    document.body.appendChild(overlay);
    document.body.appendChild(highlight);
    document.body.appendChild(box);

    function finish() {
      localStorage.setItem("city9twin_onboarding_done", "1");
      overlay.remove();
      highlight.remove();
      box.remove();
    }

    function drawStep() {
      const s = steps[idx];
      const target = document.querySelector(s.selector);
      if (!target) {
        finish();
        return;
      }

      const r = target.getBoundingClientRect();
      highlight.style.top = Math.max(6, r.top - 4) + "px";
      highlight.style.left = Math.max(6, r.left - 4) + "px";
      highlight.style.width = r.width + 8 + "px";
      highlight.style.height = r.height + 8 + "px";

      const top = Math.min(window.innerHeight - 170, Math.max(10, r.top));
      const left = Math.min(window.innerWidth - 380, r.right + 12);
      box.style.top = top + "px";
      box.style.left = Math.max(10, left) + "px";
      box.innerHTML =
        "<h4>" + s.title + "</h4>" +
        "<p>" + s.text + "</p>" +
        '<div class="tour-actions">' +
        '<button id="tour-skip" class="btn btn-secondary">Saltar tour</button>' +
        '<button id="tour-next" class="btn btn-primary">' + (idx === steps.length - 1 ? "Finalizar" : "Siguiente") + "</button>" +
        "</div>";

      document.getElementById("tour-skip")?.addEventListener("click", finish);
      document.getElementById("tour-next")?.addEventListener("click", function () {
        idx += 1;
        if (idx >= steps.length) {
          finish();
          return;
        }
        drawStep();
      });
    }

    setTimeout(drawStep, 900);
  }

  setTimeout(function () {
    document.getElementById("dashboard-skeleton").style.display = "none";
    document.getElementById("dashboard-real").style.display = "block";
    const filtro = window.AppState?.filtroHorario || "tiempo-real";
    renderKpi(filtro);
    renderBottlenecks();
    renderCharts(filtro);
    initTabs();
    bindMap();
    updateMapByFilter(filtro);
    onboardingAdmin();
  }, 800);

  setInterval(refreshTicker, 1000);
})();
