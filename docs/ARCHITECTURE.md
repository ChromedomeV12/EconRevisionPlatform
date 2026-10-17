# Architecture Reference

## Swipe Controls

In compact/portrait feeds, `feed-controls.js` mounts the previous/actions/next rail; `feed-controls.css` defines the portrait reading surface, acrylic action menu and side dial. Both are explicit public preview assets. The swipe view hides workspace headers, navigation strips, feed heading/filters and desktop queue; other views retain them. Card actions, feed selection and appearance remain reachable through the action menu. The dial opens Refresh, Library, Dashboard, Saved and Studio, with icons inset on its face rather than on its rim.

A tap opens card actions. Holding the center control for 360ms opens the dial; vertical movement selects one view per 46px and release commits it. A hold without movement leaves the dial available for direct selection. Pointer cancellation, lost capture, window blur, hidden document, card change and route rerender dismiss transient controls without navigation. Keyboard users can open Switch view from the menu (or Shift+F10 on the center button), use arrows/Home/End, Enter and Escape. Event listeners/timers are disposed on rerender. The component owns no persisted learning state: actions use existing app handlers, and bookmark/manual revisit never create FSRS reviews.

Touch-driven dial selection changes request an optional 8ms vibration, capped at one request per 50ms. Mouse/keyboard interaction and reduced-motion preference do not trigger vibration. Dismissal/disposal cancels a requested pulse. Missing, denied or throwing Vibration APIs never block navigation; physical feedback is device/browser dependent and unavailable in iOS Safari. Browser tests stub API requests, not physical motor behavior.

## Runtime

This is a static browser application. There is no application package manifest, build pipeline, backend or database. `index.html` loads relative assets so the same files work at the GitHub Pages project path. `TikTok Econ.html` preserves legacy links through a redirect.

`theme.js` and `adaptive-layout.js` run synchronously in the head before styles to initialize appearance/menu preference and viewport presentation respectively. Styles load in order: `styles.css`, `acrylic.css`, `theme.css`, `graph.css`, `feed-controls.css`. Later layers override earlier ones; changing base CSS alone may not change the final component.

Deferred scripts run in document order: vendored Lucide, FSRS and D3, then `graph.js`, legacy `content.js`, `card-model.js`, selected `content/*.js` packs, `content-bootstrap.js`, `learning.js`, `refresh.js`, `decisions.js` and `app.js`. Keep that dependency order. These browser scripts expose globals rather than using a bundler. Several logic modules also export CommonJS interfaces for Node tests.

## Routes and Workspace Navigation

Empty and unrecognized hashes enter `#feed`; existing compatibility aliases still work. `#welcome` is an optional introduction, not a gate before studying. The brand and the menu's **About this study space** link open it explicitly. `#progress` opens the dashboard: actual browsing statistics precede the continuation entry and topic catalog. A continuation uses the last opened point, not a predicted recall schedule. `#units`, `#saved` and `#studio` retain their existing routes.

The shared header sits outside `.workspace-layout`. There is one `#workspaceMenu`, not cloned desktop/mobile navigation: `theme.js` moves it into the native `#mobileMenu` dialog at widths up to 1023px and on the introduction at every width. Other wide views use the collapsible sidebar. The saved desktop collapse preference is applied in the head before styles load; drawer-open state is temporary and never overwrites it.

Escape, the close button and backdrop dismissal return focus to the menu toggle. The open drawer locks background page scrolling and contains its own overflow. Selecting a route closes the drawer and focuses the new main content; Study settings closes the drawer before opening the settings dialog. Open dialogs suppress the feed's global arrow/Page Up/Page Down shortcuts. The skip link focuses the current main content without changing the hash or route.


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

## Adaptive Presentation

`adaptive-layout.js` sets `html[data-layout]` before styles and first paint using the layout viewport's CSS-pixel width and height. It uses no user-agent detection, device list or stored layout preference. The initial body is the feed shell; deferred `app.js` resolves the route as usual.

| Geometry | Presentation | Rationale |
| --- | --- | --- |
| Width < 600px | Swipe | Reading and conventional workspace controls compete for space even in a short window. |
| Width 600–999px, width/height < 1.2 | Swipe | Portrait tablets and tall narrow windows get the focused reader. Square windows are included. |
| Width 600–999px, height ≤ 500px | Swipe | Landscape phones keep the touch rail and can scroll long card bodies. |
| All other sizes | Desktop | A 1000px viewport always has room for the conventional workspace; medium landscape tablets/windows use it at ratios ≥ 1.2. |

Thus 768×1024 and 844×390 use swipe; 1024×768, 1000×1400 and 900×600 use desktop. Exactly 600px enters the ratio test, exactly 1.2 selects desktop unless the short-screen rule applies, and exactly 1000px selects desktop. These are presentation choices for windows as well as devices: a sufficiently narrow desktop window deliberately gets swipe. The desktop queue collapses below 1280px in the redesigned frame; navigation, title bar, filters and conventional actions remain available.

On coarse-pointer devices, height-only resize events retain the chosen layout until width or orientation changes, so browser chrome and software keyboards cannot change it. Height-only changes while an editable control is focused also retain it on fine-pointer devices. Explicit `screen.orientation` changes reevaluate geometry. Desktop height resizing otherwise reevaluates the ratio. No `visualViewport` resize listener is used; keyboard/zoom changes to the visual viewport alone do not change presentation. Viewport height can still change the reading surface and scroll area.

`feed-controls.css` scopes the PR #9 distraction-free presentation to swipe. Desktop presentation/controls were recovered from `0397980`, the parent of merge `1dd2a55`; current content, graph gates, scheduling and action logic remain in place. Both presentations use one card DOM, catalog, session, `feedFilter`, learning/browsing state and delegated actions. After bookmark/revisit/confusing actions, `syncCardPreferences` updates every matching card control, including the hidden presentation: desktop buttons use `aria-pressed`, menu checkboxes use `aria-checked`. CSS `display: none` removes the alternate controls from keyboard and accessibility navigation; IDs are not duplicated.

Geometry notifications pause feed intersection observation, dismiss menus/dials (including active pointer capture/haptics), and re-anchor the existing active card on the next frame before observation resumes. A `ResizeObserver` covers workspace width changes such as menu collapse. The feed is not rendered again to switch layout. Reattaching observation to that same card during geometry changes does not rewrite its opened timestamp. Each newly rendered feed has a pending first exposure, so initial load, filter rendering and returning from another view still record the first card that reaches 65% visibility even if the initial size-observer callback runs first. Pending geometry from the replaced feed is cancelled. Focus moves to the feed if the previously focused control becomes hidden; an open dialog retains focus and returns to the feed on close if its opener became hidden. Layout changes do not write persistent preferences or recall history.

## Persistent State

| Key | Owner | Meaning |
| --- | --- | --- |
| `econ-workspace-v2` | `learning.js`, saved by `app.js` | Legacy reviews/scheduling, saved cards and personal submissions. |
| `econ-refresh-v1` | `refresh.js`, saved by `app.js` | Opened timestamps and explicit revisit/confusing preferences. |
| `econ-theme-v1` | `theme.js` | Explicit light/dark choice; otherwise follow the OS. |
| `econ-menu-hidden-v1` | `theme.js` | Desktop sidebar collapse preference; temporary drawer state is not persisted. |

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
