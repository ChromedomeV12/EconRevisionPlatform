const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const crypto = require("node:crypto");

const model = require("../card-model.js");
const graphModule = require("../graph.js");
globalThis.EconCards = model;
globalThis.EconGraphs = graphModule;

const sha256 = text => crypto.createHash("sha256").update(text, "utf8").digest("hex");
const card = (id, graphId = null, revision = 1) => ({
  id, revision, unit: "micro", topic: "Market equilibrium", title: `${id.replace(/-/g, " ")} principle`,
  headline: `${id} headline stays short and specific`,
  summary: `${id} summary explains the core idea in one compact paragraph.`,
  notes: `${id} notes expand on the mechanism, limits, and common exam traps.`,
  takeaway: `Remember ${id}.`, caution: "", level: "common-core-provisional",
  related: [], sources: [{ id: "TB-01", page: 114 }], graphId
});
const pack = (id, cards) => ({ schemaVersion: 1, id, title: `${id} pack`, cards });
const graphSpec = id => ({
  version: 1, id, title: `${id} diagram`, description: "Reviewed schematic of the core market relationship.",
  coordinateMode: "schematic",
  axes: { x: { label: "Quantity", min: 0, max: 10 }, y: { label: "Price", min: 0, max: 10 } },
  curves: [{ id: `${id}D`, label: "D", role: "demand", points: [[1, 9], [9, 1]] }],
  points: [], guides: [], arrows: [], areas: [], labels: [],
  review: { status: "reviewed", reviewer: "QA Reviewer" }
});
const draftSpec = id => ({ ...graphSpec(id), review: { status: "draft", reviewer: null } });
const buildRelease = (packs, specs) => {
  const pins = Object.keys(specs).map(id => ({ id, revision: 1, hash: sha256(model.canonical(specs[id])) })).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const release = sha256(model.canonical({ packs, graphs: pins }));
  const responses = Object.fromEntries(pins.map(pin => [`${pin.id}:${pin.revision}`, { schemaVersion: 1, id: pin.id, revision: pin.revision, hash: pin.hash, spec: specs[pin.id] }]));
  return { catalog: { schemaVersion: 1, release, editorialStatus: "Editorial draft; not teacher verified", packs, graphs: pins }, responses, specs };
};
const tamperRelease = catalog => ({ ...catalog, release: (catalog.release[0] === "a" ? "b" : "a") + catalog.release.slice(1) });
const v2specs = () => ({ "supply-demand": graphSpec("supply-demand"), "market-graph": graphSpec("market-graph") });

const v1 = buildRelease([pack("base-pack", [card("base-card", "base-graph")])], { "base-graph": graphSpec("base-graph") });
const v2 = buildRelease([pack("supply-pack", [card("base-card", "supply-demand", 2), card("extra-card")]), pack("market-pack", [card("market-card", "market-graph")])], v2specs());
const v3 = buildRelease([pack("supply-pack", [card("base-card", "supply-demand", 3), card("extra-card")]), pack("market-pack", [card("market-card", "market-graph")])], { "supply-demand": { ...graphSpec("supply-demand"), title: "supply-demand diagram, updated" }, "market-graph": graphSpec("market-graph") });
const v2draft = buildRelease(v2.catalog.packs, { "supply-demand": draftSpec("supply-demand"), "market-graph": graphSpec("market-graph") });
const v2minusExtra = buildRelease([pack("supply-pack", [card("base-card", "supply-demand", 2)]), pack("market-pack", [card("market-card", "market-graph")])], v2specs());
const v2ghost = buildRelease([pack("supply-pack", [card("base-card", "supply-demand", 2), card("extra-card")]), pack("market-pack", [card("market-card", "ghost-graph")])], v2specs());
const v0graph = buildRelease([pack("plain-pack", [card("plain-card", null)])], {});

