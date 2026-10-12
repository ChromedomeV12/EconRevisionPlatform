const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createReviewServer, capture } = require("../scripts/graph-review.cjs");
const { createWorkflow } = require("../scripts/graph-work.cjs");
const crypto = require("node:crypto");
const { createServer } = require("../scripts/serve.cjs");
const { fixture } = require("./graphs.cjs");
const root = path.resolve(__dirname, "..");

(async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "econ-graph-review-"));
  const put = (relative, body) => {
    const file = path.join(temporary, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  };
  for (const file of ["scripts/graph-review.html", "graph.js", "graph.css", "vendor/d3.min.js", "assets/diagrams/demand-figure-3-2.png"]) put(file, fs.readFileSync(path.join(root, file)));
  put("private-sources/graph-work/demand/draft.json", JSON.stringify(fixture()));
  put("private-sources/secret.txt", "must not be served");
  const review = createReviewServer("demand", temporary);
  const app = createServer();
  let browser;
  try {
    await new Promise(resolve => review.listen(0, "127.0.0.1", resolve));
    await new Promise(resolve => app.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${review.address().port}`;
    const appBase = `http://127.0.0.1:${app.address().port}`;
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const route of ["private-sources/secret.txt", "private-sources/graph-work/demand/draft.json", ".git/config", "source.png/../secret.txt"]) assert.equal((await page.request.get(`${base}/${route}`)).status(), 404);
    assert.equal((await page.request.get(`${base}/spec.json`)).status(), 200);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base);
      await page.locator("#native svg").waitFor();
      await page.locator("#original").evaluate(img => img.decode());
      assert.match(await page.locator("#validation").textContent(), /Structural checks passed/);
      for (const theme of ["light", "dark"]) {
        await page.locator(`[data-mode="${theme}"]`).click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        fs.mkdirSync(path.join(root, "test-output/graphs"), { recursive: true });
        await page.screenshot({ path: path.join(root, `test-output/graphs/review-${theme}-${width}.png`), fullPage: true });
      }
    }
    const spec = fixture();
    for (const status of ["draft", "reviewed"]) {
      spec.review = { status, reviewer: status === "reviewed" ? "Synthetic test reviewer" : null };
      await page.route("**/content.js", async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: `${await response.text()}\nEconData.cards[0].graphSpec = ${JSON.stringify(spec)};` });
      });
      await page.goto(appBase);
      await page.locator(".refresh-scroll").waitFor();
      assert.equal(await page.locator("svg[data-graph]").count(), status === "reviewed" ? 1 : 0, "Only explicitly reviewed curated content can activate native graphs");
      if (status === "reviewed") {
        assert.equal(await page.locator("[data-point]").first().locator("canvas").isVisible(), false);
        assert.equal(await page.locator("svg[data-graph]").getAttribute("role"), "img");
      }
      await page.unroute("**/content.js");
    }
    assert.deepEqual(errors, []);
    const manifest = await capture("demand", temporary);
    const hash = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(temporary, relative))).digest("hex");
    assert.equal(manifest.specSha256, hash("private-sources/graph-work/demand/draft.json"));
    assert.equal(manifest.sourceSha256, hash("assets/diagrams/demand-figure-3-2.png"));
    assert.equal(manifest.screenshots.length, 4);
    for (const screenshot of manifest.screenshots) assert.equal(screenshot.sha256, hash(screenshot.path));
    assert.equal(manifest.status, "visual_inspection_required");
    const basePath = "private-sources/ocr-work/TB-01/pages/00012";
    const imagePath = `${basePath}/figures/fig-test.png`;
    put(imagePath, fs.readFileSync(path.join(temporary, "assets/diagrams/demand-figure-3-2.png")));
    const metadataPath = `${basePath}/figures/fig-test.json`;
    const metadata = { book_id: "TB-01", pdf_page: 12, asset_id: "fig-test", kind: "diagram", image_path: imagePath,
      image_sha256: hash(imagePath), source_sha256: "a".repeat(64), evidence_sha256: "b".repeat(64), caption: null };
    put(metadataPath, JSON.stringify(metadata));
    put(`${basePath}/transcription.json`, JSON.stringify({ book_id: "TB-01", pdf_page: 12, status: "transcribed_needs_review",
      source_sha256: metadata.source_sha256, evidence_sha256: metadata.evidence_sha256,
      figures: [{ kind: "diagram", asset_id: "fig-test" }], figure_assets: [{ ...metadata, metadata_sha256: hash(metadataPath) }] }));
    const workflow = createWorkflow({ root: temporary });
    const [dynamicId] = workflow.enqueuePage("TB-01", 12).queued;
    const dynamicSpec = fixture();
    dynamicSpec.id = dynamicId;
    put(workflow.paths(dynamicId).draft, JSON.stringify(dynamicSpec));
    const dynamicManifest = await capture(dynamicId, temporary);
    assert.equal(dynamicManifest.sourceSha256, hash(imagePath));
    assert.equal(dynamicManifest.specSha256, hash(workflow.paths(dynamicId).draft));
    for (const screenshot of dynamicManifest.screenshots) assert.equal(screenshot.sha256, hash(screenshot.path));
    console.log("Private graph review isolation, responsive source comparison, both themes and reviewed-only app integration passed.");
  } finally {
    if (browser) await browser.close();
    for (const server of [review, app]) if (server.listening) await new Promise(resolve => server.close(resolve));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
