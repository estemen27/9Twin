(function () {
  const TZ = "America/Bogota";

  function ensureToastContainer() {
    let el = document.getElementById("toast-container");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast-container";
      el.className = "toast-container";
      document.body.appendChild(el);
    }
    return el;
  }

  function ensureConfirmModal() {
    if (document.getElementById("global-confirm-modal")) return;
    const modal = document.createElement("div");
    modal.id = "global-confirm-modal";
    modal.className = "modal";
    modal.innerHTML =
      '<div class="modal-content">' +
      '<button class="modal-close" aria-label="Cerrar">×</button>' +
      '<h3>Confirmación</h3>' +
      '<p id="confirm-text">¿Deseas continuar?</p>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-secondary" id="confirm-cancelar">Cancelar</button>' +
      '<button class="btn btn-danger" id="confirm-aceptar">Confirmar</button>' +
      "</div></div>";
    document.body.appendChild(modal);

    modal.querySelector(".modal-close")?.addEventListener("click", function () {
      closeModal("global-confirm-modal");
    });
    modal.querySelector("#confirm-cancelar")?.addEventListener("click", function () {
      closeModal("global-confirm-modal");
    });
  }

  window.showToast = function showToast(mensaje, tipo) {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = "toast toast-" + (tipo || "info");
    toast.textContent = mensaje;
    container.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add("visible");
    });
    setTimeout(function () {
      toast.classList.remove("visible");
      setTimeout(function () {
        toast.remove();
      }, 200);
    }, 3000);
  };

  window.showModal = function showModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  };

  window.closeModal = function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  };

  window.showConfirm = function showConfirm(mensaje, callback) {
    ensureConfirmModal();
    const text = document.getElementById("confirm-text");
    const btn = document.getElementById("confirm-aceptar");
    if (text) text.textContent = mensaje;
    if (btn) {
      const clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);
      clone.addEventListener("click", function () {
        closeModal("global-confirm-modal");
        callback?.();
      });
    }
    showModal("global-confirm-modal");
  };

  window.formatDateTime = function formatDateTime(date) {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: TZ,
    }).format(date instanceof Date ? date : new Date(date));
  };

  window.formatElapsed = function formatElapsed(ms) {
    const sec = Math.max(0, Math.floor(ms / 1000));
    if (sec < 60) return "hace " + sec + "s";
    const min = Math.floor(sec / 60);
    if (min < 60) return "hace " + min + " min";
    const hr = Math.floor(min / 60);
    return "hace " + hr + " h";
  };

  window.calcularConfianza = function calcularConfianza(fuentes) {
    const fs = fuentes || window.AppData?.fuentes || [];
    let color = "VERDE";
    const razones = [];

    fs.forEach(function (f) {
      if (f.estado === "inactivo" && f.critica) {
        color = "ROJO";
        razones.push(f.id + " inactivo (crítico)");
      }
      if (f.estado === "degradado") {
        if (color !== "ROJO") color = "AMARILLO";
        razones.push(f.id + " degradado");
      }
      if (typeof f.frescura === "number" && f.frescura > 300) {
        color = "ROJO";
        razones.push(f.id + " sin datos >5 min");
      } else if (typeof f.frescura === "number" && f.frescura > 60) {
        if (color !== "ROJO") color = "AMARILLO";
        razones.push(f.id + " excede límite de 60s");
      }
    });

    if (!razones.length) {
      razones.push("Todas las fuentes críticas están nominales");
    }

    return {
      nivel: color,
      explicacion: razones,
    };
  };

  window.registrarAuditoria = function registrarAuditoria(accion, entidad, entidadId, resultado, parametros) {
    const usuario = window.getCurrentUser ? window.getCurrentUser() : null;
    const registro = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      usuario: usuario?.email || "sistema@city9twin.com",
      rol: usuario?.rol || "Sistema",
      accion,
      entidad,
      entidadId,
      version: "v" + ((window.AppData?.escenarios?.find(function (e) { return e.id === entidadId; })?.version) || 1),
      resultado,
      parametros: parametros || {},
    };
    window.AppData?.auditoria?.unshift(registro);
    if (window.saveAppData) window.saveAppData();
  };

  window.exportarCSV = function exportarCSV(nombre, filas) {
    const contenido = "\uFEFF" + filas.map(function (r) { return r.join(","); }).join("\n");
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  };

  window.exportarReporte = function exportarReporte(escenarioId, formato) {
    const escenario = window.AppData?.escenarios?.find(function (e) { return e.id === escenarioId; });
    const usuario = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!escenario || escenario.estado !== "Aprobado") {
      showToast("Solo puedes exportar escenarios aprobados.", "warning");
      return;
    }
    if (window.checkPermission && !window.checkPermission("exportar_reporte")) {
      showToast("Permisos insuficientes.", "error");
      registrarAuditoria("Exportar", "Reporte", escenarioId, "BLOQUEADO", { motivo: "Permisos" });
      return;
    }

    const now = new Date();
    const fecha = now.toISOString().slice(0, 10);
    const baseRows = [
      ["PLAN DE DECISIÓN — CITY 9TWIN"],
      ["Zona piloto", window.AppData?.zonaPiloto?.nombre || "N/A"],
      ["Generado", formatDateTime(now)],
      ["Aprobado por", usuario?.nombre || "N/A"],
      ["Versión", "v" + escenario.version],
      ["ID Simulación", "SIM-" + Date.now()],
      ["ID Escenario", escenario.id],
      ["Nombre", escenario.nombre],
      ["Confianza", escenario.confianza || "N/A"],
    ];

    const progress = document.getElementById("export-progress");
    if (progress) {
      progress.style.width = "0%";
      showModal("modal-exportar");
      setTimeout(function () { progress.style.width = "40%"; }, 300);
      setTimeout(function () { progress.style.width = "80%"; }, 900);
      setTimeout(function () { progress.style.width = "100%"; }, 1600);
    }

    setTimeout(function () {
      if (formato === "CSV" || formato === "Ambos") {
        exportarCSV("plan_" + escenario.id + "_" + fecha + ".csv", baseRows);
      }
      if (formato === "PDF" || formato === "Ambos") {
        const prev = document.getElementById("preview-export");
        if (prev) {
          prev.innerHTML = baseRows.map(function (r) {
            if (r.length === 1) return "<h3>" + r[0] + "</h3>";
            return "<p><strong>" + r[0] + ":</strong> " + (r[1] || "") + "</p>";
          }).join("");
        }
        window.print();
      }
      closeModal("modal-exportar");
      showToast("✓ Reporte generado: plan_" + escenario.id + "_" + fecha + ".csv", "success");
      registrarAuditoria("Exportar", "Reporte", escenario.id, "EXITOSO", { formato: formato });
    }, 2000);
  };

  window.getQueryParam = function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  };

  window.initModalSystem = function initModalSystem() {
    document.querySelectorAll(".modal").forEach(function (modal) {
      modal.addEventListener("click", function (event) {
        if (event.target === modal) {
          closeModal(modal.id);
        }
      });
      modal.querySelectorAll(".modal-close").forEach(function (btn) {
        btn.addEventListener("click", function () {
          closeModal(modal.id);
        });
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        document.querySelectorAll(".modal.open").forEach(function (modal) {
          closeModal(modal.id);
        });
      }
    });
  };

  window.initSortableTable = function initSortableTable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const headers = table.querySelectorAll("th[data-sort]");
    headers.forEach(function (th, idx) {
      th.style.cursor = "pointer";
      let asc = true;
      th.addEventListener("click", function () {
        const rows = Array.from(table.querySelectorAll("tbody tr"));
        rows.sort(function (a, b) {
          const ta = a.children[idx]?.textContent?.trim() || "";
          const tb = b.children[idx]?.textContent?.trim() || "";
          const na = Number(ta.replace(/[^0-9.-]/g, ""));
          const nb = Number(tb.replace(/[^0-9.-]/g, ""));
          const result = !Number.isNaN(na) && !Number.isNaN(nb)
            ? na - nb
            : ta.localeCompare(tb, "es", { sensitivity: "base" });
          return asc ? result : -result;
        });
        const tbody = table.querySelector("tbody");
        tbody.innerHTML = "";
        rows.forEach(function (r) { tbody.appendChild(r); });
        headers.forEach(function (h) { h.classList.remove("asc", "desc"); });
        th.classList.add(asc ? "asc" : "desc");
        asc = !asc;
      });
    });
  };

  window.paginarTabla = function paginarTabla(tableId, pageSize, pageInfoId, prevId, nextId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    let page = 1;
    const info = document.getElementById(pageInfoId);
    const prev = document.getElementById(prevId);
    const next = document.getElementById(nextId);

    function render() {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      rows.forEach(function (row, i) {
        row.style.display = i >= start && i < end ? "" : "none";
      });
      if (info) info.textContent = "Página " + page + " de " + totalPages;
      if (prev) prev.disabled = page <= 1;
      if (next) next.disabled = page >= totalPages;
    }

    prev?.addEventListener("click", function () {
      if (page > 1) {
        page -= 1;
        render();
      }
    });

    next?.addEventListener("click", function () {
      if (page < totalPages) {
        page += 1;
        render();
      }
    });

    render();
  };
})();
