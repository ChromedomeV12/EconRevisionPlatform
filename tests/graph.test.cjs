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
  ["reversed x", s => s.curves[0].points.reverse()],
  ["vertical demand", s => s.curves[0].points[1] = [1, 5]],
  ["unknown curve reference", s => s.points[0].curve = "missing"],
  ["point off polyline", s => s.points[0].y = 5.1],
  ["unknown guide point", s => s.guides[0].point = "missing"],
  ["invalid guide axis", s => s.guides[0].axes = ["z"]],
  ["duplicate guide", s => s.guides.push(s.guides[0])],
  ["unknown arrow point", s => s.arrows[0].from = "missing"],
  ["zero-length arrow", s => s.arrows[0].to = "a"],
  ["invalid welfare role", s => s.areas[0].role = "profit"],
  ["degenerate area", s => s.areas[0].points = [[1, 1], [2, 2], [3, 3]]],
  ["repeated closing vertex", s => s.areas[0].points.push(s.areas[0].points[0])],
  ["long text", s => s.labels[0].text = "x".repeat(81)],
  ["long guide symbol", s => s.points[0].xLabel = "x".repeat(13)],
  ["long point label", s => s.points[0].label = "x".repeat(17)],
  ["non-string point label", s => s.points[0].label = null],
  ["point label controls", s => s.points[0].label = "A\nB"],
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
