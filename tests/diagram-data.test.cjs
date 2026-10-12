const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../content.js"), "utf8"), context);
const cards = context.EconData.cards;

test("Numerical diagram points belong to their stated demand curve and visible window", () => {
  for (const card of cards.filter(card => card.diagram)) {
    const graph = card.diagram;
    assert.ok(graph.priceIntercept > 0 && graph.quantityIntercept > 0, card.id);
    assert.ok(graph.priceAxis && graph.quantityAxis && graph.assumption, card.id);
    assert.equal(graph.points.length, 2, card.id);
    for (const point of graph.points) {
      const priceOnCurve = graph.priceIntercept * (1 - point.quantity / graph.quantityIntercept);
      assert.ok(Math.abs(point.price - priceOnCurve) < 1e-9, `${card.id}: ${point.label} is off its curve`);
      assert.ok(point.price >= 0 && point.quantity >= 0, card.id);
      for (const [range, value] of [[graph.priceRange, point.price], [graph.quantityRange, point.quantity]]) {
        if (range) assert.ok(range[0] <= value && value <= range[1], `${card.id}: point outside plotted range`);
      }
    }
  }
});

test("Demand price-fall example moves to a larger quantity on the same curve", () => {
  const [start, end] = cards.find(card => card.id === "demand").diagram.points;
  assert.ok(end.price < start.price);
  assert.ok(end.quantity > start.quantity);
});

test("PED diagram demonstrates the public card's initial-base percentage calculation", () => {
  const card = cards.find(card => card.id === "price-elasticity");
  const [start, end] = card.diagram.points;
  const priceChange = 100 * (end.price - start.price) / start.price;
  const quantityChange = 100 * (end.quantity - start.quantity) / start.quantity;
  assert.equal(priceChange, 10);
  assert.equal(quantityChange, -20);
  assert.equal(quantityChange / priceChange, -2);
  assert.equal(card.diagram.method, "Initial-base PED");
  assert.match(card.refresh.summary, /10% price rise and 20% fall/);
  assert.match(card.answer, /-20% \/ 10% = -2/);
});
