# Deployment plan

This records the hosting requirements and the evidence that would justify moving beyond static Pages. It is a decision guide, not a provider manual.

## Current MVP

GitHub Pages serves the public static demo from `main`. Progress is local to the browser. There are no accounts, shared submissions, server-side student records or live AI. This is deliberate: the product is validating the refresher experience and content, not operating a learning platform.

The frontend needs no build or server runtime. A public release is the committed file set; the preview allowlist is only a local protection. See [DECISIONS.md](DECISIONS.md) for the static-first choice.

## What would force a backend

A backend is justified when one of these becomes a real requirement:

- Accounts, cross-device progress or class membership.
- Shared moderation or a teacher review queue.
- Server-authoritative content revisions and publication.
- Live AI that needs credentials, canonical sources, rate limits and audit records.
- Shared analytics that cannot be computed from local data.

A visual redesign, more cards or a larger static site does not justify a backend by itself.

## Candidate shapes and tradeoffs

| Shape | Fits | Costs |
| --- | --- | --- |
| GitHub Pages + static frontend | Public cards, local progress, no shared authority. | No accounts, server secrets, moderation or shared data. |
| Static frontend + small API (e.g. Cloudflare Workers) + managed identity/Postgres (e.g. Supabase) | First classroom pilot; one origin, server enforcement, managed auth/data. | New operational surface: auth, email, backups, regional/privacy review, quotas, incident response. |
| Vercel or another app host | Preview environments and functions if the team values them. | Plan eligibility, runtime limits, vendor lock-in and the same backend security work. |
| Full LMS/backend framework now | Not justified by the current product. | More code and policy before the learning loop is validated. |

The recommended first shared-service shape is a static frontend plus a small API and managed identity/Postgres, with the API in a separate backend repository. Hosting and data decisions remain subject to school requirements, provider terms, region and actual network access.

## Phase 1: reliable public MVP

Keep Pages while content is public and progress is local. Make releases inspectable:

- Build the published artifact from an explicit runtime allowlist in CI, not by serving the workspace root.
- Run public unit, syntax, packaging, browser and layout checks; keep private OCR out of public CI.
- Gate merges through required checks and review; the solo owner may merge their own checked PR.
- Record the merged SHA and verify the Pages build for that SHA. Roll back by reverting through the same checks.
- Keep private source material out of the artifact. `.gitignore` is not HTTP access control.

## Phase 2: shared classroom pilot

When accounts or shared moderation become necessary, add only the authority the pilot needs:

```text
Browser -> public frontend + /api
                  -> managed identity + Postgres
                  -> Jev service only when explicitly enabled

Private workstation -> private OCR/review -> separately cleared public release
```

- Use one frontend/API origin where possible to simplify cookies and CORS.
- Enforce identity, roles and class membership on the server. A hidden button or client-supplied role is not authorization.
- Prefer managed authentication over handling passwords.
- Start with versioned migrations for users/classes/memberships, card versions and release manifests, private submissions/revisions, moderation actions and published pointers.
- Keep anonymous local browsing working. Offer explicit export/import; do not silently upload all localStorage or personal drafts.
- Define conflict and deletion rules before enabling multi-device writes. Exposure remains exposure; local approval never becomes teacher approval during migration.
- Keep previews restricted and use synthetic data and separate credentials. A random preview URL or `noindex` is not authentication.

## Phase 3: moderated content and Jev

Publication remains a server-authorized action against an exact immutable version. Two independent gates remain:

| Gate | Required evidence |
| --- | --- |
| Editorial | Authorized human review of correctness, assumptions, axes/labels, SL/HL scope and curriculum revision. Syllabus mapping stays provisional until the official guide/amendments are checked. |
| Reuse permission | Recorded permission or a licensed/original basis, audience, attribution and expiry/withdrawal terms. |

Only versions passing both gates enter a public manifest. An edit invalidates affected approvals. Keep the private provenance chain (source ID, page, hash, crop bounds, transcript version, reviewer and timestamps); expose only public-cleared metadata.

Jev requires an authenticated proxy, canonical card/source retrieval, validated output, timeout/abstention, rate limits, quotas and a kill switch. AI may advise moderation; it cannot approve publication or rewrite a recall schedule. Test against teacher-reviewed examples before enabling it.

## Storage, domain and migration

localStorage belongs to an origin. Moving from `chromedomev12.github.io` to a custom domain or another host does not transfer it. Before a move, implement versioned JSON export/import for `econ-refresh-v1`, `econ-workspace-v2` and optional theme/menu preferences; validate schema/size, show a summary, preserve timestamps and never invent recall events. Keep the old origin available long enough to export.

Once data is shared, a frontend rollback cannot undo a destructive database migration. Prefer additive migrations and a separate recovery procedure. Back up SQL, object files and permission/provenance records separately, and test restoration.

## Costs and ownership

Budget separately for static hosting, API/CPU, database compute/storage/backups, auth/email, object egress, previews, logs and AI usage. Set usage alerts and application quotas; billing alerts are not a hard cap. Assign an owner for renewals, backups, failed releases and account recovery. Recheck provider terms and limits at implementation; no permanent free tier is assumed.

## Decision triggers

| Trigger | Next decision |
| --- | --- |
| Public cards, local progress, no shared authority | Stay on Pages; improve content and release checks. |
| Reviewer previews or custom response headers before accounts | Evaluate a static host with functions; no database yet. |
| First cross-device sync or shared moderation pilot | Choose managed identity/Postgres and implement server authorization. |
| Live Jev | Add the authenticated proxy and evaluation/cost gates. |
| Paid offering, institutional use or procurement | Reassess terms, paid plans, regions, recovery and support. |
| Long jobs, uploads or runtime limits become material | Add isolated job processing/object storage; keep the frontend static. |

The next product decision is whether the teacher actually needs shared accounts and moderation for the pilot. That answer determines when the backend is worth operating.
