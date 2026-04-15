(function () {
  const KEY = "city9twin_app_state";

  const defaultState = {
    usuario: null,
    confianzaDatos: "AMARILLO",
    notificacionesNoLeidas: 3,
    escenarioSeleccionado: null,
    filtroHorario: "tiempo-real",
    fallbackActivo: false,
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(KEY);
      if (!saved) return { ...defaultState };
      return { ...defaultState, ...JSON.parse(saved) };
    } catch (error) {
      return { ...defaultState };
    }
  }

  function saveState() {
    localStorage.setItem(KEY, JSON.stringify(window.AppState));
  }

  window.AppState = loadState();

  window.updateAppState = function updateAppState(patch) {
    window.AppState = { ...window.AppState, ...patch };
    saveState();
    return window.AppState;
  };

  window.resetAppState = function resetAppState() {
    window.AppState = { ...defaultState };
    saveState();
  };
})();
