(function () {
  function lerp(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function hexToRgb(hex) {
    const m = String(hex).replace("#", "");
    return {
      r: parseInt(m.substring(0, 2), 16),
      g: parseInt(m.substring(2, 4), 16),
      b: parseInt(m.substring(4, 6), 16),
    };
  }

  function mixColor(c1, c2, t) {
    const a = hexToRgb(c1);
    const b = hexToRgb(c2);
    return "rgb(" + lerp(a.r, b.r, t) + "," + lerp(a.g, b.g, t) + "," + lerp(a.b, b.b, t) + ")";
  }

  function colorByCongestion(c) {
    const v = Math.min(1, Math.max(0, c));
    // Palette: Teal -> Green -> Yellow -> Orange -> Red
    if (v < 0.2) return mixColor("#14B8A6", "#2DD4BF", v / 0.2);
    if (v < 0.4) return mixColor("#2DD4BF", "#A3E635", (v - 0.2) / 0.2);
    if (v < 0.6) return mixColor("#A3E635", "#FACC15", (v - 0.4) / 0.2);
    if (v < 0.8) return mixColor("#FACC15", "#FB923C", (v - 0.6) / 0.2);
    return mixColor("#FB923C", "#F87171", (v - 0.8) / 0.2);
  }

  function createSvgEl(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs || {}).forEach(function (k) {
      el.setAttribute(k, String(attrs[k]));
    });
    return el;
  }

  function safeId(id) {
    return String(id).replace(/[^a-zA-Z0-9-_]/g, "_");
  }

  window.initTwinMap = function initTwinMap(options) {
    const cfg = options || {};
    const svg = document.getElementById(cfg.svgId || "map-svg");
    if (!svg) return null;

    if (typeof svg.__twinCleanup === "function") {
      svg.__twinCleanup();
      svg.__twinCleanup = null;
    }

    const data = cfg.data || window.AppData?.mapaChia;
    if (!data) return null;

    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 700 460");
    svg.classList.add("twin-map");
    const mapKey = safeId(cfg.svgId || "map-svg");
    const interactive = cfg.interactive !== false;

    const root = createSvgEl("g", { id: "twin-root" });
    const defs = createSvgEl("defs");
    const gridPatternId = "map-grid-" + mapKey;
    const glowId = "seg-glow-" + mapKey;
    const gridPattern = createSvgEl("pattern", { id: gridPatternId, width: 34, height: 34, patternUnits: "userSpaceOnUse" });
    gridPattern.appendChild(createSvgEl("path", {
      d: "M 34 0 L 0 0 0 34",
      fill: "none",
      stroke: "rgba(168,190,220,0.08)",
      "stroke-width": 1,
    }));
    defs.appendChild(gridPattern);
    const glow = createSvgEl("filter", { id: glowId, x: "-30%", y: "-30%", width: "160%", height: "160%" });
    glow.appendChild(createSvgEl("feGaussianBlur", { stdDeviation: "1.6", result: "blur" }));
    glow.appendChild(createSvgEl("feBlend", { in: "SourceGraphic", in2: "blur", mode: "screen" }));
    defs.appendChild(glow);
    svg.appendChild(defs);

    const bg = createSvgEl("rect", { x: 0, y: 0, width: 700, height: 460, fill: "#111a2d" });
    const bgGrid = createSvgEl("rect", { x: 0, y: 0, width: 700, height: 460, fill: "url(#" + gridPatternId + ")" });

    const terrain = createSvgEl("g", { id: "twin-terrain" });
    [
      { x: 132, y: 136, w: 120, h: 54, r: 16 },
      { x: 448, y: 110, w: 168, h: 72, r: 18 },
      { x: 230, y: 306, w: 160, h: 66, r: 16 },
    ].forEach(function (p) {
      terrain.appendChild(createSvgEl("rect", {
        x: p.x,
        y: p.y,
        width: p.w,
        height: p.h,
        rx: p.r,
        fill: "rgba(74,222,128,0.08)",
        stroke: "rgba(74,222,128,0.22)",
        "stroke-width": 1,
      }));
    });

    const creek = createSvgEl("path", {
      d: "M74 334 C156 298, 264 318, 344 286 C438 248, 558 258, 642 224",
      stroke: "rgba(56,189,248,0.42)",
      "stroke-width": 10,
      fill: "none",
      "stroke-linecap": "round",
      opacity: 0.28,
    });

    const roadsCase = createSvgEl("g", { id: "twin-roads-case", stroke: "#2a3550", "stroke-width": 5.0, fill: "none", opacity: 0.6 });
    data.calles.forEach(function (pathDef) {
      roadsCase.appendChild(createSvgEl("path", { d: pathDef }));
    });

    const roads = createSvgEl("g", { id: "twin-roads", stroke: "#556079", "stroke-width": 2.5, fill: "none", opacity: 0.6 });
    data.calles.forEach(function (pathDef) {
      roads.appendChild(createSvgEl("path", { d: pathDef }));
    });

    const poly = createSvgEl("polygon", {
      id: "twin-poly",
      points: data.poligono.join(" "),
      stroke: "#D6A87A",
      "stroke-dasharray": "7 5",
      "stroke-width": 2,
      fill: "rgba(214,168,122,0.08)",
    });

    const segGroup = createSvgEl("g", { id: "twin-segmentos", "stroke-linecap": "round" });
    const flowGroup = createSvgEl("g", { id: "twin-flow", "stroke-linecap": "round" });
    const segmentRefs = {};
    data.segmentos.forEach(function (s) {
      const el = createSvgEl("line", {
        id: "seg-" + safeId(s.id),
        x1: s.from[0],
        y1: s.from[1],
        x2: s.to[0],
        y2: s.to[1],
        stroke: colorByCongestion(s.congestion),
        "stroke-width": s.critical ? 6.3 : 4.6,
        class: "seg-line" + (s.critical ? " critico" : ""),
      });
      el.setAttribute("filter", "url(#" + glowId + ")");
      el.dataset.segmentoId = s.id;
      el.dataset.nombre = s.nombre;
      el.dataset.velocidad = String(s.velocidad);
      el.dataset.cola = s.cola;
      el.dataset.demora = s.demora;
      el.dataset.frescura = s.frescura;
      el.dataset.congestion = String(s.congestion);
      segGroup.appendChild(el);

      const flow = createSvgEl("line", {
        id: "flow-" + safeId(s.id),
        x1: s.from[0],
        y1: s.from[1],
        x2: s.to[0],
        y2: s.to[1],
        stroke: "rgba(191,219,254,0.65)",
        "stroke-width": 1.8,
        "stroke-dasharray": "8 10",
        class: "flow-line",
      });
      flow.style.animationDuration = (1.2 + Math.max(0.2, (1 - s.congestion)) * 1.6).toFixed(2) + "s";
      flowGroup.appendChild(flow);
      segmentRefs[s.id] = { line: el, flow: flow, baseCritical: !!s.critical };
    });

    const nodesGroup = createSvgEl("g", { id: "twin-nodos", fill: "#F1D2AF" });
    data.nodos.forEach(function (n) {
      const node = createSvgEl("circle", {
        id: "node-" + safeId(n.id),
        cx: n.pos[0],
        cy: n.pos[1],
        r: n.invalid ? 4.2 : 3.3,
        fill: n.invalid ? "#F87171" : "#F1D2AF",
        class: "map-node" + (n.invalid ? " invalid" : ""),
      });
      node.dataset.nodeId = n.id;
      node.dataset.tipo = n.tipo;
      node.dataset.estado = n.estado;
      node.dataset.coord = n.coord;
      nodesGroup.appendChild(node);
    });

    const lights = createSvgEl("g", { id: "twin-semaforos" });
    data.semaforos.forEach(function (s) {
      const g = createSvgEl("g", { transform: "translate(" + s.pos[0] + " " + s.pos[1] + ")" });
      g.appendChild(createSvgEl("rect", { x: -5, y: -5, width: 10, height: 10, rx: 2, fill: "#0f172a", opacity: 0.95 }));
      g.appendChild(createSvgEl("circle", { r: 2.3, cy: -1.8, fill: "#4ADE80", class: "signal-green" }));
      g.appendChild(createSvgEl("circle", { r: 2.3, cy: 1.8, fill: "#FACC15", class: "signal-yellow" }));
      lights.appendChild(g);
    });

    const labels = createSvgEl("g", { id: "twin-labels" });
    data.segmentos.slice(0, 5).forEach(function (s) {
      const x = (s.from[0] + s.to[0]) / 2;
      const y = (s.from[1] + s.to[1]) / 2;
      const t = createSvgEl("text", {
        x: x,
        y: y - 7,
        fill: "#c7dcff",
        "font-size": 9,
        "text-anchor": "middle",
        opacity: 0.86,
      });
      t.textContent = s.id;
      labels.appendChild(t);
    });

    [
      { text: "Centro Chia", x: 286, y: 222 },
      { text: "Variante Norte", x: 448, y: 164 },
      { text: "Sector Unisabana", x: 204, y: 142 },
    ].forEach(function (zone) {
      const z = createSvgEl("text", {
        x: zone.x,
        y: zone.y,
        fill: "rgba(197,220,255,0.72)",
        "font-size": 11,
        "font-weight": 600,
        "text-anchor": "middle",
      });
      z.textContent = zone.text;
      labels.appendChild(z);
    });

    root.appendChild(bg);
    root.appendChild(bgGrid);
    root.appendChild(terrain);
    root.appendChild(creek);
    root.appendChild(roadsCase);
    root.appendChild(roads);
    root.appendChild(poly);
    root.appendChild(segGroup);
    root.appendChild(flowGroup);
    root.appendChild(nodesGroup);
    root.appendChild(lights);
    root.appendChild(labels);
    svg.appendChild(root);

    const layerCfg = cfg.layers || {};
    function bindLayerToggle(toggleId, elId) {
      const t = document.getElementById(toggleId);
      const g = document.getElementById(elId);
      if (!t || !g) return;
      t.addEventListener("change", function () {
        g.style.display = t.checked ? "" : "none";
      });
    }

    bindLayerToggle(layerCfg.nodos, "twin-nodos");
    bindLayerToggle(layerCfg.segmentos, "twin-segmentos");
    bindLayerToggle(layerCfg.poligono, "twin-poly");
    bindLayerToggle(layerCfg.semaforos, "twin-semaforos");
    bindLayerToggle(layerCfg.segmentos, "twin-flow");

    let scale = 1;
    const minScale = 0.85;
    const maxScale = 2.3;
    const zoomIn = document.getElementById(cfg.zoomInId || "zoom-in");
    const zoomOut = document.getElementById(cfg.zoomOutId || "zoom-out");

    function renderTransform() {
      applyPan();
    }

    const onZoomIn = function () {
      scale = Math.min(maxScale, scale + 0.12);
      renderTransform();
    };

    const onZoomOut = function () {
      scale = Math.max(minScale, scale - 0.12);
      renderTransform();
    };

    if (interactive) {
      zoomIn?.addEventListener("click", onZoomIn);
      zoomOut?.addEventListener("click", onZoomOut);
    }

    let dragging = false;
    let last = { x: 0, y: 0 };
    let pan = { x: 0, y: 0 };

    function applyPan() {
      root.style.transform = "translate(" + pan.x + "px," + pan.y + "px) scale(" + scale.toFixed(2) + ")";
      root.style.transformOrigin = "top left";
    }

    const onMouseDown = function (e) {
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
      svg.classList.add("grabbing");
    };

    const onMouseUp = function () {
      dragging = false;
      svg.classList.remove("grabbing");
    };

    const onMouseMove = function (e) {
      if (!dragging) return;
      pan.x += (e.clientX - last.x) / scale;
      pan.y += (e.clientY - last.y) / scale;
      last = { x: e.clientX, y: e.clientY };
      applyPan();
    };

    if (interactive) {
      svg.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("mousemove", onMouseMove);
    }

    segGroup.querySelectorAll(".seg-line").forEach(function (el) {
      el.addEventListener("click", function (event) {
        event.stopPropagation();
        const seg = data.segmentos.find(function (s) { return s.id === el.dataset.segmentoId; });
        cfg.onSegmentClick?.(seg, el);
      });
    });

    nodesGroup.querySelectorAll(".map-node").forEach(function (node) {
      node.addEventListener("click", function (event) {
        event.stopPropagation();
        const n = data.nodos.find(function (x) { return x.id === node.dataset.nodeId; });
        cfg.onNodeClick?.(n, node);
      });
    });

    svg.__twinCleanup = function cleanupTwinMap() {
      zoomIn?.removeEventListener("click", onZoomIn);
      zoomOut?.removeEventListener("click", onZoomOut);
      svg.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      svg.classList.remove("grabbing");
    };

    applyPan();
    return {
      setCongestion: function setCongestion(segmentId, value) {
        const ref = segmentRefs[segmentId];
        const el = ref?.line;
        const flow = ref?.flow;
        if (!el) return;
        const v = Math.min(1, Math.max(0, value));
        el.setAttribute("stroke", colorByCongestion(v));
        el.setAttribute("stroke-width", String((ref?.baseCritical ? 5.0 : 3.8) + v * 2.0));
        el.style.opacity = String(0.6 + v * 0.4);
        if (flow) {
          flow.style.animationDuration = (1.5 + Math.max(0.2, (1 - v)) * 2.0).toFixed(2) + "s";
          flow.style.opacity = String(0.4 + Math.min(0.5, v * 0.6));
          flow.style.strokeWidth = String(1.4 + v * 1.1);
        }
      },
      getScale: function getScale() { return scale; },
      resetView: function resetView() {
        scale = 1;
        pan = { x: 0, y: 0 };
        applyPan();
      },
      destroy: function destroy() {
        if (typeof svg.__twinCleanup === "function") {
          svg.__twinCleanup();
          svg.__twinCleanup = null;
        }
      },
    };
  };
})();
