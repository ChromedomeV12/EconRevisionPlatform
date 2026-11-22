# Architecture

This guide records the system boundaries and the reasons they exist. It does not narrate call order or CSS implementation; the source, tests and command help own those details.

## Product boundaries

The public product is a static frontend that runs without a backend. It owns the feed, browsing state, appearance and local personal library. The optional API owns shared content, identity and AI only when a backend is justified. Private OCR and graph work is an operator workflow, not part of the public runtime. See [DECISIONS.md](DECISIONS.md) for the choices behind these boundaries.

## Repositories and Working Copies

Use two repositories with three active working directories:

| Directory | Owns | Branch |
| --- | --- | --- |
| `EconRevisionPlatform` | Browser UI, shared card/graph contracts, public demo content, private local authoring tools | `main`; feature branches through PRs |
| `EconRevisionPlatform-m1` | Backend-integrated frontend for cross-repository testing; linked worktree of the frontend repository | `m1` |
| `EconRevisionPlatform-backend` | Node/SQLite API, stored content revisions, server migrations and future authenticated workflows | Its own `main`; feature branches through PRs |

Frontend `main` stays demo-ready without the backend. The long-lived `m1` integration branch receives frontend updates from `main` while preserving backend adapters; it is tested against the backend before pushing. Promote reviewed integration changes to `main` when deployment needs them. Retiring the `m1` lane is an owner decision, not routine cleanup.

Use a Git worktree for `m1`, not a second clone. A linked worktree shares the main repository's object store. Keep the worktree directory and its `.git` metadata out of folder sync; both are machine-local.

```sh
git fetch origin
git worktree add --track -b m1 ../EconRevisionPlatform-m1 origin/m1
```

If local `m1` exists without an attached worktree, attach it with `git worktree add ../EconRevisionPlatform-m1 m1`. Stop if the destination already contains files or the branch is checked out elsewhere; inspect rather than replace either. If a worktree was created on another OS or moved, run `git worktree repair <path>` from the main checkout. Do not copy `.git` worktree pointer files between machines. Restore private authoring files only in the normal frontend checkout; see [OCR operations](OCR_OPERATIONS.md).

## Runtime boundaries

The frontend has no build step, package manager, server runtime or database. `index.html` loads relative assets so the same files work under the GitHub Pages project path; `TikTok Econ.html` preserves legacy links. Appearance and layout initialization run before first paint, while the application scripts expose globals rather than using a bundler. Keep the load order in `index.html` consistent when adding a runtime asset.

The browser stores convenience state; it does not hold server authority. The backend, when present, owns identity, shared content, moderation and credentials. The private operator workflow owns source processing and evidence, not publication.

## State ownership

| Key | Owner | Meaning |
| --- | --- | --- |
| `econ-workspace-v2` | `learning.js`, saved by `app.js` | Legacy reviews/scheduling, saved cards and personal submissions. |
| `econ-refresh-v1` | `refresh.js`, saved by `app.js` | Opened timestamps and explicit revisit/confusing preferences. |
| `econ-theme-v1` | `theme.js` | Explicit light/dark choice; otherwise follow the OS. |
| `econ-menu-hidden-v1` | `theme.js` | Desktop sidebar collapse preference; temporary drawer state is not persisted. |

Storage is browser-profile and origin local. `file:`, localhost ports and GitHub Pages are different contexts. Storage failures fall back to in-memory behavior. Export is not a complete backup, and there is no import/restore UI; do not describe it as one.

