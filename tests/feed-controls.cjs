const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const { createServer } = require("../scripts/serve.cjs");
(async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
    const out = path.join(__dirname, "../test-output/feed-controls"); fs.mkdirSync(out, { recursive: true });
    for (const theme of ["light", "dark"]) for (const width of [360, 390, 600, 768, 900]) {
      const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, reducedMotion: "reduce" });
      const page = await context.newPage(), errors = []; page.on("pageerror", error => errors.push(error.message));
      await page.goto(base); await page.evaluate(theme => { localStorage.setItem("econ-theme-v1", theme); document.documentElement.dataset.theme = theme; }, theme);
      await page.evaluate(() => document.fonts.ready);
      const multi = page.getByRole("button", { name: "Card actions", exact: true });
      assert.equal(await page.locator(".feed-rail button").count(), 3);
      for (const selector of [".topbar", ".sidebar", ".refresh-heading", ".refresh-queue"]) assert.equal(await page.locator(selector).isVisible(), false, "Swipe view has no workspace chrome");
      assert.equal(await page.getByRole("button", { name: "Previous point", exact: true }).isDisabled(), true);
      const initialLogs = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("econ-workspace-v2") || "{}").logs || []));
      await multi.click();
      assert.ok(await page.getByRole("menu", { name: "Card actions", exact: true }).isVisible());
      await page.screenshot({ path: path.join(out, `actions-${theme}-${width}.png`) });
      await page.getByRole("menuitemcheckbox", { name: "Bookmark card" }).click();
      await multi.click(); assert.equal(await page.getByRole("menuitemcheckbox", { name: "Bookmark card" }).getAttribute("aria-checked"), "true");
      await page.getByRole("menuitemcheckbox", { name: "Revisit manually" }).click();
      await multi.click(); assert.equal(await page.getByRole("menuitemcheckbox", { name: "Revisit manually" }).getAttribute("aria-checked"), "true");
      await page.keyboard.press("Escape"); assert.ok(await multi.evaluate(el => el === document.activeElement));
      await multi.click(); await multi.click(); assert.equal(await page.locator("#feedActionMenu").isVisible(), false);
      await multi.focus(); await page.keyboard.press("Enter"); await page.keyboard.press("End"); await page.keyboard.press("Enter");
      assert.ok(await page.getByRole("menu", { name: "Switch view" }).isVisible());
      await page.screenshot({ path: path.join(out, `dial-${theme}-${width}.png`) });
      for (const item of await page.locator(".feed-dial button").all()) {
        const b = await item.boundingBox(); assert.ok(b.x >= 0 && b.x + b.width <= width + 1 && b.y >= 0 && b.y + b.height <= (width < 600 ? 844 : 900), "Dial items fit the viewport");
        assert.ok(await item.evaluate(el => {
          const icon = el.querySelector("svg").getBoundingClientRect(), ring = el.parentElement.querySelector(".feed-dial-ring").getBoundingClientRect();
          return Math.hypot(icon.x + icon.width / 2 - (ring.x + ring.width / 2), icon.y + icon.height / 2 - (ring.y + ring.height / 2)) + icon.width / 2 < ring.width / 2 - 12;
        }), "Icons sit inside the dial face, not on its edge");
      }
      await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await page.waitForURL("**/#units");
      await page.goto(`${base}/#feed`);
      const b = await multi.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
      await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(430);
      assert.ok(await page.locator(".feed-dial").isVisible());
      await page.mouse.move(x, y - 92, { steps: 8 }); await page.mouse.up(); await page.waitForURL("**/#progress");
      await page.waitForFunction(() => !document.body.classList.contains("feed-mode"));
      assert.equal(await page.locator("#feedActionMenu").count(), 0, "Hold release cannot trigger a stray tap menu");
      await page.goto(`${base}/#feed`); await page.getByRole("button", { name: "Next point", exact: true }).click();
      await page.waitForFunction(() => document.querySelector(".set-progress").getAttribute("aria-valuenow") === "2");
      assert.equal(await page.getByRole("button", { name: "Previous point", exact: true }).isDisabled(), false);
      await multi.click(); assert.equal(await page.getByRole("menuitemcheckbox", { name: "Bookmark card" }).getAttribute("aria-checked"), "false", "Actions refer to the new active card");
      await page.keyboard.press("Escape");
      assert.equal(await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("econ-workspace-v2") || "{}").logs || [])), initialLogs);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []); await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "no-preference" });
    await context.addInitScript(() => {
      window.hapticRequests = [];
      Object.defineProperty(navigator, "vibrate", { configurable: true, value: duration => { window.hapticRequests.push(duration); return true; } });
    });
    const page = await context.newPage(); await page.goto(base);
    const cdp = await context.newCDPSession(page), b = await page.locator(".feed-multi").boundingBox();
    const point = { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 0 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] }); await page.waitForTimeout(430);
    assert.ok(await page.locator(".feed-dial").isVisible());
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    assert.equal(await page.locator(".feed-dial").isVisible(), false);
    assert.equal(new URL(page.url()).hash, "");
    assert.deepEqual(await page.evaluate(() => window.hapticRequests), [], "Opening/cancelling without selecting never vibrates");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] }); await page.waitForTimeout(430);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, y: point.y - 46 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, y: point.y - 49 }] });
    assert.deepEqual(await page.evaluate(() => window.hapticRequests), [8], "One small pulse per selected step, not per pointer event");
    await page.waitForTimeout(70);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, y: point.y - 92 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await page.waitForURL("**/#progress");
    assert.deepEqual(await page.evaluate(() => window.hapticRequests), [8, 8, 0]);
    await context.close();
    for (const mode of ["missing", "throws", "reduced"]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: mode === "reduced" ? "reduce" : "no-preference" });
      await context.addInitScript(mode => {
        window.hapticRequests = [];
        Object.defineProperty(navigator, "vibrate", { configurable: true, value: mode === "missing" ? undefined : duration => { window.hapticRequests.push(duration); if (mode === "throws") throw Error("Device declined"); return true; } });
      }, mode);
      const page = await context.newPage(); await page.goto(base);
      const cdp = await context.newCDPSession(page), b = await page.locator(".feed-multi").boundingBox();
      const point = { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 0 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] }); await page.waitForTimeout(430);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, y: point.y - 92 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await page.waitForURL("**/#progress");
      if (mode !== "throws") assert.deepEqual(await page.evaluate(() => window.hapticRequests), []);
      await context.close();
    }
    for (const height of [568, 667]) {
      const context = await browser.newContext({ viewport: { width: 360, height } });
      const page = await context.newPage(); await page.goto(base);
      const count = await page.locator("[data-point]").count();
      for (let index = 0; index < count; index++) {
        await page.locator(".refresh-scroll").evaluate((el, index) => el.scrollTo({ top: el.children[index].offsetTop, behavior: "instant" }), index);
        await page.waitForFunction(index => document.querySelector(".set-progress").getAttribute("aria-valuenow") === String(index + 1), index);
        const point = page.locator("[data-point]").nth(index);
        assert.ok(await point.locator("h2").evaluate(el => el.scrollWidth <= el.clientWidth + 1), "Long headings wrap inside the reading column");
        assert.ok(await point.locator(".refresh-body").evaluate(el => el.firstElementChild.getBoundingClientRect().top >= el.getBoundingClientRect().top - 1), "Short screens never clip the top of overflowing content");
      }
      await page.getByRole("button", { name: "Card actions", exact: true }).click();
      const menu = await page.locator("#feedActionMenu").boundingBox(); assert.ok(menu.y >= 0 && menu.y + menu.height <= height);
      await page.screenshot({ path: path.join(out, `short-${height}.png`) });
      await context.close();
    }
    console.log("Feed controls: three-button rail, actions, keyboard dial, hold/drag/release, touch cancellation, both themes/five widths and unchanged recall history passed.");
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
