const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const { createServer } = require("../scripts/serve.cjs");
(async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`, out = path.join(__dirname, "../test-output/layout");
  fs.mkdirSync(out, { recursive: true }); let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
    for (const theme of ["light", "dark"]) for (const [width, height] of [[360, 844], [390, 844], [768, 1080], [1024, 1080], [1280, 900], [1920, 1080], [1280, 550]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
      await context.addInitScript(theme => localStorage.setItem("econ-theme-v1", theme), theme);
      const page = await context.newPage(), errors = []; page.on("pageerror", e => errors.push(e.message));
      await page.goto(base);
      await page.evaluate(() => {
        const learning = EconLearning.empty(); learning.saved = EconData.cards.slice(0, 2).map(c => c.id);
        localStorage.setItem("econ-workspace-v2", JSON.stringify(learning));
      });
      let workspaceReference;
      for (const view of ["progress", "units", "saved", "studio", "welcome", "feed"]) {
        await page.goto(`${base}/#${view}`); await page.reload();
        await page.evaluate(() => document.fonts.ready);
        if (view === "progress") workspaceReference = await page.evaluate(() => {
          const workspace = document.querySelector(".workspace-layout").getBoundingClientRect(), settings = document.querySelector(".workspace-layout > .sidebar .settings-link");
          return { topGap: document.querySelector(".shell").getBoundingClientRect().top - document.querySelector(".topbar").getBoundingClientRect().bottom, settingsOffset: settings?.getClientRects().length ? settings.getBoundingClientRect().top - workspace.top : null };
        });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${theme}/${view}/${width}: page overflow`);
        const defects = await page.evaluate(({ topGap: expectedTopGap, settingsOffset: expectedSettingsOffset }) => {
          const errors = [], shell = document.querySelector(".shell"), frame = getComputedStyle(shell);
          if (parseFloat(frame.borderTopWidth) || parseFloat(frame.borderLeftWidth) || parseFloat(frame.borderRadius)) errors.push("Workspace shell regained a card frame");
          if (frame.backgroundColor !== "rgba(0, 0, 0, 0)") errors.push("Workspace page gained a filled wrapper");
          const sidebar = document.querySelector(".workspace-layout > .sidebar");
          if (sidebar?.getClientRects().length && getComputedStyle(sidebar).backgroundColor !== "rgba(0, 0, 0, 0)") errors.push("Sidebar gained a filled rectangle");
          const settings = sidebar?.querySelector(".settings-link");
          if (expectedSettingsOffset !== null && settings?.getClientRects().length) {
            const offset = settings.getBoundingClientRect().top - document.querySelector(".workspace-layout").getBoundingClientRect().top;
            if (Math.abs(offset - expectedSettingsOffset) > 1) errors.push("Study settings placement differs from Dashboard");
            const bounds = settings.getBoundingClientRect(), panel = sidebar.getBoundingClientRect();
            if (bounds.top < panel.top - 1 || bounds.bottom > panel.bottom + 1) errors.push("Study settings is clipped by the sidebar");
          }
          if (document.body.classList.contains("feed-mode")) {
            const panel = document.querySelector(".refresh-stage").getBoundingClientRect(), heading = document.querySelector(".refresh-heading");
            if (heading.getClientRects().length) {
              const gap = shell.getBoundingClientRect().top - document.querySelector(".topbar").getBoundingClientRect().bottom;
              if (Math.abs(gap - expectedTopGap) > 1) errors.push(`Refresh top-bar gap ${gap}px differs from workspace gap ${expectedTopGap}px`);
              const left = heading.firstElementChild.getBoundingClientRect().left, right = document.querySelector(".refresh-filters").getBoundingClientRect().right;
              const inset = left - panel.left;
              if (inset < 12 || Math.abs(panel.right - right - inset) > 1) errors.push("Refresh heading has uneven panel insets");
              for (const [selector, side, edge] of [[".refresh-canvas", "left", left], [".set-position", "left", left], [".desktop-feed-navigation", "right", right], [".refresh-queue", "right", right]]) {
                const element = document.querySelector(selector);
                if (element?.getClientRects().length && Math.abs(element.getBoundingClientRect()[side] - edge) > 1) errors.push(`Refresh panel edge misaligned: ${selector}`);
              }
              const body = document.querySelector(".refresh-body");
              if (innerHeight >= 768 && body.scrollHeight > body.clientHeight + 1) errors.push("Desktop refresh point requires internal scrolling");
            } else if (Math.abs(panel.top) > 1 || Math.abs(panel.bottom - innerHeight) > 1) errors.push("Swipe refresh no longer fills the viewport");
          }
          for (const el of document.querySelectorAll(".view-heading h1, .section-heading h2, .library-body h3, .library-body p, .form-actions, .studio-tabs, .stat-top")) {
            if (!el.getClientRects().length) continue;
            if (el.scrollWidth > el.clientWidth + 1) errors.push(`Clipped content: ${el.className || el.tagName}`);
          }
          for (const [parentSelector, childSelector] of [[".stat", ".stat-top"], [".topic-card", ".topic-info h3"], [".library-card", ".library-body h3"], [".feature-banner", ".banner-entry"]]) {
            for (const parent of document.querySelectorAll(parentSelector)) {
              const child = parent.querySelector(childSelector); if (!child?.getClientRects().length) continue;
              const p = parent.getBoundingClientRect(), c = child.getBoundingClientRect();
              if (c.left < p.left + 12 || c.right > p.right - 12) errors.push(`Missing card inset: ${parentSelector}`);
            }
          }
          for (const tag of document.querySelectorAll(".image-tag")) if (!tag.textContent.trim()) errors.push("Empty image badge");
          for (const row of document.querySelectorAll(".library-bottom > div")) {
            const buttons = [...row.querySelectorAll("button")];
            if (buttons.length > 1 && Math.abs(buttons[0].getBoundingClientRect().top - buttons[1].getBoundingClientRect().top) > 1) errors.push("Library actions stacked vertically");
          }
          for (const button of document.querySelectorAll(".queue-list button")) {
            if (!button.getClientRects().length) continue;
            const p = button.closest(".refresh-queue").getBoundingClientRect(), b = button.getBoundingClientRect();
            if (b.left < p.left - 1 || b.right > p.right + 1) errors.push("Feed queue extends past its column");
          }
          for (const button of document.querySelectorAll(".graph-zoom")) {
            if (!button.getClientRects().length) continue;
            const b = button.getBoundingClientRect(), p = button.closest(".refresh-art").getBoundingClientRect();
            if (b.width < 44 || b.height < 44 || b.right > p.right || b.top < p.top) errors.push("Graph zoom target clipped or undersized");
          }
          return errors;
        }, workspaceReference);
        assert.deepEqual(defects, [], `${theme}/${view}/${width}: layout proportions`);
        if ([390, 1920].includes(width)) {
          await page.mouse.click(width - 3, 100);
          await page.screenshot({ path: path.join(out, `${view}-${theme}-${width}.png`) });
        }
      }
      assert.deepEqual(errors, []); await context.close();
    }
    console.log("Layout proportions: all six views, both themes, six widths, unframed shells, card insets, refresh edge/top-bar alignment, wrapping and overflow passed.");
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
