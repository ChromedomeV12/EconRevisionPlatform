(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory(require("./vendor/d3.min.js"));
  else root.EconGraphs = factory(root.d3);
})(typeof globalThis !== "undefined" ? globalThis : this, function (d3) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const documents = new WeakMap();
  const ID = /^[A-Za-z][A-Za-z0-9_-]{0,47}$/;
  const TOP = ["version", "id", "title", "description", "kind", "coordinateMode", "axes", "curves", "points", "guides", "guidePaths", "arrows", "areas", "labels", "width", "height", "panels", "nodes", "connectors", "paths", "bands", "arcs", "columns", "rows", "review"];
  const KINDS = ["chart", "multipanel", "schematic", "table"];

  // Reject non-JSON values and accessors before reading any schema properties.
  function jsonTree(value, seen = new Set(), depth = 0, budget = { left: 12000 }) {
    if (--budget.left < 0 || depth > 8) return false;
    if (value === null || typeof value === "string" || typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value !== "object" || seen.has(value)) return false;
    const array = Array.isArray(value);
    if (array ? value.length > 128 : ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
    seen.add(value);
    const keys = Reflect.ownKeys(value);
    if (keys.length > 129) return false;
    for (const key of keys) {
      if (array && key === "length") continue;
      const property = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== "string" || !property.enumerable || !("value" in property)) return false;
      if (array && !/^(0|[1-9]\d*)$/.test(key)) return false;
      if (!jsonTree(property.value, seen, depth + 1, budget)) return false;
    }
    if (array && keys.length !== value.length + 1) return false;
    seen.delete(value);
    return true;
  }

  function onPolyline(point, vertices, axes) {
    const normal = pair => [(pair[0] - axes.x.min) / (axes.x.max - axes.x.min), (pair[1] - axes.y.min) / (axes.y.max - axes.y.min)];
    const p = normal(point);
    return vertices.slice(1).some((end, i) => {
      const a = normal(vertices[i]);
      const b = normal(end);
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const length = dx * dx + dy * dy;
      if (!length) return false;
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length));
      return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy) <= 1e-6;
    });
  }

  function validate(spec) {
    const errors = [];
    const fail = (path, message) => { if (errors.length < 100) errors.push(`${path}: ${message}`); };
    try {
      if (!jsonTree(spec)) return { valid: false, errors: ["spec: expected bounded plain JSON without accessors or cycles"] };
      const object = (value, fields, optional, path) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) { fail(path, "expected object"); return false; }
        for (const key of Object.keys(value)) if (!fields.includes(key)) fail(`${path}.${key}`, "unknown field");
        for (const key of fields) if (!optional.includes(key) && !Object.hasOwn(value, key)) fail(`${path}.${key}`, "required field");
        return true;
      };
      const text = (value, max, path, allowEmpty = false) => {
        if (allowEmpty && value === "") return;
        if (typeof value !== "string" || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value)) fail(path, `expected nonempty text, maximum ${max} characters, no control characters`);
      };
      const choice = (value, choices, path) => { if (!choices.includes(value)) fail(path, `expected ${choices.join(" or ")}`); };
      const array = (value, max, path, visit, min = 0) => {
        if (!Array.isArray(value) || value.length < min || value.length > max) { fail(path, `expected ${min}..${max} entries`); return false; }
        value.forEach((item, index) => visit(item, `${path}[${index}]`));
        return true;
      };
      const ids = new Set();
      const id = (value, path) => {
        if (typeof value !== "string" || !ID.test(value) || ["__proto__", "constructor", "prototype"].includes(value)) fail(path, "expected safe identifier, maximum 48 characters");
        else if (ids.has(value)) fail(path, "duplicate identifier");
        else ids.add(value);
      };
      const TOP_OPTIONAL = TOP.filter(key => !["version", "id", "title", "description", "coordinateMode", "review"].includes(key));
      if (!object(spec, TOP, TOP_OPTIONAL, "spec")) return { valid: false, errors };
      if (spec.version !== 1) fail("version", "expected 1");
      id(spec.id, "id"); text(spec.title, 120, "title"); text(spec.description, 1000, "description");
      choice(spec.coordinateMode, ["schematic", "quantitative"], "coordinateMode");
      const kind = spec.kind === undefined ? "chart" : spec.kind;
      choice(kind, KINDS, "kind");
      const review = () => {
        if (object(spec.review, ["status", "reviewer"], [], "review")) {
          choice(spec.review.status, ["draft", "reviewed"], "review.status");
          if (spec.review.reviewer !== null) text(spec.review.reviewer, 120, "review.reviewer");
          if (spec.review.status === "reviewed" && spec.review.reviewer === null) fail("review.reviewer", "reviewed graphs require a reviewer");
        }
      };
      review();
      if (kind !== "chart") {
        const special = () => {
          if (kind === "multipanel") {
            array(spec.panels, 3, "panels", (panel, path) => {
              if (!object(panel, TOP, TOP_OPTIONAL, path)) return;
              const result = validate(panel);
              if (!result.valid) fail(path, result.errors.join("; "));
              if ((panel.kind || "chart") !== "chart") fail(path, "every panel must be a chart spec");
            }, 2);
            if (Object.hasOwn(spec, "axes") || Object.hasOwn(spec, "curves")) fail("spec", "multipanel specs do not use top-level axes/curves");
          } else if (kind === "schematic") {
            const coord = (value, path) => {
              if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) fail(path, "expected schematic coordinate 0..100");
            };
            const pair = (value, path) => {
              if (!Array.isArray(value) || value.length !== 2) { fail(path, "expected [x,y]"); return; }
              coord(value[0], `${path}.x`); coord(value[1], `${path}.y`);
            };
            const tone = (value, path) => { if (value !== undefined) choice(value, ["neutral", "muted", "accent", "magenta", "cyan", "warning"], path); };
            if (Object.hasOwn(spec, "width") && (typeof spec.width !== "number" || !Number.isFinite(spec.width) || spec.width < 320 || spec.width > 1600)) fail("width", "expected 320..1600");
            if (Object.hasOwn(spec, "height") && (typeof spec.height !== "number" || !Number.isFinite(spec.height) || spec.height < 200 || spec.height > 2400)) fail("height", "expected 200..2400");
            const nodes = new Map();
            array(spec.nodes, 64, "nodes", (node, path) => {
              if (!object(node, ["id", "label", "x", "y", "shape", "w", "h", "tone", "labelPosition"], ["shape", "w", "h", "tone", "labelPosition"], path)) return;
              id(node.id, `${path}.id`); text(node.label, 80, `${path}.label`, true);
              coord(node.x, `${path}.x`); coord(node.y, `${path}.y`);
              if (Object.hasOwn(node, "shape")) choice(node.shape, ["circle", "box", "rounded"], `${path}.shape`);
              for (const key of ["w", "h"]) if (Object.hasOwn(node, key) && (typeof node[key] !== "number" || !Number.isFinite(node[key]) || node[key] < 3 || node[key] > 70)) fail(`${path}.${key}`, "expected 3..70");
              tone(node.tone, `${path}.tone`);
              if (Object.hasOwn(node, "labelPosition")) pair(node.labelPosition, `${path}.labelPosition`);
              nodes.set(node.id, node);
            }, 1);
            if (spec.connectors !== undefined) array(spec.connectors, 128, "connectors", (connector, path) => {
              if (!object(connector, ["from", "to", "style", "tone", "label", "arrow"], ["style", "tone", "label", "arrow"], path)) return;
              if (!nodes.has(connector.from) || !nodes.has(connector.to)) fail(path, "unknown node reference");
              if (Object.hasOwn(connector, "style")) choice(connector.style, ["solid", "dashed"], `${path}.style`);
              if (Object.hasOwn(connector, "arrow")) choice(connector.arrow, ["none", "end", "both"], `${path}.arrow`);
              if (Object.hasOwn(connector, "tone")) tone(connector.tone, `${path}.tone`);
              if (Object.hasOwn(connector, "label")) text(connector.label, 40, `${path}.label`, true);
            });
            if (spec.paths !== undefined) array(spec.paths, 32, "paths", (item, path) => {
              if (!object(item, ["points", "style", "tone", "arrow", "label"], ["style", "tone", "arrow", "label"], path)) return;
              array(item.points, 64, `${path}.points`, pair, 2);
              if (Object.hasOwn(item, "style")) choice(item.style, ["solid", "dashed"], `${path}.style`);
              if (Object.hasOwn(item, "arrow")) choice(item.arrow, ["none", "end", "both"], `${path}.arrow`);
              if (Object.hasOwn(item, "tone")) tone(item.tone, `${path}.tone`);
              if (Object.hasOwn(item, "label")) text(item.label, 40, `${path}.label`, true);
            });
            if (spec.bands !== undefined) array(spec.bands, 16, "bands", (band, path) => {
              if (!object(band, ["x", "y", "w", "h", "label", "tone"], ["label", "tone"], path)) return;
              coord(band.x, `${path}.x`); coord(band.y, `${path}.y`);
              for (const key of ["w", "h"]) if (typeof band[key] !== "number" || !Number.isFinite(band[key]) || band[key] <= 0 || band[key] > 100) fail(`${path}.${key}`, "expected 0..100");
              if (Object.hasOwn(band, "label")) text(band.label, 80, `${path}.label`, true);
              tone(band.tone, `${path}.tone`);
            });
            if (spec.arcs !== undefined) array(spec.arcs, 32, "arcs", (arc, path) => {
              if (!object(arc, ["cx", "cy", "r", "start", "end", "tone", "width", "arrow"], ["tone", "width", "arrow"], path)) return;
              coord(arc.cx, `${path}.cx`); coord(arc.cy, `${path}.cy`);
              if (typeof arc.r !== "number" || !Number.isFinite(arc.r) || arc.r < 1 || arc.r > 80) fail(`${path}.r`, "expected 1..80");
              for (const key of ["start", "end"]) if (typeof arc[key] !== "number" || !Number.isFinite(arc[key]) || Math.abs(arc[key]) > 720) fail(`${path}.${key}`, "expected angle -720..720");
              if (Object.hasOwn(arc, "width") && (typeof arc.width !== "number" || !Number.isFinite(arc.width) || arc.width < 1 || arc.width > 12)) fail(`${path}.width`, "expected 1..12");
              if (Object.hasOwn(arc, "arrow")) choice(arc.arrow, ["none", "end", "both"], `${path}.arrow`);
              tone(arc.tone, `${path}.tone`);
            });
            if (spec.labels !== undefined) array(spec.labels, 32, "labels", (label, path) => {
              if (!object(label, ["text", "x", "y"], [], path)) return;
              text(label.text, 80, `${path}.text`); coord(label.x, `${path}.x`); coord(label.y, `${path}.y`);
            });
          } else if (kind === "table") {
            array(spec.columns, 5, "columns", (column, path) => text(column, 80, path, true), 2);
            array(spec.rows, 5, "rows", (row, path) => {
              if (!object(row, ["label", "cells"], [], path)) return;
              text(row.label, 80, `${path}.label`, true);
              array(row.cells, 4, `${path}.cells`, (cell, cellPath) => text(cell, 80, cellPath, true), 1);
              if (Array.isArray(row.cells) && row.cells.length !== spec.columns.length - 1) fail(`${path}.cells`, "expected one cell per non-label column");
            }, 2);
          }
          return { valid: !errors.length, errors };
        };
        return special();
      }
      if (object(spec.axes, ["x", "y", "aspectRatio"], ["aspectRatio"], "axes")) for (const key of ["x", "y"]) {
        const axis = spec.axes[key];
        if (object(axis, ["label", "min", "max"], [], `axes.${key}`)) {
          text(axis.label, 48, `axes.${key}.label`);
          if (![axis.min, axis.max].every(n => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 1e6) || axis.max - axis.min < 1e-6) fail(`axes.${key}`, "expected finite bounds within +/-1000000 and span >= 0.000001");
        }
      }
      if (Object.hasOwn(spec.axes, "aspectRatio") && (typeof spec.axes.aspectRatio !== "number" || !Number.isFinite(spec.axes.aspectRatio) || spec.axes.aspectRatio < 0.8 || spec.axes.aspectRatio > 2.4)) fail("axes.aspectRatio", "expected plot width/height ratio from 0.8 to 2.4");
      if (errors.length) return { valid: false, errors };
      const coordinate = (value, axis, path) => {
        if (typeof value !== "number" || !Number.isFinite(value) || value < axis.min || value > axis.max) { fail(path, "coordinate outside axis bounds"); return false; }
        return true;
      };
      const pair = (value, path) => {
        if (!Array.isArray(value) || value.length !== 2) { fail(path, "expected [x,y]"); return; }
        coordinate(value[0], spec.axes.x, `${path}.x`); coordinate(value[1], spec.axes.y, `${path}.y`);
      };
      const curves = new Map(), points = new Map();
      array(spec.curves, 16, "curves", (curve, path) => {
        if (!object(curve, ["id", "label", "role", "points", "labelPosition", "shape", "orientation", "tone"], ["labelPosition", "shape", "orientation", "tone"], path)) return;
        id(curve.id, `${path}.id`); text(curve.label, 24, `${path}.label`);
        if (Object.hasOwn(curve, "shape")) choice(curve.shape, ["linear", "piecewise"], `${path}.shape`);
        if (Object.hasOwn(curve, "orientation")) {
          choice(curve.orientation, ["horizontal", "vertical", "mixed"], `${path}.orientation`);
          if (!["demand", "supply"].includes(curve.role)) fail(`${path}.orientation`, "only demand and supply curves may declare orientation");
          if (curve.orientation === "mixed" && curve.shape !== "piecewise") fail(`${path}.orientation`, "mixed orientation requires a piecewise curve");
        }
        if (Object.hasOwn(curve, "labelPosition")) pair(curve.labelPosition, `${path}.labelPosition`);
        if (Object.hasOwn(curve, "tone")) choice(curve.tone, ["neutral", "muted", "accent", "magenta", "cyan", "warning"], `${path}.tone`);
        choice(curve.role, ["demand", "supply", "cost", "reference", "ppc"], `${path}.role`);
        const before = errors.length;
        array(curve.points, 64, `${path}.points`, pair, 2);
        if (errors.length === before) {
          const orientation = curve.orientation;
          curve.points.slice(1).forEach((end, i) => {
            const start = curve.points[i];
            if (end[0] === start[0] && end[1] === start[1]) fail(path, "zero-length curve segment");
            if (!orientation && ["demand", "supply", "ppc"].includes(curve.role) && (end[0] <= start[0] || (curve.role === "supply" ? end[1] <= start[1] : end[1] >= start[1]))) fail(path, `${curve.role} requires increasing x and strictly ${curve.role === "supply" ? "increasing" : "decreasing"} y`);
          });
          if (orientation === "horizontal" && curve.points.some(point => point[1] !== curve.points[0][1])) fail(path, "horizontal orientation requires one fixed y");
          if (orientation === "horizontal" && curve.points.some((point, i) => i > 0 && point[0] <= curve.points[i - 1][0])) fail(path, "horizontal orientation requires increasing x");
          if (orientation === "vertical" && curve.points.some(point => point[0] !== curve.points[0][0])) fail(path, "vertical orientation requires one fixed x");
          if (orientation === "vertical" && curve.points.some((point, i) => i > 0 && point[1] === curve.points[i - 1][1])) fail(path, "vertical orientation requires changing y");
        }
        if (errors.length === before && curve.shape === "linear" && curve.points.some(point => !onPolyline(point, [curve.points[0], curve.points.at(-1)], spec.axes))) fail(path, "linear curve vertices must lie on the straight endpoint segment");
        curves.set(curve.id, curve);
      });
      array(spec.points, 32, "points", (point, path) => {
        if (!object(point, ["id", "label", "curve", "x", "y", "xLabel", "yLabel", "labelPosition", "marker"], ["curve", "xLabel", "yLabel", "labelPosition", "marker"], path)) return;
        id(point.id, `${path}.id`); text(point.label, 16, `${path}.label`, true);
        if (Object.hasOwn(point, "marker") && typeof point.marker !== "boolean") fail(`${path}.marker`, "expected boolean");
        if (Object.hasOwn(point, "labelPosition")) pair(point.labelPosition, `${path}.labelPosition`);
        for (const key of ["xLabel", "yLabel"]) if (Object.hasOwn(point, key)) text(point[key], 12, `${path}.${key}`);
        coordinate(point.x, spec.axes.x, `${path}.x`); coordinate(point.y, spec.axes.y, `${path}.y`);
        if (point.curve !== undefined && point.curve !== null && (typeof point.curve !== "string" || !curves.has(point.curve))) fail(`${path}.curve`, "unknown curve");
        points.set(point.id, point);
      });
      // Membership is checked only after vertex shapes and coordinates are valid.
      if (!errors.length) for (const point of spec.points) if (point.curve != null && !onPolyline([point.x, point.y], curves.get(point.curve).points, spec.axes)) fail(`points.${point.id}`, "point not on specified polyline (normalized tolerance 0.000001)");
      const guided = new Set();
      array(spec.guides, 32, "guides", (guide, path) => {
        if (!object(guide, ["point", "axes"], [], path)) return;
        if (!points.has(guide.point)) fail(`${path}.point`, "unknown point");
        array(guide.axes, 2, `${path}.axes`, (axis, p) => {
          choice(axis, ["x", "y"], p);
          const key = `${guide.point}:${axis}`;
          if (guided.has(key)) fail(p, "duplicate point guide");
          guided.add(key);
        }, 1);
      });
      if (spec.guidePaths !== undefined) array(spec.guidePaths, 16, "guidePaths", (item, path) => {
        if (!object(item, ["points", "label"], ["label"], path)) return;
        array(item.points, 64, `${path}.points`, pair, 2);
        if (Object.hasOwn(item, "label")) text(item.label, 40, `${path}.label`, true);
        if (Array.isArray(item.points)) item.points.slice(1).forEach((end, i) => {
          const start = item.points[i];
          if (end[0] === start[0] && end[1] === start[1]) fail(path, "zero-length guide path segment");
        });
      });
      array(spec.arrows, 32, "arrows", (arrow, path) => {
        if (arrow && (Object.hasOwn(arrow, "start") || Object.hasOwn(arrow, "end"))) {
          if (!object(arrow, ["start", "end", "heads"], ["heads"], path)) return;
          // Detached indicators and callouts may use only the reserved SVG margins.
          for (const key of ["start", "end"]) {
            const p = arrow[key];
            if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) { fail(`${path}.${key}`, "expected finite [x,y]"); continue; }
            const nx = (p[0] - spec.axes.x.min) / (spec.axes.x.max - spec.axes.x.min);
            const ny = (p[1] - spec.axes.y.min) / (spec.axes.y.max - spec.axes.y.min);
            const marginBelow = Math.min(0.2, 80 / (spec.axes.aspectRatio ? 416 / spec.axes.aspectRatio : 212));
            if (nx < -0.18 || nx > 1.04 || ny < -marginBelow || ny > 1.08) fail(`${path}.${key}`, "outside plot and reserved annotation margins");
          }
          if (Object.hasOwn(arrow, "heads")) choice(arrow.heads, ["end", "both"], `${path}.heads`);
          if (Array.isArray(arrow.start) && Array.isArray(arrow.end) && arrow.start[0] === arrow.end[0] && arrow.start[1] === arrow.end[1]) fail(path, "zero-length arrow");
          return;
        }
        if (!object(arrow, ["from", "to", "offset"], ["offset"], path)) return;
        let offset = [0, 0];
        if (Object.hasOwn(arrow, "offset")) {
          if (!Array.isArray(arrow.offset) || arrow.offset.length !== 2 || !arrow.offset.every(n => typeof n === "number" && Number.isFinite(n))) {
            fail(`${path}.offset`, "expected finite [dx,dy] in axis-coordinate units");
            return;
          }
          offset = arrow.offset;
        }
        if (!points.has(arrow.from) || !points.has(arrow.to)) fail(path, "unknown arrow point");
        else {
          const a = points.get(arrow.from), b = points.get(arrow.to);
          if (a.x === b.x && a.y === b.y) fail(path, "zero-length arrow");
          pair([a.x + offset[0], a.y + offset[1]], `${path}.offsetFrom`);
          pair([b.x + offset[0], b.y + offset[1]], `${path}.offsetTo`);
        }
      });
      array(spec.areas, 16, "areas", (area, path) => {
        if (!object(area, ["id", "role", "points"], [], path)) return;
        id(area.id, `${path}.id`); choice(area.role, ["welfare", "consumer-surplus", "producer-surplus", "profit", "loss"], `${path}.role`);
        const before = errors.length;
        array(area.points, 64, `${path}.points`, pair, 3);
        if (errors.length === before) {
          const vertices = area.points;
          let sum = 0;
          for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i], b = vertices[(i + 1) % vertices.length];
            if (a[0] === b[0] && a[1] === b[1]) fail(path, "zero-length area edge (do not repeat closing vertex)");
            sum += (a[0] - spec.axes.x.min) * (b[1] - spec.axes.y.min) - (b[0] - spec.axes.x.min) * (a[1] - spec.axes.y.min);
          }
          if (!sum) fail(path, "area must have nonzero signed area");
        }
      });
      array(spec.labels, 32, "labels", (label, path) => {
        if (!object(label, ["text", "x", "y"], [], path)) return;
        text(label.text, 80, `${path}.text`); coordinate(label.x, spec.axes.x, `${path}.x`); coordinate(label.y, spec.axes.y, `${path}.y`);
      });
      return { valid: !errors.length, errors };
    } catch (_) {
      return { valid: false, errors: ["spec: unreadable JSON input"] };
    }
  }

  function renderMultipanel(spec, document, prefix, make) {
    const panels = spec.panels.map(panel => render(panel, document));
    const height = Math.max(...panels.map(panel => Number(panel.attributes?.height || panel.getAttribute?.("height")) || 420));
    const width = 640 * panels.length;
    const svg = make("svg", { class: "econ-graph econ-graph-multipanel", viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: "xMidYMid meet", width, height, role: "img", "aria-labelledby": `${prefix}-title ${prefix}-desc`, "data-kind": "multipanel" });
    make("title", { id: `${prefix}-title` }, svg).textContent = spec.title;
    make("desc", { id: `${prefix}-desc` }, svg).textContent = `${spec.description} Multi-panel schematic layout; panels retain their own source axes and labels.${spec.review.status === "draft" ? " Draft; not teacher reviewed." : ` Reviewed by ${spec.review.reviewer}.`}`;
    panels.forEach((panel, index) => {
      panel.setAttribute("x", index * 640);
      panel.setAttribute("y", 0);
      panel.setAttribute("width", 640);
      panel.setAttribute("height", height);
      panel.setAttribute("aria-hidden", "true");
      svg.appendChild(panel);
    });
    return svg;
  }

  function renderSchematic(spec, document, prefix, make) {
    const width = 640, height = spec.height || 420;
    const svg = make("svg", { class: "econ-graph econ-graph-schematic", viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: "xMidYMid meet", width, height, role: "img", "aria-labelledby": `${prefix}-title ${prefix}-desc`, "data-kind": "schematic" });
    make("title", { id: `${prefix}-title` }, svg).textContent = spec.title;
    make("desc", { id: `${prefix}-desc` }, svg).textContent = `${spec.description} Schematic layout; positions and connector lengths are illustrative, not measurements.${spec.review.status === "draft" ? " Draft; not teacher reviewed." : ` Reviewed by ${spec.review.reviewer}.`}`;
    make("rect", { class: "graph-paper", width, height }, svg);
    const defs = make("defs", {}, svg);
    const marker = make("marker", { id: `${prefix}-arrow`, viewBox: "0 0 10 10", refX: 10, refY: 5, markerWidth: 8, markerHeight: 8, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" }, defs);
    make("path", { class: "graph-arrowhead", d: "M0,0 L10,5 L0,10 Z" }, marker);
    const startMarker = make("marker", { id: `${prefix}-start`, viewBox: "0 0 10 10", refX: 0, refY: 5, markerWidth: 8, markerHeight: 8, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" }, defs);
    make("path", { class: "graph-arrowhead", d: "M10,0 L0,5 L10,10 Z" }, startMarker);
    const px = value => 48 + value / 100 * (width - 96);
    const py = value => 32 + value / 100 * (height - 64);
    const text = (value, x, y, cls, maxWidth = 180, maxLines = 2, attributes = {}) => {
      if (!value) return;
      const node = make("text", { class: cls, x, y, "text-anchor": "middle", ...attributes }, svg);
      const chunks = [];
      let rest = value;
      while (rest.length > 28 && chunks.length < maxLines - 1) {
        let split = rest.lastIndexOf(" ", 28);
        if (split < 14) split = 28;
        chunks.push(rest.slice(0, split)); rest = rest.slice(split).trimStart();
      }
      chunks.push(rest);
      chunks.forEach((chunk, index) => {
        const estimated = Array.from(chunk).reduce((sum, char) => sum + (/[WM@%\u0080-\uffff]/.test(char) ? 20 : /[ilI.,' ]/.test(char) ? 6 : /[A-Z]/.test(char) ? 13 : 10), 0);
        const fit = estimated > maxWidth ? { textLength: maxWidth, lengthAdjust: "spacingAndGlyphs" } : {};
        make("tspan", { x, dy: index ? 21 : 0, ...fit }, node).textContent = chunk;
      });
    };
    const toneClass = tone => tone ? ` graph-tone-${tone}` : "";
    const markerEnd = `url(#${prefix}-arrow)`, markerStart = `url(#${prefix}-start)`;
    for (const band of spec.bands || []) {
      make("rect", { class: `graph-band${toneClass(band.tone)}`, x: px(band.x), y: py(band.y), width: band.w / 100 * (width - 96), height: band.h / 100 * (height - 64) }, svg);
      if (band.label) text(band.label, px(band.x + band.w / 2), py(band.y + band.h / 2) + 7, "graph-band-label", 260, 2);
    }
    const polar = (cx, cy, r, angle) => {
      const rad = angle * Math.PI / 180;
      return [px(cx + r * Math.cos(rad)), py(cy - r * Math.sin(rad))];
    };
    for (const arc of spec.arcs || []) {
      const start = polar(arc.cx, arc.cy, arc.r, arc.start);
      const end = polar(arc.cx, arc.cy, arc.r, arc.end);
      const span = Math.abs(arc.end - arc.start);
      const large = span > 180 ? 1 : 0;
      const sweep = arc.end > arc.start ? 0 : 1;
      const d = `M ${start[0]} ${start[1]} A ${arc.r / 100 * (width - 96)} ${arc.r / 100 * (height - 64)} 0 ${large} ${sweep} ${end[0]} ${end[1]}`;
      make("path", { class: `graph-arc${toneClass(arc.tone)}`, d, "stroke-width": arc.width || 3, "marker-end": arc.arrow === "both" || arc.arrow === "end" ? markerEnd : undefined, "marker-start": arc.arrow === "both" ? markerStart : undefined }, svg);
    }
    const nodeMap = new Map((spec.nodes || []).map(node => [node.id, node]));
    for (const connector of spec.connectors || []) {
      const a = nodeMap.get(connector.from), b = nodeMap.get(connector.to);
      const x1 = px(a.x), y1 = py(a.y), x2 = px(b.x), y2 = py(b.y);
      make("line", { class: `graph-connector${toneClass(connector.tone)}`, x1, y1, x2, y2, "stroke-dasharray": connector.style === "dashed" ? "7 5" : undefined, "marker-end": connector.arrow === "none" ? undefined : markerEnd, "marker-start": connector.arrow === "both" ? markerStart : undefined }, svg);
      if (connector.label) text(connector.label, (x1 + x2) / 2, (y1 + y2) / 2 - 6, "graph-connector-label", 120, 2);
    }
    for (const item of spec.paths || []) {
      const points = item.points.map(point => `${px(point[0])},${py(point[1])}`).join(" ");
      make("polyline", { class: `graph-flow${toneClass(item.tone)}`, points, "stroke-dasharray": item.style === "dashed" ? "7 5" : undefined, "marker-end": item.arrow === "none" ? undefined : markerEnd, "marker-start": item.arrow === "both" ? markerStart : undefined }, svg);
      if (item.label) {
        const mid = item.points[Math.floor(item.points.length / 2)];
        text(item.label, px(mid[0]), py(mid[1]) - 8, "graph-flow-label", 140, 2);
      }
    }
    for (const node of spec.nodes || []) {
      const x = px(node.x), y = py(node.y);
      if (node.shape === "box" || node.shape === "rounded") {
        const w = (node.w || 22) / 100 * (width - 96), h = (node.h || 10) / 100 * (height - 64);
        const rx = node.shape === "rounded" ? Math.min(12, h / 3) : 0;
        make("rect", { class: `graph-node graph-node-${node.shape}${toneClass(node.tone)}`, x: x - w / 2, y: y - h / 2, width: w, height: h, rx }, svg);
      } else {
        make("circle", { class: `graph-node graph-node-circle${toneClass(node.tone)}`, cx: x, cy: y, r: Math.min((node.w || 14) / 100 * (width - 96) / 2, 42) }, svg);
      }
      if (node.label) {
        const position = node.labelPosition ? [px(node.labelPosition[0]), py(node.labelPosition[1])] : [x, y + 7];
        text(node.label, position[0], position[1], "graph-node-label", 170, 3);
      }
    }
    for (const label of spec.labels || []) text(label.text, px(label.x), py(label.y), "graph-annotation", 190, 3);
    return svg;
  }

  function renderTable(spec, document, prefix, make) {
    const columns = spec.columns, rows = spec.rows;
    const width = 640, labelWidth = 150, headerHeight = 64, rowHeight = 78, height = headerHeight + rows.length * rowHeight + 28;
    const cellWidth = (width - 80 - labelWidth) / (columns.length - 1);
    const svg = make("svg", { class: "econ-graph econ-graph-table", viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: "xMidYMid meet", width, height, role: "img", "aria-labelledby": `${prefix}-title ${prefix}-desc`, "data-kind": "table" });
    make("title", { id: `${prefix}-title` }, svg).textContent = spec.title;
    make("desc", { id: `${prefix}-desc` }, svg).textContent = `${spec.description} Table layout; cells are transcribed source content, not inferred values.${spec.review.status === "draft" ? " Draft; not teacher reviewed." : ` Reviewed by ${spec.review.reviewer}.`}`;
    make("rect", { class: "graph-paper", width, height }, svg);
    const text = (value, x, y, cls, maxWidth, maxLines = 2) => {
      if (!value) return;
      const node = make("text", { class: cls, x, y, "text-anchor": "middle" }, svg);
      const chunks = []; let rest = value;
      while (rest.length > 24 && chunks.length < maxLines - 1) {
        let split = rest.lastIndexOf(" ", 24); if (split < 12) split = 24;
        chunks.push(rest.slice(0, split)); rest = rest.slice(split).trimStart();
      }
      chunks.push(rest);
      chunks.forEach((chunk, index) => {
        const estimated = Array.from(chunk).reduce((sum, char) => sum + (/[WM@%\u0080-\uffff]/.test(char) ? 20 : /[ilI.,' ]/.test(char) ? 6 : /[A-Z]/.test(char) ? 13 : 10), 0);
        const fit = estimated > maxWidth ? { textLength: maxWidth, lengthAdjust: "spacingAndGlyphs" } : {};
        make("tspan", { x, dy: index ? 20 : 0, ...fit }, node).textContent = chunk;
      });
    };
    for (let row = 0; row < rows.length + 1; row++) {
      const y = 20 + row * (row === 0 ? headerHeight : rowHeight);
      const h = row === 0 ? headerHeight : rowHeight;
      make("rect", { class: row === 0 ? "graph-table-header" : "graph-table-row", x: 40, y, width: width - 80, height: h }, svg);
      if (row === 0) {
        text(columns[0], 40 + labelWidth / 2, y + h / 2 + 6, "graph-table-heading", labelWidth - 12, 2);
        for (let col = 1; col < columns.length; col++) text(columns[col], 40 + labelWidth + cellWidth * (col - 1) + cellWidth / 2, y + h / 2 + 6, "graph-table-heading", cellWidth - 12, 2);
      } else {
        const item = rows[row - 1];
        text(item.label, 40 + labelWidth / 2, y + h / 2 + 6, "graph-table-row-label", labelWidth - 12, 2);
        item.cells.forEach((cell, col) => text(cell, 40 + labelWidth + cellWidth * col + cellWidth / 2, y + h / 2 + 6, "graph-table-cell", cellWidth - 12, 2));
      }
    }
    return svg;
  }

  function render(spec, document) {
    const result = validate(spec);
    if (!result.valid) throw new TypeError(`Invalid graph spec: ${result.errors.join("; ")}`);
    if (!document || typeof document.createElementNS !== "function") throw new TypeError("render requires a DOM document");
    if (!d3 || d3.version !== "7.9.0" || typeof d3.scaleLinear !== "function") throw new Error("Load vendor/d3.min.js (D3 7.9.0) before graph.js");
    let serial = (documents.get(document) || 0) + 1;
    while (document.getElementById(`econ-graph-${serial}-title`)) serial++;
    documents.set(document, serial);
    const prefix = `econ-graph-${serial}`;
    const make = (name, attributes = {}, parent) => {
      const node = document.createElementNS(NS, name);
      for (const [key, value] of Object.entries(attributes)) if (value !== undefined) node.setAttribute(key, String(value));
      if (parent) parent.appendChild(node);
      return node;
    };
    if (spec.kind === "multipanel") return renderMultipanel(spec, document, prefix, make);
    if (spec.kind === "schematic") return renderSchematic(spec, document, prefix, make);
    if (spec.kind === "table") return renderTable(spec, document, prefix, make);
    const plotHeight = spec.axes.aspectRatio ? 416 / spec.axes.aspectRatio : 212;
    const bottom = 54 + plotHeight, height = bottom + 94;
    const svg = make("svg", { class: "econ-graph", viewBox: `0 0 640 ${height}`, preserveAspectRatio: "xMidYMid meet", width: 640, height, role: "img", "aria-labelledby": `${prefix}-title ${prefix}-desc`, "data-coordinate-mode": spec.coordinateMode, "data-review-status": spec.review.status });
    make("title", { id: `${prefix}-title` }, svg).textContent = spec.title;
    make("desc", { id: `${prefix}-desc` }, svg).textContent = `${spec.description}${spec.coordinateMode === "schematic" ? " Schematic: positions are illustrative, not numerical values." : " Quantitative coordinates; only explicitly supplied labels are shown."}${spec.review.status === "draft" ? " Draft; not teacher reviewed." : ` Reviewed by ${spec.review.reviewer}.`}`;
    make("rect", { class: "graph-paper", width: 640, height }, svg);
    const defs = make("defs", {}, svg);
    const marker = make("marker", { id: `${prefix}-arrow`, viewBox: "0 0 10 10", refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" }, defs);
    make("path", { class: "graph-arrowhead", d: "M0,0 L10,5 L0,10 Z" }, marker);
    const movementMarker = make("marker", { id: `${prefix}-movement`, viewBox: "0 0 10 10", refX: 10, refY: 5, markerWidth: 11, markerHeight: 11, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" }, defs);
    make("path", { class: "graph-movement-arrowhead", d: "M0,0 L10,5 L0,10 Z" }, movementMarker);
    const x = d3.scaleLinear().domain([spec.axes.x.min, spec.axes.x.max]).range([112, 528]);
    const y = d3.scaleLinear().domain([spec.axes.y.min, spec.axes.y.max]).range([bottom, 54]);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const line = (a, b, cls, parent = svg, extra = {}) => make("line", { class: cls, x1: a[0], y1: a[1], x2: b[0], y2: b[1], ...extra }, parent);
    const text = (value, px, py, cls, width = 20, attributes = {}, maxWidth = 180, maxLines = Infinity) => {
      const node = make("text", { class: cls, x: px, y: py, "text-anchor": "middle", ...attributes }, svg);
      const chunks = [];
      let rest = value;
      while (rest.length > width && chunks.length < maxLines - 1) {
        let split = rest.lastIndexOf(" ", width);
        if (split < width / 2) split = width;
        chunks.push(rest.slice(0, split)); rest = rest.slice(split).trimStart();
      }
      chunks.push(rest);
      chunks.forEach((chunk, i) => {
        // A conservative glyph bound keeps long words inside the reserved margin.
        const estimatedWidth = Array.from(chunk).reduce((sum, char) => sum + (/[WM@%\u0080-\uffff]/.test(char) ? 20 : /[ilI.,' ]/.test(char) ? 6 : /[A-Z]/.test(char) ? 13 : 10), 0);
        const fit = estimatedWidth > maxWidth ? { textLength: maxWidth, lengthAdjust: "spacingAndGlyphs" } : {};
        make("tspan", { x: px, dy: i ? 19 : 0, ...fit }, node).textContent = chunk;
      });
      return node;
    };
    for (const area of spec.areas) make("polygon", { class: `graph-area graph-area-${area.role}`, points: area.points.map(p => `${x(p[0])},${y(p[1])}`).join(" ") }, svg);
    line([112, bottom], [556, bottom], "graph-axis", svg, { "marker-end": `url(#${prefix}-arrow)` });
    line([112, bottom], [112, 30], "graph-axis", svg, { "marker-end": `url(#${prefix}-arrow)` });
    text(spec.axes.x.label, 332, bottom + 63, "graph-axis-label", 24, {}, 400);
    const middle = 46 + plotHeight / 2;
    text(spec.axes.y.label, 25, middle, "graph-axis-label", 24, { transform: `rotate(-90 25 ${middle})` }, 250);
    const points = new Map(spec.points.map(p => [p.id, p]));
    for (const guide of spec.guides) {
      const point = points.get(guide.point), px = x(point.x), py = y(point.y);
      for (const axis of guide.axes) {
        line([px, py], axis === "x" ? [px, bottom] : [112, py], "graph-guide");
        const label = axis === "x" ? point.xLabel : point.yLabel;
        if (label) text(label, axis === "x" ? px : 102, axis === "x" ? bottom + 25 : py + 5, "graph-guide-label", 12, { "text-anchor": axis === "x" ? "middle" : "end" }, axis === "x" ? 120 : 70);
      }
    }
    for (const item of spec.guidePaths || []) {
      make("polyline", { class: "graph-guide graph-guide-path", points: item.points.map(p => `${x(p[0])},${y(p[1])}`).join(" ") }, svg);
      if (item.label) {
        const mid = item.points[Math.floor(item.points.length / 2)];
        text(item.label, x(mid[0]), y(mid[1]) - 6, "graph-guide-label", 12, {}, 120);
      }
    }
    for (const curve of spec.curves) {
      make("polyline", { class: `graph-curve graph-curve-${curve.role}${curve.tone ? ` graph-tone-${curve.tone}` : ""}`, points: curve.points.map(p => `${x(p[0])},${y(p[1])}`).join(" ") }, svg);
      const end = curve.points[curve.points.length - 1];
      const position = curve.labelPosition ? [x(curve.labelPosition[0]), y(curve.labelPosition[1])] : [clamp(x(end[0]) + 28, 154, 562), clamp(y(end[1]) - 14, 43, bottom - 35)];
      text(curve.label, position[0], position[1], "graph-curve-label", 12, {}, 130);
    }
    for (const arrow of spec.arrows) {
      if (arrow.start) {
        line([x(arrow.start[0]), y(arrow.start[1])], [x(arrow.end[0]), y(arrow.end[1])], "graph-arrow", svg, { "marker-end": `url(#${prefix}-movement)`, ...(arrow.heads === "both" ? { "marker-start": `url(#${prefix}-movement)` } : {}) });
        continue;
      }
      const a = points.get(arrow.from), b = points.get(arrow.to);
      const [ox, oy] = arrow.offset || [0, 0];
      const ax = x(a.x + ox), ay = y(a.y + oy), bx = x(b.x + ox), by = y(b.y + oy);
      const length = Math.hypot(bx - ax, by - ay);
      const inset = Math.min(8, length / 4);
      const dx = (bx - ax) / length * inset, dy = (by - ay) / length * inset;
      line([ax + dx, ay + dy], [bx - dx, by - dy], "graph-arrow", svg, { "marker-end": `url(#${prefix}-movement)` });
    }
    for (const point of spec.points) {
      if (point.marker !== false) make("circle", { class: "graph-point", cx: x(point.x), cy: y(point.y), r: 4.5 }, svg);
      const position = point.labelPosition ? [x(point.labelPosition[0]), y(point.labelPosition[1])] : [clamp(x(point.x) + 18, 144, 558), clamp(y(point.y) - 12, 43, bottom - 16)];
      if (point.label) text(point.label, position[0], position[1], "graph-point-label", 16, {}, 150);
    }
    for (const label of spec.labels) text(label.text, x(label.x), y(label.y), "graph-annotation", 12, {}, 180, Math.max(1, Math.floor((height - 8 - y(label.y)) / 19) + 1));
    return svg;
  }

  return Object.freeze({ validate, render });
});
