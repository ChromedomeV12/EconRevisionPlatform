# Econ / Quick Refresh

A static economics refresher: one knowledge point per swipe, with the explanation immediately visible. Optional deeper notes, saved/revisit lists, a secondary dashboard, a searchable topic library, and personal card review support the feed.

## Try the demo

[Open the demo](https://ChromedomeV12.github.io/EconRevisionPlatform/).

For local use, open `index.html` in a browser. No installation or build step is needed. Progress is stored in that browser's localStorage. For a loopback preview, run `node scripts/serve.cjs 4181` and open `http://127.0.0.1:4181`.

The app opens the refresh feed directly. `#welcome` is an optional introduction, reachable through the brand or **About this study space** in the workspace menu; `#progress` opens the dashboard with browsing activity and a continuation entry before the topic catalog. The menu is a persistent collapsible sidebar on wide workspace views and a temporary modal drawer on narrow screens or the introduction. Dismissing the drawer does not change the saved desktop preference.

## Documentation

Start with the [documentation index](docs/README.md). Contributors should read the [contribution guide](CONTRIBUTING.md), [architecture reference](docs/ARCHITECTURE.md), and [testing guide](docs/TESTING.md). Private source-processing operators have a separate [OCR operations guide](docs/OCR_OPERATIONS.md); a public clone does not include the private corpus or Pi configuration.

Use this checkout for the demo-ready frontend and UI/style changes. Maintainers test backend integration in the linked `EconRevisionPlatform-m1` worktree on the long-lived frontend `m1` branch. The Node/SQLite API belongs to `EconRevisionPlatform-backend`. Read [repository and working-copy roles](docs/ARCHITECTURE.md#repositories-and-working-copies) before changing branches or retiring a worktree.

## Project files

- `index.html`: refresh-first application shell.
- `TikTok Econ.html`: compatibility redirect for old links.
- `styles.css`: base responsive interface and feed layout, overridden by the appearance layers below.
- `acrylic.css`: frosted surfaces, rounded controls, serif knowledge headlines and responsive acrylic styling.
- `theme.js`, `theme.css`: light/dark toolbar switch, persistent appearance preference and Catppuccin Latte light and Mocha dark color overrides. Uses the system preference until a mode is selected; keeps diagrams on light paper.
- `content.js`: legacy sample cards and unit metadata.
- `card-model.js`, `content-bootstrap.js`, `content/*.js`: versioned card contract, replaceable backend-compatible repository adapter and 13 selected editorial knowledge points with 11 native graph assets.
- `app.js`: scroll-snap feed, optional introduction, browsing dashboard, bookmarks and card studio.
- `graph.js`, `graph.css`: bounded D3/SVG graph specifications, economic geometry checks, theme-aware colors and native graph enlargement. Selected reconstructions are active; the permitted PED image remains as a legacy example.
- `refresh.js`: validated browsing state and revisit/confusing preferences.
- `learning.js`: retained legacy FSRS state, scheduling helpers and persistence validation.
- `decisions.js`: local screening and future Jev provider interface.
- `vendor/`: pinned FSRS, Lucide and D3 browser bundles with licenses.
- `assets/`: local fonts, photographs and credit information.
- `AGENTS.md`: guidance for future contributors and coding agents.
- `docs/JEV_INTEGRATION.md`: future AI contracts and backend architecture.
- `docs/GRAPH_WORKFLOW.md`: native graph architecture and the synced local Pi reconstruction task.
- `SECURITY.md`: vulnerability reporting, trust boundaries and security invariants.
- `docs/REPOSITORY_SECURITY.md`: GitHub protection settings and ruleset maintenance.
- `docs/DEPLOYMENT_PLAN.md`: hosting recommendation and phased backend migration.
- `docs/superpowers/`: historical design and implementation notes.

## Current scope

This is an independent, unofficial educational prototype. Sample content needs teacher review and is not a complete or verified IB syllabus resource. The selected demand/PED textbook extracts have owner-confirmed public reuse permission; the remaining source collection stays private.

The new demand, supply and market-outcomes packs use selected reconstructed schematic graphs and independently worded explanations, with exact source pages in Closer look. They are editorial drafts, not teacher verified; the owner authorized this selected demo publication. [Content records](content/README.md) list the scope. The permitted original PED image remains, and the original-image path is retained/tested. No numerical coordinates, exact elasticity or official syllabus verification are inferred from drawings. The [content pipeline](docs/CONTENT_PIPELINE.md) separates private authoring/review from public delivery and describes the backend transition for 1.0.0. The earlier [Python proposal](docs/DIAGRAM_RECONSTRUCTION.md) is historical.

The MVP has no compulsory questions, answer reveals or recall ratings. Touch swipes, mouse-wheel scrolling, keyboard arrows/Page Up/Page Down and navigation buttons move through the feed. A Closer look opens full notes and provenance. Saved and Revisit filters use explicit user choices, not a retention algorithm.

Feed headlines use the compact 24px size when the reading column is at most 650px wide, including columns narrowed by the sidebar or topic queue. Wider columns retain the existing desktop sizing and short-viewport rules; diagrams and actions keep their existing sizes.

The dashboard reports unique points opened, points opened today, bookmarks and points set aside. An opened point means at least 65% of its panel entered the visible feed; it does not prove reading, understanding or mastery. Browsing state uses `econ-refresh-v1`. Existing recall history and personal submissions remain in `econ-workspace-v2`; browsing never adds FSRS reviews or changes scheduled dates. Existing scheduling helpers and tests are retained for a possible separate, optional recall mode.

You submit and review personal cards on the current device. Local approval adds a card to your personal library; it grants no publication or teacher-verification status. Local checks identify missing sources, short text and exact duplicate questions. Frontend `main` needs no backend. Maintainers have implemented a separate local catalog API, while accounts, shared submissions and live AI remain planned.

Jev integration boundaries remain for future advisory assessment and submission screening, with validation, timeouts and fallback. The refresh feed does not call answer assessment. Browsing/preferences must not be relabelled as recall evidence or teacher approval. [The integration plan](docs/JEV_INTEGRATION.md) describes future work.

## Checks

Run `node --test tests/learning.test.cjs tests/refresh.test.cjs` for legacy scheduling, service and browsing-state tests. `node tests/browser.cjs` requires Playwright; it verifies feed navigation (including emulated touch), unchanged recall history, saved/revisit preferences, personal submissions, responsive layouts and private-source isolation. Set `PLAYWRIGHT_PATH` to an existing package path and optionally `BROWSER_CHANNEL=msedge` to use installed Edge. Screenshots are written to the ignored `test-output/` folder.

Run `node tests/theme.cjs` with the same Playwright configuration to check the keyboard-accessible switch, saved preference, cross-tab synchronization, OS appearance changes and storage fallback. It also verifies unchanged feed typography and geometry, composited text contrast, interaction states and reduced transparency, and captures both themes across all views. The approved PR #5 design combines bright white light reading surfaces with Latte text and accents, and layered Mocha dark surfaces. Sapphire details complement Mauve actions and Blue focus indicators. Dialogs have a fixed serif-title header and separately scrolling content; `node tests/navigation.cjs` checks their behavior and the persistent menu toggle. Diagrams retain light paper in both modes. Palette references: [Catppuccin palette](https://catppuccin.com/palette/) and [style guide](https://github.com/catppuccin/catppuccin/blob/main/docs/style-guide.md).

`node --test tests/diagram-data.test.cjs` checks image dimensions, attribution and figure/copy consistency. `node tests/diagrams.cjs` checks image loading, uncropped contain fitting, accessible descriptions, enlargement and failure fallbacks across eleven viewport sizes in both themes, including both sides of the navigation and queue layout breakpoints. It and `node tests/browser.cjs` assert that feed content fits without inner scrolling or covered actions. GitHub's required `verify` job runs all `tests/*.test.cjs` unit tests, syntax checks and public-file boundary checks.

## Private reference collection

For diagram reconstruction, see [the native graph workflow](docs/GRAPH_WORKFLOW.md). On the synced Omarchy machine, `/graph-reconstruct 1` uses the current Pi model to produce one private JSON draft, inspect source/rendered evidence, and save a resumable checkpoint. It cannot approve or publish its output. Run `node --test tests/graph.test.cjs tests/graph-work.test.cjs` for the renderer/workflow checks and `node tests/graphs.cjs` plus `node tests/graph-review.cjs` for Playwright rendering/integration checks.

Local research materials belong in `private-sources/Econ Revision App Sources/`, which is excluded from Git. Only the explicitly approved selected copies in `assets/diagrams/` are included in the app; source PDFs, transcripts and other crops remain private. Read the collection's `START_HERE.md` and `CONTENT_NOTES.md` before drafting content. Source attribution and teacher review do not establish permission to republish textbooks, diagrams, or exam questions.

Do not deploy the whole local workspace or serve its root publicly: Git ignore rules do not restrict HTTP access. Publish only the committed app files. Never force-add the private source directory.

## Deployment

GitHub Pages serves the root of the `main` branch. Open a feature-branch pull request, pass the required `verify` and `adaptive-browser` checks, resolve review conversations, and merge to `main` to update the demo. Only committed files are available to the Pages build. The default branch blocks direct pushes, force pushes and deletion.

See [Git, deployment and pull requests](docs/GIT_WORKFLOW.md) for the exact commit/push workflow, deployment checks, and instructions for opening or reviewing a PR. New files must be staged explicitly: committing changes to `index.html` alone does not include a new stylesheet it references.

The [deployment plan](docs/DEPLOYMENT_PLAN.md) keeps GitHub Pages for the current public MVP and defines when accounts, synchronized progress, moderation and Jev justify a backend. Repository protections are described in [repository security](docs/REPOSITORY_SECURITY.md).
