(function () {
  const modules = [
    { key: "dashboard", label: "Dashboard", href: "dashboard.html", icon: '<svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z"/></svg>' },
    { key: "zona", label: "Zona Piloto", href: "zona-piloto.html", icon: '<svg viewBox="0 0 24 24"><path d="M3 7l6-3 6 3 6-3v14l-6 3-6-3-6 3V7zm6-1.8v12.6l6 3V8.2l-6-3z"/></svg>' },
    { key: "fuentes", label: "Fuentes de Datos", href: "fuentes-datos.html", icon: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 14a4 4 0 110-8 4 4 0 010 8zm0-10a6 6 0 016 6h2a8 8 0 10-8 8v-2a6 6 0 010-12z"/></svg>' },
    { key: "escenarios", label: "Escenarios", href: "escenarios.html", icon: '<svg viewBox="0 0 24 24"><path d="M4 4h16v4H4V4zm0 6h10v10H4V10zm12 0h4v10h-4V10z"/></svg>' },
    { key: "comparador", label: "Comparador", href: "comparador.html", icon: '<svg viewBox="0 0 24 24"><path d="M4 5h6v14H4V5zm10 4h6v10h-6V9zM9 2h6v5H9V2z"/></svg>' },
    { key: "incidentes", label: "Incidentes", href: "incidentes.html", icon: '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>' },
    { key: "evaluacion", label: "Evaluación", href: "evaluacion.html", icon: '<svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>' },
    { key: "auditoria", label: "Auditoría", href: "auditoria.html", icon: '<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V5l-9-4zm0 10h7c-.5 3.9-3 7.4-7 8.7V11H5V6.3l7-3.1V11z"/></svg>' },
    { key: "usuarios", label: "Usuarios", href: "usuarios.html", icon: '<svg viewBox="0 0 24 24"><path d="M16 11c1.7 0 3-1.3 3-3S17.7 5 16 5s-3 1.3-3 3 1.3 3 3 3zM8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.7 0-1.1.1 1.2.8 2.1 1.9 2.1 3.4V19h7v-2.5c0-2.3-4.7-3.5-7-3.5z"/></svg>', onlyAdmin: true },
  ];

  function rolColor(rol) {
    return {
      Administrador: "role-admin",
      "Operador de Tráfico": "role-operador",
      Planificador: "role-planificador",
      Observador: "role-observador",
      Auditor: "role-observador",
    }[rol] || "role-observador";
  }

  function initials(name) {
    return String(name || "Usuario")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(function (p) { return p[0]; })
      .join("")
      .toUpperCase();
  }

  function renderNotifications() {
    const panel = document.getElementById("notifications-panel");
    const list = document.getElementById("notifications-list");
    const count = document.getElementById("notif-count");
    const data = window.AppData?.notificaciones || [];
    const unread = data.filter(function (n) { return !n.leida; }).length;

    if (count) count.textContent = String(unread);
    if (window.updateAppState) {
      window.updateAppState({ notificacionesNoLeidas: unread });
    }
    const h = document.getElementById("notif-header-title");
    if (h) {
      h.textContent = "Notificaciones (" + unread + " nuevas)";
    }
    if (!list) return;

    list.innerHTML = data
      .map(function (n) {
        return (
          '<button class="notif-item" data-id="' + n.id + '">' +
          '<span class="notif-dot ' + (n.leida ? "hidden" : "") + '"></span>' +
          '<span class="notif-text">' + n.texto + '</span>' +
          '<span class="notif-time">' + (window.formatElapsed ? window.formatElapsed(Date.now() - n.tiempo) : "") + '</span>' +
          "</button>"
        );
      })
      .join("");

    list.querySelectorAll(".notif-item").forEach(function (item) {
      item.addEventListener("click", function () {
        const id = item.getAttribute("data-id");
        const found = data.find(function (n) { return n.id === id; });
        if (!found) return;
        found.leida = true;
        if (window.saveAppData) window.saveAppData();
        window.location.href = found.url;
      });
    });

    document.getElementById("mark-read")?.addEventListener("click", function () {
      data.forEach(function (n) { n.leida = true; });
      if (window.saveAppData) window.saveAppData();
      if (window.updateAppState) window.updateAppState({ notificacionesNoLeidas: 0 });
      renderNotifications();
    });

    document.getElementById("notif-btn")?.addEventListener("click", function () {
      panel?.classList.toggle("open");
    });
  }

  window.initLayout = function initLayout(moduleKey, title) {
    const user = window.requireAuth ? window.requireAuth() : null;
    if (!user) return;

    const container = document.getElementById("app-layout");
    if (!container) return;
    const originalNode = document.getElementById("page-content");
    const originalContent = originalNode ? originalNode.innerHTML : "";

    const links = modules
      .filter(function (m) { return !m.onlyAdmin || user.rol === "Administrador"; })
      .map(function (m) {
        return (
          '<a class="nav-item ' + (m.key === moduleKey ? "active" : "") + '" href="' + m.href + '">' +
          '<span class="nav-icon">' + m.icon + '</span>' +
          '<span>' + m.label + "</span>" +
          "</a>"
        );
      })
      .join("");

    container.innerHTML =
      '<aside class="sidebar">' +
      '<div><div class="logo"><svg viewBox="0 0 24 24"><path d="M2 20h20v2H2v-2zm2-2h4V8H4v10zm6 0h4V4h-4v14zm6 0h4v-7h-4v7z"/></svg><span>City 9Twin</span></div>' +
      '<nav class="sidebar-nav">' + links + "</nav></div>" +
      '<div class="sidebar-footer">' +
      '<div class="clock" id="co-clock">--:--:--</div>' +
      '<div class="user-box">' +
      '<div class="avatar ' + rolColor(user.rol) + '">' + initials(user.nombre) + '</div>' +
      '<div><strong>' + user.nombre + '</strong><span class="role-badge ' + rolColor(user.rol) + '">' + user.rol + '</span></div>' +
      '</div>' +
      '<button class="btn btn-text" id="logout-btn">Cerrar sesión</button>' +
      "</div></aside>" +
      '<main class="main-content">' +
      '<header class="topbar">' +
      '<h1>' + title + '</h1>' +
      '<div class="topbar-actions">' +
      '<div id="trust-badge" class="trust-badge amarillo"><span class="pulse"></span><span>AMARILLO</span></div>' +
      '<div class="notif-wrapper"><button id="notif-btn" class="icon-btn" aria-label="Notificaciones">🔔<span id="notif-count" class="notif-count">0</span></button>' +
      '<div id="notifications-panel" class="notif-panel"><div id="notif-header-title" class="notif-header">Notificaciones (0 nuevas)</div><div id="notifications-list"></div><button id="mark-read" class="btn btn-secondary">Marcar todo como leído</button></div></div>' +
      "</div></header>" +
      '<section id="module-content"></section>' +
      '<footer class="global-footer">Sistema: ✓ Operativo | Uptime: 99.7% | Último chequeo: <span id="uptime-seconds">hace 0s</span> | Versión: 2.1.4</footer>' +
      "</main>";

    const mount = document.getElementById("module-content");
    if (mount) {
      mount.innerHTML = '<div id="page-content" style="display:block; width:100%">' + originalContent + "</div>";
    }

    document.getElementById("logout-btn")?.addEventListener("click", function () {
      window.logout?.();
    });

    function tickClock() {
      const clock = document.getElementById("co-clock");
      if (!clock) return;
      const text = new Intl.DateTimeFormat("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "America/Bogota",
      }).format(new Date());
      clock.textContent = "COL UTC-5: " + text;
      const up = document.getElementById("uptime-seconds");
      if (up) up.textContent = "hace " + Math.floor(performance.now() / 1000) + "s";
    }

    function updateTrust() {
      const trust = window.calcularConfianza ? window.calcularConfianza(window.AppData?.fuentes) : { nivel: "AMARILLO" };
      const badge = document.getElementById("trust-badge");
      if (!badge) return;
      badge.classList.remove("verde", "amarillo", "rojo");
      badge.classList.add(trust.nivel.toLowerCase());
      badge.querySelector("span:last-child").textContent = trust.nivel;
      if (window.updateAppState) window.updateAppState({ confianzaDatos: trust.nivel });
    }

    tickClock();
    updateTrust();
    renderNotifications();
    setInterval(tickClock, 1000);
    setInterval(updateTrust, 30000);
  };
})();
