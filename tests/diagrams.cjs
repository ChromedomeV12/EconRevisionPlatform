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
    const out = path.join(__dirname, "../test-output/diagrams");
    fs.mkdirSync(out, { recursive: true });
    const url = `http://127.0.0.1:${server.address().port}/`;
    for (const theme of ["light", "dark"]) {
      for (const [width, height] of [[360, 740], [390, 844], [768, 900], [1024, 768], [1440, 900]]) {
        await page.setViewportSize({ width, height });
        await page.goto(url);
        if (await page.locator("html").getAttribute("data-theme") !== theme) await page.getByRole("switch", { name: "Dark mode" }).click();
        for (const id of ["demand", "price-elasticity"]) {
          const image = page.locator(`img[data-diagram="${id}"]`);
          await image.waitFor({ state: "visible" });
          const values = await image.evaluate(img => ({ loaded: img.complete && img.naturalWidth > 0, width: img.naturalWidth, height: img.naturalHeight, fit: getComputedStyle(img).objectFit, background: getComputedStyle(img).backgroundColor, box: img.getBoundingClientRect().toJSON(), alt: img.alt }));
          assert.ok(values.loaded);
          assert.equal(values.fit, "contain");
          assert.equal(values.background, "rgb(255, 255, 255)");
          assert.match(values.alt, /P1 to P2.*Q1 to Q2/);
          assert.ok(values.box.width <= width);
          const canvasHeight = await page.locator(`canvas[data-concept="${id}"]`).evaluate(canvas => parseFloat(getComputedStyle(canvas).height));
          assert.equal(values.box.height, canvasHeight, `${id}: image must follow responsive canvas height`);
          assert.equal(await page.locator(`canvas[data-concept="${id}"]`).isVisible(), false);
          await image.scrollIntoViewIfNeeded();
          const overflow = await page.locator(`[data-point="${id}"] .refresh-body`).evaluate(body => body.scrollHeight - body.clientHeight);
          assert.ok(overflow <= 1, `${id}: inner scroll at ${width}x${height}: ${overflow}`);
          const actionsBottom = await page.locator(`[data-point="${id}"] footer`).evaluate(footer => footer.getBoundingClientRect().bottom);
          assert.ok(actionsBottom <= height - (width <= 650 ? 67 : 0), `${id}: actions covered at ${width}x${height}`);
          await image.screenshot({ path: path.join(out, `${id}-${theme}-${width}.png`) });
          await page.locator(`[data-point="${id}"] button[title="Enlarge diagram"]`).click();
          const enlarged = page.locator("#modal img");
          assert.ok(await enlarged.evaluate(img => img.getBoundingClientRect().width <= img.parentElement.clientWidth));
          await page.getByRole("button", { name: "Show original size" }).click();
          assert.equal(await enlarged.evaluate(img => img.getBoundingClientRect().width), values.width);
          assert.equal(await enlarged.evaluate(img => img.getBoundingClientRect().height), values.height);
          await page.getByRole("button", { name: "Fit diagram to width" }).click();
          assert.ok(await enlarged.evaluate(img => img.getBoundingClientRect().width <= img.parentElement.clientWidth));
          await page.getByRole("button", { name: "Close dialog" }).click();
        }
      }
    }
    await page.route("**/assets/diagrams/*.png", route => route.abort());
    await page.goto(url);
    for (const id of ["demand", "price-elasticity"]) {
      const canvas = page.locator(`canvas[data-concept="${id}"]`);
      await canvas.waitFor({ state: "visible" });
      assert.ok(await canvas.evaluate(c => c.getContext("2d").getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0)));
      assert.match(await canvas.getAttribute("aria-label"), /P1 to P2/);
    }
    assert.deepEqual(errors, []);
    console.log("Textbook diagrams: load, contain fit, alt text, original-size zoom and canvas fallback; both themes at five widths.");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
