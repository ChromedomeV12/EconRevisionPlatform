(() => {
  "use strict";
  // This delivery adapter is replaceable by an authenticated backend provider.
  const HEX64 = /^[0-9a-f]{64}$/;
  const GRAPH_ID = /^[a-z][a-z0-9-]{0,63}$/;
  const GRAPH_RESPONSE_FIELDS = ["schemaVersion", "id", "revision", "hash", "spec"];
  const CATALOG_FIELDS = ["schemaVersion", "release", "editorialStatus", "packs", "graphs"];
  const DRAFT_STATUS = "Editorial draft; not teacher verified";
  const sha256Hex = async text => {
    const subtle = globalThis.crypto?.subtle ?? (typeof require === "function" ? require("node:crypto").webcrypto.subtle : null);
    if (!subtle) throw new Error("WebCrypto SHA-256 unavailable");
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  };
  const graphValidate = () => {
    if (globalThis.EconGraphs && typeof globalThis.EconGraphs.validate === "function") return globalThis.EconGraphs.validate.bind(globalThis.EconGraphs);
    if (typeof require === "function") { try { return require("./graph.js").validate; } catch (_) { return null; } }
    return null;
  };
  const validateEnvelope = catalog => {
    if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) throw new Error("Catalog must be a JSON object");
    for (const key of Object.keys(catalog)) if (!CATALOG_FIELDS.includes(key)) throw new Error(`Unknown catalog field: ${key}`);
    if (catalog.schemaVersion !== 1) throw new Error("Unsupported catalog schemaVersion");
    if (typeof catalog.editorialStatus !== "string" || catalog.editorialStatus !== DRAFT_STATUS) throw new Error("Catalog editorialStatus must be the exact draft status with no verification claims");
    if (!Array.isArray(catalog.packs)) throw new Error("Catalog packs are required");
    if (!Array.isArray(catalog.graphs)) throw new Error("Catalog graph pins are required");
    if (typeof catalog.release !== "string" || !HEX64.test(catalog.release)) throw new Error("Catalog release must be 64 lowercase hex characters");
    const pinIds = new Set();
    for (const pin of catalog.graphs) {
      if (!pin || typeof pin !== "object" || Array.isArray(pin)) throw new Error("Invalid graph pin");
      for (const key of Object.keys(pin)) if (!["id", "revision", "hash"].includes(key)) throw new Error(`Unknown graph pin field: ${key}`);
      if (typeof pin.id !== "string" || !GRAPH_ID.test(pin.id) || ["constructor", "prototype", "__proto__"].includes(pin.id)) throw new Error("Invalid graph pin id");
      if (pinIds.has(pin.id)) throw new Error(`Duplicate graph pin ${pin.id}`);
      pinIds.add(pin.id);
      if (!Number.isInteger(pin.revision) || pin.revision < 1 || pin.revision > 1000000) throw new Error(`Invalid graph pin revision for ${pin.id}`);
      if (typeof pin.hash !== "string" || !HEX64.test(pin.hash)) throw new Error(`Invalid graph pin hash for ${pin.id}`);
    }
    return catalog;
  };
  const verifyRelease = async catalog => {
    const pins = [...catalog.graphs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const digest = await sha256Hex(EconCards.canonical({ packs: catalog.packs, graphs: pins }));
    if (digest !== catalog.release) throw new Error("Catalog release hash mismatch");
  };
  const stageGraphs = async (catalog, fetchJson) => {
    const validate = graphValidate();
    if (!validate) throw new Error("Graph validator unavailable");
    const graphs = {};
    for (const pin of catalog.graphs) {
      const body = await fetchJson(`/graphs/${encodeURIComponent(pin.id)}/${pin.revision}`);
      for (const key of Object.keys(body)) if (!GRAPH_RESPONSE_FIELDS.includes(key)) throw new Error(`Unknown graph response field for ${pin.id}: ${key}`);
      if (body.schemaVersion !== 1 || body.id !== pin.id || body.revision !== pin.revision) throw new Error(`Invalid graph response for ${pin.id}`);
      if (typeof body.hash !== "string" || body.hash !== pin.hash) throw new Error(`Graph hash mismatch for ${pin.id}`);
      const digest = await sha256Hex(EconCards.canonical(body.spec));
      if (digest !== body.hash) throw new Error(`Graph spec hash mismatch for ${pin.id}`);
      const result = validate(body.spec);
      if (!result.valid) throw new Error(`Invalid graph ${pin.id}: ${result.errors.join("; ")}`);
      if (body.spec.review.status !== "reviewed" || typeof body.spec.review.reviewer !== "string" || !body.spec.review.reviewer.trim()) throw new Error(`Graph ${pin.id} requires a reviewed status and nonempty reviewer`);
      graphs[pin.id] = body.spec;
    }
    return graphs;
  };
  // A provider is reusable: every listPacks() fetches a fresh release end to
  // end (catalog, exact editorial status, release hash, and every pinned graph
  // at its exact revision with canonical SHA-256 and geometry checks) before
  // exposing anything. The staged graph snapshot is keyed by the returned packs
  // array, so listGraphs(packs) resolves the one snapshot bound to those exact
  // packs and overlapping refreshes can never observe a mixed pack/graph state.
  // A no-arg listGraphs() stages a fresh snapshot for direct callers.
  const createHttpProvider = ({ baseUrl, fetch } = {}) => {
    if (typeof baseUrl !== "string" || (!/^[a-z][a-z0-9+.-]*:\/\//.test(baseUrl) && !baseUrl.startsWith("/"))) throw new Error("baseUrl must be an absolute API root or a same-origin path");
    const base = baseUrl.replace(/\/+$/, "");
    const doFetch = typeof fetch === "function" ? fetch : globalThis.fetch;
    const fetchJson = async path => {
      if (typeof doFetch !== "function") throw new Error("fetch is unavailable");
      const response = await doFetch(base + path, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
      const body = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(`Invalid JSON body for ${path}`);
      return body;
    };
    const copy = value => JSON.parse(JSON.stringify(value));
    const graphByPacks = new WeakMap();
    const build = async () => {
      const catalog = validateEnvelope(await fetchJson("/catalog"));
      await verifyRelease(catalog);
      const staged = { packs: catalog.packs, graphs: await stageGraphs(catalog, fetchJson) };
      graphByPacks.set(staged.packs, staged.graphs);
      return staged;
    };
    return Object.freeze({
      listPacks: async () => (await build()).packs,
      listGraphs: async packs => {
        if (packs !== undefined && graphByPacks.has(packs)) return copy(graphByPacks.get(packs));
        return copy((await build()).graphs);
      }
    });
  };
  try {
    const payload = globalThis.EconPublished || { packs: [], graphs: {} };
    const repository = EconCards.createRepository(payload.packs, payload.graphs);
    const legacy = EconData.cards;
    const curated = repository.list(), ids = new Set(curated.map(c => c.id));
    globalThis.EconCardRepository = repository;
    EconData.cards = [...curated, ...EconData.cards.filter(c => !ids.has(c.id))];
    globalThis.EconCatalog = Object.freeze({
      async refresh(provider) {
        const next = await repository.reload(provider), nextIds = new Set(next.map(c => c.id));
        EconData.cards = [...next, ...legacy.filter(c => !nextIds.has(c.id))];
        window.dispatchEvent(new Event("econ:catalog-change"));
      },
      createHttpProvider
    });
  } catch (error) {
    console.error("Curated catalog unavailable; retaining sample cards.", error);
  }
})();
