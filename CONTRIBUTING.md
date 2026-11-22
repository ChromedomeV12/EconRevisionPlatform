# Contributing

Start with [Project README](README.md), [Documentation](docs/README.md), [Decision log](docs/DECISIONS.md) and [AGENTS.md](AGENTS.md). The decision log explains why the app is static, local-first and refresh-first; a change that reverses one of those choices needs an explicit decision, not a quiet edit.

## What a good change preserves

- **The feed comes first.** One knowledge point, its explanation and one visual per screen. Deeper notes stay behind Closer look; the dashboard and library stay secondary.
- **Exposure stays exposure.** Swipes, opens, saves and revisits must not create recall reviews or mastery claims. Only an explicit recall rating may change FSRS history.
- **The app stays static and local-first.** No build step, server runtime, account system or new runtime dependency without a demonstrated need. Progress remains in localStorage in the MVP.
- **Accessibility is part of the feature.** Keyboard alternatives, visible focus, readable contrast, reduced-motion/transparency support and responsive layouts must survive.
- **Private material stays private.** Source PDFs, transcripts, crops, drafts, credentials and machine-local runtimes do not enter the public repository or the deployed site.

## Working agreement

1. Read [AGENTS.md](AGENTS.md) and the guide for the surface you are changing.
2. Check `git status --short --branch` before editing. Preserve other people's work, especially untracked private tooling.
3. Start a feature branch from current `main`. Keep the change focused; do not mix unrelated cleanup with a product change.
4. Stage explicit public files, not the workspace root. Review `git diff --cached` before committing.
5. Run the checks appropriate to the risk; say what you ran and what remains unverified. See [Testing](docs/TESTING.md).
6. Open a pull request with the reasoning, the rejected alternative and the verification. Required checks and resolved review threads gate the merge.

## Where to look

| Changing | Read |
| --- | --- |
| Feed, navigation, dialogs or personal review | [Architecture](docs/ARCHITECTURE.md), [Testing](docs/TESTING.md) |
| Layout, appearance or accessibility | [Architecture § Surface and Proportion Ownership](docs/ARCHITECTURE.md#surface-and-proportion-ownership), [Testing](docs/TESTING.md) |
| Cards, sources or publication | [Content pipeline](docs/CONTENT_PIPELINE.md) |
| Native graphs | [Graph workflow](docs/GRAPH_WORKFLOW.md) |
| Private OCR or reconstruction | [OCR operations](docs/OCR_OPERATIONS.md) |
| Branches, worktrees or releases | [Git workflow](docs/GIT_WORKFLOW.md) |
| Accounts, hosting or AI | [Deployment plan](docs/DEPLOYMENT_PLAN.md), [Jev integration](docs/JEV_INTEGRATION.md) |

## Content changes

Use one economic idea per card. Write original copy, cite exact source pages, keep the syllabus level provisional, and record assumptions and concerns privately. Do not copy textbook prose or question sets. A card may be published only after content review and a separate reuse-permission decision; an agent, validator or OCR acceptance cannot approve either.

Native reconstructions stay private until a human inspects the source and the current render, records the fidelity evidence and approves publication. Do not infer numerical values from schematic geometry or present an extract as an original drawing.

## Before opening a pull request

- Run the risk-appropriate checks and inspect UI screenshots in both themes where relevant.
- Confirm that no private file, credential, local runtime, generated screenshot or absolute private path is staged.
- Update the guide whose requirement, boundary, command, state key or permission changed. Do not paste code walkthroughs into docs.
- Describe the user-visible result, the tradeoff and any remaining limitation. A green check is not teacher approval or publication permission.

Merge through a reviewed PR. A feature-branch push does not deploy; after merge, verify that GitHub Pages built the merged `main` commit. See [Git workflow](docs/GIT_WORKFLOW.md).
