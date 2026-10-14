(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EconCards = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ID = /^[a-z][a-z0-9-]{0,63}$/;
  const safeId = value => typeof value === "string" && ID.test(value) && !["constructor", "prototype", "__proto__"].includes(value);
  function plainJson(value, seen = new Set(), depth = 0, budget = { left: 12000 }) {
    if (--budget.left < 0 || depth > 8) return false;
    if (value === null || typeof value === "string" || typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (!value || typeof value !== "object" || seen.has(value)) return false;
    const array = Array.isArray(value);
    if (array ? value.length > 128 : Object.getPrototypeOf(value) !== Object.prototype) return false;
    seen.add(value);
    const keys = Reflect.ownKeys(value);
    if (keys.length > 129 || (array && keys.length !== value.length + 1)) return false;
    for (const key of keys) {
      if (array && key === "length") continue;
      const d = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== "string" || !d.enumerable || !("value" in d) || (array && !/^(0|[1-9]\d*)$/.test(key)) || !plainJson(d.value, seen, depth + 1, budget)) return false;
    }
    seen.delete(value); return true;
  }
  const FIELDS = ["id", "revision", "unit", "topic", "title", "headline", "summary", "notes", "takeaway", "caution", "related", "sources", "level", "graphId"];
  function validateCard(card) {
    const errors = [];
    if (!plainJson(card) || !card || Array.isArray(card) || typeof card !== "object") return { valid: false, errors: ["Card must be bounded plain JSON"] };
    for (const field of Object.keys(card)) if (!FIELDS.includes(field)) errors.push(`Unknown card field: ${field}`);
    const string = (key, limit, optional = false) => {
      if (optional && card[key] === "") return;
      if (typeof card[key] !== "string" || !card[key].trim() || card[key].length > limit || /[\x00-\x1f\x7f]/.test(card[key])) errors.push(`Invalid ${key} (maximum ${limit} characters)`);
    };
    string("id", 64); if (!safeId(card.id)) errors.push("Invalid card id");
    if (!Number.isInteger(card.revision) || card.revision < 1 || card.revision > 1000000) errors.push("Revision must be a bounded positive integer");
    if (!["intro", "micro", "macro", "global"].includes(card.unit)) errors.push("Unknown unit");
    for (const [key, limit] of [["topic", 80], ["title", 80], ["headline", 130], ["summary", 480], ["notes", 1600]]) string(key, limit);
    string("takeaway", 150, true); string("caution", 400, true);
    if (!["common-core-provisional", "sl-provisional", "hl-provisional", "unmapped"].includes(card.level)) errors.push("Explicit provisional syllabus level required");
    if (!Array.isArray(card.related) || card.related.length > 8 || card.related.some(id => !safeId(id)) || new Set(card.related).size !== card.related.length) errors.push("Invalid related IDs");
    if (!Array.isArray(card.sources) || !card.sources.length || card.sources.length > 8) errors.push("One to eight source references required");
    else for (const source of card.sources) {
      if (!source || Object.getPrototypeOf(source) !== Object.prototype || Object.keys(source).some(k => !["id", "page", "figure"].includes(k)) || !/^(TB-0[12]|original)$/.test(source.id) || (source.id === "original" ? source.page !== null : !Number.isInteger(source.page) || source.page < 1 || source.page > 99999) || (source.figure !== undefined && (typeof source.figure !== "string" || source.figure.length > 40))) errors.push("Invalid source reference; use IDs and PDF viewer pages, never private file paths");
    }
    if (card.graphId !== null && !safeId(card.graphId)) errors.push("Graph reference must be a registry ID or null");
    return { valid: !errors.length, errors };
  }
  function validatePack(pack) {
    const errors = [];
    if (!plainJson(pack) || !pack || pack.schemaVersion !== 1 || !safeId(pack.id) || typeof pack.title !== "string" || !pack.title.trim() || pack.title.length > 100 || !Array.isArray(pack.cards) || !pack.cards.length || pack.cards.length > 40 || Object.keys(pack).some(k => !["schemaVersion", "id", "title", "cards"].includes(k))) return { valid: false, errors: ["Invalid version-1 card pack (1..40 cards)"] };
    const ids = new Set();
    for (const card of pack.cards) {
      errors.push(...validateCard(card).errors.map(e => `${card?.id || "card"}: ${e}`));
      if (ids.has(card?.id)) errors.push(`Duplicate card: ${card?.id}`);
      ids.add(card?.id);
    }
    return { valid: !errors.length, errors };
  }
  function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
    return JSON.stringify(value);
  }
  function runtimeCard(card, graphs) {
    const validation = validateCard(card);
    if (!validation.valid) throw new Error(validation.errors.join("; "));
    const graph = card.graphId && Object.hasOwn(graphs, card.graphId) ? graphs[card.graphId] : null;
    if (card.graphId && !graph) throw new Error(`Missing curated graph ${card.graphId}`);
    return { id: card.id, version: card.revision, unit: card.unit, topic: card.topic, title: card.title,
      refresh: { headline: card.headline, summary: card.summary }, question: card.headline, answer: card.notes,
      takeaway: card.takeaway, trap: card.caution, rubric: [], related: card.related,
      visual: "custom", graphSpec: graph || undefined, editorialStatus: "Editorial draft; not teacher verified",
      syllabusLevel: card.level, sourceRefs: card.sources,
      source: card.sources.map(s => s.id === "original" ? "Original authored explanation" : `${s.id}${s.id === "TB-01" ? ": Hoang, Wray & Chakraborty, Economics for the IB Diploma (2020)" : ""}, PDF viewer page ${s.page}${s.figure ? `, Figure ${s.figure}` : ""}`).join("; ") };
  }
  function createRepository(initialPacks = [], graphs = {}) {
    let packs = [];
    const replace = next => {
      if (!plainJson(next) || !Array.isArray(next) || next.length > 50) throw new Error("Invalid pack catalog");
      const seen = new Set();
      const copy = JSON.parse(JSON.stringify(next));
      for (const pack of copy) {
        const result = validatePack(pack); if (!result.valid) throw new Error(result.errors.join("; "));
        for (const card of pack.cards) { if (seen.has(card.id)) throw new Error(`Duplicate catalog card ${card.id}`); seen.add(card.id); runtimeCard(card, graphs); }
      }
      packs = copy;
    };
    replace(initialPacks);
    return Object.freeze({ list: () => packs.flatMap(p => p.cards.map(c => runtimeCard(c, graphs))),
      catalog: () => JSON.parse(JSON.stringify(packs)),
      async reload(provider) { const next = await provider.listPacks(); replace(next); return this.list(); } });
  }
  return Object.freeze({ validateCard, validatePack, canonical, runtimeCard, createRepository });
});
