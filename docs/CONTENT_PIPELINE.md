# Content pipeline

## Editorial goal

Each card teaches **one declarative economics idea** with an immediately visible explanation. Copy is independently written, source-pinned where applicable, and honest about uncertainty. Cards are revision material, not a syllabus, textbook substitute or practice-question bank.

Publication requires two separate human decisions:

1. **Editorial review** — correctness, scope, assumptions, level and diagram fidelity.
2. **Reuse permission** — a documented right to distribute the text/asset to the intended audience.

Attribution, OCR acceptance, a passing validator or a graph audit does none of these. Teacher verification remains pending unless established separately.

## Card requirements

A card has a stable ID, positive revision, unit, topic, library title, one declarative headline, an immediate summary, deeper notes, a compact takeaway, a misconception caution, exact sources, a provisional level, related IDs and a curated graph reference or null.

- Use exact source IDs and PDF-viewer pages, never private file paths. The static prototype accepts the configured textbook IDs or an original contribution.
- Keep syllabus level provisional. Do not introduce HL calculations or claim official mapping from an incomplete guide.
- Render strings as escaped text. No executable HTML, raw SVG, graph code, private images or inline graph specs.
- Keep one idea per swipe. No answer reveal or compulsory practice gate is introduced by the MVP.
- Prefer a few useful points over a forced target. A page may yield one card or none.

## Private authoring

Card drafting is part of the integrated OCR workflow, not a separate slash command. Accepted transcription leads to graph reconstruction and then private card submission in the same bounded session. Per page, produce 1–3 useful points or a source-pinned content-only no-card decision.

A card-page task is stable per page. Its packet pins accepted transcript/graph hashes and lists nearby submitted coverage, a `unitHint` and non-blocking warnings. Use them to avoid repeated points and classification drift, not as approval. Compare public packs too.

Private drafts and `author-notes.json` hold assumptions, source conflicts and concerns. Submit saves an immutable `submitted_needs_review` snapshot. Changing submitted content requires a higher revision and a new snapshot. Never overwrite or delete history to hide a duplicate; flag it for human selection.

Manual operator tooling for larger packs remains available:

```sh
node scripts/card-work.cjs init PACK TB-01 START END LIMIT
node scripts/card-work.cjs packet PACK
node scripts/card-work.cjs validate PACK
node scripts/card-work.cjs audit [BOOK [START [END]]]
node scripts/card-work.cjs submit PACK
```

`validate` returns non-blocking warnings for unit drift, universal claims and unpinned forward references. `audit` is a read-only listing of submitted cards, no-card pages, hashes and warnings. Neither approves nor publishes.

## Budgets and recovery

The page, graph and card budgets survive compaction and restarts. At most three card-producing page tasks complete per explicit batch. A `no_card_needed` page is tracked separately and does not consume a card slot; a revision of an already-counted page does not add one. The page batch still caps total pages. Only an explicit human continuation resets a batch.

After interruption, call `ocr_recovery`, then resume its exact card page. Re-read the draft, notes and pinned sources/render images; hashes override summaries. If submit completed before the reply was lost, the matching immutable snapshot is already recognized and authoring is not repeated.

Initialization repairs missing templates only; surviving malformed drafts remain for careful repair. Stale source/graph hashes block submission rather than silently refreshing provenance. `no_card_needed` requires front matter, no knowledge point or a specific duplicate-coverage reason; tool, vision, context, provider or budget failures stay pending. A no-card record pins the manifest and cannot replace existing work.

## Human selection and projection

The operator reads the exact submitted revision and private notes, refines wording if needed, verifies graph fidelity and assumptions, and confirms reuse permission. Then:

```sh
node scripts/card-work.cjs review PACK SUBMISSION_SHA "Reviewer name" --permission-confirmed
node scripts/card-work.cjs export PACK SUBMISSION_SHA
```

Review binds the exact hash and source manifest. Export emits selected card data and native graph geometry only; it excludes transcripts, private paths, concerns, review logs and screenshots. Existing public projections are archived privately before replacement. Add new pack scripts to `index.html` and the preview allowlist through a reviewed public change.

The CLI flags are operator controls, not authentication. The local owner can alter files; do not expose this CLI as a production API.

## Backend transition

The static pack files are an interim delivery adapter. A backend should own card revisions, drafts, evidence, reviews and publication decisions for 1.0.0. The browser contract remains pack-shaped: a provider returns validated pack DTOs; `EconCatalog.refresh(provider)` replaces content without touching recall history, and malformed responses leave the current catalog intact.

A future server boundary should keep transitions explicit and auditable:

| Route | Responsibility |
| --- | --- |
| `GET /api/v1/catalog` | Return visible published revisions, cursor/ETag, approved graph refs and public citations. |
| `GET /api/v1/graphs/:id/:revision` | Return reviewed, publication-cleared geometry; never private crops or executable SVG. |
| `POST /api/v1/submissions` | Validate the shared contract; assign author from identity, not JSON; support idempotency. |
| `PATCH /api/v1/submissions/:id` | Author-owned revision with optimistic concurrency; content changes invalidate review. |
| `POST /api/v1/submissions/:id/reviews` | Authorized reviewer records a decision against exact hashes; authors cannot approve themselves. |
| `POST /api/v1/publications` | Publisher verifies editorial decision, permission, revision and graph clearance before publishing. |

Server authority must enforce roles, tenant scope, rate/size limits and CSRF protections. Teacher approval and reuse permission remain separate. An AI recommendation is an untrusted suggestion, not a transition authority.

The device-local Card Studio is a personal author/review experience. Its approval means personal-library use only; it is not the production moderation database.

## Verification

Run `node --test tests/card-model.test.cjs tests/card-work.test.cjs`, the public unit suite, and browser/theme/navigation/image checks after delivery changes. Inspect new cards in both themes at mobile and desktop widths, including enlargement, notes, citations and escaping. Run the Pi loader test after extension changes. No test grants teacher approval or broad reuse permission.
