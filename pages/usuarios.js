(function () {
  window.initLayout?.("usuarios", "Usuarios");
  window.initModalSystem?.();

  if (!window.checkPermission?.("gestionar_usuarios")) {
    window.showToast?.("Acceso denegado", "error");
    window.location.href = "dashboard.html";
    return;
  }

  const users = window.AppData?.usuarios || [];
  let editing = null;
  let query = "";

  function roleBadge(rol) {
    const map = {
      Administrador: "badge-purple",
      "Operador de Tráfico": "badge-blue",
      Planificador: "badge-teal",
      Observador: "badge-gray",
      Auditor: "badge-gray",
    };
    const cls = map[rol] || "badge-gray";
    return '<span class="badge ' + cls + '">' + rol + '</span>';
  }

  function render() {
    const body = document.getElementById("body-usuarios");
    const rows = users.filter(function (u) {
      const text = [u.nombre, u.email, u.rol, u.id].join(" ").toLowerCase();
      return text.includes(query);
    });

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7"><div class="empty-state">No hay usuarios para esta búsqueda.</div></td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (u) {
      return (
        '<tr>' +
        '<td>' + u.id + '</td>' +
        '<td>' + u.nombre + '</td>' +
        '<td>' + u.email + '</td>' +
        '<td>' + roleBadge(u.rol) + '</td>' +
        '<td><label><input type="checkbox" data-toggle="' + u.id + '" ' + (u.activo ? "checked" : "") + '/> ' + (u.activo ? "Activo" : "Inactivo") + '</label></td>' +
        '<td>' + window.formatDateTime?.(u.ultimoAcceso || Date.now()) + '</td>' +
        '<td><button class="btn btn-secondary" data-edit="' + u.id + '">Editar</button> <button class="btn btn-danger" data-dis="' + u.id + '">' + (u.activo ? "Deshabilitar" : "Habilitar") + '</button></td>' +
        '</tr>'
      );
    }).join("");

    body.querySelectorAll("button[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        const id = Number(b.getAttribute("data-edit"));
        const u = users.find(function (x) { return x.id === id; });
        if (!u) return;
        editing = u;
        document.getElementById("mu-title").textContent = "Editar usuario";
        document.getElementById("u-nombre").value = u.nombre;
        document.getElementById("u-email").value = u.email;
        document.getElementById("u-email").disabled = true;
        document.getElementById("u-pass").value = "";
        document.getElementById("u-pass2").value = "";
        document.getElementById("u-rol").value = u.rol;
        document.getElementById("u-estado").value = String(u.activo);
        document.getElementById("guardar-user").textContent = "Guardar cambios";
        document.getElementById("mu-note").textContent = "El cambio de rol se aplicará en el próximo inicio de sesión";
        validateForm();
        window.showModal?.("modal-user");
      });
    });

    body.querySelectorAll("button[data-dis]").forEach(function (b) {
      b.addEventListener("click", function () {
        const id = Number(b.getAttribute("data-dis"));
        const u = users.find(function (x) { return x.id === id; });
        if (!u) return;
        window.showConfirm?.("¿Deshabilitar a " + u.nombre + "? No podrá iniciar sesión hasta que vuelvas a habilitarlo.", function () {
          u.activo = !u.activo;
          window.saveAppData?.();
          window.registrarAuditoria?.("Cambio usuario", "Usuario", String(u.id), "EXITOSO", { activo: u.activo });
          render();
        });
      });
    });

    body.querySelectorAll("input[data-toggle]").forEach(function (x) {
      x.addEventListener("change", function () {
        const u = users.find(function (k) { return k.id === Number(x.getAttribute("data-toggle")); });
        if (!u) return;
        u.activo = x.checked;
        window.saveAppData?.();
        render();
      });
    });

    window.initSortableTable?.("tabla-usuarios");
    window.paginarTabla?.("tabla-usuarios", 10, "page-info-user", "prev-user", "next-user");
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateForm() {
    const nombre = document.getElementById("u-nombre").value.trim();
    const email = document.getElementById("u-email").value.trim();
    const pass = document.getElementById("u-pass").value;
    const pass2 = document.getElementById("u-pass2").value;

    let ok = true;
    document.getElementById("e-nombre").textContent = "";
    document.getElementById("e-email").textContent = "";
    document.getElementById("e-pass").textContent = "";
    document.getElementById("e-pass2").textContent = "";

    if (nombre.length < 3) {
      ok = false;
      document.getElementById("e-nombre").textContent = "Mínimo 3 caracteres";
    }

    if (!validateEmail(email)) {
      ok = false;
      document.getElementById("e-email").textContent = "Email inválido";
    }

    if (!editing) {
      const exists = users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); });
      if (exists) {
        ok = false;
        document.getElementById("e-email").textContent = "Email ya existe en el sistema";
      }
    }

    if (!editing || pass || pass2) {
      if (pass.length < 8 || !/[0-9]/.test(pass)) {
        ok = false;
        document.getElementById("e-pass").textContent = "Mínimo 8 caracteres y al menos 1 número";
      }
      if (pass !== pass2) {
        ok = false;
        document.getElementById("e-pass2").textContent = "Las contraseñas no coinciden";
      }
    }

    document.getElementById("guardar-user").disabled = !ok;
    return ok;
  }

  ["u-nombre", "u-email", "u-pass", "u-pass2", "u-rol", "u-estado"].forEach(function (id) {
    document.getElementById(id)?.addEventListener("input", validateForm);
    document.getElementById(id)?.addEventListener("change", validateForm);
  });

  document.getElementById("buscar-usuarios")?.addEventListener("input", function () {
    query = this.value.trim().toLowerCase();
    render();
  });

  document.getElementById("nuevo-usuario")?.addEventListener("click", function () {
    editing = null;
    document.getElementById("mu-title").textContent = "Nuevo usuario";
    document.getElementById("u-nombre").value = "";
    document.getElementById("u-email").value = "";
    document.getElementById("u-email").disabled = false;
    document.getElementById("u-pass").value = "";
    document.getElementById("u-pass2").value = "";
    document.getElementById("u-rol").value = "Planificador";
    document.getElementById("u-estado").value = "true";
    document.getElementById("guardar-user").textContent = "Crear usuario";
    document.getElementById("mu-note").textContent = "";
    validateForm();
    window.showModal?.("modal-user");
  });

  document.getElementById("guardar-user")?.addEventListener("click", function () {
    if (!validateForm()) return;
    const payload = {
      nombre: document.getElementById("u-nombre").value.trim(),
      email: document.getElementById("u-email").value.trim(),
      password: document.getElementById("u-pass").value,
      rol: document.getElementById("u-rol").value,
      activo: document.getElementById("u-estado").value === "true",
    };

    if (editing) {
      editing.nombre = payload.nombre;
      if (payload.password) editing.password = payload.password;
      editing.rol = payload.rol;
      editing.activo = payload.activo;
      window.registrarAuditoria?.("Cambio de rol", "Usuario", String(editing.id), "EXITOSO", { rol: editing.rol });
    } else {
      users.push({ id: users.length + 1, ...payload, ultimoAcceso: new Date().toISOString() });
      window.registrarAuditoria?.("Crear usuario", "Usuario", String(users.length), "EXITOSO", { email: payload.email });
    }

    window.saveAppData?.();
    window.closeModal?.("modal-user");
    render();
  });

  render();
})();
