# Jev integration boundary

## Current state

The app has **no live AI**. The refresh feed does not call answer assessment. `decisions.js` performs deterministic local screening (missing fields, short text, exact duplicates) and exposes a provider boundary for a future service. When no provider is available, the result is explicitly `unavailable` or `unassessed`, not a simulated grade.

## Product rule

AI is **advisory**. It may suggest whether a written answer meets rubric points, or flag ambiguity, level fit or source support. It must not:

- approve publication or teacher verification;
- change a recall schedule or create a review;
- silently replace the reference explanation;
- turn an uncertain or failed response into a pass.

A human reviewer remains the authority. The feed must stay usable when the provider times out, is rate-limited, returns malformed output or is disabled.

## Backend responsibilities

The browser must never hold a vendor key or private source context. A future authenticated backend:

- retrieves the canonical card version, rubric and authorized reference material instead of trusting client-supplied answer keys;
- retrieves duplicate candidates and source support itself instead of trusting a client list;
- sends narrow, typed questions (Choice/Score) for rubric satisfaction, ambiguity, level fit and evidence support;
- validates the provider response, maps it into the application contract and records model/rubric/source versions, result, request ID and reviewer action;
- enforces authentication, authorization, per-user quotas, rate limits, timeouts and a kill switch;
- minimizes retention of student free text and keeps source material within its permitted use.

Treat student answers and submissions as untrusted data, not instructions. Do not accept arbitrary models, prompts, source paths or tools from the client.

## Application contract

Proposed application routes, not vendor endpoints:

- `POST /api/decisions/assess-answer` with schema version, card ID/version and answer. The server resolves the canonical question, reference answer and rubric.
- `POST /api/decisions/screen-submission` with schema version and the submitted card. The server resolves duplicate candidates and source support.

Normalized assessment states: `correct`, `partial`, `incorrect` or `unassessed`. Rubric matches are zero-based indexes into the canonical versioned rubric; out-of-range indexes are rejected. Unavailable, failed or uncertain judgments normalize to `unavailable`/`unassessed`, no confidence and an empty match list.

Normalized screening states: `complete` with allowed flags (`missing_source`, `short_question`, `short_answer`, `duplicate_question`, `ambiguous`, `unsupported`, `level_mismatch`), confidence or null, correctness `supported`/`unsupported`/`unassessed`, and **always** `requiresHumanReview: true`. The service forces human review even if a provider says otherwise. High confidence is not permission to publish.

The browser validates response shape and bounds, uses a short timeout and falls back to the local provider. It never treats an assessment as a scheduling instruction. `createHttpProvider({ baseUrl })` is an unused transport adapter for our own backend, not a vendor URL.

## Evaluation

Use a held-out set graded by the teacher to choose confidence thresholds. Do not hard-code an arbitrary percentage as proof of correctness. Track false approvals, false rejections, abstention, SL/HL errors, latency and cost. Keep a disable switch.

Until that evaluation and the backend exist, no AI result should appear in the product.

## Research references

Reviewed 2026-10-03; confirm current contracts at implementation:

- [TypeSafe introduction](https://docs.typesafe.ai/introduction)
- [TypeSafe documentation index](https://docs.typesafe.ai/llms.txt)
- [TypeSafe confidence](https://docs.typesafe.ai/confidence)
- [TypeSafe API reference](https://docs.typesafe.ai/api)

This is an application boundary, not a claim that a vendor has validated the educational use case.
