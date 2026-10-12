# Deployment plan

Research checked: 2026-10-12. This is a proposal, not a record of implemented infrastructure. Read alongside [README](../README.md), [Jev integration](JEV_INTEGRATION.md), and [AGENTS.md](../AGENTS.md).

## Recommendation

Keep GitHub Pages for the current public, local-only MVP. Keep GitHub as the source repository and review system even if hosting later moves. For the first shared classroom pilot, prefer Cloudflare Workers Static Assets plus a small API and managed Supabase Auth/Postgres, subject to school requirements, provider terms, region availability, and measured access from students' networks. Vercel is a credible alternative if its collaboration or server runtime fits the eventual team better.

This is an interactive learning app that happens to have a static frontend. Its present hosting requirements resemble a documentation site; accounts, private drafts, moderation, and AI calls will not. A documentation framework or frontend rewrite would not solve those backend requirements. Keep vanilla JavaScript and the current swipe-first experience unless product needs justify a change.

Do not migrate merely because the app has grown beyond a demo visually. Migrate when a feature needs server authority or a hosting capability is materially missing.

## Provider comparison

| Option | Fit for this project | Constraints and operating implications |
| --- | --- | --- |
| GitHub Pages now | Existing public static app, versioned releases, minimal administration; no database required. | Cannot execute our API or keep server secrets. Current documented limits include a 1 GB published site and soft 100 GB/month bandwidth limit. Pages is unsuitable for sensitive transactions and has restrictions on commercial SaaS use; reassess before accounts or monetization. [Official limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). |
| Cloudflare Pages plus Functions | Static hosting with branch previews and a small HTTP backend; reasonable if the team already uses Pages. | Static requests that bypass Functions are free and unlimited under the documented model; Functions consume Workers quotas. Route static files outside Functions. [Functions billing](https://developers.cloudflare.com/pages/functions/pricing/). |
| Cloudflare Workers Static Assets | Preferred Cloudflare route for a new full app: deploy frontend assets and API together, potentially under one origin. | Cloudflare recommends this over Pages for new projects. Workers have runtime/CPU/memory limits; the current memory limit is 128 MB and static assets are limited to 25 MiB per file. Suitable for authentication checks and short Jev HTTP calls, not our GPU/Python OCR pipeline. [Recommendation](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [static assets](https://developers.cloudflare.com/workers/static-assets/), [limits](https://developers.cloudflare.com/workers/platform/limits/). |
| Vercel | Static frontend, preview environments, functions, and straightforward Git integration. Consider if its runtime or reviewer workflow saves real effort. | Hobby is restricted to non-commercial personal use; a teacher/school service must check eligibility rather than assume it. Function duration depends on runtime/plan; documented request/response payload limit is 4.5 MB. Keep large uploads and OCR outside these endpoints. [Fair use](https://vercel.com/docs/limits/fair-use-guidelines), [environments](https://vercel.com/docs/deployments/environments), [function limits](https://vercel.com/docs/functions/limitations). |
| Managed auth/database, independent of frontend host | Supabase is the recommended initial candidate: Auth integrated with Postgres suits ownership, class membership, card versions, and moderation. | It adds data operations, authorization policies, email delivery, and backups. Enable row-level security on exposed tables; secret/service-role keys stay server-side. Free projects can pause after low activity over seven days, so a free tier is a prototype choice, not an availability promise for a school term. [Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [key security](https://supabase.com/docs/guides/database/secure-data), [pausing](https://supabase.com/docs/guides/platform/free-project-pausing). |

Managed auth/database complements a host; it does not replace static hosting. Using Supabase also avoids assembling separate identity, SQL, and storage services immediately. A separate managed identity provider plus managed Postgres remains an alternative if school identity integration requires it; evaluate that requirement before choosing vendors.

All limits above are research snapshots, not capacity commitments. Recheck them at implementation. No fixed subscription price or assumption of permanent free service is built into this plan.

## Phase 1: reliable public MVP

Stay on Pages while content is public, progress is local, and submitted cards remain personal. Continue teacher feedback using the actual feed and diagrams. Keep account signup and live Jev disabled until the backend exists.

Improve delivery before changing providers:

1. Build a release artifact in a clean CI checkout from an explicit runtime allowlist. Include HTML, application JS/CSS, required vendored dependencies, licensed assets, and `.nojekyll`. Check every referenced file is present. A packaging step need not introduce an app compilation step.
2. Run the existing learning/refresh unit tests, browser tests, and theme tests with a pinned CI browser installation. Check keyboard/touch navigation, five widths, both themes, diagram rendering, and unchanged review history.
3. Reject private/source-processing paths in the artifact and verify they return 404 on the deployed site. Publish only that checked artifact using a Pages Actions workflow. GitHub documents artifact upload, deployment permissions, and the `github-pages` environment in its [custom workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
4. Gate production merges through meaningful required checks and review, with a narrowly controlled recovery path appropriate to a small team. A one-person repository should not require an unavailable second approver. Confirm the real configured check names before requiring them.
5. Record the commit SHA and deployed URL; smoke-test the live release. Roll back by redeploying a known good artifact or reverting a commit through the same checks.

Do not deploy a developer workspace with a recursive copy or CLI upload of `.`. Git ignore rules and a private repository do not establish access controls for deployed files. Even committed files should pass an explicit public release allowlist.

## Phase 2: shared classroom pilot

Start this phase when students need cross-device progress or teachers need a shared submission queue. Recommended design:

```text
Browser -> public frontend + /api on Cloudflare Workers
                        -> managed identity + Postgres
                        -> Jev service, only when explicitly enabled

Local OCR workstation -> private research/review workspace
                      -> separately cleared public card/asset release
```

Use one frontend/API origin where possible to simplify cookies and CORS. Validate identity on the server, authorize every action, and enforce class membership and teacher roles in database policies/server code. A hidden button or client-supplied role is not authorization. Keep private responses out of shared CDN caches. For cookie sessions, include CSRF protection and appropriate secure cookie attributes.

Use managed authentication instead of implementing password handling. Decide with the teacher who may register, which class data a teacher can see, and the minimum student identity needed. Choose region, retention/deletion policy, recovery owner, and school approval before collecting student records. Test login and email delivery on actual school networks.

Start with versioned SQL migrations and a small schema:

- Users, classes, memberships, and server-controlled roles.
- Stable card IDs, immutable card versions, public release manifests, and asset versions.
- Private submissions and revisions, moderation actions, and published-version pointers.
- Per-user bookmarks, revisit/confusing choices, and opened events or bounded aggregates.
- Separate explicit recall reviews only if an optional recall mode ships; do not derive these from swipes.

Anonymous local browsing should continue to work. Offer an explicit, validated import into the signed-in account; do not silently upload personal drafts or all localStorage. Use unique event IDs/idempotency keys for retries and revisions/tombstones for edits and deletions. Define conflict rules before enabling multi-device writes. Exposure remains exposure; local approval never becomes teacher approval during migration.

Keep browser contracts provider-neutral and place backend operations behind a small API. Use Postgres migrations and conventional SQL for core data. D1 or another store can be considered if measured workload warrants it, but there is no need to adopt Workers, D1, KV, queues, and multiple identity services at once.

## Phase 3: moderated content and Jev

Make publication a server-authorized action against an exact immutable card version. Maintain two independent gates:

| Gate | Required evidence |
| --- | --- |
| Editorial approval | Authorized human reviewer, reviewed version/hash, correctness, axes/labels/assumptions, SL/HL scope, uncertainty, and curriculum revision. Syllabus mapping stays provisional until the official guide/amendments are checked. |
| Publication permission | Recorded permission or an appropriate licensed/original asset basis, permitted audience/use, attribution requirements, and any expiry or withdrawal requirement. Attribution, OCR acceptance, and teacher approval do not establish redistribution permission. |

Only versions passing both gates enter a public manifest. An edit invalidates the affected approvals. Preserve the private provenance chain: source ID, PDF/printed page conventions, source hash, crop bounds/hash, transcript version, interpretation, reviewer, and timestamps. Public records expose only metadata cleared for public use; never expose local paths or private excerpts through a provenance panel.

Textbook crops, transcripts, page images, draft briefs, and model evidence remain in `private-sources/` on the private workflow. Existing crops are not automatically eligible for public diagrams. An original redraw needs its own review and publication decision; redrawing is not a blanket permission workaround. Authentication alone also does not grant permission to distribute sources to a class.

Implement Jev through the contracts in [JEV_INTEGRATION.md](JEV_INTEGRATION.md): server-held credentials, canonical card/rubric retrieval, authorized reference context, validated responses, timeout/abstention, rate limits, per-user quotas, and a kill switch. Test against teacher-reviewed examples before enabling it. Log versions and reviewer outcomes while minimizing student text. AI can advise moderation; it cannot approve publication or rewrite a recall schedule.

Keep lengthy OCR/transcription and GPU inference on the existing workstation. If asynchronous shared processing becomes necessary, use an authenticated job queue and dedicated worker with bounded tasks; do not run whole textbooks in a request handler. Remote processing of source material requires a separate authorization decision.

## Previews and environments

PR checks should work without production credentials. For the present Pages setup, use local Playwright previews and screenshots or a separate public-safe preview project; do not overwrite production for each PR. GitHub Pages does not provide the same automatic branch preview workflow as the specialist hosts.

Cloudflare Pages provides branch/commit previews, but they are public by default; use Cloudflare Access when restricting viewers. Vercel provides preview environments and deployment protection; verify the chosen plan's access features. A random preview URL or `noindex` is not authentication. [Cloudflare previews](https://developers.cloudflare.com/pages/configuration/preview-deployments/), [Vercel environments](https://vercel.com/docs/deployments/environments), [Vercel protection](https://vercel.com/docs/deployment-protection).

Every preview must use synthetic or specifically approved data, separate credentials, and a staging database/project. Keep production references, student data, and Jev keys out of fork builds. Untrusted PR code must never execute with production secrets. Protect all aliases, asset endpoints, and APIs needed for a restricted preview, not just its landing URL. CI and deployment permissions should be minimal, with third-party actions pinned and a production environment gate when needed.

## Domain and data migration

A custom domain is optional for the demo, but establish a stable app origin before inviting users who rely on saved progress. GitHub Pages already supports custom domains; verify domain ownership and enforce HTTPS. Preserve hashes and the `TikTok Econ.html` compatibility URL during moves. [GitHub domain configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

localStorage belongs to an origin. Moving from `chromedomev12.github.io` to a custom domain or another provider hostname cannot automatically transfer it. Implement versioned JSON export/import for `econ-refresh-v1`, `econ-workspace-v2`, and optional `econ-theme-v1` preferences before such a move. Validate size/schema, show an import summary, preserve timestamps, and never manufacture recall events. Keep the old origin available long enough to export; a redirect alone does not migrate browser storage.

Later keep the custom hostname stable when switching hosts, update DNS/TLS and auth callback allowlists, verify legacy routes and cache behavior, and test rollback before cutover. Persist API/schema compatibility through a rollout. Once data is shared, a frontend rollback cannot safely undo a destructive database migration: prefer additive migrations and a separate recovery procedure.

Keep user exports and deletion available after accounts arrive. Back up SQL, object files, and permission/provenance records separately, and test restoration. Supabase database backups exclude Storage objects; free-tier projects should arrange their own exports rather than assume managed recovery. Auth migration needs a separate tested identity/session plan; a SQL export alone does not guarantee seamless login portability. [Backup scope and recovery](https://supabase.com/docs/guides/platform/backups).

## Costs, operations, and decision triggers

Budget for the frontend/CDN, dynamic requests/CPU, database compute/storage/backups, auth/email, object egress, previews, logs, and Jev usage independently. The model and database may dominate a small school's cost; this is a planning assumption to validate with pilot measurements. Use current [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Vercel plan information](https://vercel.com/docs/plans), and [Supabase billing guidance](https://supabase.com/docs/guides/platform/billing-on-supabase) when approving a budget, including staging and recovery needs.

Set a modest approved pilot budget, usage alerts, application-enforced AI quotas, and a provider disable switch. Billing alerts alone should not be treated as a hard spending cap. Assign a maintainer for renewals, backups, failed releases, and account recovery. Avoid operating a public always-on server or GPU just to serve static cards.

| Trigger | Next decision |
| --- | --- |
| Public cards, local progress, no shared authority | Stay on Pages; improve release checks and content quality. |
| Need reviewer previews or custom response headers before accounts | Evaluate Cloudflare hosting without introducing a database or framework. |
| First cross-device sync or shared moderation pilot | Select managed identity/Postgres and implement server authorization; prefer Workers Static Assets/API for the new deployment. |
| Jev goes live | Add the authenticated proxy and evaluation/cost gates; keep the reading feed usable during provider failure. |
| Paid offering, institutional availability, or procurement requirements | Reassess service terms, paid plan/recovery needs, ownership, regions, and support before expansion. |
| Long jobs, uploads, or runtime limits become material | Add isolated job processing/object storage or select a suitable server runtime; keep the frontend static. |

The next deployment work should be the explicit public artifact, CI checks, and browser-data export/import. The next product decision should be whether the teacher actually needs shared accounts and moderation for the pilot. That requirement determines when a backend is worth operating.
