const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { validate, render } = require("../graph.js");
const { fixture } = require("./graphs.cjs");

test("Pinned D3 7.9.0 distribution and upstream ISC license are intact", () => {
  assert.equal(require("../vendor/d3.min.js").version, "7.9.0");
  for (const [file, hash] of [
    ["vendor/d3.min.js", "f2094bbf6141b359722c4fe454eb6c4b0f0e42cc10cc7af921fc158fceb86539"],
    ["vendor/d3.LICENSE", "3e6849627f74ff73c257a3ae1efb574015d94fc1035c05ec3c15805165efcbc4"]
  ]) assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(__dirname, "..", file))).digest("hex"), hash);
});

test("Valid synthetic piecewise model, quantitative mode, optional symbols and empty collections", () => {
  const spec = fixture();
  assert.deepEqual(validate(spec), { valid: true, errors: [] });
  spec.coordinateMode = "quantitative";
  spec.review = { status: "reviewed", reviewer: "Synthetic reviewer" };
  delete spec.points[0].xLabel; delete spec.points[0].yLabel;
  assert.equal(validate(spec).valid, true);
  for (const key of ["curves", "points", "guides", "arrows", "areas", "labels"]) spec[key] = [];
  assert.equal(validate(spec).valid, true);
});

const invalidCases = [
  ["version", s => s.version = 2],
  ["unknown top-level property", s => s.style = "color:red"],
  ["unknown nested property", s => s.curves[0].html = "<script>"],
  ["required collection", s => delete s.points],
  ["unsafe id", s => s.id = "x\" onload=alert(1)"],
  ["reserved id", s => s.id = "constructor"],
  ["duplicate id across categories", s => s.areas[0].id = s.curves[0].id],
  ["inverted axis", s => s.axes.x.max = -1],
  ["tiny axis span", s => s.axes.x.max = 1e-9],
  ["unbounded axis", s => s.axes.x.max = 1e7],
  ["numeric strings", s => s.points[0].x = "5"],
  ["nonfinite", s => s.points[0].x = NaN],
  ["out of range", s => s.labels[0].x = 11],
  ["empty curve", s => s.curves[0].points = []],
  ["zero-length segment", s => s.curves[0].points[1] = [1, 9]],
  ["wrong demand slope", s => s.curves[0].points[1] = [5, 10]],
  ["wrong supply slope", s => s.curves[1].points[1] = [5, 0]],
  ["unknown curve shape", s => s.curves[0].shape = "smooth"],
  ["bent declared-linear curve", s => { s.curves[0].shape = "linear"; s.curves[0].points[1] = [5, 5.5]; }],
  ["reversed x", s => s.curves[0].points.reverse()],
  ["vertical demand", s => s.curves[0].points[1] = [1, 5]],
  ["unknown curve reference", s => s.points[0].curve = "missing"],
  ["point off polyline", s => s.points[0].y = 5.1],
  ["unknown guide point", s => s.guides[0].point = "missing"],
  ["invalid guide axis", s => s.guides[0].axes = ["z"]],
  ["duplicate guide", s => s.guides.push(s.guides[0])],
  ["unknown arrow point", s => s.arrows[0].from = "missing"],
  ["zero-length arrow", s => s.arrows[0].to = "a"],
  ["arrow offset wrong shape", s => s.arrows[0].offset = [1]],
  ["arrow offset wrong type", s => s.arrows[0].offset = null],
  ["arrow offset numeric string", s => s.arrows[0].offset = [0, "1"]],
  ["arrow offset nonfinite", s => s.arrows[0].offset = [0, Infinity]],
  ["arrow offset outside axis", s => s.arrows[0].offset = [0, 20]],
  ["invalid welfare role", s => s.areas[0].role = "profit"],
  ["degenerate area", s => s.areas[0].points = [[1, 1], [2, 2], [3, 3]]],
  ["repeated closing vertex", s => s.areas[0].points.push(s.areas[0].points[0])],
  ["long text", s => s.labels[0].text = "x".repeat(81)],
  ["long guide symbol", s => s.points[0].xLabel = "x".repeat(13)],
  ["long point label", s => s.points[0].label = "x".repeat(17)],
  ["non-string point label", s => s.points[0].label = null],
  ["point label controls", s => s.points[0].label = "A\nB"],
  ["point marker nonboolean", s => s.points[0].marker = "false"],
  ["curve label position out of bounds", s => s.curves[0].labelPosition = [11, 5]],
  ["point label position out of bounds", s => s.points[0].labelPosition = [5, -1]],
  ["curve label position wrong shape", s => s.curves[0].labelPosition = [5]],
  ["point label position wrong type", s => s.points[0].labelPosition = "5,5"],
  ["curve label position nonfinite", s => s.curves[0].labelPosition = [5, Infinity]],
  ["point label position numeric string", s => s.points[0].labelPosition = ["5", 5]],
  ["control characters", s => s.title = "bad\nlabel"],
  ["empty text", s => s.title = "  "],
  ["too many curves", s => s.curves = Array(17).fill(s.curves[0])],
  ["too many vertices", s => s.curves[0].points = Array(65).fill([1, 1])],
  ["review status", s => s.review.status = "approved"],
  ["missing reviewer", s => s.review.status = "reviewed"],
  ["executable function", s => s.title = () => "x"],
  ["custom prototype", s => s.labels[0] = new Date()],
  ["cycle", s => s.labels[0].text = s],
  ["sparse array", s => s.labels = Array(2)],
  ["array custom field", s => s.points.color = "red"]
];
for (const [name, mutate] of invalidCases) test(`Reject ${name}`, () => {
  const spec = fixture(); mutate(spec);
  const result = validate(spec);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0 && result.errors.length <= 100);
  assert.throws(() => render(spec, null), TypeError);
});

