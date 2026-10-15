# Architecture Reference

## Swipe Controls

`feed-controls.js` mounts the previous/actions/next rail; `feed-controls.css` defines the portrait reading surface, acrylic action menu and side dial. Both are explicit public preview assets. The swipe view hides workspace headers, navigation strips, feed heading/filters and desktop queue; other views retain them. Card actions, feed selection and appearance remain reachable through the action menu. The dial opens Refresh, Library, Overview, Saved and Studio, with icons inset on its face rather than on its rim.

A tap opens card actions. Holding the center control for 360ms opens the dial; vertical movement selects one view per 46px and release commits it. A hold without movement leaves the dial available for direct selection. Pointer cancellation, lost capture, window blur, hidden document, card change and route rerender dismiss transient controls without navigation. Keyboard users can open Switch view from the menu (or Shift+F10 on the center button), use arrows/Home/End, Enter and Escape. Event listeners/timers are disposed on rerender. The component owns no persisted learning state: actions use existing app handlers, and bookmark/manual revisit never create FSRS reviews.

Touch-driven dial selection changes request an optional 8ms vibration, capped at one request per 50ms. Mouse/keyboard interaction and reduced-motion preference do not trigger vibration. Dismissal/disposal cancels a requested pulse. Missing, denied or throwing Vibration APIs never block navigation; physical feedback is device/browser dependent and unavailable in iOS Safari. Browser tests stub API requests, not physical motor behavior.

## Runtime

This is a static browser application. There is no application package manifest, build pipeline, backend or database. `index.html` loads relative assets so the same files work at the GitHub Pages project path. `TikTok Econ.html` preserves legacy links through a redirect.

`theme.js` runs in the head before styles to initialize appearance and menu preference. Styles load in order: `styles.css`, `acrylic.css`, `theme.css`, `graph.css`, `feed-controls.css`. Later layers override earlier ones; changing base CSS alone may not change the final component.

Deferred scripts run in document order: vendored Lucide, FSRS and D3, then `graph.js`, legacy `content.js`, `card-model.js`, selected `content/*.js` packs, `content-bootstrap.js`, `learning.js`, `refresh.js`, `decisions.js` and `app.js`. Keep that dependency order. These browser scripts expose globals rather than using a bundler. Several logic modules also export CommonJS interfaces for Node tests.

## Ownership and Data Flow

`card-model.js` defines versioned knowledge-card packs shared by the frontend and private authoring CLI. `content/*.js` contains selected public projections; `content-bootstrap.js` loads them through `EconCardRepository` and preserves legacy cards outside current coverage. A future backend provider can replace these files using `listPacks()` and `EconCatalog.refresh(provider)` without changing card rendering. Private drafts/reviews remain separate; see [Content pipeline](CONTENT_PIPELINE.md). The prototype does not yet have an authenticated backend.

```text
content.js ----------------------------> app.js -> feed/library/dialog DOM
localStorage -> learning.js ------------> app.js -> local personal library
localStorage -> refresh.js -------------> app.js -> exposure/preferences
decisions.js ---------------------------> app.js -> local submission checks
reviewed built-in graphSpec -> graph.js + D3 ----> bounded SVG
theme.js -> data-theme -> theme.css / graph.css -> appearance
```

`app.js` handles routing, DOM rendering, feed observation, dialogs, search and personal submission review. It combines built-in cards with locally approved personal submissions. An opened point requires at least 65% intersection with the feed viewport; this is an exposure signal, not evidence of comprehension.

`decisions.js` provides local screening and a future provider boundary. No live AI request is enabled. FSRS is retained for legacy state and a possible separate recall mode; the current refresh feed does not collect recall ratings.

## Persistent State

| Key | Owner | Meaning |
| --- | --- | --- |
| `econ-workspace-v2` | `learning.js`, saved by `app.js` | Legacy reviews/scheduling, saved cards and personal submissions. |
| `econ-refresh-v1` | `refresh.js`, saved by `app.js` | Opened timestamps and explicit revisit/confusing preferences. |
| `econ-theme-v1` | `theme.js` | Explicit light/dark choice; otherwise follow the OS. |
| `econ-menu-hidden-v1` | `theme.js` | Navigation collapse preference. |

Storage is browser-profile and origin local, not an authenticated shared record. `file:`, localhost (including different ports) and GitHub Pages are different storage contexts; do not expect progress to move between them. Storage failures fall back to in-memory behavior; changes may then last only for the visit.

Study settings export `{ learning, browsing }` as JSON. Theme and menu preferences are not included. There is no app import/restore interface; do not describe export as a complete one-click backup. Reset reviews is narrower than clearing browser storage and keeps saved cards/submissions; do not use it to reset browsing preferences.

## Visual Paths

The app supports three diagram paths:

1. Selected permitted textbook PNGs in `assets/diagrams/`, with accessible descriptions, light paper, contain fitting and enlargement.
2. Existing illustrative canvas diagrams drawn by `app.js`; their theme-dependent colors are redrawn when appearance changes.
3. Declarative native SVG through `graph.js` and pinned D3 scales. Activation requires a built-in card, `review.status: "reviewed"`, a nonempty reviewer, and valid geometry. Private drafts and local submissions do not self-activate.

Graph specifications contain bounded data, not executable equations, scripts or arbitrary styles. CSS semantic graph roles determine colors, including separate consumer/producer surplus fills. Optional plot aspect ratios preserve source proportions; detached arrows occupy bounded annotation margins without invented curve anchors. Schematic coordinates describe layout, not measurements. See [Graph workflow](GRAPH_WORKFLOW.md) for the specification and human review process.

## Publication and Private Processing

GitHub Pages publishes the configured `main` branch root. The local preview's allowlist is a separate protection, not a Pages deployment filter. Any committed file in the publication source must be treated as potentially public. Git ignore rules prevent accidental staging; they do not authorize reuse or restrict HTTP access.

Private OCR tooling prepares page images/text and lets the existing Pi model inspect and transcribe bounded batches. Accepted transcripts queue final referenced diagram crops for reconstruction in the same session. OCR checkpoints and graph checkpoints are independent; graph failure must not rewind accepted transcription. Outputs remain under private source directories and require human review. A public clone does not include the Pi configuration or corpus. See [OCR operations](OCR_OPERATIONS.md).

Future accounts, shared moderation and Jev require server authority. The contracts in [Jev integration](JEV_INTEGRATION.md) and [deployment plan](DEPLOYMENT_PLAN.md) are plans, not implemented services. Never place credentials in client scripts to simulate that architecture.
