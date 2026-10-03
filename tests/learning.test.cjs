const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../learning.js");
const { createService } = require("../decisions.js");
const now = new Date("2030-05-10T12:00:00Z");
test("Only a recall rating updates the FSRS schedule; Again is earlier than Easy", () => {
  const again = L.empty(),
    easy = L.empty();
  L.rate(again, "a", 1, now);
  L.rate(easy, "a", 4, now);
  assert.equal(again.logs.length, 1);
  assert.ok(new Date(again.cards.a.due) < new Date(easy.cards.a.due));
  const serialized = JSON.stringify(again);
  const restored = L.load({ getItem: () => serialized });
  L.rate(restored, "a", 3, new Date("2030-05-11T12:00:00Z"));
  assert.equal(restored.cards.a.reps, 2);
});
test("Due cards precede new cards; future reviews stay out of the queue", () => {
  const state = L.empty();
  L.rate(state, "future", 4, now);
  L.rate(state, "due", 1, new Date("2030-05-09T12:00:00Z"));
  assert.deepEqual(
    L.queue([{ id: "new" }, { id: "future" }, { id: "due" }], state, now).map(
      (c) => c.id,
    ),
    ["due", "new"],
  );
});
test("Legacy learned flags are preserved as seen, not fabricated recall history", () => {
  const state = L.load({
    getItem: (key) =>
      key === "ibdp-econ-swipe-progress" ? '["inflation"]' : null,
  });
  assert.deepEqual(state.legacySeen, ["inflation"]);
  assert.equal(L.stats(state, [{ id: "inflation" }], now).total, 0);
});
test("Corrupt storage does not prevent opening the app", () => {
  assert.deepEqual(L.load({ getItem: () => "{broken" }), L.empty());
  assert.deepEqual(
    L.load({
      getItem: () => {
        throw new Error("blocked");
      },
    }),
    L.empty(),
  );
});
test("Recall stats are derived from actual logs, including yesterday streak", () => {
  const state = L.empty();
  L.rate(state, "a", 3, new Date("2030-05-09T12:00:00Z"));
  L.rate(state, "b", 1, new Date("2030-05-09T12:01:00Z"));
  const stats = L.stats(state, [{ id: "a" }, { id: "b" }], now);
  assert.equal(stats.recall, 50);
  assert.equal(stats.streak, 1);
  assert.equal(stats.today, 0);
});
test("Local screening flags duplicate and absent sources without claiming correctness", async () => {
  const result = await createService().screenSubmission({
    card: {
      question: "What is inflation?",
      answer: "Prices rise.",
      source: "",
    },
    existingCards: [{ question: "What is inflation?" }],
  });
  assert.ok(result.flags.includes("duplicate_question"));
  assert.ok(result.flags.includes("missing_source"));
  assert.equal(result.correctness, "unassessed");
  assert.equal(result.requiresHumanReview, true);
});
test("Provider failure and malformed AI output fall back to self assessment", async () => {
  const throwing = createService({
    assessAnswer: async () => {
      throw new Error("offline");
    },
  });
  assert.equal((await throwing.assessAnswer({})).verdict, "unassessed");
  const malformed = createService({
    assessAnswer: async () => ({
      status: "complete",
      verdict: "correct",
      confidence: 5,
      rubricMatches: [],
    }),
  });
  assert.equal((await malformed.assessAnswer({})).status, "unavailable");
});
test("A provider cannot bypass human review", async () => {
  const service = createService({
    screenSubmission: async () => ({
      status: "complete",
      flags: [],
      confidence: 0.8,
      correctness: "supported",
      requiresHumanReview: false,
    }),
  });
  const result = await service.screenSubmission({
    card: {
      question: "A long question here?",
      answer: "Reference answer",
      source: "Original",
    },
    existingCards: [],
  });
  assert.equal(result.requiresHumanReview, true);
});
test("A stalled provider cannot block the study flow", async () => {
  const service = createService(
    { assessAnswer: () => new Promise(() => {}) },
    { timeoutMs: 5 },
  );
  assert.equal((await service.assessAnswer({})).status, "unavailable");
});
