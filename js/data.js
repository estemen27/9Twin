(function () {
  function horas(base, variacion) {
    return Array.from({ length: 24 }, function (_, h) {
      const factor = h >= 6 && h <= 9 ? 1.2 : h >= 17 && h <= 20 ? 1.3 : 0.85;
      return Math.max(20, Math.round((base + (h % 5) * variacion) * factor));
    });
  }

  const usuarios = [
    { id: 1, nombre: "Carlos Gómez", email: "admin@city9twin.com", password: "Admin123", rol: "Administrador", activo: true, ultimoAcceso: "2026-04-15T07:20:00" },
    { id: 2, nombre: "María Torres", email: "operador@city9twin.com", password: "Op123", rol: "Operador de Tráfico", activo: true, ultimoAcceso: "2026-04-15T07:41:00" },
    { id: 3, nombre: "Juan Pérez", email: "planificador@city9twin.com", password: "Plan123", rol: "Planificador", activo: true, ultimoAcceso: "2026-04-14T16:12:00" },
    { id: 4, nombre: "Ana López", email: "observador@city9twin.com", password: "Obs123", rol: "Observador", activo: true, ultimoAcceso: "2026-04-14T19:02:00" },
    { id: 5, nombre: "Luis Mora", email: "auditor@city9twin.com", password: "Audit123", rol: "Auditor", activo: false, ultimoAcceso: "2026-04-10T09:00:00" },
  ];

  const base = {
    usuarios,
    zonaPiloto: {
      nombre: "Chía-Unisabana-Cajicá",
      estado: "activa",
      nodos: 847,
      segmentos: 1203,
      intersecciones: 312,
      semaforos: 89,
      area: 28.4,
      poligonoSW: { lat: 4.8234, lng: -74.0521 },
      poligonoNE: { lat: 4.9876, lng: -73.9834 },
    },
    fuentes: [
      { id: "SRC-01", nombre: "Sensores Loop Vial", tipo: "IoT Sensor", estado: "activo", frescura: 23, completitud: 97, critica: true, ultimaActualizacion: Date.now() - 23000 },
      { id: "SRC-02", nombre: "Cámaras CCTV IA", tipo: "Cámara", estado: "activo", frescura: 45, completitud: 94, critica: true, ultimaActualizacion: Date.now() - 45000 },
      { id: "SRC-03", nombre: "GPS Flota Transmilenio", tipo: "GPS", estado: "degradado", frescura: 187, completitud: 82, critica: false, ultimaActualizacion: Date.now() - 187000 },
      { id: "SRC-04", nombre: "App Waze/Google Maps", tipo: "API REST", estado: "inactivo", frescura: null, completitud: null, critica: false, ultimaActualizacion: Date.now() - 900000 },
    ],
    corredores: [
      { id: "COR-01", nombre: "Av. Circunvalar Chía / Cra 11", velocidadActual: 16.3, velocidadBase: 27.1, congestion: 0.92, tiempoPromedio: 34.2, p90: 49.1, historico: horas(290, 12) },
      { id: "COR-02", nombre: "Variante Chía-Cajicá / Puente Piedra", velocidadActual: 18.8, velocidadBase: 29.2, congestion: 0.88, tiempoPromedio: 29.8, p90: 44.7, historico: horas(260, 10) },
      { id: "COR-03", nombre: "Entrada Unisabana Norte", velocidadActual: 22.6, velocidadBase: 31.4, congestion: 0.76, tiempoPromedio: 25.1, p90: 39.2, historico: horas(220, 9) },
      { id: "COR-04", nombre: "Cra 6 Cajicá / Cll 3", velocidadActual: 24.7, velocidadBase: 32.0, congestion: 0.71, tiempoPromedio: 22.8, p90: 35.4, historico: horas(210, 8) },
      { id: "COR-05", nombre: "Av. Boyacá / Chía", velocidadActual: 26.8, velocidadBase: 33.1, congestion: 0.64, tiempoPromedio: 21.5, p90: 33.8, historico: horas(200, 6) },
      { id: "COR-06", nombre: "Autonorte / Peaje Andes", velocidadActual: 27.4, velocidadBase: 35.0, congestion: 0.58, tiempoPromedio: 19.2, p90: 30.6, historico: horas(190, 5) },
      { id: "COR-07", nombre: "Anillo Vial Chía Centro", velocidadActual: 24.9, velocidadBase: 30.5, congestion: 0.68, tiempoPromedio: 23.1, p90: 34.7, historico: horas(205, 7) },
    ],
    escenarios: [
      { id: "ESC-001", version: 3, nombre: "Ajuste semáforo Unisabana", tipo: "Ajuste Semaforización", creador: "María Torres", fecha: "2026-04-14T07:12:00", estado: "Aprobado", confianza: "VERDE", kpi: { tiempo: 21.3, p90: 33.1, congestion: 0.82, velocidad: 23.7 } },
      { id: "ESC-002", version: 1, nombre: "Cierre parcial Cra 11", tipo: "Cierre Vial", creador: "Juan Pérez", fecha: "2026-04-15T05:30:00", estado: "Completado", confianza: "AMARILLO", kpi: { tiempo: 23.1, p90: 36.8, congestion: 0.85, velocidad: 22.0 } },
      { id: "ESC-003", version: 2, nombre: "Obra puente Piedra", tipo: "Cierre Vial", creador: "María Torres", fecha: "2026-04-15T06:10:00", estado: "En simulación", confianza: "AMARILLO", kpi: null },
      { id: "ESC-004", version: 1, nombre: "Incidente Variante Norte", tipo: "Incidente", creador: "Carlos Gómez", fecha: "2026-04-15T06:55:00", estado: "Borrador", confianza: "AMARILLO", kpi: null },
      { id: "ESC-005", version: 1, nombre: "Cierre Variante Cajicá", tipo: "Cierre Vial", creador: "Juan Pérez", fecha: "2026-04-12T07:00:00", estado: "Aprobado", confianza: "AMARILLO", kpi: { tiempo: 24.8, p90: 41.2, congestion: 0.91, velocidad: 20.1 } },
      { id: "ESC-006", version: 1, nombre: "Semaforización Centro Chía", tipo: "Ajuste Semaforización", creador: "Carlos Gómez", fecha: "2026-04-13T08:00:00", estado: "Rechazado", confianza: "ROJO", kpi: { tiempo: 28.2, p90: 47.5, congestion: 0.95, velocidad: 17.1 } },
    ],
    incidentes: [
      { id: "INC-001", descripcion: "Colisión múltiple en Av. Circunvalar", ubicacion: "Av. Circunvalar Chía / Cra 11", severidad: "Alta", carriles: 2, estado: "Activo — ESC generado", escenarioAsociado: "ESC-008", creadoEn: Date.now() - 900000 },
      { id: "INC-002", descripcion: "Falla semafórica en Puente Piedra", ubicacion: "Variante Chía-Cajicá / Puente Piedra", severidad: "Media", carriles: 1, estado: "En simulación", escenarioAsociado: "ESC-003", creadoEn: Date.now() - 600000 },
      { id: "INC-003", descripcion: "Obra imprevista en Cra 6", ubicacion: "Cra 6 Cajicá / Cll 3", severidad: "Baja", carriles: 1, estado: "Cerrado", escenarioAsociado: "ESC-002", creadoEn: Date.now() - 86400000 },
    ],
    auditoria: Array.from({ length: 25 }, function (_, i) {
      return {
        id: i + 1,
        timestamp: new Date(Date.now() - i * 1800000).toISOString(),
        usuario: i % 2 === 0 ? "admin@city9twin.com" : "operador@city9twin.com",
        rol: i % 2 === 0 ? "Administrador" : "Operador de Tráfico",
        accion: ["Login", "Crear escenario", "Ejecutar simulación", "Aprobar", "Exportar"][i % 5],
        entidad: ["Usuario", "Escenario", "Simulación", "Reporte", "Incidente"][i % 5],
        entidadId: ["USR-01", "ESC-001", "SIM-1022", "REP-22", "INC-001"][i % 5],
        version: i % 3 === 0 ? "v2" : "v1",
        resultado: i % 7 === 0 ? "BLOQUEADO" : "EXITOSO",
        parametros: { origen: "sistema", indice: i + 1 },
      };
    }),
    notificaciones: [
      { id: "NOT-01", texto: "⚠ Fuente SRC-03 degradada (frescura: 3m 12s)", tiempo: Date.now() - 300000, leida: false, url: "fuentes-datos.html" },
      { id: "NOT-02", texto: "✓ Simulación ESC-007 completada", tiempo: Date.now() - 480000, leida: false, url: "escenarios.html?id=ESC-007" },
      { id: "NOT-03", texto: "🔴 Incidente en Av. Circunvalar registrado", tiempo: Date.now() - 240000, leida: false, url: "incidentes.html?id=INC-001" },
      { id: "NOT-04", texto: "⚠ Desviación >20% en evaluación ESC-005: P90", tiempo: Date.now() - 7200000, leida: true, url: "evaluacion.html?id=ESC-005" },
      { id: "NOT-05", texto: "✓ ESC-001 aprobado por operador", tiempo: Date.now() - 10800000, leida: true, url: "escenarios.html?id=ESC-001" },
    ],
    mapaChia: {
      poligono: ["80,78", "620,70", "652,390", "92,414"],
      calles: [
        "M70 120L640 110",
        "M60 190L650 180",
        "M50 258L645 248",
        "M72 328L625 318",
        "M130 44L120 432",
        "M228 40L218 438",
        "M328 38L318 440",
        "M430 36L420 442",
        "M530 42L520 436",
        "M85 95L585 352",
        "M560 92L130 360",
      ],
      segmentos: [
        { id: "COR-01", nombre: "Av. Circunvalar Chía / Cra 11", from: [100, 190], to: [610, 182], congestion: 0.92, velocidad: 16.3, cola: "390m", demora: "14 min", frescura: "19s", critical: true },
        { id: "COR-02", nombre: "Variante Chía-Cajicá / Puente Piedra", from: [324, 78], to: [315, 402], congestion: 0.88, velocidad: 18.8, cola: "320m", demora: "11 min", frescura: "24s", critical: true },
        { id: "COR-03", nombre: "Entrada Unisabana Norte", from: [132, 120], to: [530, 312], congestion: 0.76, velocidad: 22.6, cola: "210m", demora: "7 min", frescura: "17s", critical: false },
        { id: "COR-04", nombre: "Cra 6 Cajicá / Cll 3", from: [220, 258], to: [528, 252], congestion: 0.71, velocidad: 24.7, cola: "170m", demora: "6 min", frescura: "21s", critical: false },
        { id: "COR-05", nombre: "Av. Boyacá / Chía", from: [82, 326], to: [620, 316], congestion: 0.64, velocidad: 26.8, cola: "112m", demora: "4 min", frescura: "16s", critical: false },
        { id: "COR-06", nombre: "Autonorte / Peaje Andes", from: [428, 78], to: [423, 398], congestion: 0.58, velocidad: 27.4, cola: "91m", demora: "3 min", frescura: "14s", critical: false },
        { id: "COR-07", nombre: "Anillo Vial Chía Centro", from: [90, 94], to: [575, 350], congestion: 0.68, velocidad: 24.9, cola: "162m", demora: "5 min", frescura: "18s", critical: false },
      ],
      nodos: [
        { id: "N-001", pos: [120, 120], tipo: "Intersección", estado: "Activo", coord: "4.8891,-74.0271" },
        { id: "N-012", pos: [220, 118], tipo: "Intersección", estado: "Activo", coord: "4.8920,-74.0172" },
        { id: "N-045", pos: [318, 188], tipo: "Intersección", estado: "Inválido", coord: "4.9031,-74.0122", invalid: true },
        { id: "N-062", pos: [420, 182], tipo: "Intersección", estado: "Activo", coord: "4.9103,-74.0021" },
        { id: "N-080", pos: [520, 176], tipo: "Intersección", estado: "Activo", coord: "4.9148,-73.9941" },
        { id: "N-112", pos: [315, 256], tipo: "Semáforo", estado: "Activo", coord: "4.9000,-74.0103" },
        { id: "N-124", pos: [220, 258], tipo: "Intersección", estado: "Activo", coord: "4.8967,-74.0171" },
        { id: "N-144", pos: [424, 318], tipo: "Intersección", estado: "Activo", coord: "4.9142,-74.0019" },
      ],
      semaforos: [
        { id: "S-11", pos: [220, 118] },
        { id: "S-24", pos: [315, 256] },
        { id: "S-47", pos: [424, 318] },
      ],
    },
  };

  function mergeWithStored(key, fallback) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (!saved) return fallback;
      return saved;
    } catch (error) {
      return fallback;
    }
  }

  window.AppData = {
    usuarios: mergeWithStored("city9twin_usuarios", base.usuarios),
    zonaPiloto: mergeWithStored("city9twin_zona", base.zonaPiloto),
    fuentes: mergeWithStored("city9twin_fuentes", base.fuentes),
    corredores: mergeWithStored("city9twin_corredores", base.corredores),
    escenarios: mergeWithStored("city9twin_escenarios", base.escenarios),
    incidentes: mergeWithStored("city9twin_incidentes", base.incidentes),
    auditoria: mergeWithStored("city9twin_auditoria", base.auditoria),
    notificaciones: mergeWithStored("city9twin_notificaciones", base.notificaciones),
    mapaChia: mergeWithStored("city9twin_mapa_chia", base.mapaChia),
    invalidos: Array.from({ length: 20 }, function (_, i) {
      return {
        timestamp: new Date(Date.now() - i * 61000).toISOString(),
        fuente: ["SRC-01", "SRC-02", "SRC-03", "SRC-04"][i % 4],
        razon: ["Timestamp futuro", "Campo obligatorio faltante", "Tipo de dato inválido"][i % 3],
        campos: ["timestamp", "latitud,longitud", "velocidad,estado"][i % 3],
      };
    }),
  };

  window.saveAppData = function saveAppData() {
    localStorage.setItem("city9twin_usuarios", JSON.stringify(window.AppData.usuarios));
    localStorage.setItem("city9twin_zona", JSON.stringify(window.AppData.zonaPiloto));
    localStorage.setItem("city9twin_fuentes", JSON.stringify(window.AppData.fuentes));
    localStorage.setItem("city9twin_corredores", JSON.stringify(window.AppData.corredores));
    localStorage.setItem("city9twin_escenarios", JSON.stringify(window.AppData.escenarios));
    localStorage.setItem("city9twin_incidentes", JSON.stringify(window.AppData.incidentes));
    localStorage.setItem("city9twin_auditoria", JSON.stringify(window.AppData.auditoria));
    localStorage.setItem("city9twin_notificaciones", JSON.stringify(window.AppData.notificaciones));
    localStorage.setItem("city9twin_mapa_chia", JSON.stringify(window.AppData.mapaChia));
  };
})();
