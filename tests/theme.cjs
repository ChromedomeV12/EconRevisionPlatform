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
    const color = (selector, property = "color") => page.locator(selector).first().evaluate((el, property) => getComputedStyle(el)[property], property);
    const checkLatte = async view => {
      assert.equal(await page.locator('meta[name="theme-color"]').getAttribute("content"), "#eff1f5");
      assert.equal(await color("body", "backgroundColor"), "rgb(220, 224, 232)", `${view}: Latte Crust backdrop`);
      assert.equal(await color(".shell", "backgroundColor"), "rgba(239, 241, 245, 0.93)", `${view}: Latte Base workspace`);
      assert.equal(await color(".shell", "backgroundImage"), "none", `${view}: no legacy dark feed gradient`);
      assert.equal(await color(".breadcrumb strong"), "rgb(76, 79, 105)");
      assert.equal(await color(".sample-label"), "rgb(92, 95, 119)");
      assert.equal(await color(".topbar", "backgroundColor"), "rgba(230, 233, 239, 0.5)");
      if (view === "feed") {
        assert.equal(await color(".refresh-point h2"), "rgb(76, 79, 105)");
        assert.equal(await color(".refresh-summary"), "rgb(92, 95, 119)");
        assert.equal(await color(".refresh-art", "backgroundColor"), "rgb(239, 241, 245)");
        assert.equal(await color('.refresh-filters button[aria-pressed="true"]', "backgroundColor"), "rgb(136, 57, 239)");
      }
      const failures = await page.evaluate(() => {
        const rgb = value => value.match(/[\d.]+/g).map(Number);
        const over = (front, back) => {
          const alpha = front[3] ?? 1;
          return front.slice(0, 3).map((v, i) => v * alpha + back[i] * (1 - alpha));
        };
        const luminance = channels => channels.map(v => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        const selectors = '.breadcrumb, .sample-label, .refresh-meta, .refresh-meta > span:last-child, .refresh-summary, .refresh-takeaway, .refresh-art small, .visual-label, .refresh-controls, .queue-number, .queue-list small, .refresh-filters button, .stat-foot, .topic-info p, .topic-meta, .library-body p, .badge, .filter, .studio-tabs button, .note';
        return [...document.querySelectorAll(selectors)].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden").flatMap(el => {
          const ancestors = [];
          for (let parent = el; parent; parent = parent.parentElement) ancestors.unshift(parent);
          const background = ancestors.reduce((back, node) => over(rgb(getComputedStyle(node).backgroundColor), back), [255, 255, 255]);
          const foreground = over(rgb(getComputedStyle(el).color), background);
          const [a, b] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
          const ratio = (a + 0.05) / (b + 0.05);
          return ratio < 4.5 ? [{ selector: el.className, text: el.textContent.trim().slice(0, 50), ratio }] : [];
        });
      });
      assert.deepEqual(failures, [], `${view}: small Latte text must reach 4.5:1 on composited surfaces`);
    };
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
          if (theme === "light") await checkLatte(view);
          if (view === "feed") {
            const geometry = await page.evaluate(() => {
              const root = document.documentElement;
              const snapshot = () => [...document.querySelectorAll('.sidebar, .shell, .topbar, .refresh-heading, .refresh-point, .refresh-point h2, .refresh-summary, .refresh-art, .refresh-controls, .refresh-queue')].map(el => {
                const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
                return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, font: style.fontFamily, size: style.fontSize, spacing: style.letterSpacing, blur: style.backdropFilter, radius: style.borderRadius };
              });
              const original = root.dataset.theme;
              const before = snapshot();
              root.dataset.theme = original === "light" ? "dark" : "light";
              const after = snapshot();
              root.dataset.theme = original;
              return { before, after };
            });
            assert.deepEqual(geometry.after, geometry.before, `${theme}: theme switch preserves feed geometry, type and acrylic effects at ${width}`);
            const diagram = page.locator('img[data-diagram]:visible, canvas:visible').first();
            await diagram.waitFor({ state: "visible" });
            await page.waitForFunction(() => {
              const image = [...document.querySelectorAll('img[data-diagram]')].find(el => el.getClientRects().length && getComputedStyle(el).display !== "none");
              if (image) return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
              const canvas = [...document.querySelectorAll("canvas")].find(el => el.getClientRects().length && getComputedStyle(el).display !== "none");
              return canvas && canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data.some((v, i) => i % 4 === 3 && v > 0);
            });
          }
          if (width === 390 || width === 1280) await page.screenshot({ path: path.join(out, `${theme}-${view}-${width}.png`), fullPage: true });
        }
      }
    }
    await page.getByRole("button", { name: "Open study settings" }).click();
    assert.equal(await page.locator("dialog").evaluate(el => getComputedStyle(el).color), "rgb(205, 214, 244)");
    await page.screenshot({ path: path.join(out, "dark-settings.png") });
    await page.getByRole("button", { name: "Close dialog" }).click();
    await toggle.click();
    await page.goto(`${base}/#feed`);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator('.refresh-filters button[aria-pressed="false"]').first().hover();
    assert.equal(await color('.refresh-filters button[aria-pressed="false"]:hover'), "rgb(76, 79, 105)");
    await page.locator('.refresh-filters button[aria-pressed="true"]').hover();
    assert.equal(await color('.refresh-filters button[aria-pressed="true"]:hover'), "rgb(239, 241, 245)");
    const save = page.locator('.refresh-actions .icon-button').first();
    await save.click();
    assert.equal(await save.getAttribute("aria-pressed"), "true");
    assert.equal(await color('.refresh-actions .icon-button[aria-pressed="true"]'), "rgb(136, 57, 239)");
    await save.click();
    await page.keyboard.press("Tab");
    await toggle.focus();
    assert.equal(await color('.theme-toggle', "outlineColor"), "rgb(30, 102, 245)");
    await page.getByRole("button", { name: "Open study settings" }).click();
    assert.equal(await color("dialog"), "rgb(76, 79, 105)");
    assert.equal(await color("dialog", "backgroundColor"), "rgba(230, 233, 239, 0.92)");
    await page.getByRole("button", { name: "Close dialog" }).click();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    assert.equal(await color(".sidebar", "backgroundColor"), "rgb(230, 233, 239)");
    assert.equal(await color(".shell", "backgroundColor"), "rgb(239, 241, 245)");
    assert.equal(await color(".sidebar", "backdropFilter"), "none");
    assert.equal(await color(".shell", "backdropFilter"), "none");
    await cdp.send("Emulation.setEmulatedMedia", { features: [] });
    await cdp.detach();
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
    console.log("Theme checks passed: Latte surfaces and composited text contrast, hover/selected/focus/dialog states, reduced transparency, keyboard switch, persistence, cross-tab sync, OS preference, storage fallback, unchanged typography/state, diagrams and both themes across 5 widths and all views.");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