test("Accessors are rejected without invocation; primitive inputs never throw", () => {
  let called = false;
  const spec = fixture();
  Object.defineProperty(spec, "title", { enumerable: true, get() { called = true; throw new Error("executed"); } });
  assert.equal(validate(spec).valid, false); assert.equal(called, false);
  for (const value of [null, undefined, "{}", 1, true, [], Symbol("x")]) assert.equal(validate(value).valid, false);
});

test("Membership uses segment projection with normalized tolerance, including reference vertical segments", () => {
  const spec = fixture();
  spec.points[0].y += 0.000001;
  assert.equal(validate(spec).valid, true);
  spec.points[0].y += 0.001;
  assert.equal(validate(spec).valid, false);
  spec.curves = [{ id: "vertical", label: "R", role: "reference", points: [[5, 1], [5, 9]] }];
  spec.points = [{ id: "p", label: "P", curve: "vertical", x: 5, y: 4 }];
  spec.guides = []; spec.arrows = [];
  assert.equal(validate(spec).valid, true);
  spec.points[0].y = 10;
  assert.equal(validate(spec).valid, false);
});

test("Explicit linear shapes accept collinear vertices and reject a descending kink", () => {
  const spec = fixture();
  spec.curves[0].shape = "linear";
  assert.equal(validate(spec).valid, true);
  spec.points = []; spec.guides = []; spec.arrows = [];
  spec.curves[0].points = [[12, 91], [35, 63], [49, 44], [78, 14]];
  spec.axes.x.max = spec.axes.y.max = 100;
  assert.match(validate(spec).errors.join("; "), /linear curve vertices/);
  spec.curves[0].points = [[12, 91], [78, 14]];
  assert.equal(validate(spec).valid, true);
  spec.curves[0].shape = "piecewise";
  spec.curves[0].points = [[12, 91], [35, 63], [49, 44], [78, 14]];
  assert.equal(validate(spec).valid, true, "Nonlinear shapes must remain available when source-supported");
});