const legacyCards = [
  { id: "legacy-scarsity", unit: "intro", topic: "Scarcity", title: "Legacy scarcity point", headline: "Resources are limited.", summary: "Legacy sample summary.", answer: "Legacy sample answer." },
  { id: "legacy-cost", unit: "intro", topic: "Opportunity cost", title: "Legacy cost point", headline: "Every choice has a cost.", summary: "Legacy sample summary.", answer: "Legacy sample answer." }
];
const idsOf = list => list.map(c => c.id).sort();

// A fresh real loopback server per test, with independent mutable wire state.
const startServer = () => new Promise(resolve => {
  const state = { catalog: null, graphs: {} };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
    if (req.method !== "GET") return send(405, { error: "method not allowed" });
    if (url.pathname === "/api/v1/catalog") return state.catalog ? send(200, state.catalog) : send(404, { error: "catalog unavailable" });
    const match = url.pathname.match(/^\/api\/v1\/graphs\/([^/]+)\/(\d+)$/);
    if (!match) return send(404, { error: "not found" });
    const body = state.graphs[`${decodeURIComponent(match[1])}:${match[2]}`];
    return body ? send(200, body) : send(404, { error: "unknown graph" });
  });
  server.listen(0, "127.0.0.1", () => resolve({
    baseUrl: `http://127.0.0.1:${server.address().port}/api/v1`,
    state,
    close: () => new Promise(done => server.close(done))
  }));
});

// Fresh bootstrap context per test: new published payload, legacy data and window,
// plus a re-executed content-bootstrap.js so each test owns its own EconCatalog and
// EconCardRepository with no shared global state from a prior test.
const bootstrap = ({ published = { packs: [], graphs: {} }, legacy = [] } = {}) => {
  globalThis.EconGraphs = graphModule;
  globalThis.EconPublished = published;
  globalThis.EconData = { cards: [...legacy] };
  globalThis.window = { events: [], dispatchEvent(event) { this.events.push(event.type); } };
  delete require.cache[require.resolve("../content-bootstrap.js")];
  require("../content-bootstrap.js");
  return { catalog: globalThis.EconCatalog, repo: globalThis.EconCardRepository, window: globalThis.window, data: globalThis.EconData };
};

test("listPacks-only static provider keeps the current graph registry", async () => {
  const { catalog: EconCatalog, repo: EconCardRepository, window, data } = bootstrap({ published: { packs: v1.catalog.packs, graphs: v1.specs }, legacy: legacyCards });
  await EconCatalog.refresh({ listPacks: async () => [pack("supply-pack", [card("base-card", "base-graph", 2)])] });
  const list = EconCardRepository.list();
  assert.deepEqual(idsOf(list), ["base-card"]);
  assert.equal(list[0].version, 2);
  assert.deepEqual(list[0].graphSpec, graphSpec("base-graph"));
  assert.deepEqual(idsOf(data.cards), ["base-card", "legacy-cost", "legacy-scarsity"]);
  assert.deepEqual(window.events, ["econ:catalog-change"]);
});

test("real HTTP refresh swaps packs and graph snapshot atomically with stable IDs", async () => {
  const env = await startServer();
  try {
    env.state.catalog = v2.catalog; env.state.graphs = v2.responses;
    const { catalog: EconCatalog, repo: EconCardRepository, window, data } = bootstrap({ published: { packs: v1.catalog.packs, graphs: v1.specs }, legacy: legacyCards });
    const before = JSON.parse(JSON.stringify(data.cards));
    await EconCatalog.refresh(EconCatalog.createHttpProvider({ baseUrl: env.baseUrl }));
    const list = EconCardRepository.list();
    assert.deepEqual(idsOf(list), ["base-card", "extra-card", "market-card"]);
    const base = list.find(c => c.id === "base-card");
    assert.equal(base.version, 2, "stable canonical ID keeps its history while the revision advances");
    assert.deepEqual(base.graphSpec, graphSpec("supply-demand"), "new card and new graph commit together");
    assert.deepEqual(list.find(c => c.id === "market-card").graphSpec, graphSpec("market-graph"));
    assert.deepEqual(EconCardRepository.catalog(), v2.catalog.packs);
    assert.deepEqual(idsOf(data.cards), ["base-card", "extra-card", "legacy-cost", "legacy-scarsity", "market-card"]);
    assert.deepEqual(window.events, ["econ:catalog-change"]);
    assert.notDeepEqual(data.cards, before);
  } finally {
    await env.close();
  }
});

