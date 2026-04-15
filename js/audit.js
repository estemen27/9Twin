(function () {
  window.Audit = {
    immutable: true,
    blockMutationAttempt: function blockMutationAttempt(origen) {
      const usuario = window.getCurrentUser ? window.getCurrentUser() : null;
      if (window.showToast) {
        window.showToast("Registro inmutable. No se permite modificar auditoría.", "error");
      }
      if (window.registrarAuditoria) {
        window.registrarAuditoria(
          "Intento bloqueado",
          "Auditoría",
          origen || "N/A",
          "BLOQUEADO",
          { motivo: "Inmutabilidad" }
        );
      } else if (window.AppData?.auditoria) {
        window.AppData.auditoria.unshift({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          usuario: usuario?.email || "anónimo",
          rol: usuario?.rol || "Sin sesión",
          accion: "Intento bloqueado",
          entidad: "Auditoría",
          entidadId: origen || "N/A",
          version: "v1",
          resultado: "BLOQUEADO",
          parametros: { motivo: "Inmutabilidad" },
        });
      }
    },
  };
})();
