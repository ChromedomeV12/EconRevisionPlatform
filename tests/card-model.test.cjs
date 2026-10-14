const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const model = require("../card-model.js");
function card() { return { id: "test-point", revision: 1, unit: "micro", topic: "Demand", title: "One idea", headline: "Own price changes quantity demanded", summary: "Other determinants are held constant.", notes: "Read a movement along the existing curve, not a shift.", takeaway: "One point per swipe", caution: "Do not infer a curve shift.", related: [], sources: [{ id: "TB-01", page: 114 }], level: "common-core-provisional", graphId: null }; }
function pack() { return { schemaVersion: 1, id: "test-pack", title: "Test", cards: [card()] }; }
test("Versioned knowledge cards reject executable/oversized/unknown and malformed fields", () => {
  assert.equal(model.validateCard(card()).valid, true);
  for (const change of [{ summary: "x".repeat(481) }, { graphSpec: {} }, { id: "constructor" }, { graphId: "constructor" }, { revision: 0 }, { level: "SL verified" }, { sources: [{ id: "TB-01", page: 0 }] }, { sources: [{ id: "TB-01", page: 114, path: "secret" }] }, { related: ["../secret"] }]) assert.equal(model.validateCard({ ...card(), ...change }).valid, false);
  let invoked = false; const getter = card(); Object.defineProperty(getter, "notes", { enumerable: true, get() { invoked = true; return "no"; } });
  assert.equal(model.validateCard(getter).valid, false); assert.equal(invoked, false);
  const cyclic = card(); cyclic.sources.push(cyclic); assert.equal(model.validateCard(cyclic).valid, false);
});
test("Repository preserves IDs, rejects duplicate/missing graph data, and provider reload is atomic", async () => {
  const repo = model.createRepository([pack()]);
  assert.equal(repo.list()[0].refresh.headline, card().headline);
  assert.equal(repo.list()[0].editorialStatus, "Editorial draft; not teacher verified");
  const changed = pack(); changed.cards[0].headline = "An updated knowledge point";
  await repo.reload({ listPacks: async () => [changed] }); assert.equal(repo.list()[0].refresh.headline, changed.cards[0].headline);
  await assert.rejects(repo.reload({ listPacks: async () => [changed, changed] }), /Duplicate/);
  assert.equal(repo.list().length, 1);
  const missing = pack(); missing.cards[0].graphId = "absent"; assert.throws(() => model.createRepository([missing]), /Missing curated graph/);
});
test("Published packs are modular, source-backed, graph-valid and contain no private paths", () => {
  const context = vm.createContext({});
  for (const file of ["demand-basics", "supply-basics", "market-outcomes"]) vm.runInContext(fs.readFileSync(`content/${file}.js`, "utf8"), context);
  const payload = JSON.parse(JSON.stringify(context.EconPublished));
  assert.equal(payload.packs.length, 3); assert.equal(payload.packs.flatMap(p => p.cards).length, 13);
  const all = model.createRepository(payload.packs, payload.graphs).list();
  assert.equal(new Set(all.map(c => c.id)).size, 13); assert.equal(all.find(c => c.id === "demand").version, 2);
  const graphModel = require("../graph.js");
  for (const graph of Object.values(payload.graphs)) { assert.equal(graphModel.validate(graph).valid, true); assert.equal(graph.review.status, "reviewed"); assert.match(graph.review.reviewer, /teacher verification pending/); }
  for (const c of all) for (const id of c.related) assert.ok(all.some(x => x.id === id) || id === "scarcity");
  assert.doesNotMatch(JSON.stringify(payload), /private-sources|\.ocr-runtime|\.pi[/\\]|transcription\.json/);
});
module.exports = { card, pack };
