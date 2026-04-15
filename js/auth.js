(function () {
  const SESSION_KEY = "city9twin_session";

  const matrix = {
    gestionar_usuarios: ["Administrador"],
    configurar_zona: ["Administrador", "Planificador"],
    ver_dashboard: ["Administrador", "Operador de Tráfico", "Planificador", "Observador", "Auditor"],
    crear_escenario: ["Administrador", "Operador de Tráfico", "Planificador"],
    ejecutar_simulacion: ["Administrador", "Operador de Tráfico"],
    aprobar_escenario: ["Administrador", "Operador de Tráfico"],
    exportar_reporte: ["Administrador", "Operador de Tráfico", "Planificador"],
    registrar_incidente: ["Administrador", "Operador de Tráfico"],
    ver_auditoria: ["Administrador", "Observador"],
    editar_auditoria: [],
  };

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    if (window.updateAppState) window.updateAppState({ usuario: user });
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  window.getCurrentUser = function getCurrentUser() {
    return getSession();
  };

  window.login = function login(email, password) {
    const user = window.AppData?.usuarios?.find(function (u) {
      return u.email.toLowerCase() === String(email).toLowerCase() && u.password === password;
    });

    if (!user) {
      return { ok: false, error: "Credenciales inválidas" };
    }
    if (!user.activo) {
      return { ok: false, error: "Cuenta inactiva. Contacte al administrador." };
    }

    const sessionUser = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      activo: user.activo,
    };

    setSession(sessionUser);
    if (window.registrarAuditoria) {
      window.registrarAuditoria("Login", "Usuario", String(user.id), "EXITOSO", { email: user.email });
    }
    return { ok: true, user: sessionUser };
  };

  window.logout = function logout() {
    const user = getSession();
    if (window.registrarAuditoria && user) {
      window.registrarAuditoria("Logout", "Usuario", String(user.id), "EXITOSO", { email: user.email });
    }
    localStorage.removeItem(SESSION_KEY);
    if (window.resetAppState) window.resetAppState();
    window.location.href = "index.html";
  };

  window.requireAuth = function requireAuth() {
    const current = getSession();
    if (!current) {
      window.location.href = "index.html";
      return null;
    }
    if (window.updateAppState) {
      window.updateAppState({ usuario: current });
    }
    return current;
  };

  window.checkPermission = function checkPermission(accion) {
    const current = getSession();
    if (!current) return false;
    const allowed = matrix[accion] || [];
    return allowed.includes(current.rol);
  };

  window.enforcePermission = function enforcePermission(accion, element) {
    if (!element) return;
    const has = checkPermission(accion);
    if (has) return;
    element.classList.add("disabled");
    if ("disabled" in element) element.disabled = true;
    element.setAttribute("aria-disabled", "true");

    element.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      const current = getSession();
      const rol = current?.rol || "Sin rol";
      window.showToast?.("Permisos insuficientes. Tu rol (" + rol + ") no tiene acceso a esta función.", "error");
      window.registrarAuditoria?.("Intento bloqueado", "Permisos", accion, "BLOQUEADO", { rol: rol });
    });
  };

  window.enforceRoutePermission = function enforceRoutePermission(accion, fallback) {
    if (checkPermission(accion)) return true;
    const user = getSession();
    window.showToast?.("Acceso denegado", "error");
    window.registrarAuditoria?.("Intento bloqueado", "Ruta", window.location.pathname, "BLOQUEADO", { accion: accion, rol: user?.rol || "Sin sesión" });
    window.location.href = fallback || "dashboard.html";
    return false;
  };
})();
