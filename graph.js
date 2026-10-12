(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory(require("./vendor/d3.min.js"));
  else root.EconGraphs = factory(root.d3);
})(typeof globalThis !== "undefined" ? globalThis : this, function (d3) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const documents = new WeakMap();
  const ID = /^[A-Za-z][A-Za-z0-9_-]{0,47}$/;
  const TOP = ["version", "id", "title", "description", "coordinateMode", "axes", "curves", "points", "guides", "arrows", "areas", "labels", "review"];

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
      if (!object(spec, TOP, [], "spec")) return { valid: false, errors };
      if (spec.version !== 1) fail("version", "expected 1");
      id(spec.id, "id"); text(spec.title, 120, "title"); text(spec.description, 1000, "description");
      choice(spec.coordinateMode, ["schematic", "quantitative"], "coordinateMode");
      if (object(spec.axes, ["x", "y"], [], "axes")) for (const key of ["x", "y"]) {
        const axis = spec.axes[key];
        if (object(axis, ["label", "min", "max"], [], `axes.${key}`)) {
          text(axis.label, 48, `axes.${key}.label`);
          if (![axis.min, axis.max].every(n => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 1e6) || axis.max - axis.min < 1e-6) fail(`axes.${key}`, "expected finite bounds within +/-1000000 and span >= 0.000001");
        }
      }
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
        if (!object(curve, ["id", "label", "role", "points", "labelPosition"], ["labelPosition"], path)) return;
        id(curve.id, `${path}.id`); text(curve.label, 24, `${path}.label`);
        if (Object.hasOwn(curve, "labelPosition")) pair(curve.labelPosition, `${path}.labelPosition`);
        choice(curve.role, ["demand", "supply", "cost", "reference"], `${path}.role`);
        const before = errors.length;
        array(curve.points, 64, `${path}.points`, pair, 2);
        if (errors.length === before) curve.points.slice(1).forEach((end, i) => {
          const start = curve.points[i];
          if (end[0] === start[0] && end[1] === start[1]) fail(path, "zero-length curve segment");
          if (["demand", "supply"].includes(curve.role) && (end[0] <= start[0] || (curve.role === "demand" ? end[1] >= start[1] : end[1] <= start[1]))) fail(path, "demand/supply requires increasing x and strictly decreasing/increasing y");
        });
        curves.set(curve.id, curve);
      });
      array(spec.points, 32, "points", (point, path) => {
        if (!object(point, ["id", "label", "curve", "x", "y", "xLabel", "yLabel", "labelPosition"], ["xLabel", "yLabel", "labelPosition"], path)) return;
        id(point.id, `${path}.id`); text(point.label, 16, `${path}.label`, true);
        if (Object.hasOwn(point, "labelPosition")) pair(point.labelPosition, `${path}.labelPosition`);
        for (const key of ["xLabel", "yLabel"]) if (Object.hasOwn(point, key)) text(point[key], 12, `${path}.${key}`);
        coordinate(point.x, spec.axes.x, `${path}.x`); coordinate(point.y, spec.axes.y, `${path}.y`);
        if (typeof point.curve !== "string" || !curves.has(point.curve)) fail(`${path}.curve`, "unknown curve");
        points.set(point.id, point);
      });
      // Membership is checked only after vertex shapes and coordinates are valid.
      if (!errors.length) for (const point of spec.points) if (!onPolyline([point.x, point.y], curves.get(point.curve).points, spec.axes)) fail(`points.${point.id}`, "point not on specified polyline (normalized tolerance 0.000001)");
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
      array(spec.arrows, 32, "arrows", (arrow, path) => {
        if (!object(arrow, ["from", "to"], [], path)) return;
        if (!points.has(arrow.from) || !points.has(arrow.to)) fail(path, "unknown arrow point");
        else {
          const a = points.get(arrow.from), b = points.get(arrow.to);
          if (a.x === b.x && a.y === b.y) fail(path, "zero-length arrow");
        }
      });
      array(spec.areas, 16, "areas", (area, path) => {
        if (!object(area, ["id", "role", "points"], [], path)) return;
        id(area.id, `${path}.id`); choice(area.role, ["welfare"], `${path}.role`);
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
      if (object(spec.review, ["status", "reviewer"], [], "review")) {
        choice(spec.review.status, ["draft", "reviewed"], "review.status");
        if (spec.review.reviewer !== null) text(spec.review.reviewer, 120, "review.reviewer");
        if (spec.review.status === "reviewed" && spec.review.reviewer === null) fail("review.reviewer", "reviewed graphs require a reviewer");
      }
      return { valid: !errors.length, errors };
    } catch (_) {
      return { valid: false, errors: ["spec: unreadable JSON input"] };
    }
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
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
      if (parent) parent.appendChild(node);
      return node;
    };
    const svg = make("svg", { class: "econ-graph", viewBox: "0 0 640 360", preserveAspectRatio: "xMidYMid meet", width: 640, height: 360, role: "img", "aria-labelledby": `${prefix}-title ${prefix}-desc`, "data-coordinate-mode": spec.coordinateMode, "data-review-status": spec.review.status });
    make("title", { id: `${prefix}-title` }, svg).textContent = spec.title;
    make("desc", { id: `${prefix}-desc` }, svg).textContent = `${spec.description}${spec.coordinateMode === "schematic" ? " Schematic: positions are illustrative, not numerical values." : " Quantitative coordinates; only explicitly supplied labels are shown."}${spec.review.status === "draft" ? " Draft; not teacher reviewed." : ` Reviewed by ${spec.review.reviewer}.`}`;
    make("rect", { class: "graph-paper", width: 640, height: 360 }, svg);
    const defs = make("defs", {}, svg);
    const marker = make("marker", { id: `${prefix}-arrow`, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" }, defs);
    make("path", { class: "graph-arrowhead", d: "M0,0 L10,5 L0,10 Z" }, marker);
    const x = d3.scaleLinear().domain([spec.axes.x.min, spec.axes.x.max]).range([112, 528]);
    const y = d3.scaleLinear().domain([spec.axes.y.min, spec.axes.y.max]).range([266, 54]);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const line = (a, b, cls, parent = svg, extra = {}) => make("line", { class: cls, x1: a[0], y1: a[1], x2: b[0], y2: b[1], ...extra }, parent);
    const text = (value, px, py, cls, width = 20, attributes = {}, maxWidth = 180) => {
      const node = make("text", { class: cls, x: px, y: py, "text-anchor": "middle", ...attributes }, svg);
      const chunks = [];
      let rest = value;
      while (rest.length > width) {
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
    for (const area of spec.areas) make("polygon", { class: "graph-area graph-area-welfare", points: area.points.map(p => `${x(p[0])},${y(p[1])}`).join(" ") }, svg);
    line([112, 266], [556, 266], "graph-axis", svg, { "marker-end": `url(#${prefix}-arrow)` });
    line([112, 266], [112, 30], "graph-axis", svg, { "marker-end": `url(#${prefix}-arrow)` });
    text(spec.axes.x.label, 332, 329, "graph-axis-label", 24, {}, 400);
    text(spec.axes.y.label, 25, 152, "graph-axis-label", 24, { transform: "rotate(-90 25 152)" }, 250);
    const points = new Map(spec.points.map(p => [p.id, p]));
    for (const guide of spec.guides) {
      const point = points.get(guide.point), px = x(point.x), py = y(point.y);
      for (const axis of guide.axes) {
        line([px, py], axis === "x" ? [px, 266] : [112, py], "graph-guide");
        const label = axis === "x" ? point.xLabel : point.yLabel;
        if (label) text(label, axis === "x" ? px : 102, axis === "x" ? 291 : py + 5, "graph-guide-label", 12, { "text-anchor": axis === "x" ? "middle" : "end" }, axis === "x" ? 120 : 70);
      }
    }
    for (const curve of spec.curves) {
      make("polyline", { class: `graph-curve graph-curve-${curve.role}`, points: curve.points.map(p => `${x(p[0])},${y(p[1])}`).join(" ") }, svg);
      const end = curve.points[curve.points.length - 1];
      const position = curve.labelPosition ? [x(curve.labelPosition[0]), y(curve.labelPosition[1])] : [clamp(x(end[0]) + 28, 154, 562), clamp(y(end[1]) - 14, 43, 231)];
      text(curve.label, position[0], position[1], "graph-curve-label", 12, {}, 130);
    }
    for (const arrow of spec.arrows) {
      const a = points.get(arrow.from), b = points.get(arrow.to);
      const ax = x(a.x), ay = y(a.y), bx = x(b.x), by = y(b.y);
      const length = Math.hypot(bx - ax, by - ay);
      const inset = Math.min(8, length / 4);
      const dx = (bx - ax) / length * inset, dy = (by - ay) / length * inset;
      line([ax + dx, ay + dy], [bx - dx, by - dy], "graph-arrow", svg, { "marker-end": `url(#${prefix}-arrow)` });
    }
    for (const point of spec.points) {
      make("circle", { class: "graph-point", cx: x(point.x), cy: y(point.y), r: 4.5 }, svg);
      const position = point.labelPosition ? [x(point.labelPosition[0]), y(point.labelPosition[1])] : [clamp(x(point.x) + 18, 144, 558), clamp(y(point.y) - 12, 43, 250)];
      if (point.label) text(point.label, position[0], position[1], "graph-point-label", 16, {}, 150);
    }
    for (const label of spec.labels) text(label.text, clamp(x(label.x), 108, 532), clamp(y(label.y), 62, 202), "graph-annotation", 20);
    return svg;
  }

  return Object.freeze({ validate, render });
});