**Exposure is not recall.** Opened timestamps and saved/revisit choices are browsing signals. Only an explicit recall rating may alter FSRS history. Never derive reviews from swipes, views or automated assessments. See [DECISIONS.md](DECISIONS.md#d4-exposure-is-not-recall).

## Rendering and visual paths

The app supports three visual paths:

1. Selected permitted textbook PNGs with accessible descriptions, light paper and enlargement.
2. Illustrative canvas diagrams drawn by the app and redrawn on theme changes.
3. Declarative native SVG through `graph.js` and pinned D3 scales.

Native graphs activate only for a built-in card with `review.status: "reviewed"`, a nonempty reviewer and valid geometry. Private drafts and local submissions do not self-activate. Graph specifications contain bounded data, not executable equations, scripts or styles. CSS semantic roles own colors; schematic coordinates describe layout, not measurements. See [Graph workflow](GRAPH_WORKFLOW.md).

## Surface and Proportion Ownership

Workspace wrappers (`.workspace-layout`, `.shell`, `main`) are unframed layouts, not cards. Workspace shells, including Refresh, and the inline sidebar are transparent; only the sidebar separator remains. Shared surface defaults use `:where()` so a grouped selector cannot raise the specificity of every card and wrapper. Component rules own actual card surfaces, borders and insets. Keep app-only graph controls in `theme.css`, not the renderer stylesheet, so a control change does not invalidate private renderer evidence.

The inline sidebar aligns to the start of its grid row and sizes to its content on every workspace route. The viewport-locked Refresh frame must not stretch it and push Study settings below its position elsewhere. Narrow layouts use the shared menu drawer. The desktop workspace reserves the navigation column and gutter; library grids size from available content width rather than a fixed column count. Card actions stay in one row. Compact-height desktop feeds reduce diagram height and spacing while keeping actions and text reachable.

`tests/layout.cjs` guards these boundaries in all six views, both themes and six widths. Passing metrics do not approve an unintended design; inspect screenshots as well.

## Swipe interaction

Compact and portrait feeds use a previous/actions/next rail and a hold/drag view dial; desktop uses the conventional workspace. The rail keeps the feed reachable on touch screens, and the dial switches views without cloning a separate mobile navigation. Both presentations share one card DOM, actions and state. Pointer cancellation, keyboard alternatives, focus restoration and reduced-motion behavior are required. Interaction never creates recall state; bookmark and revisit use the existing explicit handlers.

## Routes

`#feed` is the default. `#welcome` is an optional introduction, `#progress` is the browsing dashboard, `#units` is the library, `#saved` is the personal library and `#studio` is the card studio. Unknown hashes fall back to the feed; `TikTok Econ.html` preserves legacy links. Route changes do not imply recall or mastery.

## Appearance and type

The feed is the fast surface; the dashboard, library and studio stay serious, readable and teacher-friendly. Knowledge headlines and library titles use a Georgia/system serif; interface headings use Manrope; body text uses DM Sans; feed position counters use system monospace. Keep letter spacing at zero and do not add remote fonts. Light mode uses the Catppuccin Latte palette, dark mode Mocha, through semantic theme tokens rather than hard-coded component colors. Diagrams keep light paper in both modes. Dialogs have a fixed serif-title header and independently scrolling content. Reduced-motion and reduced-transparency preferences are honored.

These are product requirements, not decoration: the app is used for sustained reading on varied screens, and the approved appearance should survive refactors.

## Adaptive presentation

`adaptive-layout.js` sets `html[data-layout]` before styles and first paint from the layout viewport's CSS-pixel width and height. It uses no user-agent detection, device list or stored preference.

| Geometry | Presentation | Why |
| --- | --- | --- |
| Width < 600px | Swipe | Conventional workspace controls compete with reading space. |
| Width 600–999px and width/height < 1.2 | Swipe | Portrait tablets and tall narrow windows get the focused reader. |
| Width 600–999px and height ≤ 500px | Swipe | Landscape phones keep the touch rail; long bodies scroll. |
| All other sizes | Desktop | There is room for the conventional workspace. |

Presentation is a choice about the window, not a claim about the device. Both presentations share one card DOM, catalog, session, filters, actions and learning/browsing state; switching layout does not rewrite exposure, saved/revisit choices or recall history. Height-only browser chrome or keyboard changes retain the chosen layout where the geometry contract requires it. Physical keyboard/browser chrome and vibration still need a real-device spot check.

## Publication and private processing

GitHub Pages publishes the configured `main` root. The local preview's allowlist is a separate protection, not a Pages filter. Treat every committed file in the publication source as potentially public. Git ignore rules prevent accidental staging; they do not restrict HTTP access or authorize publication.

Private OCR prepares page images and text for bounded model-assisted transcription; selected diagram crops enter private graph reconstruction. Accepted OCR is not accurate transcription or publication approval, and graph work never rewinds OCR checkpoints. Outputs stay in private source directories under human review. A public clone does not include the corpus or Pi configuration. See [OCR operations](OCR_OPERATIONS.md).

Future accounts, shared moderation and AI require server authority. The contracts in [Jev integration](JEV_INTEGRATION.md) and [deployment plan](DEPLOYMENT_PLAN.md) are plans, not services. Never put credentials in client code to simulate them.

## Where the mechanics live

- Runtime order and route aliases: `index.html`, `app.js`.
- Card/graph validation and repository adapters: `card-model.js`, `graph.js`.
- State behavior and tests: `learning.js`, `refresh.js`, `tests/`.
- Preview allowlist: `scripts/serve.cjs`.
- Private operations: `docs/OCR_OPERATIONS.md`, `docs/GRAPH_WORKFLOW.md`, and the private tooling README.
