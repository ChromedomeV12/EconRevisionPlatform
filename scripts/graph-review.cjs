const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const { createWorkflow } = require("./graph-work.cjs");

function createReviewServer(id, workspace = root) {
  const inputs = createWorkflow({ root: workspace }).paths(id);
  const routes = new Map([
    ["/", ["scripts/graph-review.html", "text/html; charset=utf-8"]],
    ["/graph.js", ["graph.js", "text/javascript"]],
    ["/graph.css", ["graph.css", "text/css"]],
    ["/vendor/d3.min.js", ["vendor/d3.min.js", "text/javascript"]],
    ["/source.png", [inputs.source, "image/png"]],
    ["/spec.json", [inputs.draft, "application/json"]],
  ]);
  const realRoot = fs.realpathSync(workspace);
  return http.createServer((req, res) => {
    let route;
    try { route = new URL(req.url, "http://localhost").pathname; }
    catch { res.writeHead(400).end(); return; }
    if (!routes.has(route)) { res.writeHead(404).end("Not found"); return; }
    const [relative, type] = routes.get(route);
    try {
      const file = path.join(workspace, relative);
      const actual = fs.realpathSync(file);
      const inside = path.relative(realRoot, actual);
      if (inside.startsWith("..") || path.isAbsolute(inside) || actual !== path.resolve(file)) throw new Error("Linked files are not served.");
      const limit = route === "/spec.json" ? 128 * 1024 : 8 * 1024 * 1024;
      if (!fs.statSync(actual).isFile() || fs.statSync(actual).size > limit) throw new Error("File exceeds review bound.");
      res.writeHead(200, {
        "Content-Type": type, "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      res.end(fs.readFileSync(actual));
    } catch {
      res.writeHead(404).end("Review file unavailable. Run graph-work init and write a draft first.");
    }
  });
}

async function capture(id, workspace = root) {
  let chromium;
  try {
    const local = path.join(workspace, ".ocr-runtime/graph-browser/node_modules/playwright");
    ({ chromium } = require(process.env.PLAYWRIGHT_PATH || (fs.existsSync(local) ? local : "playwright")));
  }
  catch { throw new Error("Captures need Playwright. Set PLAYWRIGHT_PATH to its package path; see docs/GRAPH_WORKFLOW.md for optional machine-local setup."); }
  const server = createReviewServer(id, workspace);
  const inputs = createWorkflow({ root: workspace }).paths(id);
  const draftPath = path.join(workspace, inputs.draft);
  const sourcePath = path.join(workspace, inputs.source);
  for (const file of [draftPath, sourcePath]) {
    if (fs.realpathSync(file) !== path.resolve(file)) throw new Error("Capture rejects linked input paths.");
  }
  const rejectLinkedOutput = file => {
    if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw new Error("Capture rejects linked output paths.");
  };
  const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const specSha256 = hash(draftPath), sourceSha256 = hash(sourcePath);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}), ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}) });
    const page = await browser.newPage();
    const directory = path.join(workspace, "private-sources/graph-work", id);
    const outputs = [];
    for (const theme of ["light", "dark"]) {
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`http://127.0.0.1:${server.address().port}/`);
        await page.locator("#native svg").waitFor();
        await page.locator(`[data-mode="${theme}"]`).click();
        await page.locator("#original").evaluate(img => img.decode());
        const destination = path.join(directory, `review-${theme}-${width}.png`);
        rejectLinkedOutput(destination);
        await page.screenshot({ path: destination, fullPage: true });
        outputs.push({ path: path.relative(workspace, destination).split(path.sep).join("/"), sha256: hash(destination) });
      }
    }
    if (hash(draftPath) !== specSha256 || hash(sourcePath) !== sourceSha256) throw new Error("Source or draft changed during capture. Discard these previews and capture again.");
    const manifest = { specSha256, sourceSha256, screenshots: outputs, capturedAt: new Date().toISOString(), status: "visual_inspection_required" };
    const manifestPath = path.join(directory, "render-manifest.json");
    rejectLinkedOutput(manifestPath);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify(manifest, null, 2));
    return manifest;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

if (require.main === module) {
  const [id, option] = process.argv.slice(2);
  if (option === "--capture") capture(id).catch(error => { console.error(error.message); process.exitCode = 1; });
  else {
    const port = Number(option || 4182);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Port must be 1024-65535.");
    createReviewServer(id).listen(port, "127.0.0.1", () => console.log(`Private graph review: http://127.0.0.1:${port}`));
  }
}
module.exports = { createReviewServer, capture };
