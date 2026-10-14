(() => {
  "use strict";
  // This delivery adapter is replaceable by an authenticated backend provider.
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
      }
    });
  } catch (error) {
    console.error("Curated catalog unavailable; retaining sample cards.", error);
  }
})();
