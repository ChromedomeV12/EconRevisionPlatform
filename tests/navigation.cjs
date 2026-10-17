const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const { createServer } = require("../scripts/serve.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
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

      // Hold the deferred app script and inspect the actual pre-app surface.
      const prepaint = await context.newPage();
      await prepaint.addInitScript(() => {
        localStorage.setItem("econ-menu-hidden-v1", "true");
      });
      let releaseApp;
      const appGate = new Promise(resolve => { releaseApp = resolve; });
      await prepaint.route("**/app.js", async route => { await appGate; await route.continue(); });
      await prepaint.setViewportSize({ width: 1440, height: 900 });
      await prepaint.goto(`${base}/#progress`, { waitUntil: "commit" });
      await prepaint.locator("#workspaceMenu").waitFor({ state: "attached" });
      await prepaint.evaluate(() => document.fonts.ready);
      assert.equal(await prepaint.locator("#workspaceMenu").isVisible(), false, "Saved collapse preference hides the sidebar before app initialization");
      releaseApp();
      await prepaint.waitForLoadState("domcontentloaded");
      assert.equal(await prepaint.locator('[data-action="menu-toggle"]').getAttribute("aria-expanded"), "false");
      assert.equal(await prepaint.locator("#workspaceMenu").isVisible(), false);
      await prepaint.reload();
      assert.equal(await prepaint.locator("#workspaceMenu").isVisible(), false, "Collapse preference persists across reloads");
      assert.equal(await prepaint.locator('[data-action="menu-toggle"]').getAttribute("aria-expanded"), "false");
      await prepaint.locator('[data-action="menu-toggle"]').click();
      assert.ok(await prepaint.locator("#workspaceMenu").isVisible(), "Hidden navigation stays recoverable");
      await prepaint.evaluate(() => localStorage.removeItem("econ-menu-hidden-v1"));
      await prepaint.close();

      for (const [width, height] of [[360, 740], [390, 844], [768, 900], [1024, 768], [1440, 900]]) {
        await page.setViewportSize({ width, height });
        const narrow = width <= 1023;
        await page.goto(`${base}/#progress`);
        await page.evaluate(() => document.fonts.ready);
        const menu = page.locator('[data-action="menu-toggle"]');
        if (narrow) {
          assert.equal(await menu.getAttribute("aria-expanded"), "false", "Narrow workspace menu starts collapsed into the drawer");
        } else {
          assert.equal(await menu.getAttribute("aria-expanded"), "true");
          assert.ok(await page.locator("#workspaceMenu").isVisible(), "Wide workspace menu is a persistent sidebar");
        }
        await page.goto(`${base}/#feed`);
        const swipe = await page.evaluate(() => document.documentElement.dataset.layout) === "swipe";
        const opener = swipe ? page.getByRole("button", { name: "Card actions", exact: true }) : page.locator('.refresh-actions [data-action="detail"]').first();
        const openDetail = async () => { await opener.click(); if (swipe) await page.getByRole("menuitem", { name: "Closer look", exact: true }).click(); };
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

      // Drawer lifecycle on a narrow viewport: containment, dismissal paths,
      // route handoff and settings handoff.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}/#progress`);
      const drawer = page.locator("#mobileMenu");
      const menu = page.locator('[data-action="menu-toggle"]');
      assert.equal(await drawer.evaluate(el => el.open), false, "Drawer starts closed");
      await menu.click();
      assert.equal(await drawer.evaluate(el => el.open), true);
      assert.ok(await drawer.evaluate(el => el.contains(document.activeElement)), "Focus is contained inside the open drawer");
      const backgroundScroll = await page.evaluate(() => scrollY);
      await page.mouse.move(380, 420);
      await page.mouse.wheel(0, 500);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(() => scrollY), backgroundScroll, "Scrolling the backdrop cannot move the underlying page");
      await drawer.getByRole("link", { name: "Refresh", exact: true }).click();
      assert.equal(await page.evaluate(() => location.hash), "#feed");
      assert.equal(await drawer.evaluate(el => el.open), false, "Choosing a route from the drawer closes it");
      await page.waitForFunction(() => document.querySelector("#main").contains(document.activeElement));
      assert.ok(await page.evaluate(() => document.querySelector("#main").contains(document.activeElement)), "Route focus lands in the main content");
      await page.goto(`${base}/#progress`);
      await menu.click();
      assert.equal(await drawer.evaluate(el => el.open), true);
      await drawer.locator('[data-action="settings"]').click();
      assert.equal(await drawer.evaluate(el => el.open), false, "Settings handoff dismisses the drawer");
      assert.equal(await page.locator("#modal").evaluate(el => el.open), true, "Only the settings dialog is active");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#modal").evaluate(el => el.open), false);
      await menu.click();
      await page.keyboard.press("Escape");
      assert.equal(await drawer.evaluate(el => el.open), false, "Escape closes the drawer");
      assert.ok(await menu.evaluate(el => el === document.activeElement), "Escape restores toggle focus");
      await menu.click();
      await page.mouse.click(390 - 16, 422);
      assert.equal(await drawer.evaluate(el => el.open), false, "Backdrop click closes the drawer");
      await menu.click();
      await page.locator('[data-action="menu-close"]').click();
      assert.equal(await drawer.evaluate(el => el.open), false, "Close button closes the drawer");

      // Feed-first routing: empty and unknown hashes fall back to the feed,
      // while the explicit welcome route is retained.
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${base}/`);
      assert.ok(await page.locator(".refresh-scroll").isVisible(), "Empty hash opens the usable feed");
      await page.goto(`${base}/#nonsense`);
      assert.ok(await page.locator(".refresh-scroll").isVisible(), "Unknown hash opens the usable feed");
      await page.goto(`${base}/#welcome`);
      assert.ok(await page.locator(".welcome-hero .hero-cta").isVisible(), "The introduction remains explicitly accessible");

      // Welcome must stay reachable through the shared drawer on wide
      // viewports, including 1024-1279 where the global nav is hidden.
      for (const width of [1024, 1100]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${base}/#welcome`);
        const wideMenu = page.locator('[data-action="menu-toggle"]');
        assert.ok(await wideMenu.isVisible(), `Menu toggle visible on welcome at ${width}px`);
        assert.equal(await wideMenu.getAttribute("aria-controls"), "mobileMenu", "Welcome uses the shared drawer on wide viewports");
        await wideMenu.click();
        assert.equal(await page.locator("#mobileMenu").evaluate(el => el.open), true);
        await page.locator('#mobileMenu a[href="#studio"]').click();
        await page.locator("#main form").waitFor({ state: "visible" });
        assert.ok(await page.locator("#main form").isVisible(), `Card studio is reachable from the introduction at ${width}px`);
        assert.equal(await page.locator("#mobileMenu").evaluate(el => el.open), false, "Choosing Studio closes the drawer");
      }

      // The skip link moves focus to main without touching the hash.
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${base}/#progress`);
      await page.locator(".skip-link").focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => location.hash), "#progress", "Skip link does not change the route");
      assert.ok(await page.evaluate(() => document.activeElement?.id === "main"), "Skip link focuses main content");

      // Desktop-layout feed at a narrow-theme width: feed keys must stay
      // inert while the drawer is open (no advance, no exposure).
      await page.setViewportSize({ width: 1000, height: 800 });
      const priorExposure = await page.evaluate(() => localStorage.getItem("econ-refresh-v1"));
      await page.goto(`${base}/#feed`);
      assert.ok(await page.locator(".refresh-actions").first().isVisible(), "This scenario uses the desktop feed controls");
      await page.waitForFunction(previous => localStorage.getItem("econ-refresh-v1") !== previous, priorExposure);
      const snapshot = () => page.evaluate(() => ({
        position: document.getElementById("refreshPosition")?.textContent,
        scroll: document.querySelector(".refresh-scroll")?.scrollTop,
        opened: localStorage.getItem("econ-refresh-v1"),
      }));
      const beforeKeys = await snapshot();
      await page.locator('[data-action="menu-toggle"]').click();
      await page.locator("#mobileMenu [data-nav='units']").focus();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("PageDown");
      assert.deepEqual(await snapshot(), beforeKeys, "Feed keys are inert while a modal dialog is open");
      await page.keyboard.press("Escape");

      // Viewport transitions: an open drawer closes when crossing to wide and
      // restores the saved desktop preference; the ephemeral narrow state is
      // never persisted or restored.
      await page.goto(`${base}/#progress`);
      await page.setViewportSize({ width: 900, height: 800 });
      await page.evaluate(() => localStorage.setItem("econ-menu-hidden-v1", "true"));
      await page.reload();
      assert.equal(await page.locator("#workspaceMenu").isVisible(), false, "Narrow navigation starts closed despite the saved desktop preference");
      await page.locator('[data-action="menu-toggle"]').click();
      assert.equal(await drawer.evaluate(el => el.open), true);
      await page.setViewportSize({ width: 1024, height: 800 });
      await page.waitForFunction(() => document.querySelector('[data-action="menu-toggle"]').getAttribute("aria-controls") === "workspaceMenu");
      assert.equal(await drawer.evaluate(el => el.open), false, "Crossing to wide closes the drawer");
      assert.equal(await menu.getAttribute("aria-expanded"), "false", "Wide navigation restores the saved collapse preference");
      assert.equal(await page.locator("#workspaceMenu").isVisible(), false);
      assert.equal(await menu.getAttribute("aria-controls"), "workspaceMenu");
      await page.setViewportSize({ width: 900, height: 800 });
      await page.waitForFunction(() => document.querySelector('[data-action="menu-toggle"]').getAttribute("aria-controls") === "mobileMenu");
      assert.equal(await drawer.evaluate(el => el.open), false, "Narrow does not restore the ephemeral drawer state");
      assert.equal(await page.locator("#workspaceMenu").isVisible(), false);
      assert.equal(await page.evaluate(() => localStorage.getItem("econ-menu-hidden-v1")), "true", "Drawer transitions do not overwrite the desktop preference");
      await page.evaluate(() => localStorage.removeItem("econ-menu-hidden-v1"));

      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log("Navigation/dialog checks passed: prepaint menu preference, persistent desktop collapse, drawer lifecycle (focus, Escape, close, backdrop, route/settings handoff), welcome drawer recovery on wide viewports, feed-first hash fallback, skip link, feed key isolation under modals, viewport transitions, fixed dialog headers and both themes across five sizes.");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
