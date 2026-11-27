const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const context = {};
for (const file of ["tb02-demo-intro", "tb02-demo-micro", "tb02-demo-macro", "tb02-demo-global"]) vm.runInNewContext(fs.readFileSync(path.join(__dirname, `../content/${file}.js`), "utf8"), context);
const payload = context.EconPublished;

test("TB-02 demo packs contain real source-backed cards and no TB-01 content", () => {
  assert.equal(payload.packs.length, 4);
  const cards = payload.packs.flatMap(pack => pack.cards);
  assert.equal(cards.length, 72);
  assert.equal(new Set(cards.map(card => card.id)).size, 72);
  for (const card of cards) {
    assert.equal(card.sources.length >= 1, true);
    assert.equal(card.sources.every(source => source.id === "TB-02"), true, card.id);
    assert.equal(card.graphId === null || typeof card.graphId === "string", true);
  }
  assert.doesNotMatch(JSON.stringify(payload), /TB-01|private-sources|\.ocr-runtime|transcription\.json/);
});
