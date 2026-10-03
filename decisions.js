(function (root) {
  "use strict";
  // A future authenticated backend owns Jev credentials, source retrieval,
  // response validation and audit records. The app only uses this contract.
  const localProvider = {
    async assessAnswer() {
      return {
        status: "unavailable",
        provider: "local",
        verdict: "unassessed",
        confidence: null,
        rubricMatches: [],
      };
    },
    async screenSubmission({ card, existingCards }) {
      const normalize = (text) =>
        text.toLowerCase().replace(/\s+/g, " ").trim();
      const flags = [];
      if (!card.source?.trim()) flags.push("missing_source");
      if (card.question.trim().length < 20) flags.push("short_question");
      if (card.answer.trim().length < 30) flags.push("short_answer");
      if (
        existingCards.some(
          (c) => normalize(c.question) === normalize(card.question),
        )
      )
        flags.push("duplicate_question");
      return {
        status: "complete",
        provider: "local",
        flags,
        confidence: null,
        correctness: "unassessed",
        requiresHumanReview: true,
      };
    },
  };
  function validateAssessment(result) {
    if (
      !result ||
      !["complete", "unavailable"].includes(result.status) ||
      !["correct", "partial", "incorrect", "unassessed"].includes(
        result.verdict,
      )
    )
      throw new Error("Invalid assessment response");
    if (
      result.confidence !== null &&
      (!Number.isFinite(result.confidence) ||
        result.confidence < 0 ||
        result.confidence > 1)
    )
      throw new Error("Invalid confidence");
    if (
      !Array.isArray(result.rubricMatches) ||
      !result.rubricMatches.every(Number.isInteger)
    )
      throw new Error("Invalid rubric matches");
    return result;
  }
  async function bounded(request, timeoutMs) {
    let timer;
    try {
      return await Promise.race([
        request,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Decision timed out")),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  function createService(provider = localProvider, { timeoutMs = 5000 } = {}) {
    return {
      async assessAnswer(input) {
        try {
          return validateAssessment(
            await bounded(provider.assessAnswer(input), timeoutMs),
          );
        } catch {
          return localProvider.assessAnswer(input);
        }
      },
      async screenSubmission(input) {
        try {
          const result = await bounded(
            provider.screenSubmission(input),
            timeoutMs,
          );
          const allowed = [
            "missing_source",
            "short_question",
            "short_answer",
            "duplicate_question",
            "ambiguous",
            "unsupported",
            "level_mismatch",
          ];
          if (
            !result ||
            result.status !== "complete" ||
            !Array.isArray(result.flags) ||
            !result.flags.every((f) => allowed.includes(f))
          )
            throw new Error("Invalid screening response");
          if (
            result.confidence !== null &&
            (!Number.isFinite(result.confidence) ||
              result.confidence < 0 ||
              result.confidence > 1)
          )
            throw new Error("Invalid confidence");
          if (
            !["supported", "unsupported", "unassessed"].includes(
              result.correctness,
            )
          )
            throw new Error("Invalid correctness value");
          return { ...result, requiresHumanReview: true };
        } catch {
          return {
            ...(await localProvider.screenSubmission(input)),
            status: "fallback",
          };
        }
      },
    };
  }
  // Optional transport for a future application backend, not api.typesafe.ai.
  // No vendor keys or private source excerpts belong in browser configuration.
  function createHttpProvider({ baseUrl, fetchImpl = fetch }) {
    async function post(path, input) {
      const response = await fetchImpl(
        `${baseUrl.replace(/\/$/, "")}/${path}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schemaVersion: 1, ...input }),
          signal: AbortSignal.timeout(4500),
        },
      );
      if (!response.ok) throw new Error("Decision service unavailable");
      return response.json();
    }
    return {
      assessAnswer: (input) => post("assess-answer", input),
      screenSubmission: (input) => post("screen-submission", input),
    };
  }
  root.EconDecisions = { createService, createHttpProvider, localProvider };
  if (typeof module !== "undefined" && module.exports)
    module.exports = root.EconDecisions;
})(globalThis);
