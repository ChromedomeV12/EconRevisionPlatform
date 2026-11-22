# Decision log

This log records why the project is shaped this way. A decision stays in force until an explicit replacement is recorded here. The implementation may change; the reason and the constraints usually do not.

## D1. Static frontend first

**Decision.** The public app is plain HTML, CSS and JavaScript served by GitHub Pages. There is no application build, server runtime or database in the frontend.

**Why.** The MVP needs to be cheap to host, easy to inspect, and usable without an account or backend. A static artifact also keeps deployment and review simple while the content and learning model are still being validated.

**Alternative rejected.** A framework or SPA now would add build, dependency, routing and server concerns before the product needs them.

**Consequence.** Accounts, shared submissions and live AI cannot live in this app. They require a separate backend and an explicit security design. See [D20](#d20-backend-only-when-shared-authority-is-needed).

## D2. Refresh-first feed

**Decision.** The first screen is a swipe-first knowledge feed: one point, its explanation and one visual per screen. The dashboard, library and card studio are secondary.

**Why.** The product is a quick refresher, not a course platform or a quiz app. A short, paced feed makes revisiting economical and keeps the explanation next to the point it explains.

**Alternative rejected.** A dashboard-first catalogue or a practice-first question flow would slow the main use case and imply mastery evidence the app does not collect.

**Consequence.** There are no compulsory questions, answer reveals or recall ratings in the MVP. Deeper notes stay behind Closer look. See [D4](#d4-exposure-is-not-recall).

## D3. Local-first state

**Decision.** Progress, saved cards, preferences and personal submissions live in the browser's localStorage. There are no accounts and no server-side student record.

**Why.** Local storage keeps the prototype useful without authentication, avoids collecting student data, and makes the privacy boundary easy to explain. It also matches the static hosting decision.

**Alternative rejected.** Accounts and a hosted database would add identity, recovery, authorization and moderation work before there is a shared classroom requirement.

**Consequence.** Data is device- and origin-local. Moving hosts or browsers does not move progress. There is no shared moderation or cross-device sync. See [Deployment plan](DEPLOYMENT_PLAN.md).

## D4. Exposure is not recall

**Decision.** Opening, swiping, saving or revisiting a point is exposure or an explicit preference. Only an explicit recall rating may create an FSRS review. Legacy FSRS state is retained but not driven by the feed.

**Why.** Treating a swipe as evidence of recall would fabricate mastery. It would also make the dashboard and any future scheduling look more authoritative than the data supports.

**Alternative rejected.** Inferring reviews from feed activity, or filling charts with estimated knowledge, was rejected as misleading.

**Consequence.** The feed reports opened points, bookmarks and explicit revisit choices, clearly separated from recall history. A future recall mode requires its own opt-in flow.

## D5. Editorial content is independent and source-pinned

**Decision.** Each card carries one declarative idea, independently written copy, exact source IDs and PDF-viewer pages, a provisional level and a source/attribution record. Teacher review and reuse permission are separate gates.

**Why.** The app is an educational prototype, not a textbook substitute. Independent wording reduces copying risk; exact pages make review possible; separate gates prevent an automated check or an agent from being mistaken for a teacher or rights holder.

**Alternative rejected.** Copying textbook prose, treating OCR acceptance as factual approval, or treating attribution as permission to republish all source material.

**Consequence.** Drafts, concerns and submissions remain private. Public delivery contains only selected, reviewed projections. See [Content pipeline](CONTENT_PIPELINE.md).

## D6. Native SVG graphs, not generated images

**Decision.** Reviewed graph specifications render as bounded D3/SVG in the browser using semantic CSS colors. The app does not run a Python/Matplotlib diagram pipeline.

**Why.** Native SVG is theme-aware, responsive, inspectable and testable, and it avoids maintaining a second rendering stack. A declarative specification also makes invented geometry easier to detect.

**Alternative rejected.** Screenshot tracing or a Python image pipeline. Both hide economic assumptions inside pixels and complicate theme and responsive behavior.

**Consequence.** Every reconstructed graph needs a source inventory, preview inspection and human review. Structural validity alone is not visual fidelity. See [Graph workflow](GRAPH_WORKFLOW.md) and [Graph fidelity analysis](GRAPH_FIDELITY_POSTMORTEM.md).

## D7. Private OCR and source material stay isolated

**Decision.** PDFs, transcripts, crops, drafts, graph evidence and operator tooling remain outside the public repository and deployed site. Private work is synced separately, with one writer at a time and bounded batches.

**Why.** The source collection is not cleared for public redistribution, and raw OCR or model output is not teacher-reviewed content. Isolation also keeps private paths and credentials out of a static site where committed files are public.

**Alternative rejected.** Committing the corpus, serving the workspace root, or treating `.gitignore` as HTTP access control. A local repository is not a publication boundary.

**Consequence.** A public clone cannot reproduce private authoring. Operators need the private sync, the OCR tooling and the review process. See [OCR operations](OCR_OPERATIONS.md).

## D8. Separate frontend demo and backend integration lanes

**Decision.** The normal frontend checkout stays demo-ready on `main`. A linked worktree on the long-lived `m1` branch tests backend integration. The API and database live in a separate backend repository.

**Why.** Backend integration must be testable without destabilizing the public demo. A worktree shares the frontend object store, so it is cheaper than a second clone; a separate backend repository keeps API, schema and credentials out of the static release.

**Alternative rejected.** Developing integration on `main`, publishing from a second full clone, or putting the backend inside the frontend repository.

**Consequence.** Worktrees are machine-local; their `.git` pointers are not synced. Integration changes reach `main` only through review. See [Architecture](ARCHITECTURE.md#repositories-and-working-copies) and [Git workflow](GIT_WORKFLOW.md#integration-branch).

## D9. AI is advisory and backend-owned

**Decision.** Any future Jev integration is an advisory service behind an authenticated backend. The backend holds credentials, retrieves canonical cards and sources, validates responses and records audit data. The browser never holds vendor keys. AI cannot approve publication or mutate a recall schedule.

**Why.** Model output is untrusted and can be wrong, uncertain or unavailable. Educational use also requires canonical context, privacy controls and a human authority for approval.

**Alternative rejected.** Calling a vendor directly from the browser, trusting client-supplied answer keys, or letting a model silently update scheduling.

**Consequence.** Until that backend exists, the local decision provider returns honest `unavailable` results rather than simulated grading. See [Jev integration](JEV_INTEGRATION.md).

## D10. Security is a boundary, not a feature flag

**Decision.** Treat submitted strings and browser storage as untrusted. Keep credentials and private material out of client code and public assets. The local preview binds to loopback and serves an explicit allowlist. Workflow tokens use least privilege.

**Why.** A static site exposes every committed file it serves. Client-side checks and local approval are convenience controls, not authorization. A preview server or a hidden button must not be mistaken for a security boundary.

**Alternative rejected.** Relying on `.gitignore`, obscurity, `robots.txt`, or client-side role checks to protect private material.

**Consequence.** Publication requires reviewing the actual served files. A future shared service needs server-side identity, authorization and audit before it is enabled. See [Security policy](../SECURITY.md) and [Repository security](REPOSITORY_SECURITY.md).

## D11. Protected main, checked pull requests

**Decision.** `main` accepts changes through pull requests with required `verify` and `adaptive-browser` checks, resolved review threads and linear history. The solo owner may merge their own checked PR; the ruleset does not require a second approver.

**Why.** The owner needs a recoverable release path without pretending an unavailable reviewer exists. Required checks still prevent a red or structurally broken tree from deploying.

**Alternative rejected.** Direct pushes to `main`, or a second-approver rule that the solo maintainer cannot satisfy.

**Consequence.** A green check is not independent review. Sensitive changes still need deliberate inspection and, where relevant, separate content or security review. See [Repository security](REPOSITORY_SECURITY.md).

## D12. Documentation explains why

**Decision.** Project docs record the user problem, requirements, decisions, rejected alternatives and invariants. Source, configuration, tests and command help own mechanical detail.

**Why.** Code shows what happens now; it does not explain why a tradeoff was chosen or what must survive a refactor. Rationale also shortens onboarding and prevents a later change from silently reversing a deliberate boundary.

**Alternative rejected.** File-by-file walkthroughs and duplicated command references, which go stale and bury the decisions.

**Consequence.** A change that alters a requirement, boundary or permission updates this log or the relevant guide in the same change. See [Documentation](README.md).

## D13. Vanilla JavaScript, no framework

**Decision.** Browser code is vanilla JavaScript with a small set of pinned vendored dependencies (FSRS, Lucide, D3). There is no bundler or application package manifest.

**Why.** The runtime surface is small, the deployment target is static, and dependency churn has a real maintenance cost. Direct DOM code is inspectable and testable at this scale.

**Alternative rejected.** A framework or build pipeline before the interaction complexity justifies it.

**Consequence.** Contributors must manage DOM state and accessibility explicitly. The test suite and documented design rules are the guardrails.

## D14. Accessibility and appearance are requirements

**Decision.** Keyboard alternatives, visible focus, reduced-motion/transparency support, readable contrast, theme persistence and light diagram paper are part of the product, not decoration.

**Why.** This is classroom-facing study material used on varied devices and by varied users. A visually attractive screen that loses keyboard access or hides content is not acceptable.

**Alternative rejected.** Visual-only review, or treating contrast and motion as optional polish.

**Consequence.** Layout, theme and navigation changes need browser checks and human screenshot review. Passing assertions do not approve an unintended design. See [Testing](TESTING.md).

## D15. Do not fabricate activity

**Decision.** Statistics come from stored events. Browsing counts, opened points and preferences are labelled as such. Recall statistics come only from stored reviews. Empty states stay empty.

**Why.** Fabricated or estimated activity would mislead students and teachers and undermine the separation between exposure and recall.

**Alternative rejected.** Filling charts with plausible numbers, or converting swipes into reviews to make the dashboard look active.

**Consequence.** Some screens will look sparse until the learner uses them. That is accurate, not a defect.

## D16. Publication needs two human gates

**Decision.** A card or graph may be published only after editorial/content review and a separate reuse-permission decision. An agent, model, automated validator or OCR acceptance cannot perform either gate.

**Why.** Correctness and redistribution rights are different questions. A correct explanation can still be unlicensed, and a licensed extract can still be wrong or out of scope.

**Alternative rejected.** Treating validation, attribution, OCR acceptance or a passing graph audit as approval.

**Consequence.** Private drafts remain `submitted_needs_review` until a human selects an exact revision. Public projections carry provenance, but not a claim of teacher verification. See [Content pipeline](CONTENT_PIPELINE.md).

## D17. Worktrees are machine-local

**Decision.** Frontend integration uses a Git worktree linked to the main checkout. Worktree directories and `.git` metadata are excluded from folder sync and recreated or repaired per machine.

**Why.** A worktree shares the repository object store, avoids a second clone, and keeps demo and integration branches available at the same time. Absolute `.git` pointers from another OS do not work on this one.

**Alternative rejected.** A permanent second clone, or syncing a worktree directory between machines.

**Consequence.** Moving machines requires `git worktree add` or `git worktree repair`, not copying `.git` files. See [Architecture](ARCHITECTURE.md#repositories-and-working-copies).

## D18. Immutable content records and explicit revisions

**Decision.** Private card submissions are immutable snapshots. Changing submitted content requires a higher revision and a new snapshot. Validation and review bind to exact hashes.

**Why.** Revisions make review and rollback auditable. They also prevent a later edit from silently changing what was reviewed or exported.

**Alternative rejected.** Mutable drafts with a single “approved” flag, or overwriting an earlier submission.

**Consequence.** Editing a submitted draft does not refund a budget or change the reviewed artifact. A revision is a new record. See [Content pipeline](CONTENT_PIPELINE.md).

## D19. Verification is risk-based

**Decision.** CI runs public unit tests, syntax checks and packaging boundaries. Browser, layout, graph and private OCR suites run where the changed surface requires them. No check proves economic correctness, teacher approval or publication rights.

**Why.** Different changes carry different risks, and some judgments need human eyes. A single “all green” signal would overstate what automation can establish.

**Alternative rejected.** Treating unit tests or CI as full release approval, or skipping layout review because interaction tests pass.

**Consequence.** Contributors state what they ran and what remains unverified. See [Testing](TESTING.md).

## D20. Backend only when shared authority is needed

**Decision.** Keep GitHub Pages for the public, local-only MVP. Introduce a backend when accounts, shared progress, moderation, server-side content delivery or live AI become real requirements. Prefer a static host plus a small API and managed identity/Postgres, with a separate private backend repository.

**Why.** Hosting complexity should follow a product need, not a visual redesign. A backend is justified when the app must enforce identity, authorization, shared state or credential custody.

**Alternative rejected.** Migrating pre-emptively, or adding a server merely because the frontend looks mature.

**Consequence.** The first backend milestone is a narrow catalog/decision API, not a full LMS. Accounts, shared moderation and live AI remain separate decisions with separate security reviews. See [Deployment plan](DEPLOYMENT_PLAN.md).
