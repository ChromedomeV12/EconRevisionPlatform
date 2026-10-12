const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Synthetic coordinates only; not a reconstruction of any private source.
function fixture() {
  return {
    version: 1, id: "synthetic-market", title: "Synthetic market diagram",
    description: "A decreasing demand line and increasing supply line cross at E. A and B mark a movement along demand.",
    coordinateMode: "schematic",
    axes: { x: { label: "Quantity", min: 0, max: 10 }, y: { label: "Price", min: 0, max: 10 } },
    curves: [
      { id: "demand", label: "D", role: "demand", points: [[1, 9], [5, 5], [9, 1]] },
      { id: "supply", label: "S", role: "supply", points: [[1, 1], [5, 5], [9, 9]] },
      { id: "cost", label: "MC", role: "cost", points: [[2, 2], [4, 1.5], [7, 7]], labelPosition: [7, 7.8] },
      { id: "reference", label: "Reference", role: "reference", points: [[1, 7], [9, 7]], labelPosition: [8.6, 6.3] }
    ],
    points: [
      { id: "equilibrium", label: "E", curve: "demand", x: 5, y: 5, xLabel: "Qe", yLabel: "Pe" },
      { id: "a", label: "A", curve: "demand", x: 3, y: 7, xLabel: "Q1", yLabel: "P1" },
      { id: "b", label: "B", curve: "demand", x: 7, y: 3, xLabel: "Q2", yLabel: "P2" }
    ],
    guides: [{ point: "equilibrium", axes: ["x", "y"] }, { point: "a", axes: ["x", "y"] }, { point: "b", axes: ["x", "y"] }],
    arrows: [{ from: "a", to: "b" }],
    areas: [{ id: "surplus", role: "welfare", points: [[1, 9], [5, 5], [1, 5]] }],
    labels: [{ text: "Welfare area", x: 2.1, y: 9.8 }],
    review: { status: "draft", reviewer: null }
  };
}

