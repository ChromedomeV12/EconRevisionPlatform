# Documentation Index

## Start Here

| Task | Guide |
| --- | --- |
| Try the app and understand its limits | [Project README](../README.md) |
| Make a code or documentation change | [Contributing](../CONTRIBUTING.md) |
| Find repository/branch roles, state keys and rendering boundaries | [Architecture](ARCHITECTURE.md) |
| Choose and run verification | [Testing](TESTING.md) |
| Commit, open/review a PR and verify deployment | [Git workflow](GIT_WORKFLOW.md) |
| Operate privately synced OCR and resume diagram work | [OCR operations](OCR_OPERATIONS.md) |
| Write and review native diagram specifications | [Graph workflow](GRAPH_WORKFLOW.md) |
| Understand reconstruction failures and prevention | [Graph fidelity analysis](GRAPH_FIDELITY_POSTMORTEM.md) |
| Author, review and deliver modular swipe-card packs | [Content pipeline](CONTENT_PIPELINE.md) |
| Check selected public image permissions | [Diagram asset record](../assets/diagrams/README.md) |
| Report a vulnerability privately | [Security policy](../SECURITY.md) |
| Understand repository protections | [Repository security](REPOSITORY_SECURITY.md) |
| Plan shared accounts, moderation and hosting | [Deployment plan](DEPLOYMENT_PLAN.md) |
| Plan the future AI boundary | [Jev integration](JEV_INTEGRATION.md) |
| Work as a coding agent | [AGENTS.md](../AGENTS.md) |

## Status and Authority

Frontend `main` runs the static demo and user-facing UI. Maintain the linked `m1` worktree for backend integration and bring frontend updates into it from `main`. Operators run private authoring from the normal frontend checkout. The sibling backend provides local Node/SQLite catalog delivery. Accounts, shared moderation and live AI remain planned. See [repository roles](ARCHITECTURE.md#repositories-and-working-copies) before choosing a checkout.

`AGENTS.md` governs contributor/agent constraints; `SECURITY.md` governs security expectations. Architecture and operations guides describe the current code. Deployment and Jev documents describe future work unless explicitly marked implemented. If documents disagree, inspect the implementation and update the conflicting guide instead of treating historical notes as current requirements.

The [diagram reconstruction proposal](DIAGRAM_RECONSTRUCTION.md) retains a superseded Python approach. `superpowers/` contains historical plans, including earlier product directions; it is not the current MVP specification. Private corpus notes remain inside the private collection and are not copied into these public guides.

## Keep Guides Current

Update the relevant guide in the same change as a new command, storage key, runtime asset, permission boundary or workflow. Include verification actually performed and distinguish planned controls from implemented ones. Do not copy machine credentials, absolute private source paths, transcripts or generated evidence into documentation.
