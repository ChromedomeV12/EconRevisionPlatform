# Econ / Quick Refresh

A static IBDP Economics refresher for short, repeated study. The feed shows one knowledge point per screen with its explanation immediately visible; deeper notes, saving and revisit choices support it. The dashboard and library are secondary.

The live demo is <https://ChromedomeV12.github.io/EconRevisionPlatform/>.

## Who it is for

Students who want a fast refresher between lessons, and a teacher who needs a readable, reviewable prototype rather than another course platform. The content is an independent educational draft, not a verified syllabus or a replacement for a textbook.

## The learning bet

- **One idea per swipe.** A point, an explanation and one visual. Closer look holds the deeper notes and provenance.
- **Short and repeatable beats comprehensive.** The feed is designed for a few minutes at a time, not a long session.
- **Exposure is not mastery.** Opening, saving or revisiting a point is a browsing signal. The MVP does not collect recall ratings, infer a schedule from swipes, or show a mastery score.
- **Explicit choices stay explicit.** Saved and Revisit are user decisions, not a retention algorithm.

## Current scope

Included: the refresh feed, optional introduction, library/search, dashboard, saved and revisit lists, personal card studio, local persistence, light/dark appearance and native review-gated diagrams.

Not in the MVP: compulsory questions, answer reveals, recall ratings, accounts, cross-device progress, shared moderation, live AI, or server-side student records. These need a backend and separate decisions; see the [deployment plan](docs/DEPLOYMENT_PLAN.md) and [Jev boundary](docs/JEV_INTEGRATION.md).

The public demo is a static GitHub Pages site. It has no build step, package manager, server runtime or database. Progress is stored in the browser's localStorage and is local to that browser, origin and device.

## Content and rights

Cards are independently worded editorial drafts with exact source references where applicable. Publication requires two separate human decisions: editorial/content review and reuse permission. A passing test, OCR acceptance, graph audit or attribution does not perform either gate. Teacher verification remains pending unless established separately.

Selected textbook diagram extracts have owner-confirmed public reuse permission; the wider source collection does not. See [content records](content/README.md) and [content pipeline](docs/CONTENT_PIPELINE.md).

## Run and verify

Open `index.html` directly, or run a loopback-only preview:

```sh
node scripts/serve.cjs 4181
```

The preview serves an explicit public allowlist, not the workspace root. Verification is risk-based; see [Testing](docs/TESTING.md). CI runs public unit tests, syntax checks and packaging boundaries in `verify`, plus a separate `adaptive-browser` job. Other browser and private OCR checks run locally.

## Documentation

Start with the [documentation index](docs/README.md). The [decision log](docs/DECISIONS.md) explains why the product is shaped this way. Contributors should read [Contributing](CONTRIBUTING.md), [Architecture](docs/ARCHITECTURE.md) and [Git workflow](docs/GIT_WORKFLOW.md). Private operators use [OCR operations](docs/OCR_OPERATIONS.md) and [Graph workflow](docs/GRAPH_WORKFLOW.md).

Repository roles: this checkout is the demo-ready frontend; the linked `m1` worktree tests backend integration; the Node/SQLite API lives in the separate `EconRevisionPlatform-backend` repository. See [repositories and working copies](docs/ARCHITECTURE.md#repositories-and-working-copies).

## Deployment

`main` deploys through GitHub Pages after a reviewed pull request passes the required checks. Only committed files are published. See [Git workflow](docs/GIT_WORKFLOW.md) and [repository security](docs/REPOSITORY_SECURITY.md).
