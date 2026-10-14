# Content Pipeline

## Ownership

Cards are versioned domain data, not scattered markup. `card-model.js` is the shared browser/Node contract and validator. `content/*.js` are selected delivery projections grouped into topic packs. `content-bootstrap.js` adapts those packs to the current app and retains legacy sample cards outside the new coverage. Card IDs remain stable; revisions increase when published wording changes. Browsing/recall state is never manufactured or migrated merely because content changes.

The current public demo includes 13 independently worded points and 11 selected native graph specifications. These are editorial drafts, not teacher-verified material. Their selected publication was explicitly authorized by the owner on 2026-10-14. This does not clear source PDFs, transcripts, other crops or the remaining graph queue. See [delivery records](../content/README.md).

## Common Contract

A version-1 pack has `schemaVersion`, `id`, `title`, `cards`. Each card has:

- Stable `id`, positive `revision`, `unit`, `topic`, library `title`.
- One declarative `headline` (130 characters), immediate `summary` (480), deeper `notes` (1600), compact `takeaway`, and misconception `caution`.
- `sources:[{id,page,figure?}]`: bibliography IDs and exact PDF viewer pages, never file paths. The static prototype accepts TB-01/TB-02 or an original contribution. A production source catalog must register additional teacher sources before expanding this vocabulary.
- Explicit provisional `level`, `related` IDs, and a curated registry `graphId` or null. No executable HTML, raw SVG, graph code, private images or inline graphSpec are submission fields.

Strings are rendered as escaped text. Validation is neither economics verification nor publication permission. Qualitative cards should not introduce HL calculations or claim official syllabus mapping from the incomplete source collection. Keep one idea per swipe; no answer reveal or practice gate is introduced.

## Private Authoring

```text
/author-cards demand-next TB-01 113 126 4
```

This project-local Pi command initializes a bounded private pack, then asks the existing model/session to follow `econ-authoring`. At most 30 viewer pages and 8 cards per invocation. It does not run at startup, launch another model, install tools, continue OCR or publish. It is a separate explicit stage after transcription/reconstruction, so it cannot silently spend the OCR batch's inference budget.

The equivalent local tooling is:

```sh
node scripts/card-work.cjs init demand-next TB-01 113 126 4
node scripts/card-work.cjs packet demand-next
node scripts/card-work.cjs validate demand-next
node scripts/card-work.cjs submit demand-next
```

The packet lists accepted transcript paths/hashes and completed graph references. Missing pages are listed, not invented or transcribed again. The agent edits only the private draft and `author-notes.json`. It records assumptions, source conflicts and concerns separately from public copy. It must inspect graph labels before linking them to a claim. Submit saves an immutable `submitted_needs_review` snapshot; it does not approve or activate cards.

After interruption, re-read `packet`, the draft/notes and relevant accepted sources. Hashes override summaries. Existing batches are not overwritten; source or graph edits invalidate their provenance. Changed submitted card content requires a higher revision. Do not reset OCR markers or edit accepted transcripts to recover authoring.

## Human Selection and Projection

The operator reads the exact submitted revision and private notes, refines wording as needed, verifies graph fidelity/assumptions, and confirms reuse permission. Only then:

```sh
node scripts/card-work.cjs review demand-next SUBMISSION_SHA "Reviewer name" --permission-confirmed
node scripts/card-work.cjs export demand-next SUBMISSION_SHA
```

Replace `SUBMISSION_SHA` with the exact hash returned by submit. Review binds that hash and source-manifest hash. Teacher verification remains pending unless established separately. The local model is instructed never to invoke these commands or fabricate reviewer identities. These CLI flags are operator controls, not authentication: the local owner can alter files, so do not expose this CLI as a production API.

Export emits only selected card data and native graph geometry. It excludes transcript contents, file paths, author concerns, review logs and source screenshots. Existing public projections are archived privately before a reviewed replacement. Add new pack scripts to `index.html` and the explicit preview allowlist; this registration remains a contributor action. Commit only public projection/code/docs/tests through a reviewed PR. Never stage `private-sources/` or `.pi/`.

## Backend Compatibility for 1.0.0

The static packs are an interim delivery adapter, not the future authoring database. `EconCards.createRepository` supplies `list`, `catalog`, and atomic `reload(provider)`. A provider implements `listPacks()` returning the same validated pack DTOs. `EconCatalog.refresh(provider)` replaces app content and re-renders without touching recall history. Malformed responses leave the current catalog intact. Source and graph registries must be delivered/resolved separately; unreviewed user graph data never enters the curated registry automatically.

For 1.0.0, move card revisions, drafts, private evidence, reviews and publication decisions into backend storage. Remove the `content/*.js` scripts from the frontend deployment; load selected card DTOs through the provider. Public/authorized visitors can inspect any card text/geometry delivered to their browser. Backend ownership protects unpublished records and enforces access, not secrecy of rendered pixels/text.

Proposed HTTP boundary (not yet a deployed backend):

| Route | Server responsibility |
| --- | --- |
| `GET /api/v1/catalog` | Return visible published pack/card revisions, cursor/ETag, approved graph references and public source citations only. |
| `GET /api/v1/graphs/:id/:revision` | Return reviewed, publication-cleared declarative geometry; never original private crops or arbitrary executable SVG. |
| `POST /api/v1/submissions` | Validate the shared card contract, source ownership and tenant scope; assign author from authenticated identity, not JSON. Support idempotency keys. |
| `PATCH /api/v1/submissions/:id` | Author-owned draft/revision edit with optimistic concurrency; changing content invalidates previous review. |
| `POST /api/v1/submissions/:id/reviews` | Authorized teacher/editor records approval or changes requested against exact content/graph hashes. Authors cannot approve themselves. |
| `POST /api/v1/publications` | Publisher role verifies editorial decision, permissions, revision/hash and graph clearance before atomically publishing. |

Keep `draft -> submitted -> changes_requested/approved -> published` transitions server-authoritative and auditable, with author/editor/publisher roles enforced from verified sessions and tenant membership. Teacher approval and reuse permission are separate decisions. Never trust client status, reviewer names or `--permission-confirmed` equivalents. Use immutable revisions, schema versioning, rate/size limits, CSRF protections where applicable, and server-side validation even though the browser validates too. An AI or Jev recommendation is an untrusted suggestion, not a transition authority.

The existing Card Studio is a device-local author/review experience. New entries use the same card DTO, but approval still means personal-library use only; it neither publishes nor creates teacher authority. Its legacy `pending/returned/approved` state is not the production moderation database. Replace its persistence adapter with authenticated submission endpoints when a backend is introduced.

## Verification

Run `node --test tests/card-model.test.cjs tests/card-work.test.cjs`, the full public unit suite, and browser/theme/navigation/image checks after delivery changes. Check every new card in both themes and mobile/desktop, including graph zoom, immediate explanation, notes, citations and local submission escaping. Run the Pi loader test after extension changes. No test result grants teacher approval or broad source reuse permission.
