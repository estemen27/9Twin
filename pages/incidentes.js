(function () {
  window.initLayout?.("incidentes", "Incidentes");
  window.initModalSystem?.();

  const incidentes = window.AppData?.incidentes || [];
  const calles = (window.AppData?.corredores || []).map(function (c) { return c.nombre; });
  let query = "";
  document.getElementById("i-ubicacion").innerHTML = calles.map(function (c) { return "<option>" + c + "</option>"; }).join("");

  function sevBadge(s) {
    if (s === "Alta") return '<span class="badge badge-red">Alta</span>';
    if (s === "Media") return '<span class="badge badge-amber">Media</span>';
    return '<span class="badge badge-amber">Baja</span>';
  }

  function renderBanner() {
    const activos = incidentes.filter(function (i) { return i.estado.includes("Activo") || i.estado.includes("simulación"); });
    const el = document.getElementById("activos-banner");
    if (!activos.length) {
      el.innerHTML = "";
      return;
    }
    const txt = activos.map(function (a) { return a.id + " (Severidad " + a.severidad + ")"; }).join(" · ");
    el.innerHTML = '<div class="banner banner-error pulsing-banner">' + activos.length + " incidentes activos — " + txt + "</div>";
  }

  function renderPrioridad() {
    const activos = incidentes.filter(function (i) { return i.estado.includes("Activo") || i.estado.includes("simulación"); });
    const order = { Alta: 0, Media: 1, Baja: 2 };
    activos.sort(function (a, b) { return order[a.severidad] - order[b.severidad] || b.carriles - a.carriles; });
    document.getElementById("priorizacion").innerHTML = activos.map(function (i, idx) {
      const action = idx === 0 ? "Atención inmediata" : "Monitoreo activo";
      return "<p><strong>" + (idx + 1) + ". " + i.id + "</strong> — " + i.severidad + " severidad, " + i.carriles + " carriles — " + action + "</p>";
    }).join("") || "Sin incidentes activos";
  }

  function renderTable() {
    const body = document.getElementById("body-incidentes");
    const rows = incidentes.filter(function (i) {
      const text = [i.id, i.descripcion, i.ubicacion, i.estado, i.escenarioAsociado].join(" ").toLowerCase();
      return text.includes(query);
    });

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="9"><div class="empty-state">No hay incidentes para este criterio de búsqueda.</div></td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (i) {
      return (
        '<tr>' +
        '<td>' + i.id + '</td>' +
        '<td>' + i.descripcion + '</td>' +
        '<td>' + i.ubicacion + '</td>' +
        '<td>' + sevBadge(i.severidad) + '</td>' +
        '<td>' + i.carriles + '</td>' +
        '<td>' + i.estado + '</td>' +
        '<td><a href="escenarios.html?id=' + i.escenarioAsociado + '">' + i.escenarioAsociado + '</a></td>' +
        '<td>' + window.formatElapsed?.(Date.now() - i.creadoEn) + '</td>' +
        '<td><button class="btn btn-secondary" data-det="' + i.id + '">Ver detalle</button></td>' +
        '</tr>'
      );
    }).join("");

    body.querySelectorAll("button[data-det]").forEach(function (b) {
      b.addEventListener("click", function () {
        const inc = incidentes.find(function (x) { return x.id === b.getAttribute("data-det"); });
        if (!inc) return;
        const conf = window.calcularConfianza?.().nivel || "AMARILLO";
        let rec;
        if (conf === "ROJO") rec = '🔒 Recomendación bloqueada — datos insuficientes. Razón: SRC-01 sin datos >5 min';
        else if (conf === "AMARILLO") rec = "⚠ Recomendación aproximada: ajustar semáforos en corredor alterno";
        else rec = "✓ Recomendación: desvío dinámico por Ruta Alterna Norte y priorización de fase N-S por 15 min";

        document.getElementById("drawer-body").innerHTML =
          '<h3>' + inc.id + '</h3>' +
          '<p><strong>Descripción:</strong> ' + inc.descripcion + '</p>' +
          '<p><strong>Ubicación:</strong> ' + inc.ubicacion + '</p>' +
          '<p><strong>Escenario vinculado:</strong> <a href="escenarios.html?id=' + inc.escenarioAsociado + '">' + inc.escenarioAsociado + '</a></p>' +
          '<div class="card"><strong>Timeline</strong><p>07:41 → Incidente registrado<br>07:43 → ' + inc.escenarioAsociado + ' creado automáticamente<br>07:48 → Recomendación generada (7 min ✓ dentro de SLA)</p></div>' +
          '<div class="banner ' + (conf === "VERDE" ? "banner-success" : conf === "AMARILLO" ? "banner-warning" : "banner-error") + '">' + rec + '</div>';
        document.getElementById("drawer-incidente").classList.add("open");
      });
    });

    window.initSortableTable?.("tabla-incidentes");
    window.paginarTabla?.("tabla-incidentes", 10, "page-info-inc", "prev-inc", "next-inc");
  }

  document.getElementById("cerrar-drawer")?.addEventListener("click", function () {
    document.getElementById("drawer-incidente").classList.remove("open");
  });

  document.getElementById("btn-registrar")?.addEventListener("click", function () {
    if (!window.checkPermission?.("registrar_incidente")) {
      const rol = window.getCurrentUser?.().rol || "Sin rol";
      window.showToast?.("Permisos insuficientes. Tu rol (" + rol + ") no tiene acceso a esta función.", "error");
      window.registrarAuditoria?.("Intento bloqueado", "Permisos", "registrar_incidente", "BLOQUEADO", { rol: rol });
      return;
    }
    window.showModal?.("modal-incidente");
  });

  document.getElementById("i-desc")?.addEventListener("input", function () {
    document.getElementById("count-i").textContent = String(this.value.length);
  });

  document.getElementById("buscar-incidentes")?.addEventListener("input", function () {
    query = this.value.trim().toLowerCase();
    renderTable();
  });

  document.getElementById("guardar-incidente")?.addEventListener("click", function () {
    if (document.getElementById("i-ref").value.toLowerCase().includes("fuera")) {
      document.getElementById("i-geo-error").textContent = "Ubicación fuera de la zona piloto. Verifica o amplía la zona.";
      return;
    }

    const nextNum = incidentes.length + 1;
    const incId = "INC-" + String(nextNum).padStart(3, "0");
    const escId = "ESC-" + String((window.AppData?.escenarios?.length || 0) + 1).padStart(3, "0");
    const severidad = document.querySelector('input[name="sev"]:checked')?.value || "Media";
    const nuevo = {
      id: incId,
      descripcion: document.getElementById("i-desc").value.trim() || "Incidente sin descripción",
      ubicacion: document.getElementById("i-ubicacion").value,
      severidad: severidad,
      carriles: Number(document.getElementById("i-carriles").value || 1),
      estado: "Activo — ESC generado",
      escenarioAsociado: escId,
      creadoEn: Date.now(),
    };

    window.closeModal?.("modal-incidente");
    window.showToast?.("Creando escenario asociado...", "info");
    setTimeout(function () {
      window.showToast?.("✓ " + incId + " registrado. " + escId + " creado automáticamente. Iniciando análisis...", "success");
      incidentes.unshift(nuevo);
      window.AppData.escenarios.unshift({
        id: escId,
        version: 1,
        nombre: "Escenario para " + incId,
        tipo: "Incidente",
        creador: window.getCurrentUser?.().nombre,
        fecha: new Date().toISOString(),
        estado: "En simulación",
        confianza: "AMARILLO",
        kpi: null,
      });
      window.saveAppData?.();
      renderTable();
      renderBanner();
      renderPrioridad();
      window.registrarAuditoria?.("Registrar incidente", "Incidente", incId, "EXITOSO", { escenario: escId });
    }, 1500);
  });

  renderTable();
  renderBanner();
  renderPrioridad();
  setInterval(renderTable, 1000);
})();
