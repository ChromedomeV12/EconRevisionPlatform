const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("../scripts/serve.cjs");

test("Preview serves only selected diagram PNGs and keeps source files private", async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const file of ["demand-figure-3-2.png", "ped-figure-7-1.png"]) {
      const response = await fetch(`${base}/assets/diagrams/${file}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/png");
      assert.equal(Buffer.from(await response.arrayBuffer()).subarray(1, 4).toString(), "PNG");
    }
    for (const route of [
      "private-sources/Econ%20Revision%20App%20Sources/START_HERE.md",
      "private-sources/ocr-work/",
      "assets/diagrams/README.md",
      "assets/diagrams/unapproved.png",
      ".git/config",
      "assets/diagrams/%2e%2e%2f%2e%2e%2fprivate-sources/START_HERE.md",
    ]) {
      assert.equal((await fetch(`${base}/${route}`)).status, 404, route);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
