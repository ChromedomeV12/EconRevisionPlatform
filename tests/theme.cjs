const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const { createServer } = require("../scripts/serve.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const out = path.join(__dirname, "../test-output/themes");
  fs.mkdirSync(out, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
    const context = await browser.newContext({ colorScheme: "light", viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    const toggle = page.getByRole("switch", { name: "Dark mode" });
    const appearance = () => page.locator(".refresh-point h2").first().evaluate(el => {
      const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, font: style.fontFamily, size: style.fontSize, spacing: style.letterSpacing };
    });
    const before = await appearance();
    const studyBefore = await page.evaluate(() => localStorage.getItem("econ-workspace-v2"));
    await toggle.focus();
    await page.keyboard.press("Space");
    assert.equal(await toggle.getAttribute("aria-checked"), "true");
    assert.equal(await toggle.locator("svg.lucide-sun").count(), 1);
    assert.deepEqual(await appearance(), before, "Color switching must preserve typesetting and geometry");
    assert.equal(await page.evaluate(() => localStorage.getItem("econ-workspace-v2")), studyBefore);
    assert.equal(await page.locator(".refresh-point h2").first().evaluate(el => getComputedStyle(el).color), "rgb(205, 214, 244)");
    await page.reload();
    assert.equal(await toggle.getAttribute("aria-checked"), "true", "Explicit choice survives reload");
    await page.emulateMedia({ colorScheme: "light" });
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    const other = await context.newPage();
    await other.goto(base);
    await other.getByRole("switch", { name: "Dark mode" }).click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === "light");
    await other.close();

    for (const theme of ["light", "dark"]) {
      if (await page.locator("html").getAttribute("data-theme") !== theme) await toggle.click();
      for (const width of [360, 390, 768, 1280, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        for (const view of ["feed", "progress", "units", "saved", "studio"]) {
          await page.goto(`${base}/#${view}`);
          await page.waitForFunction(view => document.querySelector(`[data-nav="${view}"]`).getAttribute("aria-current") === "page", view);
          assert.ok(await toggle.isVisible());
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${theme}/${view}: overflow at ${width}`);
          if (view === "feed") {
            assert.ok(await page.locator("canvas").first().evaluate(c => c.getContext("2d").getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0)));
          }
          if (width === 390 || width === 1280) await page.screenshot({ path: path.join(out, `${theme}-${view}-${width}.png`), fullPage: true });
        }
      }
    }
    await page.getByRole("button", { name: "Open study settings" }).click();
    assert.equal(await page.locator("dialog").evaluate(el => getComputedStyle(el).color), "rgb(205, 214, 244)");
    await page.screenshot({ path: path.join(out, "dark-settings.png") });
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await toggle.evaluate(el => getComputedStyle(el).transitionDuration), "0s");
    await page.evaluate(() => localStorage.removeItem("econ-theme-v1"));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    assert.equal(await toggle.getAttribute("aria-checked"), "true");
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForFunction(() => document.documentElement.dataset.theme === "light");
    assert.deepEqual(errors, []);
    await context.close();

    const blocked = await browser.newContext({ colorScheme: "dark" });
    await blocked.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error("Storage unavailable"); };
      Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); };
    });
    const fallback = await blocked.newPage();
    await fallback.goto(base);
    const fallbackToggle = fallback.getByRole("switch", { name: "Dark mode" });
    assert.equal(await fallbackToggle.getAttribute("aria-checked"), "true");
    await fallbackToggle.click();
    assert.equal(await fallbackToggle.getAttribute("aria-checked"), "false");
    await blocked.close();
    console.log("Theme checks passed: keyboard switch, persistence, cross-tab sync, OS preference, storage fallback, unchanged typography/state, diagrams and both themes across 5 widths and all views.");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
