# City 9Twin

City 9Twin es una aplicacion web en JavaScript, HTML y CSS puro orientada a demostracion ejecutiva de un gemelo digital de movilidad para el corredor Chia - Cajica - Unisabana. El proyecto esta pensado para correr sin backend y sin proceso de build: se abre directamente en navegador y mantiene el estado en `localStorage`.

Este repositorio contiene una solucion completa con:

- autenticacion y control de permisos por rol
- tablero operativo con KPIs y visualizacion del estado vial
- configuracion de zona piloto y fuentes de datos
- construccion, simulacion y evaluacion de escenarios
- comparacion entre escenarios
- gestion de incidentes
- trazabilidad de auditoria
- gestion de usuarios
- visualizacion cartografica interactiva (motor SVG propio)

## 1. Objetivo del proyecto

El objetivo funcional es ofrecer una demo que permita responder tres preguntas clave:

1. Que esta pasando en la red vial en este momento.
2. Que pasaria si se aplica un cambio operativo.
3. Como justificar la decision con trazabilidad y evidencia visual.

El objetivo tecnico es sostener esa experiencia sin dependencias de framework ni backend, manteniendo una estructura modular, facil de abrir y facil de desplegar en hosting estatico (por ejemplo Vercel).

## 2. Alcance funcional

La aplicacion cubre los siguientes procesos de punta a punta:

- acceso con usuario y rol
- visualizacion de salud de datos y confianza operativa
- seleccion y configuracion de escenarios
- simulacion con resultado cuantitativo y espacial
- aprobacion/rechazo del escenario
- exportacion de resultados
- registro de auditoria de acciones

## 3. Arquitectura general

### 3.1 Stack

- Frontend: HTML5 + CSS3 + JavaScript Vanilla
- Graficas: Chart.js (CDN)
- Persistencia: `localStorage`
- Mapa: motor propio en SVG (`js/map-engine.js`)

### 3.2 Patron de organizacion

La app sigue una organizacion por capas simple:

- `js/`: servicios comunes, estado, autenticacion, auditoria, mapa, utilidades
- `pages/`: logica de cada modulo/pagina
- `css/`: estilos globales y componentes
- `*.html`: vistas principales

### 3.3 Criterios de diseno

- sin build, sin bundler, sin npm
- carga directa por scripts en orden controlado
- persistencia local para demo offline
- componentes reutilizables y patrones consistentes
- trazabilidad de acciones sensibles

## 4. Estructura del repositorio

```text
city9twin/
  index.html
  dashboard.html
  zona-piloto.html
  fuentes-datos.html
  escenarios.html
  comparador.html
  incidentes.html
  evaluacion.html
  auditoria.html
  usuarios.html

  css/
    main.css
    components.css

  js/
    app-state.js
    data.js
    utils.js
    auth.js
    charts.js
    audit.js
    sidebar-template.js
    map-engine.js

  pages/
    index.js
    dashboard.js
    zona-piloto.js
    fuentes-datos.js
    escenarios.js
    comparador.js
    incidentes.js
    evaluacion.js
    auditoria.js
    usuarios.js
```

## 5. Modulos y comportamiento

### 5.1 Inicio (`index.html`)

- login de acceso con validacion basica
- arranque de sesion y redireccion por contexto

### 5.2 Dashboard (`dashboard.html`)

- KPIs operativos
- estado general de la red
- visualizacion principal del gemelo digital

### 5.3 Zona Piloto (`zona-piloto.html`)

- definicion de parametros geograficos y operativos de la zona
- visualizacion de capas base

### 5.4 Fuentes de Datos (`fuentes-datos.html`)

- estado de conectividad por fuente
- frescura y completitud
- indicadores de calidad de ingestion

### 5.5 Escenarios (`escenarios.html`)

- creacion y edicion de escenarios
- simulacion con resultado KPI
- comparativo temporal (24h)
- mapa de impacto con modos `baseline`, `escenario`, `delta`
- reproduccion temporal y panel ejecutivo en vivo

### 5.6 Comparador (`comparador.html`)

- comparacion multi-escenario
- soporte para lectura de diferencias de rendimiento

### 5.7 Incidentes (`incidentes.html`)

- registro y seguimiento de incidentes
- relacion con escenarios operativos

### 5.8 Evaluacion (`evaluacion.html`)

- lectura posterior de resultados
- verificacion de desviaciones y comportamiento observado

### 5.9 Auditoria (`auditoria.html`)

- historial de acciones
- filtros y consulta
- soporte de detalle para trazabilidad

### 5.10 Usuarios (`usuarios.html`)

- administracion de usuarios y estado de cuentas
- control de roles

## 6. Seguridad y permisos (RBAC)

La autorizacion se controla por rol y permiso. Las acciones bloqueadas registran evento de auditoria.

Roles de demo incluidos:

- Administrador
- Operador de Trafico
- Planificador
- Observador
- Auditor

Permisos utilizados en la app:

- `gestionar_usuarios`
- `configurar_zona`
- `ver_dashboard`
- `crear_escenario`
- `ejecutar_simulacion`
- `aprobar_escenario`
- `exportar_reporte`
- `registrar_incidente`
- `ver_auditoria`
- `editar_auditoria`

## 7. Persistencia y modelo de datos

Toda la data se mantiene en `localStorage` y se inicializa desde `js/data.js`.

Claves principales:

- `city9twin_usuarios`
- `city9twin_zona`
- `city9twin_fuentes`
- `city9twin_corredores`
- `city9twin_escenarios`
- `city9twin_incidentes`
- `city9twin_auditoria`
- `city9twin_notificaciones`
- `city9twin_mapa_chia`

Esto permite:

- conservar estado entre recargas
- ejecutar demo sin servicios externos
- resetear rapidamente borrando almacenamiento local

## 8. Motor de mapa (`js/map-engine.js`)

El mapa esta construido en SVG con un motor propio que soporta:

- capas de red vial, segmentos, nodos y semaforos
- zoom y pan
- animacion de flujo vial
- codificacion dinamica de congestion
- callbacks para click en segmento y nodo
- limpieza de listeners para evitar fugas de memoria

En Escenarios, el motor se reutiliza durante la reproduccion temporal para reducir recalculos y evitar congelamientos.

## 9. Simulaciones en Escenarios

La simulacion de demo usa logica sintetica pero consistente:

- toma parametros del formulario (tipo, carriles, desvio, duracion, ciclo)
- calcula impacto relativo en KPIs
- genera serie temporal de 24 horas
- proyecta impacto por segmento
- actualiza grafica y mapa por hora

Estados operativos del flujo:

1. validacion
2. conectividad
3. corrida
4. publicacion de resultado
5. aprobacion/rechazo/exportacion

## 10. Usuarios de prueba

Usuarios definidos en `js/data.js`:

- `admin@city9twin.com` / `Admin123`
- `operador@city9twin.com` / `Op123`
- `planificador@city9twin.com` / `Plan123`
- `observador@city9twin.com` / `Obs123`
- `auditor@city9twin.com` / `Audit123`


