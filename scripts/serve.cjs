const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const publicFiles = new Set([
  "index.html",
  "TikTok Econ.html",
  "styles.css",
  "app.js",
  "content.js",
  "learning.js",
  "refresh.js",
  "decisions.js",
  "vendor/fsrs.js",
  "vendor/lucide.js",
  "assets/city.jpg",
  "assets/market.jpg",
  "assets/trade.jpg",
  "assets/dm-sans.ttf",
  "assets/manrope.ttf",
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".jpg": "image/jpeg",
  ".ttf": "font/ttf",
};
function createServer() {
  return http.createServer((req, res) => {
    let relative;
    try {
      relative =
        decodeURIComponent(new URL(req.url, "http://localhost").pathname).slice(
          1,
        ) || "index.html";
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (!publicFiles.has(relative)) {
      res.writeHead(404).end("Not found");
      return;
    }
    fs.readFile(path.join(root, relative), (err, body) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(relative)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    });
  });
}
if (require.main === module) {
  const port = Number(process.argv[2] || 4181);
  createServer().listen(port, "127.0.0.1", () =>
    console.log(`Econ preview: http://127.0.0.1:${port}`),
  );
}
module.exports = { createServer };
