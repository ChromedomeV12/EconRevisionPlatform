const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const { createServer } = require("../scripts/serve.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      window.demandDrawing = { labels: [], dots: [], paths: [] };
      window.pedDrawing = { labels: [], dots: [], paths: [] };
      const proto = CanvasRenderingContext2D.prototype;
      let currentPath = [];
      for (const method of ["beginPath", "moveTo", "lineTo", "stroke", "arc", "fillText"]) {
        const original = proto[method];
        proto[method] = function (...args) {
          if (["demand", "price-elasticity"].includes(this.canvas.dataset.concept)) {
            const log = this.canvas.dataset.concept === "demand" ? window.demandDrawing : window.pedDrawing;
            if (method === "beginPath") currentPath = [];
            if (method === "moveTo" || method === "lineTo") currentPath.push(args.slice(0, 2));
            if (method === "stroke") log.paths.push(currentPath.slice());
            if (method === "arc") log.dots.push(args.slice(0, 2));
            if (method === "fillText") log.labels.push({ text: args[0], x: args[1], y: args[2], width: this.measureText(args[0]).width });
          }
          return original.apply(this, args);
        };
      }
    });
    const out = path.join(__dirname, "../test-output/diagrams");
    fs.mkdirSync(out, { recursive: true });
    for (const theme of ["light", "dark"]) {
      for (const width of [360, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`http://127.0.0.1:${server.address().port}/`);
        if (await page.locator("html").getAttribute("data-theme") !== theme) {
          await page.getByRole("switch", { name: "Dark mode" }).click();
        }
        await page.evaluate(() => document.fonts.ready);
        const graph = await page.evaluate(() => ({
          model: EconData.cards.find(card => card.id === "demand").diagram,
          drawing: window.demandDrawing,
        }));
        const { model, drawing } = graph;
        assert.ok(model.points[1].price < model.points[0].price);
        assert.ok(model.points[1].quantity > model.points[0].quantity);
        for (const point of model.points) {
          assert.equal(point.price, model.priceIntercept * (1 - point.quantity / model.quantityIntercept));
          const expected = [48 + point.quantity / model.quantityIntercept * 266, 126 - point.price / model.priceIntercept * 96];
          assert.ok(drawing.dots.some(dot => dot.every((value, i) => Math.abs(value - expected[i]) < 1e-9)), "Marker must lie on the demand curve");
          assert.ok(drawing.paths.some(points => JSON.stringify(points) === JSON.stringify([[48, expected[1]], expected, [expected[0], 126]])), "Price and quantity guides must meet at the marker");
        }
        assert.ok(drawing.paths.some(points => JSON.stringify(points) === JSON.stringify([[48, 30], [314, 126]])), "Curve must meet its stated intercepts");
        const [a, b] = model.points.map(point => [48 + point.quantity / model.quantityIntercept * 266, 126 - point.price / model.priceIntercept * 96]);
        const arrowPoints = [.3, .72].map(fraction => a.map((value, i) => value + fraction * (b[i] - value)));
        assert.ok(drawing.paths.some(points => JSON.stringify(points) === JSON.stringify(arrowPoints)), "Movement arrow must follow the price fall toward greater quantity on the same curve");
        for (const expected of [model.priceAxis, model.quantityAxis, model.assumption, "A", "B", "D", "20", "200"]) {
          assert.ok(drawing.labels.some(label => label.text === expected), `Missing diagram label: ${expected}`);
        }
        for (const label of drawing.labels) {
          assert.ok(label.x >= 0 && label.x + label.width <= 360 && label.y > 0 && label.y < 170, `Label outside canvas: ${label.text}`);
        }
        const canvas = page.locator('canvas[data-concept="demand"]');
        assert.match(await canvas.getAttribute("aria-label"), /60 cups per week at \$14 per cup.*120 cups per week at \$8 per cup/);
        await canvas.scrollIntoViewIfNeeded();
        await canvas.screenshot({ path: path.join(out, `demand-${theme}-${width}.png`) });
        const pedGraph = await page.evaluate(() => ({
          model: EconData.cards.find(card => card.id === "price-elasticity").diagram,
          drawing: window.pedDrawing,
        }));
        const pedModel = pedGraph.model, pedDrawing = pedGraph.drawing;
        const [initial, final] = pedModel.points;
        const percentQ = (final.quantity - initial.quantity) / initial.quantity * 100;
        const percentP = (final.price - initial.price) / initial.price * 100;
        assert.equal(percentQ, -20);
        assert.equal(percentP, 10);
        assert.equal(percentQ / percentP, -2, "PED must use initial values, not midpoint values or slope");
        const pedPosition = point => [48 + point.quantity / 160 * 266, 110 - (point.price - 8) / 4 * 80];
        for (const point of pedModel.points) {
          assert.equal(point.price, 15 - point.quantity / 20);
          assert.ok(Math.abs(point.price - pedModel.priceIntercept * (1 - point.quantity / pedModel.quantityIntercept)) < 1e-9);
          const expected = pedPosition(point);
          assert.ok(pedDrawing.dots.some(dot => dot.every((value, i) => Math.abs(value - expected[i]) < 1e-9)), "PED marker must lie at its numeric coordinates");
          assert.ok(pedDrawing.paths.some(points => JSON.stringify(points) === JSON.stringify([[48, expected[1]], expected, [expected[0], 110]])), "PED guides must meet their marker");
        }
        const curveEnds = [{ quantity: 60, price: 12 }, { quantity: 140, price: 8 }].map(pedPosition);
        assert.ok(pedDrawing.paths.some(points => points.length === 2 && points.every((point, i) => point.every((value, j) => Math.abs(value - curveEnds[i][j]) < 1e-9))), "PED curve must match the clipped model, not suggest a zero price origin");
        for (const expected of [pedModel.priceAxis, pedModel.quantityAxis, pedModel.assumption, "A", "B", "10", "11", "80", "100", "Price axis starts at $8; P = 15 - Q/20", "Initial-base PED: (-20%)/(+10%) = -2"]) {
          assert.ok(pedDrawing.labels.some(label => label.text === expected), `Missing PED label: ${expected}`);
        }
        for (const label of pedDrawing.labels) {
          assert.ok(label.x >= 0 && label.x + label.width <= 360 && label.y > 0 && label.y < 170, `PED label outside canvas: ${label.text}`);
        }
        const pedCanvas = page.locator('canvas[data-concept="price-elasticity"]');
        assert.match(await pedCanvas.getAttribute("aria-label"), /100 tickets per week at \$10.*80 tickets per week at \$11.*Initial-base PED.*-20% \/ \+10% = -2.*Price axis starts at \$8/);
        await pedCanvas.scrollIntoViewIfNeeded();
        await pedCanvas.screenshot({ path: path.join(out, `ped-${theme}-${width}.png`) });
      }
    }
    assert.deepEqual(errors, []);
    console.log("Demand and PED diagrams: consistent curves, numeric points, guides, initial-base arithmetic and accessible labels; both themes at 360/390/1440.");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
