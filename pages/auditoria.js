(function () {
  window.initLayout?.("auditoria", "Auditoría");
  window.initModalSystem?.();

  const user = window.getCurrentUser?.();
  const denied = !window.checkPermission?.("ver_auditoria");
  document.getElementById("denegado").style.display = denied ? "block" : "none";
  document.getElementById("auditoria-content").style.display = denied ? "none" : "block";
  if (denied) {
    window.registrarAuditoria?.("Intento bloqueado", "Auditoría", "ruta", "BLOQUEADO", { rol: user?.rol });
    return;
  }

  let source = (window.AppData?.auditoria || []).map(function (r, i) { return { ...r, _idx: i + 1 }; });
  document.getElementById("f-user-a").innerHTML += (window.AppData?.usuarios || []).map(function (u) {
    return '<option value="' + u.email + '">' + u.email + '</option>';
  }).join("");

  function render(rows) {
    const body = document.getElementById("body-audit");
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="10"><div class="empty-state">No hay registros para los filtros seleccionados.</div></td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (r) {
      const cls = r.resultado === "BLOQUEADO" ? "row-blocked" : (r.accion === "Login" || r.accion === "Logout") ? "row-auth" : "";
      return (
        '<tr class="clickable ' + cls + '" data-id="' + r.id + '">' +
        '<td>' + r._idx + '</td>' +
        '<td>' + window.formatDateTime?.(r.timestamp) + '</td>' +
        '<td>' + r.usuario + '</td>' +
        '<td>' + r.rol + '</td>' +
        '<td>' + r.accion + '</td>' +
        '<td>' + r.entidad + '</td>' +
        '<td>' + r.entidadId + '</td>' +
        '<td>' + r.version + '</td>' +
        '<td>' + r.resultado + '</td>' +
        '<td>Click para expandir</td>' +
        '</tr>'
      );
    }).join("");

    body.querySelectorAll("tr[data-id]").forEach(function (tr) {
      tr.addEventListener("click", function () {
        const already = tr.nextElementSibling;
        if (already && already.classList.contains("audit-detail-row")) {
          already.remove();
          return;
        }

        const prev = body.querySelector(".audit-detail-row");
        if (prev) prev.remove();

        const id = Number(tr.getAttribute("data-id"));
        const row = rows.find(function (x) { return x.id === id; });
        if (!row) return;

        const d = document.createElement("tr");
        d.className = "audit-detail-row";
        d.innerHTML = '<td colspan="10"><pre class="audit-json">' + JSON.stringify(row.parametros || {}, null, 2) + "</pre></td>";
        tr.insertAdjacentElement("afterend", d);

        if (["Editar escenario", "Crear escenario", "Aprobar"].includes(row.accion)) {
          document.getElementById("tree-versiones").innerHTML =
            '<pre>ESC-001\n├─ v1 — Creado — 14/04 07:12 — operador@city9twin.com\n│   Parámetros: {ciclo:90, fase_NS:45}\n├─ v2 — Editado — 14/04 07:45 — operador@city9twin.com\n│   Cambio: ciclo 90s→105s\n└─ v3 — Aprobado — 14/04 08:23 — operador@city9twin.com</pre>';
          document.getElementById("drawer-versiones").classList.add("open");
        }
      });
    });

    window.initSortableTable?.("tabla-audit");
    window.paginarTabla?.("tabla-audit", 20, "page-info-a", "prev-a", "next-a");
  }

  function applyFilters() {
    const fi = document.getElementById("f-inicio-a").value;
    const ff = document.getElementById("f-fin-a").value;
    const u = document.getElementById("f-user-a").value;
    const acciones = Array.from(document.querySelectorAll("#f-acciones-a input:checked")).map(function (x) { return x.value; });
    const e = document.getElementById("f-entidad-a").value;
    const r = document.getElementById("f-res-a").value;
    const q = (document.getElementById("f-q-a")?.value || "").trim().toLowerCase();

    const rows = source.filter(function (x) {
      const dt = new Date(x.timestamp);
      const okI = !fi || dt >= new Date(fi + "T00:00:00");
      const okF = !ff || dt <= new Date(ff + "T23:59:59");
      const okU = !u || x.usuario === u;
      const okA = !acciones.length || acciones.includes(x.accion);
      const okE = !e || x.entidad === e;
      const okR = !r || x.resultado === r;
      const text = [x.usuario, x.entidad, x.entidadId, x.accion].join(" ").toLowerCase();
      const okQ = !q || text.includes(q);
      return okI && okF && okU && okA && okE && okR && okQ;
    });

    document.getElementById("contador-a").textContent = "Mostrando " + rows.length + " de " + source.length + " registros";
    render(rows);
    return rows;
  }

  document.getElementById("aplicar-f")?.addEventListener("click", applyFilters);
  document.getElementById("limpiar-f")?.addEventListener("click", function () {
    ["f-inicio-a", "f-fin-a", "f-user-a", "f-entidad-a", "f-res-a", "f-q-a"].forEach(function (id) {
      document.getElementById(id).value = "";
    });
    document.querySelectorAll("#f-acciones-a input").forEach(function (x) { x.checked = false; });
    applyFilters();
  });

  document.getElementById("f-q-a")?.addEventListener("input", applyFilters);
  document.querySelectorAll("#f-acciones-a input")?.forEach(function (x) {
    x.addEventListener("change", applyFilters);
  });

  document.getElementById("cerrar-versiones")?.addEventListener("click", function () {
    document.getElementById("drawer-versiones").classList.remove("open");
  });

  document.getElementById("exportar-audit")?.addEventListener("click", function () {
    const rows = applyFilters();
    const valid = rows.every(function (x) { return !!x.id && !!x.entidadId; });
    if (!valid) {
      window.showToast?.("Error de consistencia en IDs. Exportación cancelada.", "error");
      return;
    }
    const csv = rows.map(function (x) {
      return [x._idx, x.timestamp, x.usuario, x.rol, x.accion, x.entidad, x.entidadId, x.version, x.resultado].join(",");
    });
    window.exportarCSV?.("auditoria_city9twin_" + new Date().toISOString().slice(0, 10) + ".csv", [["#", "Timestamp", "Usuario", "Rol", "Acción", "Entidad", "ID", "Versión", "Resultado"], ...csv.map(function (r) { return r.split(","); })]);
    window.showToast?.("✓ Exportando " + rows.length + " registros...", "success");
    window.registrarAuditoria?.("Exportar", "Auditoría", "filtro", "EXITOSO", { cantidad: rows.length });
  });

  applyFilters();

  window.tryMutateAudit = function tryMutateAudit() {
    window.Audit?.blockMutationAttempt("manual");
  };
})();
