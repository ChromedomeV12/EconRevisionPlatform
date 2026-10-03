(function (root) {
  "use strict";
  const engine =
    typeof module !== "undefined" && module.exports
      ? require("./vendor/fsrs.js")
      : root.FSRS;
  const scheduler = engine.fsrs({ enable_fuzz: false });
  const empty = () => ({
    version: 2,
    cards: {},
    logs: [],
    saved: [],
    submissions: [],
    goal: 5,
    legacySeen: [],
  });
  function dayKey(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function restoreCard(card, now = new Date()) {
    if (!card) return engine.createEmptyCard(now);
    return {
      ...card,
      due: new Date(card.due),
      ...(card.last_review ? { last_review: new Date(card.last_review) } : {}),
    };
  }
  function load(storage) {
    const fallback = empty();
    try {
      const raw = storage.getItem("econ-workspace-v2");
      if (!raw) {
        const legacy = JSON.parse(
          storage.getItem("ibdp-econ-swipe-progress") || "[]",
        );
        fallback.legacySeen = Array.isArray(legacy)
          ? legacy.filter((x) => typeof x === "string")
          : [];
        return fallback;
      }
      const value = JSON.parse(raw);
      if (
        value?.version !== 2 ||
        !value.cards ||
        Array.isArray(value.cards) ||
        typeof value.cards !== "object"
      )
        return fallback;
      const cards = Object.fromEntries(
        Object.entries(value.cards).filter(
          ([, c]) =>
            c &&
            Number.isFinite(new Date(c.due).getTime()) &&
            [0, 1, 2, 3].includes(c.state) &&
            [
              "stability",
              "difficulty",
              "reps",
              "lapses",
              "elapsed_days",
              "scheduled_days",
            ].every((key) => Number.isFinite(c[key]) && c[key] >= 0),
        ),
      );
      return {
        ...fallback,
        cards,
        goal: Math.max(1, Math.min(30, Number(value.goal) || 5)),
        saved: Array.isArray(value.saved)
          ? value.saved.filter((x) => typeof x === "string")
          : [],
        logs: Array.isArray(value.logs)
          ? value.logs.filter(
              (x) =>
                x &&
                typeof x.id === "string" &&
                Number.isFinite(new Date(x.at).getTime()) &&
                [1, 2, 3, 4].includes(x.rating),
            )
          : [],
        submissions: Array.isArray(value.submissions)
          ? value.submissions.filter(
              (x) =>
                x &&
                typeof x.id === "string" &&
                typeof x.question === "string" &&
                typeof x.answer === "string" &&
                typeof x.title === "string" &&
                ["pending", "approved", "returned"].includes(x.status),
            )
          : [],
        legacySeen: Array.isArray(value.legacySeen) ? value.legacySeen : [],
      };
    } catch {
      return fallback;
    }
  }
  function queue(cards, state, now = new Date()) {
    const due = cards
      .filter(
        (c) => state.cards[c.id] && new Date(state.cards[c.id].due) <= now,
      )
      .sort(
        (a, b) =>
          new Date(state.cards[a.id].due) - new Date(state.cards[b.id].due),
      );
    return [...due, ...cards.filter((c) => !state.cards[c.id])];
  }
  function rate(state, id, rating, now = new Date()) {
    if (![1, 2, 3, 4].includes(rating))
      throw new Error("Invalid recall rating");
    const outcome = scheduler.next(
      restoreCard(state.cards[id], now),
      now,
      rating,
    );
    state.cards[id] = outcome.card;
    state.logs.push({
      id,
      rating,
      at: now.toISOString(),
      due: outcome.card.due.toISOString(),
    });
    return outcome;
  }
  function preview(state, id, now = new Date()) {
    return scheduler.repeat(restoreCard(state.cards[id], now), now);
  }
  function stats(state, cards, now = new Date()) {
    const ids = new Set(cards.map((c) => c.id));
    const logs = state.logs.filter((l) => ids.has(l.id));
    const today = logs.filter((l) => dayKey(l.at) === dayKey(now)).length;
    const dates = new Set(logs.map((l) => dayKey(l.at)));
    let streak = 0;
    const cursor = new Date(now);
    if (!dates.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dates.has(dayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return {
      today,
      streak,
      total: logs.length,
      recall: logs.length
        ? Math.round(
            (logs.filter((l) => l.rating >= 3).length / logs.length) * 100,
          )
        : null,
      due: cards.filter(
        (c) => state.cards[c.id] && new Date(state.cards[c.id].due) <= now,
      ).length,
      fresh: cards.filter((c) => !state.cards[c.id]).length,
      reviewed: cards.filter((c) => state.cards[c.id]).length,
    };
  }
  root.EconLearning = { empty, load, rate, queue, preview, stats, dayKey };
  if (typeof module !== "undefined" && module.exports)
    module.exports = root.EconLearning;
})(globalThis);
