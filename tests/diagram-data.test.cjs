const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../content.js"), "utf8"), context);
const cards = context.EconData.cards;

test("Selected image configs match PNG dimensions and accessible descriptions", () => {
  const selected = cards.filter(card => card.diagramImage);
  assert.equal(selected.length, 2);
  for (const card of selected) {
    const image = card.diagramImage;
    assert.match(image.src, /^assets\/diagrams\/(demand-figure-3-2|ped-figure-7-1)\.png$/);
    const png = fs.readFileSync(path.join(__dirname, "..", image.src));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), image.width);
    assert.equal(png.readUInt32BE(20), image.height);
    assert.match(image.alt, /Vertical axis:.*horizontal axis:/);
    assert.match(image.alt, /[Nn]o numerical values/);
    assert.match(image.credit, /Hodder Education \(2020\)/);
    assert.equal(card.diagram, undefined);
  }
});
test("Demand copy follows the carrot price-rise figure", () => {
  const card = cards.find(card => card.id === "demand");
  assert.match(card.refresh.summary, /rise.*carrots.*P1 to P2.*Q1 to Q2/);
  assert.match(card.answer, /higher carrot price P2 reduces quantity demanded to Q2/);
  assert.doesNotMatch(JSON.stringify(card), /coffee|cups|60|120/);
});
test("PED copy follows the qualitative Pepsi Cola price-fall figure", () => {
  const card = cards.find(card => card.id === "price-elasticity");
  assert.match(card.refresh.summary, /Pepsi Cola.*falls.*P1 to P2.*Q1 to Q2.*greater proportion/);
  assert.match(card.answer, /exact PED cannot be calculated.*slope alone/);
  assert.doesNotMatch(JSON.stringify(card), /10%|20%|= -2|tickets/);
});