test("tampered release hash rejects the refresh and retains the prior catalog and graphs", async () => {
  const env = await startServer();
  try {
    env.state.catalog = tamperRelease(v2.catalog); env.state.graphs = v2.responses;
    const { catalog: EconCatalog, repo: EconCardRepository, window } = bootstrap({ published: { packs: v1.catalog.packs, graphs: v1.specs }, legacy: legacyCards });
    const cardsBefore = JSON.parse(JSON.stringify(EconCardRepository.list()));
    const idsBefore = idsOf(EconCardRepository.list());
    const eventsBefore = window.events.length;
    await assert.rejects(EconCatalog.refresh(EconCatalog.createHttpProvider({ baseUrl: env.baseUrl })), /release hash mismatch/);
    assert.deepEqual(idsOf(EconCardRepository.list()), idsBefore);
    assert.deepEqual(EconCardRepository.list(), cardsBefore, "failed refresh keeps prior cards; no fallback hides the failure");
    assert.equal(window.events.length, eventsBefore);
  } finally {
    await env.close();
  }
});

test("graph spec hash mismatch rejects the whole snapshot", async () => {
  const env = await startServer();
  try {
    env.state.catalog = v2.catalog;
    env.state.graphs = { ...v2.responses, "supply-demand:1": { ...v2.responses["supply-demand:1"], spec: { ...v2.responses["supply-demand:1"].spec, title: "tampered title" } } };
    const { catalog: EconCatalog, repo: EconCardRepository } = bootstrap({ published: { packs: v2.catalog.packs, graphs: v2.specs }, legacy: legacyCards });
    const idsBefore = idsOf(EconCardRepository.list());
    await assert.rejects(EconCatalog.refresh(EconCatalog.createHttpProvider({ baseUrl: env.baseUrl })), /spec hash mismatch/);
    assert.deepEqual(idsOf(EconCardRepository.list()), idsBefore);
    assert.deepEqual(EconCardRepository.list().find(c => c.id === "market-card").graphSpec, graphSpec("market-graph"), "untouched graphs survive a rejected snapshot");
  } finally {
    await env.close();
  }
});

test("partial graph release (missing pinned graph) rolls back everything", async () => {
  const env = await startServer();
  try {
    env.state.catalog = v2.catalog;
    env.state.graphs = { "supply-demand:1": v2.responses["supply-demand:1"] }; // market-graph pin is absent
    const { catalog: EconCatalog, repo: EconCardRepository } = bootstrap({ published: { packs: v2.catalog.packs, graphs: v2.specs }, legacy: legacyCards });
    const idsBefore = idsOf(EconCardRepository.list());
    await assert.rejects(EconCatalog.refresh(EconCatalog.createHttpProvider({ baseUrl: env.baseUrl })), /HTTP 404/);
    assert.deepEqual(idsOf(EconCardRepository.list()), idsBefore);
    assert.deepEqual(EconCardRepository.list().find(c => c.id === "market-card").graphSpec, graphSpec("market-graph"));
  } finally {
    await env.close();
  }
});

test("unreviewed graph in the snapshot is rejected by release validation", async () => {
  const env = await startServer();
  try {
    env.state.catalog = v2draft.catalog; env.state.graphs = v2draft.responses;
    const { catalog: EconCatalog, repo: EconCardRepository } = bootstrap({ published: { packs: v2.catalog.packs, graphs: v2.specs }, legacy: legacyCards });
    const idsBefore = idsOf(EconCardRepository.list());
    await assert.rejects(EconCatalog.refresh(EconCatalog.createHttpProvider({ baseUrl: env.baseUrl })), /reviewed status/);
    assert.deepEqual(idsOf(EconCardRepository.list()), idsBefore);
  } finally {
    await env.close();
  }
});

