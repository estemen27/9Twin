(function () {
  window.initLayout?.("evaluacion", "Evaluación Post-Implementación");

  const planes = [
    { id: "ESC-005", nombre: "Cierre Variante Cajicá", estado: "Pendiente evaluación", implementado: "12/04 07:00-10:00", evaluado: false },
    { id: "ESC-001", nombre: "Ajuste semáforo Unisabana", estado: "Evaluado", implementado: "13/04", evaluado: true, fechaEval: "13/04 11:30" },
  ];

  let filtro = "Todos";
  let line;
  let bar;

  function renderLista() {
    const list = document.getElementById("lista-planes");
    const filtered = planes.filter(function (p) { return filtro === "Todos" || p.estado === filtro; });
    list.innerHTML = filtered.map(function (p) {
      return '<div class="card" style="margin-bottom:8px"><strong>' + p.id + ": " + p.nombre + '</strong><p>Implementado ' + p.implementado + (p.evaluado ? " — Evaluado " + p.fechaEval : " — Disponible para evaluar ✓") + '</p><button class="btn btn-secondary" data-p="' + p.id + '">' + (p.evaluado ? "Ver evaluación" : "Evaluar") + '</button></div>';
    }).join("") || '<div class="empty-state">No hay planes para este filtro.</div>';

    list.querySelectorAll("button[data-p]").forEach(function (b) {
      b.addEventListener("click", function () {
        cargarEvaluacion(b.getAttribute("data-p"));
      });
    });
  }

  function cargarEvaluacion(id) {
    const esc = window.AppData?.escenarios?.find(function (e) { return e.id === id; });
    document.getElementById("titulo-eval").textContent = "Evaluación de " + (esc?.nombre || id);

    if (!esc || !esc.kpi) {
      document.getElementById("sin-datos").style.display = "block";
      document.getElementById("tabla-eval-wrap").style.display = "none";
      return;
    }

    document.getElementById("sin-datos").style.display = "none";
    document.getElementById("tabla-eval-wrap").style.display = "block";

    const rows = [
      ["Tiempo prom (min)", 21.3, 24.8, 3.5, 16.4],
      ["P90 (min)", 33.1, 41.2, 8.1, 24.5],
      ["Índice congestión", 0.82, 0.91, 0.09, 11.0],
    ];

    document.getElementById("body-eval").innerHTML = rows.map(function (r) {
      const estado = r[4] > 20 ? "🔴 Desviación alta" : "🟡 Dentro del umbral";
      return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td><td>" + r[2] + "</td><td>" + r[3] + "</td><td>" + r[4] + "%</td><td>" + estado + "</td></tr>";
    }).join("");

    document.getElementById("alerta-eval").innerHTML = '<div class="banner banner-error">⚠ Desviación crítica en P90: 24.5% supera el umbral del 20%. Se recomienda revisión del modelo de calibración.</div>';
    document.getElementById("externas").innerHTML = '<div class="banner banner-warning">🔶 Condiciones no controladas: Lluvia intensa registrada 08:15-09:30. Puede explicar parte de la desviación.</div>';

    const labels = ["07:00", "08:00", "09:00", "10:00"];
    if (line) line.destroy();
    if (bar) bar.destroy();

    line = window.ChartKit?.createLine(document.getElementById("line-eval"), labels, [
      { label: "Predicción", data: [21, 22, 23, 21], borderColor: "#60A5FA", backgroundColor: "#60A5FA22" },
      { label: "Realidad", data: [23, 25, 26, 24], borderColor: "#F87171", backgroundColor: "#F8717122" },
    ]);

    bar = window.ChartKit?.createBar(document.getElementById("bar-eval"), ["Tiempo", "P90", "Congestión"], [
      { label: "Error %", data: [16.4, 24.5, 11], backgroundColor: ["#FACC15", "#F87171", "#FACC15"] },
    ]);

    const cacheKey = "city9twin_eval_" + id;
    if (localStorage.getItem(cacheKey)) {
      window.showToast?.("Esta evaluación fue calculada el 12/04/2026 10:45. Mostrando resultado existente. No se crearon duplicados.", "info");
    } else {
      localStorage.setItem(cacheKey, new Date().toISOString());
      window.registrarAuditoria?.("Evaluar", "Escenario", id, "EXITOSO", {});
    }
  }

  document.querySelectorAll("#tabs-eval .tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll("#tabs-eval .tab").forEach(function (x) { x.classList.remove("active"); });
      t.classList.add("active");
      filtro = t.getAttribute("data-e");
      renderLista();
    });
  });

  renderLista();
  const fromQ = window.getQueryParam?.("id");
  if (fromQ) cargarEvaluacion(fromQ);
})();
