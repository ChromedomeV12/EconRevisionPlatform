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
      // Click opens the menu; there is no hold gesture, dial or haptic feedback left.
      assert.equal(await page.locator(".feed-dial").count(), 0, "The view dial is gone");
      assert.equal(await page.getByRole("menu", { name: "Switch view" }).count(), 0, "Nothing routes through a dial");
      await multi.focus(); await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute("role").startsWith("menuitem")), true);
      await page.keyboard.press("ArrowDown");
      assert.ok(await page.evaluate(() => document.activeElement.closest("#feedActionMenu") !== null), "Arrow keys move inside the menu");
      await page.keyboard.press("Escape"); assert.ok(await multi.evaluate(el => el === document.activeElement));
      await page.screenshot({ path: path.join(out, `actions-open-${theme}-${width}.png`) });
      await page.getByRole("button", { name: "Next point", exact: true }).click();
      await page.waitForFunction(() => document.querySelector(".set-progress").getAttribute("aria-valuenow") === "2");
      assert.equal(await page.getByRole("button", { name: "Previous point", exact: true }).isDisabled(), false);
      await multi.click(); assert.equal(await page.getByRole("menuitemcheckbox", { name: "Bookmark card" }).getAttribute("aria-checked"), "false", "Actions refer to the new active card");
      await page.keyboard.press("Escape");
      assert.equal(await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("econ-workspace-v2") || "{}").logs || [])), initialLogs);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []); await context.close();
    }
    // Touch only has to support the click menu; no gesture, haptic or navigation side effects.
    const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "no-preference" });
    const touchPage = await touchContext.newPage(); await touchPage.goto(base);
    const touchCdp = await touchContext.newCDPSession(touchPage), tap = await touchPage.locator(".feed-multi").boundingBox();
    await touchCdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: tap.x + tap.width / 2, y: tap.y + tap.height / 2, id: 0 }] });
    await touchCdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.ok(await touchPage.getByRole("menu", { name: "Card actions", exact: true }).isVisible(), "A tap opens the action menu");
    await touchPage.keyboard.press("Escape");
    assert.equal(await touchPage.locator(".feed-dial").count(), 0);
    assert.equal(new URL(touchPage.url()).hash, "", "A tap never navigates");
    await touchContext.close();
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
    console.log("Feed controls: three-button rail, click menu, action toggles, menu keyboard handling, short screens, touch tap, both themes/five widths and unchanged recall history passed.");
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