test("refresh that drops an existing canonical card ID is rejected", async () => {
  const env = await startServer();
  try {
    env.state.catalog = v2minusExtra.catalog; env.state.graphs = v2minusExtra.responses;
    const { catalog: EconCatalog, repo: EconCardRepository } = bootstrap({ published: { packs: v2.catalog.packs, graphs: v2.specs }, legacy: legacyCards });
    const idsBefore = idsOf(EconCardRepository.list());
    await assert.rejects(EconCatalog.refresh(EconCatalog.createHttpProvider({ baseUrl: env.baseUrl })), /dropped canonical card extra-card/);
    assert.deepEqual(idsOf(EconCardRepository.list()), idsBefore);
  } finally {
    await env.close();
  }
});

test("pack referencing a graph absent from the pins rejects before any commit", async () => {
  const env = await startServer();
  try {
    env.state.catalog = v2ghost.catalog; env.state.graphs = v2ghost.responses;
    const { catalog: EconCatalog, repo: EconCardRepository } = bootstrap({ published: { packs: v2.catalog.packs, graphs: v2.specs }, legacy: legacyCards });
    const idsBefore = idsOf(EconCardRepository.list());
    await assert.rejects(EconCatalog.refresh(EconCatalog.createHttpProvider({ baseUrl: env.baseUrl })), /Missing curated graph ghost-graph/);
    assert.deepEqual(idsOf(EconCardRepository.list()), idsBefore);
  } finally {
    await env.close();
  }
});

test("overlapping refreshes on one reusable provider never mix and keep a consistent release", async () => {
  const env = await startServer();
  try {
    env.state.catalog = tamperRelease(v2.catalog); env.state.graphs = v2.responses;
    const { catalog: EconCatalog, repo: EconCardRepository } = bootstrap({ published: { packs: v2.catalog.packs, graphs: v2.specs }, legacy: legacyCards });
    const provider = EconCatalog.createHttpProvider({ baseUrl: env.baseUrl });
    const results = await Promise.allSettled([EconCatalog.refresh(provider), EconCatalog.refresh(provider)]);
    assert.ok(results.every(r => r.status === "rejected"), "both overlapping refreshes see the failed release");
    env.state.catalog = v2.catalog;
    const good = EconCatalog.createHttpProvider({ baseUrl: env.baseUrl });
    await Promise.all([EconCatalog.refresh(good), EconCatalog.refresh(good)]);
    assert.deepEqual(idsOf(EconCardRepository.list()), ["base-card", "extra-card", "market-card"]);
  } finally {
    await env.close();
  }
});

test("overlapping refreshes serialize; one failing provider never blocks a valid one", async () => {
  const env = await startServer();
  try {
    env.state.catalog = v2.catalog; env.state.graphs = v2.responses;
    const { catalog: EconCatalog, repo: EconCardRepository, window } = bootstrap({ published: { packs: v1.catalog.packs, graphs: v1.specs }, legacy: legacyCards });
    const bad = EconCatalog.createHttpProvider({ baseUrl: env.baseUrl, fetch: () => Promise.reject(new Error("network down")) });
    const good = EconCatalog.createHttpProvider({ baseUrl: env.baseUrl });
    const results = await Promise.allSettled([EconCatalog.refresh(bad), EconCatalog.refresh(good)]);
    assert.equal(results[0].status, "rejected");
    assert.equal(results[1].status, "fulfilled");
    assert.deepEqual(idsOf(EconCardRepository.list()), ["base-card", "extra-card", "market-card"]);
    assert.equal(window.events.at(-1), "econ:catalog-change");
  } finally {
    await env.close();
  }
});

test("provider without listPacks rejects", async () => {
  const { catalog: EconCatalog } = bootstrap({ published: { packs: v1.catalog.packs, graphs: v1.specs }, legacy: legacyCards });
  await assert.rejects(EconCatalog.refresh({}), /listPacks/);
});