async function run() {
  const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  const out = path.join(__dirname, "../test-output/graphs");
  fs.mkdirSync(out, { recursive: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const theme of ["light", "dark"]) for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html data-theme="${theme}"><head></head><body style="margin:0;background:${theme === "dark" ? "#1e1e2e" : "#dce0e8"}"></body></html>`);
      await page.addStyleTag({ path: path.join(__dirname, "../graph.css") });
      await page.addScriptTag({ path: path.join(__dirname, "../vendor/d3.min.js") });
      await page.addScriptTag({ path: path.join(__dirname, "../graph.js") });
      await page.evaluate(spec => {
        const graph = EconGraphs.render(spec, document);
        document.body.append(graph, EconGraphs.render(spec, document));
      }, fixture());
      const result = await page.evaluate(async () => {
        const svg = document.querySelector("svg");
        const box = svg.getBoundingClientRect();
        const ids = [...document.querySelectorAll("[id]")].map(node => node.id);
        const text = [...svg.querySelectorAll("text")].map(node => node.textContent);
        const clipped = [...svg.querySelectorAll("text")].filter(node => {
          const r = node.getBoundingClientRect();
          return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1;
        }).map(node => node.textContent);
        const positioned = [...svg.querySelectorAll(".graph-curve-label, .graph-point-label, .graph-annotation")];
        const overlaps = [];
        positioned.forEach((node, i) => positioned.slice(i + 1).forEach(other => {
          const a = node.getBoundingClientRect(), b = other.getBoundingClientRect();
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps.push([node.textContent, other.textContent]);
        }));
        const styles = [...document.styleSheets].flatMap(sheet => [...sheet.cssRules].map(rule => rule.cssText)).join("\n");
        const copy = svg.cloneNode(true);
        const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
        style.textContent = styles;
        copy.prepend(style);
        copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        const image = new Image();
        const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }));
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 640; canvas.height = 360;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        URL.revokeObjectURL(url);
        const pixels = context.getImageData(0, 0, 640, 360).data;
        let ink = 0;
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] && pixels[i] + pixels[i + 1] + pixels[i + 2] < 550) ink++;
        const rgb = selector => getComputedStyle(svg.querySelector(selector)).getPropertyValue(selector === ".graph-paper" ? "fill" : "stroke");
        return { width: box.width, height: box.height, ids, text, clipped, overlaps, ink, paper: rgb(".graph-paper"), demand: rgb(".graph-curve-demand"), desc: svg.querySelector("desc").textContent,
          curves: svg.querySelectorAll("polyline").length, guides: svg.querySelectorAll(".graph-guide").length,
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(result.paper, "rgb(239, 241, 245)");
      assert.equal(result.demand, theme === "light" ? "rgb(30, 102, 245)" : "rgb(40, 85, 160)");
      assert.equal(result.width, Math.min(width, 960));
      assert.ok(Math.abs(result.height / result.width - 360 / 640) < 0.01);
      assert.equal(result.ids.length, new Set(result.ids).size);
      assert.equal(result.overflow, false);
      assert.deepEqual(result.clipped, []);
      assert.deepEqual(result.overlaps, [], `Synthetic fixture label overlaps at ${theme}/${width}`);
      assert.ok(result.ink > 1500, `Nonblank diagram: ${result.ink} ink pixels`);
      assert.equal(result.curves, 4); assert.equal(result.guides, 6);
      assert.match(result.desc, /Schematic:.*Draft;/);
      assert.ok(result.text.includes("P1") && result.text.includes("Q2"));
      assert.ok(!result.text.some(value => /^\d+(\.\d+)?$/.test(value)), "No inferred numerical axis labels");
      await page.locator("svg").first().screenshot({ path: path.join(out, `${theme}-${width}.png`) });
      const contained = await page.locator("svg").first().evaluate(svg => {
        svg.style.height = "150px";
        const box = svg.getBoundingClientRect();
        const text = svg.querySelector(".graph-axis-label").getBoundingClientRect();
        return { height: box.height, fit: getComputedStyle(svg).objectFit, aspect: svg.getAttribute("preserveAspectRatio"), inside: text.left >= box.left && text.right <= box.right && text.top >= box.top && text.bottom <= box.bottom };
      });
      assert.equal(contained.height, 150);
      assert.equal(contained.fit, "contain");
      assert.equal(contained.aspect, "xMidYMid meet");
      assert.equal(contained.inside, true);
    }
    const edge = fixture();
    edge.axes.x.label = "W".repeat(48); edge.axes.y.label = "W".repeat(48);
    edge.curves[0].label = "W".repeat(24);
    edge.points[0].label = "W".repeat(16); edge.points[0].xLabel = "W".repeat(12); edge.points[0].yLabel = "W".repeat(12);
    edge.labels = [{ text: "W".repeat(80), x: 0, y: 0 }, { text: "W".repeat(80), x: 10, y: 10 }];
    await page.evaluate(spec => document.body.replaceChildren(EconGraphs.render(spec, document)), edge);
    assert.deepEqual(await page.evaluate(() => {
      const box = document.querySelector("svg").getBoundingClientRect();
      return [...document.querySelectorAll("svg text")].filter(node => {
        const r = node.getBoundingClientRect();
        return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1;
      }).map(node => node.textContent);
    }), []);
    const hostile = fixture(); hostile.labels[0].text = "<img src=x onerror=alert(1)>";
    await page.evaluate(spec => document.body.replaceChildren(EconGraphs.render(spec, document)), hostile);
    assert.equal(await page.locator("svg img, svg script, svg foreignObject").count(), 0);
    assert.match(await page.locator(".graph-annotation").textContent(), /<img/);
    const anonymous = fixture(); anonymous.points.forEach(point => { point.label = ""; });
    await page.evaluate(spec => document.body.replaceChildren(EconGraphs.render(spec, document)), anonymous);
    assert.equal(await page.locator(".graph-point").count(), 3);
    assert.equal(await page.locator(".graph-point-label").count(), 0);
    assert.equal(await page.locator(".graph-guide-label").count(), 6);
    assert.deepEqual(errors, []);
    console.log("Native graphs: both themes, 360/390/768/1440px, SVG IDs, geometry, label bounds, hostile text and nonblank raster checks passed.");
  } finally { await browser.close(); }
}

module.exports = { fixture };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
