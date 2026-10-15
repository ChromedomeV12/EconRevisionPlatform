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
    const out = path.join(__dirname, "../test-output/navigation");
    fs.mkdirSync(out, { recursive: true });
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ colorScheme: theme });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      for (const [width, height] of [[360, 740], [390, 844], [768, 900], [1024, 768], [1440, 900]]) {
        await page.setViewportSize({ width, height });
        await page.goto(`http://127.0.0.1:${server.address().port}/#progress`);
        await page.evaluate(() => document.fonts.ready);
        const menu = page.locator('[data-action="menu-toggle"]');
        assert.equal(await menu.getAttribute("aria-expanded"), "true");
        await menu.click();
        assert.equal(await menu.getAttribute("aria-expanded"), "false");
        assert.equal(await page.locator("#workspaceMenu").isVisible(), false);
        await page.reload();
        assert.equal(await menu.getAttribute("aria-expanded"), "false");
        assert.equal(await page.locator("#workspaceMenu").isVisible(), false);
        assert.ok(await menu.isVisible(), "Hidden navigation must remain recoverable");
        await menu.click();
        assert.ok(await page.locator("#workspaceMenu").isVisible());
        await page.getByRole("link", { name: "Refresh", exact: true }).click();
        const opener = page.getByRole('button', {name:'Card actions', exact:true});
        const openDetail = async () => { await opener.click(); await page.getByRole('menuitem', {name:'Closer look', exact:true}).click(); };
        await openDetail();
        const header = page.locator("#modal > .modal-header");
        const title = page.locator("#modalTitle");
        assert.equal(await page.locator("#modal").getAttribute("aria-labelledby"), "modalTitle");
        assert.ok(await title.isVisible());
        const before = await header.boundingBox();
        await page.locator("#modalContent").evaluate(el => el.scrollTop = el.scrollHeight);
        assert.deepEqual(await header.boundingBox(), before, "Dialog header must not scroll with content");
        const close = page.getByRole("button", { name: "Close dialog" });
        assert.ok(await close.isVisible());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: path.join(out, `${theme}-${width}.png`) });
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#modal").isVisible(), false);
        assert.ok(await opener.evaluate(el => el === document.activeElement), "Escape restores opener focus");
        await openDetail();
        await close.click();
        assert.equal(await page.locator("#modal").isVisible(), false);
        await openDetail();
        await page.mouse.click(2, 2);
        assert.equal(await page.locator("#modal").isVisible(), false, "Backdrop closes dialog");
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log("Navigation/dialog checks passed: persistence, recovery, fixed headers, labels, Escape, close/backdrop, focus restoration and both themes across five sizes.");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