test("repository commits packs and graphs atomically and rolls both back on failure", async () => {
  const repo = model.createRepository([pack("p1", [card("c1", "g1")])], { g1: graphSpec("g1") });
  await repo.reload({
    listPacks: async () => [pack("p2", [card("c1", "g2", 2), card("c3")])],
    listGraphs: async () => ({ g2: graphSpec("g2") })
  });
  assert.deepEqual(idsOf(repo.list()), ["c1", "c3"]);
  assert.deepEqual(repo.list().find(c => c.id === "c1").graphSpec, graphSpec("g2"));
  await assert.rejects(repo.reload({
    listPacks: async () => [pack("p3", [card("c1", "g9")]), pack("p4", [card("c3")])],
    listGraphs: async () => ({})
  }), /Missing curated graph g9/);
  assert.deepEqual(idsOf(repo.list()), ["c1", "c3"]);
  assert.deepEqual(repo.list().find(c => c.id === "c1").graphSpec, graphSpec("g2"), "graph registry rolls back with the packs");
});

test("repository reloads serialize in call order under overlap", async () => {
  const repo = model.createRepository([pack("p1", [card("c1")])], {});
  const [a, b] = await Promise.all([
    repo.reload({ listPacks: async () => [pack("p2", [card("c1", null, 2)]), pack("p3", [card("c3")])] }),
    repo.reload({ listPacks: async () => [pack("p4", [card("c1", null, 3), card("c3"), card("c4")])] })
  ]);
  assert.deepEqual(idsOf(a), ["c1", "c3"]);
  assert.deepEqual(idsOf(b), ["c1", "c3", "c4"]);
  assert.deepEqual(idsOf(repo.list()), ["c1", "c3", "c4"]);
});

test("repository graph staging uses the Node graph.js fallback and rejects bad geometry", async () => {
  delete globalThis.EconGraphs;
  try {
    const repo = model.createRepository([pack("p1", [card("c1", "g1")])], { g1: graphSpec("g1") });
    const bad = graphSpec("g2");
    bad.points = [{ id: "pt", label: "P", curve: "g2D", x: 5, y: 50 }];
    await assert.rejects(repo.reload({
      listPacks: async () => [pack("p2", [card("c1", "g2", 2), card("c3")])],
      listGraphs: async () => ({ g2: bad })
    }), /outside axis bounds/);
    assert.deepEqual(idsOf(repo.list()), ["c1"]);
  } finally {
    globalThis.EconGraphs = graphModule;
  }
});

test("reusing one provider loads each new release (revision and graph update)", async () => {
  const env = await startServer();
  try {
    env.state.catalog = v1.catalog; env.state.graphs = v1.responses;
    const { catalog: EconCatalog, repo: EconCardRepository } = bootstrap({ published: { packs: v1.catalog.packs, graphs: v1.specs }, legacy: legacyCards });
    const provider = EconCatalog.createHttpProvider({ baseUrl: env.baseUrl });
    await EconCatalog.refresh(provider);
    assert.equal(EconCardRepository.list().find(c => c.id === "base-card").version, 1);
    env.state.catalog = v2.catalog; env.state.graphs = v2.responses;
    await EconCatalog.refresh(provider);
    assert.deepEqual(idsOf(EconCardRepository.list()), ["base-card", "extra-card", "market-card"]);
    assert.equal(EconCardRepository.list().find(c => c.id === "base-card").version, 2);
    assert.deepEqual(EconCardRepository.list().find(c => c.id === "base-card").graphSpec, graphSpec("supply-demand"));
    env.state.catalog = v3.catalog; env.state.graphs = v3.responses;
    await EconCatalog.refresh(provider);
    const base = EconCardRepository.list().find(c => c.id === "base-card");
    assert.equal(base.version, 3, "a reusable provider sees the next release revision");
    assert.equal(base.graphSpec.title, "supply-demand diagram, updated", "and the updated graph spec");
  } finally {
    await env.close();
  }
});

