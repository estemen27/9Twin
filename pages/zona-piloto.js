(function () {
  window.initLayout?.("zona", "Zona Piloto");
  window.initModalSystem?.();
  if (!window.enforceRoutePermission?.("configurar_zona", "dashboard.html")) return;

  const zona = window.AppData?.zonaPiloto;
  document.getElementById("zona-nombre").value = zona?.nombre || "";
  document.getElementById("sw-lat").value = zona?.poligonoSW?.lat;
  document.getElementById("sw-lng").value = zona?.poligonoSW?.lng;
  document.getElementById("ne-lat").value = zona?.poligonoNE?.lat;
  document.getElementById("ne-lng").value = zona?.poligonoNE?.lng;

  function renderStats() {
    const stats = [
      ["Nodos", zona.nodos],
      ["Segmentos", zona.segmentos],
      ["Intersecciones", zona.intersecciones],
      ["Semáforos", zona.semaforos],
      ["Área km²", zona.area.toFixed(2)],
    ];
    document.getElementById("stats-zona").innerHTML = stats.map(function (s) {
      return '<div class="card" style="padding:10px"><div class="kpi-sub">' + s[0] + '</div><div class="kpi-value" style="font-size:20px">' + s[1] + "</div></div>";
    }).join("");
    const badge = document.getElementById("zona-estado");
    badge.textContent = zona.estado === "activa" ? "ACTIVA" : "INACTIVA";
    badge.className = "badge " + (zona.estado === "activa" ? "badge-green" : "badge-gray");
  }

  renderStats();

  const drop = document.getElementById("dropzone");
  const input = document.getElementById("file-input");
  drop.addEventListener("click", function () { input.click(); });
  input.addEventListener("change", runImport);

  function runImport() {
    const bar = document.getElementById("import-progress");
    const result = document.getElementById("import-result");
    const invalid = document.getElementById("invalid-list");
    bar.style.width = "0%";
    let v = 0;
    const id = setInterval(function () {
      v += 10;
      bar.style.width = v + "%";
      if (v >= 100) {
        clearInterval(id);
        result.innerHTML = '<div class="banner banner-success">✓ 847 nodos válidos</div><div class="banner banner-error">✗ 3 registros inválidos (filas 45, 112, 388)</div>';
        invalid.innerHTML = "Fila 45: latitud faltante<br>Fila 112: tipo de nodo inválido<br>Fila 388: longitud fuera de rango";
        window.registrarAuditoria?.("Configurar zona", "Zona", zona.nombre, "EXITOSO", { accion: "importar" });
      }
    }, 200);
  }

  document.getElementById("recalcular")?.addEventListener("click", function () {
    zona.poligonoSW.lat = Number(document.getElementById("sw-lat").value);
    zona.poligonoSW.lng = Number(document.getElementById("sw-lng").value);
    zona.poligonoNE.lat = Number(document.getElementById("ne-lat").value);
    zona.poligonoNE.lng = Number(document.getElementById("ne-lng").value);

    zona.area = Number((Math.abs(zona.poligonoNE.lat - zona.poligonoSW.lat) * Math.abs(zona.poligonoSW.lng - zona.poligonoNE.lng) * 1100).toFixed(2));
    zona.nodos = Math.max(300, Math.floor(zona.area * 30));
    renderStats();
    window.saveAppData?.();
    window.showToast?.("Área recalculada correctamente", "success");
  });

  function validarActivacion() {
    const btn = document.getElementById("activar-zona");
    if (zona.intersecciones < 10) {
      btn.disabled = true;
      document.getElementById("validacion-inter").textContent = "Mínimo 10 intersecciones para activar";
    } else {
      btn.disabled = false;
      document.getElementById("validacion-inter").textContent = "Configuración válida para activar";
    }
  }
  validarActivacion();

  document.getElementById("activar-zona")?.addEventListener("click", function () {
    if (zona.estado === "activa") {
      zona.estado = "inactiva";
      this.textContent = "Activar zona";
      window.registrarAuditoria?.("Configurar zona", "Zona", zona.nombre, "EXITOSO", { estado: "inactiva" });
      renderStats();
      window.saveAppData?.();
      return;
    }
    window.showConfirm?.("Ya existe una zona activa. ¿Deseas desactivarla y activar esta?", function () {
      zona.estado = "activa";
      document.getElementById("activar-zona").textContent = "Desactivar zona";
      renderStats();
      window.saveAppData?.();
      window.registrarAuditoria?.("Configurar zona", "Zona", zona.nombre, "EXITOSO", { estado: "activa" });
    });
  });

  window.initTwinMap?.({
    svgId: "zona-svg",
    data: window.AppData?.mapaChia,
    zoomInId: "z-in",
    zoomOutId: "z-out",
    layers: {
      nodos: "z-nodos",
      segmentos: "z-seg",
      poligono: "z-pol",
      semaforos: "z-sem",
    },
    onNodeClick: function (nodo) {
      if (!nodo) return;
      document.getElementById("node-info").innerHTML =
        "<strong>" + nodo.id + "</strong><br>Coordenadas: " + nodo.coord + "<br>Tipo: " + nodo.tipo + "<br>Estado: " + nodo.estado;
    },
    onSegmentClick: function (seg) {
      if (!seg) return;
      document.getElementById("node-info").innerHTML =
        "<strong>Segmento:</strong> " + seg.nombre +
        "<br>Congestión: " + seg.congestion.toFixed(2) +
        "<br>Velocidad: " + seg.velocidad + " km/h" +
        "<br>Demora: " + seg.demora;
    },
  });
})();
