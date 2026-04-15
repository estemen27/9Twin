(function () {
  const form = document.getElementById("login-form");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const emailError = document.getElementById("email-error");
  const passError = document.getElementById("password-error");
  const banner = document.getElementById("login-banner");

  if (window.getCurrentUser?.()) {
    window.location.href = "dashboard.html";
  }

  function setBanner(msg, type) {
    banner.innerHTML = msg ? '<div class="banner banner-' + type + '">' + msg + "</div>" : "";
  }

  function validate() {
    let ok = true;
    emailError.textContent = "";
    passError.textContent = "";

    if (!email.value.trim()) {
      emailError.textContent = "Este campo es obligatorio";
      ok = false;
    }
    if (!password.value.trim()) {
      passError.textContent = "Este campo es obligatorio";
      ok = false;
    }
    return ok;
  }

  form?.addEventListener("submit", function (event) {
    event.preventDefault();
    setBanner("", "info");
    if (!validate()) return;

    const result = window.login?.(email.value.trim(), password.value);
    if (!result?.ok) {
      setBanner(result?.error || "Credenciales inválidas", "error");
      return;
    }
    window.showToast?.("Bienvenido a City 9Twin", "success");
    window.location.href = "dashboard.html";
  });

  document.getElementById("toggle-password")?.addEventListener("click", function () {
    const open = password.type === "password";
    password.type = open ? "text" : "password";
    this.textContent = open ? "Ocultar" : "Mostrar";
  });

  const activeAccounts = (window.AppData?.usuarios || []).filter(function (u) { return u.activo; });
  const container = document.getElementById("demo-accounts");
  if (container) {
    container.innerHTML = activeAccounts.map(function (u) {
      return (
        '<button type="button" class="demo-account" data-email="' + u.email + '" data-pass="' + u.password + '">' +
        '<strong>' + u.nombre + '</strong><br><small>' + u.email + "</small></button>"
      );
    }).join("");

    container.querySelectorAll(".demo-account").forEach(function (btn) {
      btn.addEventListener("click", function () {
        email.value = btn.getAttribute("data-email") || "";
        password.value = btn.getAttribute("data-pass") || "";
      });
    });
  }
})();
