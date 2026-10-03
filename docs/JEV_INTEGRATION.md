# Jev integration plan

The demo runs without AI or a backend. `decisions.js` is the application boundary for adding Jev later. It currently performs deterministic completeness and exact-duplicate checks; free-text answers are self-assessed. No model output, confidence, or teacher approval is simulated.

## Responsibilities

| Decision | Owner | Integration point |
| --- | --- | --- |
| When a card is due | FSRS, based on the learner's explicit rating | `learning.js`: `rate`, `preview`, `queue` |
| Whether a written answer meets a rubric | Future Jev service, advisory only | `assessAnswer` on answer reveal |
| Submission ambiguity, source support, level fit | Future Jev service with approved reference context | `screenSubmission` before entering the review queue |
| Exact duplicate and missing fields | Local code today; server validation in production | Local screening provider |
| Permission to publish and teacher approval | Authorized human reviewer | Future authenticated server action |

Do not ask Jev to invent a retention schedule or silently change a student's recall rating. An incorrect answer can suggest a follow-up card later, but eligibility still comes from the deterministic due queue. Ranking due cards is a possible later experiment, not implemented here.

## Browser contract

`createService(provider)` wraps a provider with a five-second timeout, response validation, and local fallback. `createHttpProvider({ baseUrl })` is an unused transport adapter for our own backend. It sends credentialed JSON requests with a 4.5-second abort signal. Never point it directly at TypeSafe or expose a vendor key in browser code. The default app creates the local provider and makes no AI network requests.

Proposed application endpoints, **not existing TypeSafe endpoints**:

- `POST /api/decisions/assess-answer`: `schemaVersion`, `cardId`, `cardVersion`, `answer`. The prototype also supplies the question, reference answer and rubric. A production server must retrieve these from its canonical card version and must not trust client-provided answer keys.
- `POST /api/decisions/screen-submission`: `schemaVersion`, `card`, `existingCards`. A production server must retrieve duplicate candidates and reference sources itself, rather than trusting the client list.

Normalized answer assessment:

```json
{
  "status": "complete",
  "provider": "jev",
  "verdict": "partial",
  "confidence": 0.76,
  "rubricMatches": [0, 1]
}
```

`verdict` is `correct`, `partial`, `incorrect`, or `unassessed`. Unavailable, failed, or uncertain judgments must normalize to `status: unavailable`, `verdict: unassessed`, `confidence: null`, and an empty match list. Rubric matches are zero-based indexes into the canonical versioned rubric. The backend must reject out-of-range indexes. The browser never treats this response as a scheduling instruction.

Normalized submission assessment:

```json
{
  "status": "complete",
  "provider": "jev",
  "flags": ["ambiguous"],
  "confidence": 0.81,
  "correctness": "unassessed",
  "requiresHumanReview": true
}
```

Allowed flags are defined in `decisions.js`. Source support is not the same as truth, and high confidence is not permission to publish. The service always forces human review even if a provider returns `requiresHumanReview: false`.

## Backend implementation

1. Add user authentication, server-enforced teacher roles, persistence, revision IDs, and separate draft/review/published states. Local approval in this demo is personal-only and is not a security boundary.
2. Keep the TypeSafe API key in server environment variables. Fix the model version in server configuration. Do not accept arbitrary models, instructions, source paths, or tools from submissions.
3. Retrieve only material authorized for the service. The Git-ignored private collection is not implicitly authorized for remote processing or public retrieval. Public-use permission remains separate from factual review.
4. Use narrow TypeSafe Choice or Score questions for rubric satisfaction, ambiguity, level fit, and support by the supplied evidence. Treat student answers and submissions as untrusted data, not instructions.
5. Validate TypeSafe responses, map them into the contracts above, and record model version, rubric version, source IDs, result, request ID, and reviewer action. Minimize retention of student free text.
6. Use a held-out set graded by the teacher to choose confidence thresholds. Do not hard-code an arbitrary percentage as proof of correctness. Track false approvals, false rejections, abstention, SL/HL errors, latency, and cost.
7. Keep a switch to disable AI. On timeout, rate limit, invalid output, or uncertain evidence, keep the reference explanation available and route submissions to human review. Avoid showing an unavailable check as a pass.

## TypeSafe references

Reviewed 2026-10-03. Confirm the current API and model contract when implementing the backend.

- [Introduction and primitives](https://docs.typesafe.ai/introduction)
- [Documentation index](https://docs.typesafe.ai/llms.txt)
- [Confidence](https://docs.typesafe.ai/confidence)
- [API reference](https://docs.typesafe.ai/api)

The integration here is an application interface, not a claim that TypeSafe has validated this educational use case.
