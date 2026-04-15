(function () {
  window.initLayout?.("comparador", "Comparador de Escenarios");

  const completados = (window.AppData?.escenarios || []).filter(function (e) {
    return ["Completado", "Aprobado"].includes(e.estado) && e.kpi;
  });

  ["esc1", "esc2", "esc3"].forEach(function (id) {
    const s = document.getElementById(id);
    s.innerHTML = '<option value="">-- Seleccionar --</option>' + completados.map(function (e) {
      return '<option value="' + e.id + '">' + e.id + " - " + e.nombre + "</option>";
    }).join("");
  });

  let radar;

  function evalua(measures) {
    const valid = measures.filter(function (m) { return m && m.confianza !== "ROJO"; });
    const verde = valid.filter(function (x) { return x.confianza === "VERDE"; });
    const base = verde.length ? verde : valid;
    if (!base.length) {
      return { ok: false, text: "No es posible emitir recomendación. Todos los escenarios tienen confianza roja." };
    }

    base.sort(function (a, b) {
      if (a.kpi.tiempo !== b.kpi.tiempo) return a.kpi.tiempo - b.kpi.tiempo;
      if (a.kpi.p90 !== b.kpi.p90) return a.kpi.p90 - b.kpi.p90;
      return a.kpi.congestion - b.kpi.congestion;
    });

    const best = base[0];
    return {
      ok: true,
      best: best,
      text: "✓ Alternativa sugerida: " + best.nombre + " — mejor tiempo promedio (" + best.kpi.tiempo + " min), P90 " + best.kpi.p90 + " y congestión " + best.kpi.congestion,
    };
  }

  function render() {
    const picks = ["esc1", "esc2", "esc3"].map(function (id) {
      const v = document.getElementById(id).value;
      return completados.find(function (e) { return e.id === v; }) || null;
    });

    const rows = [
      { label: "Tiempo promedio", baseline: 22.1, values: [picks[0]?.kpi?.tiempo, picks[1]?.kpi?.tiempo, picks[2]?.kpi?.tiempo], mode: "min" },
      { label: "P90", baseline: 37.0, values: [picks[0]?.kpi?.p90, picks[1]?.kpi?.p90, picks[2]?.kpi?.p90], mode: "min" },
      { label: "Índice congestión", baseline: 0.83, values: [picks[0]?.kpi?.congestion, picks[1]?.kpi?.congestion, picks[2]?.kpi?.congestion], mode: "min" },
      { label: "Velocidad", baseline: 22.0, values: [picks[0]?.kpi?.velocidad, picks[1]?.kpi?.velocidad, picks[2]?.kpi?.velocidad], mode: "max" },
      { label: "Confianza", baseline: "VERDE", values: [picks[0]?.confianza, picks[1]?.confianza, picks[2]?.confianza], mode: "rank" },
    ];

    function rankConf(v) {
      return { VERDE: 3, AMARILLO: 2, ROJO: 1 }[String(v || "").toUpperCase()] || 0;
    }

    function bestIndex(row) {
      const vals = row.values;
      const only = vals.map(function (v, i) { return { v: v, i: i }; }).filter(function (x) { return x.v != null; });
      if (!only.length) return -1;
      if (row.mode === "rank") {
        let best = only[0];
        only.forEach(function (x) {
          if (rankConf(x.v) > rankConf(best.v)) best = x;
        });
        return best.i;
      }
      let best = only[0];
      only.forEach(function (x) {
        if (row.mode === "min" && Number(x.v) < Number(best.v)) best = x;
        if (row.mode === "max" && Number(x.v) > Number(best.v)) best = x;
      });
      return best.i;
    }

    document.getElementById("body-comp").innerHTML = rows.map(function (r) {
      const b = bestIndex(r);
      const cells = r.values.map(function (v, i) {
        if (v == null) {
          return '<td class="pending-cell"><span class="inline-stack">Pendiente... <button class="btn btn-secondary btn-refresh" data-i="' + i + '">Refrescar</button></span></td>';
        }
        return '<td class="' + (i === b ? "best-cell" : "") + '">' + v + "</td>";
      }).join("");
      return "<tr><td><strong>" + r.label + "</strong></td><td>" + r.baseline + "</td>" + cells + "</tr>";
    }).join("");

    document.querySelectorAll(".btn-refresh").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.showToast?.("Refrescando estado de simulación...", "info");
        render();
      });
    });

    const rec = evalua(picks.filter(Boolean));
    const box = document.getElementById("recomendacion");
    box.innerHTML = rec.ok ? '<div class="banner banner-success">' + rec.text + '</div>' : '<div class="banner banner-error">' + rec.text + '</div>';

    if (radar) radar.destroy();
    const labels = ["Tiempo", "P90", "Congestión", "Velocidad"];
    const datasets = picks.filter(Boolean).map(function (e, i) {
      return {
        label: e.id,
        data: [
          1 - Math.min(1, e.kpi.tiempo / 40),
          1 - Math.min(1, e.kpi.p90 / 60),
          1 - Math.min(1, e.kpi.congestion),
          Math.min(1, e.kpi.velocidad / 40),
        ],
        borderColor: ["#4ADE80", "#60A5FA", "#FACC15"][i],
        backgroundColor: ["#4ADE8022", "#60A5FA22", "#FACC1522"][i],
      };
    });

    radar = window.ChartKit?.createRadar(document.getElementById("radar"), labels, datasets);

    document.getElementById("aprobar-exportar").onclick = function () {
      if (!rec.ok || !rec.best) return;
      rec.best.estado = "Aprobado";
      window.saveAppData?.();
      window.exportarReporte?.(rec.best.id, "CSV");
      window.registrarAuditoria?.("Aprobar", "Escenario", rec.best.id, "EXITOSO", { via: "comparador" });
    };
  }

  ["esc1", "esc2", "esc3"].forEach(function (id) {
    document.getElementById(id)?.addEventListener("change", render);
  });

  render();
})();
