const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createServer } = require('../scripts/serve.cjs');
let server, browser, base;
before(async () => {
  server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
});
after(async () => { await browser?.close(); await new Promise(resolve => server.close(resolve)); });
async function resize(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function openPage(theme) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(theme => localStorage.setItem('econ-theme-v1', theme), theme);
  const page = await context.newPage(); page.setDefaultTimeout(5000);
  await page.goto(base);
  return { context, page };
}
const commands = [['save', 'Bookmark card'], ['revisit', 'Revisit manually'], ['confusing', 'Flag as confusing']];
for (const theme of ['light', 'dark']) {
  test(`${theme}: phone preferences update desktop controls and desktop changes update the menu`, async () => {
    const { context, page } = await openPage(theme);
    try {
      await page.getByRole('button', { name: 'Next point', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.set-progress').getAttribute('aria-valuenow') === '2');
      const id = await page.locator('[data-feed-jump][aria-current]').getAttribute('data-id');
      const point = page.locator(`[data-point="${id}"]`);
      await point.evaluate(el => window.originalPoint = el);
      await resize(page, 390, 844);
      for (const [, label] of commands) {
        await page.getByRole('button', { name: 'Card actions', exact: true }).click();
        await page.getByRole('menuitemcheckbox', { name: label, exact: true }).click();
      }
      assert.ok(await page.evaluate(id => {
        const learning = JSON.parse(localStorage.getItem('econ-workspace-v2'));
        const browsing = JSON.parse(localStorage.getItem('econ-refresh-v1'));
        return learning.saved.includes(id) && browsing.revisit.includes(id) && browsing.confusing.includes(id);
      }, id), 'All three preferences were persisted from the phone menu');
      await resize(page, 1440, 900);
      for (const [action] of commands) {
        const control = point.locator(`[data-action="${action}"]`);
        assert.equal(await control.getAttribute('aria-pressed'), 'true', `${action}: desktop reflects the phone action`);
        assert.equal(await page.locator(`#feedActionMenu [data-action="${action}"]`).getAttribute('aria-pressed'), null, 'Menu checkboxes use aria-checked only');
        await control.click();
        assert.equal(await control.getAttribute('aria-pressed'), 'false');
        assert.equal(await page.locator(`#feedActionMenu [data-action="${action}"]`).getAttribute('aria-checked'), 'false', `${action}: hidden menu is synchronized too`);
      }
      await resize(page, 390, 844);
      await page.getByRole('button', { name: 'Card actions', exact: true }).click();
      for (const [, label] of commands) assert.equal(await page.getByRole('menuitemcheckbox', { name: label, exact: true }).getAttribute('aria-checked'), 'false');
      assert.ok(await point.evaluate(el => el === window.originalPoint), 'Preference synchronization does not rebuild the cards');
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('econ-workspace-v2')).logs), []);
    } finally { await context.close(); }
  });
  test(`${theme}: feed entry updates exposure while resizing and menu collapse preserve it`, async () => {
    const { context, page } = await openPage(theme);
    try {
      const id = await page.locator('[data-point]').first().getAttribute('data-point');
      // Seed an older genuine exposure and nonempty recall history before a fresh load.
      await page.evaluate(id => {
        const learning = EconLearning.empty(); EconLearning.rate(learning, id, 3, new Date());
        localStorage.setItem('econ-workspace-v2', JSON.stringify(learning));
        const browsing = EconRefresh.empty(); browsing.current = id; browsing.opened[id] = '2000-01-01T00:00:00.000Z';
        localStorage.setItem('econ-refresh-v1', JSON.stringify(browsing));
      }, id);
      const logs = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('econ-workspace-v2')).logs));
      await page.reload();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      for (const width of [1440, 390, 1440, 390]) {
        await resize(page, width, width === 390 ? 844 : 900);
        const before = await page.evaluate(() => localStorage.getItem('econ-refresh-v1'));
        await page.evaluate(() => location.hash = 'progress');
        await page.locator('.stats-grid').waitFor();
        const menu = page.locator('[data-action="menu-toggle"]');
        if (await menu.getAttribute('aria-expanded') === 'false') await menu.click();
        await page.getByRole('link', { name: 'Refresh', exact: true }).click();
        await page.waitForFunction(({ id, before }) => JSON.parse(localStorage.getItem('econ-refresh-v1')).opened[id] > JSON.parse(before).opened[id], { id, before });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const after = await page.evaluate(() => localStorage.getItem('econ-refresh-v1'));
        await resize(page, width === 390 ? 1440 : 390, width === 390 ? 900 : 844);
        assert.equal(await page.evaluate(() => localStorage.getItem('econ-refresh-v1')), after, 'A layout switch is not a new exposure');
        await resize(page, 1440, 900);
        await page.locator('[data-action="menu-toggle"]').click();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await page.evaluate(() => localStorage.getItem('econ-refresh-v1')), after, 'Workspace menu geometry is not a new exposure');
        await page.locator('[data-action="menu-toggle"]').click();
      }
      // Also check a fresh page load with an already-opened card.
      await page.evaluate(id => {
        const browsing = JSON.parse(localStorage.getItem('econ-refresh-v1'));
        browsing.opened[id] = '2000-01-01T00:00:00.000Z';
        localStorage.setItem('econ-refresh-v1', JSON.stringify(browsing));
      }, id);
      await page.reload();
      await page.waitForFunction(id => JSON.parse(localStorage.getItem('econ-refresh-v1')).opened[id] > '2000-01-01T00:00:00.000Z', id);
      assert.equal(await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('econ-workspace-v2')).logs)), logs);
    } finally { await context.close(); }
  });
}
