# Contributing

## Local Setup

The app has no build step or package installation. Open `index.html` directly, or install Node.js (CI uses Node 24) and run this from the project root:

```sh
node scripts/serve.cjs 4181
```

Open <http://127.0.0.1:4181>. Stop the preview with Ctrl+C. If the port is occupied, choose another port. Do not substitute a general workspace-root server: the provided server binds to loopback and serves an explicit public-file allowlist.

A public clone is enough for app development and public tests. Private PDFs, OCR outputs and `.pi/` settings arrive only through the owner's private sync. Do not invent missing source references or download private materials to make public tests pass.

## Working Agreement

Read [AGENTS.md](AGENTS.md) before editing. Keep the first screen a usable knowledge feed, with the explanation immediately visible. Preserve typography, approved PR #5 appearance, keyboard access and responsive layouts. Keep the application vanilla JavaScript and GitHub Pages compatible.

Check `git status --short --branch` first. Preserve other people's changes and untracked private tooling. Start a feature branch from current `main`; follow the exact commands in [Git workflow](docs/GIT_WORKFLOW.md). Stage explicit public files, not the entire workspace.

## Change Map

| Change | Files and constraints |
| --- | --- |
| Knowledge point | Add structured content in `content.js`; preserve stable IDs and source references. |
| Feed, dialog, search or personal review | `app.js` and `index.html`; escape untrusted strings and preserve focus behavior. |
| Layout or typography | `styles.css` and `acrylic.css`; verify small screens and long content. |
| Appearance | Semantic roles in `theme.css`, behavior in `theme.js`; keep diagram paper light. |
| Browsing preferences | `refresh.js`; exposure is not recall evidence. |
| Recall state | `learning.js`; only explicit recall ratings may create reviews. |
| Native diagram | `graph.js`, `graph.css`, structured `graphSpec`; follow [graph review gates](docs/GRAPH_WORKFLOW.md). |
| Public asset | Add its relative URL and preview allowlist entry in `scripts/serve.cjs`, tests and credits. |

## Adding Content

Use one economic idea per card. Supply a concise `refresh.headline` and `refresh.summary`, then use the retained `answer`, `trap` and `rubric` for deeper context. Match the explanation to the diagram's actual labels; do not derive numerical PED or quantities from schematic geometry. Use existing cards as the field reference rather than inventing a second content format.

For sourced work, read the private collection's `START_HERE.md`, `CONTENT_NOTES.md` and `SOURCE_INDEX.md` first. Keep source ID, exact PDF-viewer/printed page distinction, figure ID, SL/HL scope, assumptions and review status in the private working record. Public copy needs a deliberate publication decision and appropriate attribution; teacher review and public-use permission are separate gates. Do not add private source paths to runtime code.

Native reconstructions remain private drafts until human fidelity/content review and a separate publication decision. Only reviewed built-in cards may activate `graphSpec`; a local submission cannot do so. Do not relabel original extracts as independently authored drawings.

## Before Opening a PR

1. Run the checks appropriate to the change using [Testing](docs/TESTING.md).
2. Inspect screenshots for UI changes; passing geometry checks alone does not establish a good design.
3. Run `git diff --check` and inspect `git diff --cached` after explicit staging.
4. Confirm no private material, credentials, local runtimes or screenshots are staged.
5. Update affected guides and describe behavior, verification and remaining limitations in the PR.

Merge only after required checks pass and review conversations are resolved. A feature-branch push does not deploy the app. After merging, verify Pages built the merged `main` commit, not merely that an older deployment succeeded.
