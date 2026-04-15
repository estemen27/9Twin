(function () {
  window.initLayout?.("fuentes", "Fuentes de Datos");
  window.initModalSystem?.();

  const fuentes = window.AppData?.fuentes || [];
  let selected = null;
  let fuenteQuery = "";
  let invalidQuery = "";

  function badgeEstado(estado) {
    if (estado === "activo") return '<span class="badge badge-green">Activo</span>';
    if (estado === "degradado") return '<span class="badge badge-amber">Degradado</span>';
    return '<span class="badge badge-gray">Inactivo</span>';
  }

  function colorFrescura(s) {
    if (s == null) return "badge-gray";
    if (s > 300) return "badge-red";
    if (s > 60) return "badge-amber";
    return "badge-green";
  }

  function renderConfianza() {
    const c = window.calcularConfianza?.(fuentes);
    const expl = c.explicacion.map(function (r) { return "→ " + r; }).join("<br>");
    document.getElementById("confianza-header").innerHTML =
      '<div class="badge ' + (c.nivel === "VERDE" ? "badge-green" : c.nivel === "AMARILLO" ? "badge-amber" : "badge-red") + '" style="font-size:16px">Estado actual: ' + c.nivel + '</div><p>' + expl + "</p>";

    document.getElementById("confianza-pasos").innerHTML = fuentes.map(function (f) {
      const ok = f.estado === "activo" && (f.frescura || 0) < 60;
      return "<p>" + (ok ? "✓" : "✗") + " " + f.id + " - " + f.nombre + "</p>";
    }).join("");
  }

  function renderTable() {
    const body = document.getElementById("body-fuentes");
    if (!body) return;
    const filtered = fuentes.filter(function (f) {
      const text = [f.id, f.nombre, f.tipo, f.estado].join(" ").toLowerCase();
      return text.includes(fuenteQuery);
    });

    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="8"><div class="empty-state">No hay fuentes que coincidan con la búsqueda.</div></td></tr>';
      return;
    }

    body.innerHTML = filtered.map(function (f) {
      const fres = f.frescura == null ? "N/A" : f.frescura + "s";
      const upd = window.formatElapsed?.(Date.now() - f.ultimaActualizacion);
      return (
        '<tr>' +
        '<td>' + f.id + '</td>' +
        '<td>' + f.nombre + '</td>' +
        '<td>' + f.tipo + '</td>' +
        '<td>' + badgeEstado(f.estado) + '</td>' +
        '<td><span class="badge ' + colorFrescura(f.frescura) + '">' + fres + '</span></td>' +
        '<td><div class="progress-wrap"><div class="progress-bar" style="width:' + (f.completitud || 0) + '%"></div></div>' + (f.completitud || "N/A") + '%</td>' +
        '<td>' + upd + '</td>' +
        '<td><button class="btn btn-secondary" data-toggle="' + f.id + '">' + (f.estado === "inactivo" ? "Habilitar" : "Deshabilitar") + '</button> <button class="btn btn-primary" data-config="' + f.id + '">Configurar</button></td>' +
        '</tr>'
      );
    }).join("");

    body.querySelectorAll("button[data-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const src = fuentes.find(function (x) { return x.id === btn.getAttribute("data-toggle"); });
        if (!src) return;
        src.estado = src.estado === "inactivo" ? "activo" : "inactivo";
        src.ultimaActualizacion = Date.now();
        window.saveAppData?.();
        renderTable();
        renderConfianza();
        window.registrarAuditoria?.("Cambio fuente", "Fuente", src.id, "EXITOSO", { estado: src.estado });
      });
    });

    body.querySelectorAll("button[data-config]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selected = fuentes.find(function (x) { return x.id === btn.getAttribute("data-config"); });
        if (!selected) return;
        document.getElementById("cfg-nombre").value = selected.nombre;
        document.getElementById("cfg-tipo").value = selected.tipo;
        document.getElementById("cfg-critica").checked = !!selected.critica;
        window.showModal?.("modal-fuente");
      });
    });

    window.initSortableTable?.("tabla-fuentes");
  }

  function renderInvalidos() {
    const body = document.getElementById("body-invalidos");
    const rows = (window.AppData?.invalidos || []).filter(function (x) {
      const text = [x.timestamp, x.fuente, x.razon, x.campos].join(" ").toLowerCase();
      return text.includes(invalidQuery);
    });

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4"><div class="empty-state">No hay registros inválidos para este filtro.</div></td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (x) {
      return "<tr><td>" + window.formatDateTime?.(x.timestamp) + "</td><td>" + x.fuente + "</td><td>" + x.razon + "</td><td>" + x.campos + "</td></tr>";
    }).join("");
    window.initSortableTable?.("tabla-invalidos");
    window.paginarTabla?.("tabla-invalidos", 10, "page-info-inv", "prev-inv", "next-inv");
  }

  document.getElementById("fallback-toggle")?.addEventListener("change", function () {
    window.updateAppState?.({ fallbackActivo: this.checked });
    const banner = document.getElementById("fallback-banner");
    banner.innerHTML = this.checked
      ? '<div class="banner banner-success">Fallback activo: usando datos del martes 08/04/2026 07:30</div>'
      : "";
  });

  document.getElementById("probar-conexion")?.addEventListener("click", function () {
    const bar = document.getElementById("test-progress");
    const out = document.getElementById("test-result");
    bar.style.width = "0%";
    out.textContent = "";
    setTimeout(function () { bar.style.width = "40%"; }, 300);
    setTimeout(function () { bar.style.width = "80%"; }, 900);
    setTimeout(function () {
      bar.style.width = "100%";
      const ok = Math.random() > 0.25;
      out.innerHTML = ok ? '<div class="banner banner-success">✓ Respuesta: 34ms</div>' : '<div class="banner banner-error">✗ Sin respuesta (timeout)</div>';
    }, 1500);
  });

  document.getElementById("guardar-fuente")?.addEventListener("click", function () {
    if (!selected) return;
    selected.nombre = document.getElementById("cfg-nombre").value.trim();
    selected.tipo = document.getElementById("cfg-tipo").value;
    selected.critica = document.getElementById("cfg-critica").checked;
    selected.ultimaActualizacion = Date.now();
    window.saveAppData?.();
    window.closeModal?.("modal-fuente");
    renderTable();
    renderConfianza();
    window.registrarAuditoria?.("Cambio fuente", "Fuente", selected.id, "EXITOSO", { nombre: selected.nombre });
  });

  renderConfianza();
  renderTable();
  renderInvalidos();

  document.getElementById("buscar-fuentes")?.addEventListener("input", function () {
    fuenteQuery = this.value.trim().toLowerCase();
    renderTable();
  });

  document.getElementById("buscar-invalidos")?.addEventListener("input", function () {
    invalidQuery = this.value.trim().toLowerCase();
    renderInvalidos();
  });

  setInterval(function () {
    fuentes.forEach(function (f) {
      if (typeof f.frescura === "number") f.frescura += 1;
    });
    renderTable();
    renderConfianza();
    document.getElementById("confianza-ts").textContent = "Calculado hace " + Math.floor(performance.now() / 1000) + "s";
  }, 1000);
})();