function fakeDocument() {
  return {
    getElementById() { return null; },
    createElementNS(namespace, tag) {
      return { namespace, tag, attributes: {}, children: [], textContent: "",
        setAttribute(key, value) { this.attributes[key] = value; },
        appendChild(child) { this.children.push(child); return child; }
      };
    }
  };
}
const flatten = node => [node, ...node.children.flatMap(flatten)];
test("Detached arrows preserve exact endpoints without curve anchors and reject unsafe margins", () => {
  const spec = fixture();
  spec.arrows = [{ start: [-1, 8], end: [-1, 6] }, { start: [3, -1.5], end: [7, -1.5] }];
  assert.equal(validate(spec).valid, true);
  const arrows = flatten(render(spec, fakeDocument())).filter(n => n.attributes.class === "graph-arrow");
  assert.equal(arrows.length, 2);
  assert.equal(Number(arrows[0].attributes.x1), 70.4);
  assert.ok(Math.abs(Number(arrows[1].attributes.y1) - 297.8) < 1e-9);
  for (const arrow of [
    { start: [-2, 8], end: [1, 6] }, { start: [1, 8], end: [1, 8] },
    { start: [1, 8], end: [2, 7], from: "a" }, { start: [1, 8] },
    { start: [1, 8], end: [2, Infinity] }, { start: [1, -3], end: [2, -3] }
  ]) { spec.arrows = [arrow]; assert.equal(validate(spec).valid, false); }
});
test("Source aspect ratios change plot height without clipping annotations or moving x geometry", () => {
  const spec = fixture();
  spec.axes.aspectRatio = 1;
  spec.arrows = [{ start: [3, -1.5], end: [7, -1.5] }];
  assert.equal(validate(spec).valid, true);
  const svg = render(spec, fakeDocument());
  assert.equal(svg.attributes.viewBox, "0 0 640 564");
  assert.equal(svg.attributes.height, "564");
  const arrow = flatten(svg).find(n => n.attributes.class === "graph-arrow");
  assert.ok(Number(arrow.attributes.y1) < 564);
  spec.axes.aspectRatio = 0.8;
  spec.arrows[0].start[1] = spec.arrows[0].end[1] = -2;
  assert.equal(validate(spec).valid, false, "Tall plots must reserve real SVG margin space");
  for (const ratio of [0, 0.79, 2.41, "1", null]) { spec.axes.aspectRatio = ratio; assert.equal(validate(spec).valid, false); }
});
test("Surplus roles are semantic and annotation coordinates are not silently clamped", () => {
  const spec = fixture();
  spec.areas[0].role = "consumer-surplus";
  spec.areas.push({ id: "producer", role: "producer-surplus", points: [[1, 1], [5, 5], [1, 5]] });
  spec.labels = [{ text: "Producer surplus", x: 3, y: 1 }];
  assert.equal(validate(spec).valid, true);
  const nodes = flatten(render(spec, fakeDocument()));
  assert.ok(nodes.some(n => n.attributes.class === "graph-area graph-area-consumer-surplus"));
  assert.ok(nodes.some(n => n.attributes.class === "graph-area graph-area-producer-surplus"));
  assert.equal(nodes.find(n => n.attributes.class === "graph-annotation").attributes.y, "244.8");
});
test("Arrow offsets translate only arrows, preserving direction, length and economic geometry", () => {
  const spec = fixture();
  const original = flatten(render(spec, fakeDocument()));
  spec.arrows[0].offset = [-0.2, 0.5];
  const before = JSON.stringify(spec);
  assert.equal(validate(spec).valid, true);
  const shifted = flatten(render(spec, fakeDocument()));
  const originalArrow = original.find(n => n.attributes.class === "graph-arrow");
  const shiftedArrow = shifted.find(n => n.attributes.class === "graph-arrow");
  for (const key of ["x1", "x2"]) assert.ok(Math.abs(Number(shiftedArrow.attributes[key]) - Number(originalArrow.attributes[key]) + 8.32) < 1e-9);
  for (const key of ["y1", "y2"]) assert.ok(Math.abs(Number(shiftedArrow.attributes[key]) - Number(originalArrow.attributes[key]) + 10.6) < 1e-9);
  for (const cls of ["graph-point", "graph-guide", "graph-curve graph-curve-demand"]) {
    assert.deepEqual(shifted.filter(n => n.attributes.class === cls).map(n => n.attributes), original.filter(n => n.attributes.class === cls).map(n => n.attributes));
  }
  assert.equal(JSON.stringify(spec), before);
  spec.arrows[0].offset = [0, 0];
  const zero = flatten(render(spec, fakeDocument())).find(n => n.attributes.class === "graph-arrow");
  assert.deepEqual(zero.attributes, originalArrow.attributes);
});
test("Explicit label positions use data coordinates, defaults remain available, and boundary positions are valid", () => {
  const spec = fixture();
  spec.curves[0].labelPosition = [0, 10];
  spec.points[0].labelPosition = [10, 0];
  assert.deepEqual(validate(spec), { valid: true, errors: [] });
  const nodes = flatten(render(spec, fakeDocument()));
  const curves = nodes.filter(node => node.attributes.class === "graph-curve-label");
  const points = nodes.filter(node => node.attributes.class === "graph-point-label");
  assert.equal(curves[0].attributes.x, "112"); assert.equal(curves[0].attributes.y, "54");
  assert.equal(points[0].attributes.x, "528"); assert.equal(points[0].attributes.y, "266");
  assert.ok(Math.abs(Number(curves[1].attributes.x) - 514.4) < 1e-9);
  assert.ok(Math.abs(Number(points[1].attributes.x) - 254.8) < 1e-9);
});
test("Empty point labels preserve dots and explicit axis symbols without invented letters", () => {
  const spec = fixture();
  spec.points.forEach(point => { point.label = ""; });
  assert.deepEqual(validate(spec), { valid: true, errors: [] });
  const nodes = flatten(render(spec, fakeDocument()));
  assert.equal(nodes.filter(node => node.attributes.class === "graph-point").length, 3);
  assert.equal(nodes.filter(node => node.attributes.class === "graph-point-label").length, 0);
  assert.equal(nodes.filter(node => node.attributes.class === "graph-guide-label").length, 6);
});
test("Invisible arrow anchors preserve guides and align the arrowhead tip to the shaft endpoint", () => {
  const spec = fixture();
  spec.points.filter(point => ["a", "b"].includes(point.id)).forEach(point => { point.marker = false; point.label = ""; });
  assert.equal(validate(spec).valid, true);
  const nodes = flatten(render(spec, fakeDocument()));
  assert.equal(nodes.filter(n => n.attributes.class === "graph-point").length, 1);
  assert.equal(nodes.filter(n => n.attributes.class === "graph-guide").length, 6);
  assert.equal(nodes.filter(n => n.attributes.class === "graph-arrow").length, 1);
  const marker = nodes.find(n => n.tag === "marker");
  assert.equal(marker.attributes.refX, "10");
  assert.equal(marker.attributes.refY, "5");
  assert.equal(marker.attributes.orient, "auto-start-reverse");
  assert.equal(nodes.find(n => n.attributes.class === "graph-arrowhead").attributes.d, "M0,0 L10,5 L0,10 Z");
  const movement = nodes.find(n => n.tag === "marker" && n.attributes.id.endsWith("-movement"));
  assert.equal(movement.attributes.markerWidth, "11");
  assert.equal(movement.attributes.markerHeight, "11");
  assert.equal(movement.attributes.refX, "10");
  assert.equal(movement.attributes.refY, "5");
  assert.equal(nodes.find(n => n.attributes.class === "graph-arrow").attributes["marker-end"], `url(#${movement.attributes.id})`);
});
test("Rendering returns isolated accessible SVG, literal text, stable geometry and unique IDs without mutating input", () => {
  const spec = fixture(); spec.labels[0].text = "<script>alert(1)</script>";
  const before = JSON.stringify(spec), document = fakeDocument();
  const svg = render(spec, document), second = render(spec, document);
  const nodes = flatten(svg);
  assert.equal(svg.tag, "svg"); assert.equal(svg.attributes.viewBox, "0 0 640 360");
  assert.equal(svg.attributes.role, "img");
  assert.notEqual(svg.attributes["aria-labelledby"], second.attributes["aria-labelledby"]);
  assert.match(nodes.find(n => n.tag === "desc").textContent, /Schematic:.*Draft;/);
  assert.equal(nodes.filter(n => n.tag === "polyline").length, 4);
  assert.ok(nodes.filter(n => n.tag === "tspan").map(n => n.textContent).join("").includes("<script>alert(1)</script>"));
  assert.ok(!nodes.some(n => ["script", "style", "foreignObject", "image"].includes(n.tag)));
  assert.ok(!nodes.some(n => Object.keys(n.attributes).some(key => /^on|href|style/.test(key))));
  assert.ok(nodes.every(n => !Object.values(n.attributes).some(value => /NaN|Infinity/.test(value))));
  assert.equal(JSON.stringify(spec), before);
  assert.throws(() => render(spec, null), /DOM document/);
});