test("concurrent provider snapshots bind each packs array to its own graphs", async () => {
  const env = await startServer();
  try {
    env.state.catalog = v2.catalog; env.state.graphs = v2.responses;
    const { catalog: EconCatalog } = bootstrap({ published: { packs: v2.catalog.packs, graphs: v2.specs }, legacy: legacyCards });
    const provider = EconCatalog.createHttpProvider({ baseUrl: env.baseUrl });
    const [p1, p2] = await Promise.all([provider.listPacks(), provider.listPacks()]);
    assert.ok(p1 !== p2, "each listPacks stages its own fresh snapshot");
    env.state.catalog = v3.catalog; env.state.graphs = v3.responses; // server moves to a new release
    const g1 = await provider.listGraphs(p1);
    const g2 = await provider.listGraphs(p2);
    const latest = await provider.listGraphs();
    assert.equal(g1["supply-demand"].title, graphSpec("supply-demand").title, "bound packs resolve their own v2 graphs");
    assert.equal(g2["supply-demand"].title, graphSpec("supply-demand").title);
    assert.equal(latest["supply-demand"].title, "supply-demand diagram, updated", "no-arg listGraphs resolves the latest staged release");
  } finally {
    await env.close();
  }
});

test("a valid graph-free catalog loads with zero graph pins", async () => {
  const env = await startServer();
  try {
    env.state.catalog = v0graph.catalog; env.state.graphs = {};
    const { catalog: EconCatalog, repo: EconCardRepository, data } = bootstrap({ published: { packs: [], graphs: {} }, legacy: legacyCards });
    await EconCatalog.refresh(EconCatalog.createHttpProvider({ baseUrl: env.baseUrl }));
    const list = EconCardRepository.list();
    assert.deepEqual(idsOf(list), ["plain-card"]);
    assert.equal(list[0].graphSpec, undefined, "graph-free card has no graph spec");
    assert.deepEqual(idsOf(data.cards), ["legacy-cost", "legacy-scarsity", "plain-card"]);
  } finally {
    await env.close();
  }
});

test("exposed cards and catalog cannot mutate the live registry", async () => {
  const env = await startServer();
  try {
    env.state.catalog = v2.catalog; env.state.graphs = v2.responses;
    const { catalog: EconCatalog, repo: EconCardRepository } = bootstrap({ published: { packs: v2.catalog.packs, graphs: v2.specs }, legacy: legacyCards });
    await EconCatalog.refresh(EconCatalog.createHttpProvider({ baseUrl: env.baseUrl }));
    const base = EconCardRepository.list().find(c => c.id === "base-card");
    const catalogCopy = EconCardRepository.catalog();
    base.sourceRefs[0].page = 99999;
    base.graphSpec.title = "MUTATED";
    catalogCopy.find(p => p.id === "supply-pack").cards[0].sources[0].page = 88888;
    const live = EconCardRepository.list();
    const liveBase = live.find(c => c.id === "base-card");
    assert.equal(liveBase.sourceRefs[0].page, 114, "live sourceRefs are untouched by caller mutation");
    assert.equal(liveBase.graphSpec.title, graphSpec("supply-demand").title, "live graphSpec is untouched by caller mutation");
    assert.equal(EconCardRepository.catalog().find(p => p.id === "supply-pack").cards[0].sources[0].page, 114, "live catalog is untouched by caller mutation");
  } finally {
    await env.close();
  }
});

test("mutating the initial published input after construction cannot alter the live registry", () => {
  const initialPacks = [pack("p1", [card("c1", "g1")])];
  const initialGraphs = { g1: graphSpec("g1") };
  const repo = model.createRepository(initialPacks, initialGraphs);
  initialPacks[0].cards[0].title = "MUTATED";
  initialPacks[0].cards[0].sources[0].page = 99999;
  initialGraphs.g1.title = "MUTATED";
  initialGraphs.g1.review = { status: "draft", reviewer: null };
  const list = repo.list();
  assert.equal(list[0].title, card("c1", "g1").title, "live packs are a copy of the initial input");
  assert.equal(list[0].sourceRefs[0].page, 114, "live sourceRefs are a copy of the initial input");
  assert.equal(list[0].graphSpec.title, graphSpec("g1").title, "live graph registry is a copy of the initial input, not an alias");
});
