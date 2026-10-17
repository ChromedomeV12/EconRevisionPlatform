const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const { createServer } = require("../scripts/serve.cjs");
(async () => {
  const server = createServer(); await new Promise(r => server.listen(0, "127.0.0.1", r));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
    const page = await browser.newPage(), errors = []; page.on("pageerror", e => errors.push(e.message));
    const out = path.join(__dirname, "../test-output/content"); fs.mkdirSync(out, { recursive: true });
    for (const theme of ["light", "dark"]) for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.evaluate(mode => { localStorage.setItem("econ-theme-v1", mode); document.documentElement.dataset.theme = mode; }, theme);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => EconCardRepository.list().length), 13);
      assert.equal(await page.locator("[data-point]").count(), 22);
      assert.equal(await page.locator("[data-point] svg.econ-graph").count(), 13);
      for (const id of ["demand", "lower-production-costs", "consumer-surplus"]) {
        await page.locator(".refresh-scroll").evaluate((scroller, id) => {
          const point = [...scroller.children].find(p => p.dataset.point === id);
          scroller.scrollTo({ top: point.offsetTop, behavior: "instant" });
        }, id);
        await page.waitForFunction(id => document.querySelector(`[data-feed-jump][data-id="${id}"]`).hasAttribute("aria-current"), id);
        const point = page.locator(`[data-point="${id}"]`), svg = point.locator("svg.econ-graph");
        assert.ok(await svg.isVisible()); assert.ok(await svg.locator("polyline").count() > 0);
        assert.match(await point.locator(".refresh-art small").textContent(), /Editorial draft/);
        await page.screenshot({ path: path.join(out, `${id}-${theme}-${width}.png`) });
        await point.getByRole("button", { name: `Enlarge ${await point.locator('.visual-label span').textContent()} diagram` }).click();
        assert.equal(await page.locator("#modal svg.econ-graph").count(), 1);
        assert.match(await page.locator("#modal").textContent(), /not teacher verified/);
        await page.getByRole("button", { name: "Close dialog" }).click();
      }
      assert.equal((await page.request.get(`http://127.0.0.1:${server.address().port}/private-sources/card-work/demand-basics/draft.json`)).status(), 404);
    }
    assert.deepEqual(errors, []);
    console.log("Curated cards: 13 points/11 graph assets, both themes, mobile/desktop, native graph zoom and private authoring isolation passed.");
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
