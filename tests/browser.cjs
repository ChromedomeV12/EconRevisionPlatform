const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const { createServer } = require("../scripts/serve.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const out = path.join(__dirname, "../test-output");
  fs.mkdirSync(out, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.BROWSER_CHANNEL
        ? { channel: process.env.BROWSER_CHANNEL }
        : {}),
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(out, "dashboard-desktop.png"),
      fullPage: true,
    });
    assert.equal(await page.locator("h1").textContent(), "Your study desk");
    assert.ok(
      await page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs.every((i) => i.complete && i.naturalWidth > 0),
        ),
    );
    await page.getByRole("button", { name: "Start a session" }).click();
    await page.locator("#conceptCanvas").waitFor();
    assert.ok(
      await page.locator("#conceptCanvas").evaluate((c) =>
        c
          .getContext("2d")
          .getImageData(0, 0, c.width, c.height)
          .data.some((v, i) => i % 4 === 3 && v > 0),
      ),
    );
    await page.screenshot({
      path: path.join(out, "feed-desktop.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Skip to next card" }).click();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("econ-workspace-v2") || '{"logs":[]}')
            .logs.length,
      ),
      0,
    );
    await page.getByRole("button", { name: "Previous card" }).click();
    await page
      .getByRole("textbox", { name: "Your answer" })
      .fill("The firm does not pay the external cost.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    assert.equal(
      await page.locator("#recallAnswer").inputValue(),
      "The firm does not pay the external cost.",
    );
    await page.getByRole("button", { name: "Reveal answer" }).click();
    await page.getByRole("button", { name: /^Good/ }).click();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("econ-workspace-v2")).logs.length,
      ),
      1,
    );
    await page.getByRole("link", { name: "Overview" }).click();
    assert.match(await page.locator(".stats-grid").textContent(), /100/);
    await page.reload();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("econ-workspace-v2")).logs.length,
      ),
      1,
    );
    await page.getByRole("link", { name: "Topic library" }).click();
    await page
      .getByRole("searchbox", { name: "Search topics" })
      .fill("inflation");
    assert.equal(await page.locator(".library-card").count(), 1);
    await page.screenshot({
      path: path.join(out, "library-desktop.png"),
      fullPage: true,
    });
    await page.getByRole("link", { name: "Saved cards" }).click();
    assert.equal(await page.locator(".library-card").count(), 1);
    assert.match(await page.locator(".library-card h3").textContent(), /Negative externalities/);
    await page.getByRole("link", { name: "Card studio" }).click();
    await page
      .getByLabel("Card title")
      .fill("Test card <img src=x onerror=bad()>");
    await page
      .getByLabel("Recall question")
      .fill("What does an opportunity cost describe?");
    await page
      .getByLabel("Reference answer")
      .fill(
        "The value of the next-best alternative forgone when making a choice.",
      );
    await page
      .getByLabel("Source & page reference")
      .fill("Original personal example");
    await page.getByRole("button", { name: "Submit for review" }).click();
    assert.equal(await page.locator(".review-row img").count(), 0);
    assert.match(await page.locator(".review-row h3").textContent(), /<img/);
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await page.getByLabel("Review note").fill("Add the next-best alternative distinction.");
    await page.getByRole("button", { name: "Request changes" }).click();
    await page.getByRole("tab", { name: "My submissions" }).click();
    await page.getByRole("button", { name: "Revise", exact: true }).click();
    await page.getByRole("button", { name: "Resubmit for review" }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("econ-workspace-v2")).submissions[0].version), 2);
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await page.getByRole("button", { name: "Add to my library" }).click();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("econ-workspace-v2")).submissions[0]
            .status,
      ),
      "pending",
    );
    await page.locator("#reviewConfirmed").check();
    await page.getByRole("button", { name: "Add to my library" }).click();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("econ-workspace-v2")).submissions[0]
            .status,
      ),
      "approved",
    );
    await page.getByRole("tab", { name: "My submissions" }).click();
    await page.screenshot({
      path: path.join(out, "studio-desktop.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Study settings" }).click();
    await page.getByLabel("Daily recall goal").fill("3");
    await page.getByRole("button", { name: "Save settings" }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("econ-workspace-v2")).goal), 3);
    await page.waitForFunction(
      () => !document.querySelector("#toast").classList.contains("visible"),
    );
    for (const width of [360, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const view of ["progress", "feed", "units", "saved", "studio"]) {
        await page.goto(`${base}/#${view}`);
        await page.waitForFunction(
          (view) =>
            document
              .querySelector(`[data-nav="${view}"]`)
              .getAttribute("aria-current") === "page",
          view,
        );
        await page.evaluate(() => document.fonts.ready);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${view}: overflow at ${width}`,
        );
        if (width === 390)
          await page.screenshot({
            path: path.join(out, `${view}-mobile.png`),
            fullPage: true,
          });
      }
    }
    assert.equal(
      (
        await page.request.get(
          `${base}/private-sources/Econ%20Revision%20App%20Sources/START_HERE.md`,
        )
      ).status(),
      404,
    );
    await page.goto(`${base}/TikTok%20Econ.html#feed`);
    await page.waitForURL("**/index.html#feed");
    await page.getByRole("button", { name: "Study settings" }).click();
    await page.getByRole("button", { name: "Reset reviews", exact: true }).click();
    await page.getByRole("button", { name: "Reset reviews", exact: true }).click();
    const reset = await page.evaluate(() => JSON.parse(localStorage.getItem("econ-workspace-v2")));
    assert.equal(reset.logs.length, 0);
    assert.equal(reset.saved.length, 1);
    assert.equal(reset.submissions.length, 1);
    assert.deepEqual(errors, []);
    console.log(
      "Browser checks passed: recall, scheduling, saved cards, persistence, search, submission approval, safe text rendering, assets, legacy redirect, private-source isolation, 5 responsive widths.",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
