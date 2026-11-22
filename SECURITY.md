# Security Policy

## Reporting

Report vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/ChromedomeV12/EconRevisionPlatform/security/advisories/new). Include the affected commit or URL, reproduction steps, expected behavior and observed impact. Do not post credentials, private source material, student data or exploit details publicly. No response deadline is promised.

`main` is the maintained prototype. Historical demo revisions are not supported release branches.

## What the system is

The public app is static HTML, CSS and JavaScript served by GitHub Pages, with vendored browser dependencies and public assets. It has no account service, server database or live AI. Study history, preferences and personal submissions are localStorage convenience data, not an authenticated record of teacher approval or recall.

Future accounts, shared moderation or AI require a backend. The design limits are recorded in [DECISIONS.md](docs/DECISIONS.md); they are not controls implemented by this static app.

## Required properties

- **Untrusted input stays untrusted.** Submitted strings and persisted browser data are validated structurally and escaped for their rendering context. They must not execute script or inject markup.
- **Local approval is not authority.** Personal review only adds a card to a local library. It does not imply teacher verification, publication permission or authority over other users.
- **Exposure is not recall.** Only explicit recall ratings may alter FSRS history. Swipes, views, saves and automated assessments must not invent reviews or silently change the schedule.
- **Private material stays out of the public artifact.** Source PDFs, extracted text, transcripts, unapproved crops, working evidence and agent credentials do not enter the repository, preview allowlist or deployed site. The selected diagram extracts with owner-confirmed reuse permission are a narrow exception, not clearance for the collection.
- **The publication boundary is the served file set.** `.gitignore` is not HTTP access control. The local preview is loopback-only and serves an explicit public allowlist; GitHub Pages publishes committed files from `main`.
- **Client code holds no service credentials.** A future AI integration requires an authenticated backend to hold keys, retrieve canonical sources, validate output and keep audit records. Model output cannot approve publication or mutate scheduling.
- **Workflows use least privilege.** Use read-only tokens where possible, pin third-party actions, and do not run untrusted PR code with deployment credentials or through `pull_request_target`.

## Reportable issues

Script injection, disclosure or publication of private material or credentials, preview allowlist/path escapes, unauthorized external transmission, workflow privilege escalation, and reachable dependency vulnerabilities. Explain the attacker-controlled input, the execution path and practical impact; a dependency's presence alone does not establish exploitability.

Automated checks, schema validation and dependency alerts do not establish factual correctness, teacher approval or redistribution rights. See [Repository security](docs/REPOSITORY_SECURITY.md) for the controls that gate merges and publication.
