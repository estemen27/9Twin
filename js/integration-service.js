(function () {
  const responseTimes = {
    "IoT Sensor": 35,
    Cámara: 55,
    GPS: 85,
    "API REST": 120,
  };

  function getBaseLatency(tipo) {
    return responseTimes[tipo] || 100;
  }

  function getStatusByLatency(latency) {
    if (latency <= 80) return "activo";
    if (latency <= 180) return "degradado";
    return "inactivo";
  }

  function probeSource(source) {
    return new Promise(function (resolve) {
      const baseLatency = getBaseLatency(source.tipo);
      const variation = Math.round(Math.random() * 60);
      const latency = baseLatency + variation;
      const estado = getStatusByLatency(latency);

      setTimeout(function () {
        resolve({
          id: source.id,
          latency: latency,
          estado: estado,
          frescura: estado === "inactivo" ? null : Math.max(10, Math.round(latency / 2)),
          completitud: estado === "activo" ? 96 : estado === "degradado" ? 82 : null,
        });
      }, Math.min(latency, 500));
    });
  }

  function syncSources(fuentes) {
    return Promise.all(
      fuentes.map(function (fuente) {
        return probeSource(fuente).then(function (result) {
          fuente.estado = result.estado;
          fuente.frescura = result.frescura;
          fuente.completitud = result.completitud;
          fuente.ultimaActualizacion = Date.now();
          return result;
        });
      })
    );
  }

  window.IntegrationService = {
    probeSource: probeSource,
    syncSources: syncSources,
  };
})();