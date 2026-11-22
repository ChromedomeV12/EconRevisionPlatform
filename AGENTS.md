# AGENTS.md

## Purpose

Maintain a static, refresh-first IBDP Economics study app: one knowledge point per screen, explanation immediately visible, deeper notes optional. The dashboard, library and local card studio support the feed; they do not replace it. Content is an editorial draft, not teacher-verified or an official syllabus.

Read [docs/README.md](docs/README.md) for the documentation philosophy and [docs/DECISIONS.md](docs/DECISIONS.md) before reversing a major choice. Then read the guide for the surface you will touch.

## Hard constraints

- Keep the demo static and GitHub Pages friendly. Vanilla JavaScript; no application build, framework, server runtime or database. Add a dependency only for a demonstrated need.
- Keep progress in localStorage. Browsing, saving and revisiting are exposure/preferences, not recall. Only explicit recall ratings may alter FSRS history.
- Keep the feed first. Explanation is visible per card; deeper notes stay behind Closer look. Do not add compulsory questions, answer reveals or mastery scores to the MVP.
- Keep submitted strings and stored data untrusted: validate structurally and escape for the rendering context.
- Keep private source PDFs, transcripts, crops, drafts, credentials and machine-local runtimes out of the public repository and deployed site. `.gitignore` is not HTTP access control.
- Treat content review and reuse permission as separate human gates. An agent, validator, OCR acceptance or graph audit cannot approve or publish.
- Accessibility, keyboard alternatives, visible focus, reduced motion/transparency and readable contrast are requirements.

## Repositories and workspaces

- This normal checkout is the demo-ready frontend on `main`; use feature branches and PRs.
- Use the linked `m1` worktree for backend-integrated frontend testing. Keep its `.git` metadata machine-local; repair or recreate it with Git, never by copying `.git` files. Do not retire the lane without the owner.
- The Node/SQLite API lives in the separate `EconRevisionPlatform-backend` repository. Do not add backend code to the static app.
- Private OCR/authoring files live only in the normal checkout through the private sync. See [Architecture](docs/ARCHITECTURE.md#repositories-and-working-copies).

## Change rules

- Add structured content through the card model, not scattered markup. Keep stable IDs and exact source references; increase revisions when published wording changes. Preserve existing section anchors unless a deliberate compatibility change updates their links.
- Use semantic theme tokens and the documented surface ownership. Do not add remote fonts. Preserve light diagram paper.
- Keep one source of truth for state. Do not fabricate activity, reviews or mastery. Empty states may be empty.
- Update the guide whose requirement, boundary, command, state key or permission changed. Explain why, not code call order.

## Verification

Choose checks by the changed surface; see [Testing](docs/TESTING.md). At minimum:

```sh
node --test tests/*.test.cjs
git diff --check
```

Run browser/layout/theme/navigation suites for UI changes and inspect screenshots. Run graph/private OCR checks only on a privately synced checkout. State what was run, what passed and what remains unverified. Green checks do not establish economic correctness, teacher approval or reuse rights.

## Private OCR and graphs

Read [OCR operations](docs/OCR_OPERATIONS.md), [Content pipeline](docs/CONTENT_PIPELINE.md), [Graph workflow](docs/GRAPH_WORKFLOW.md) and the relevant project skill before private work.

- One writer across synced machines; no parallel inference, extra model server or automatic startup. Use standalone `node` on PATH, not the harness executable.
- Preserve provenance hashes, accepted artifacts and immutable submissions. Never rewrite accepted transcripts or delete checkpoints/locks to hide a failure.
- Respect saved ranges and budgets. A resource, vision, provider or context failure stays pending; it is never a `no_card` decision. Only an explicit human continuation resets a batch.
- Acceptance is structural, not accuracy. Teacher review and publication permission remain human decisions. Never run approval/export commands or fabricate reviewer identities.
- Use cross-platform filenames: ASCII letters, digits, `-`, `_`, `.`; UTC `YYYYMMDDTHHMMSSZ`; reject Windows-reserved characters/device names, trailing dots/spaces, control characters and case-only collisions. Inspect new paths before reporting completion.

## Git and hosting

`main` is protected. Commit explicit public files on a feature branch, open a PR, pass required checks and resolve review threads. Do not commit private material, credentials or generated screenshots. After merge, verify GitHub Pages built the merged `main` commit, not merely that an older deployment succeeded. See [Git workflow](docs/GIT_WORKFLOW.md) and [Repository security](docs/REPOSITORY_SECURITY.md).

## Documentation

Docs record the user need, requirements, decisions, rejected alternatives and invariants. Code, config, tests and `--help` own mechanics. Keep guides concise; link instead of duplicating. See [Documentation](docs/README.md).
