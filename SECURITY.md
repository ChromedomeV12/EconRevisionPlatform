# Security Policy

## Reporting a Vulnerability

Report security issues privately through [GitHub private vulnerability reporting](https://github.com/ChromedomeV12/EconRevisionPlatform/security/advisories/new). It is enabled for this repository. Include the affected commit or URL, reproduction steps, expected behavior, and observed impact. Do not post credentials, private textbook material, personal study data, or exploit details in public issues. This project does not promise a response deadline.

The current `main` branch is the maintained prototype; historical demo revisions are not maintained release branches.

## System and Scope

This repository contains a static IBDP Economics revision prototype served by GitHub Pages. Its public runtime consists of HTML, CSS, vanilla JavaScript, vendored browser dependencies, and public assets. It has no account service, server-side database, or live AI integration. Review runtime code, dependencies, preview tooling, workflows, and deployment configuration wherever they affect public content, browser data, or repository integrity.

Study history, bookmarks, personal submissions, browsing preferences, and theme choice are stored in the browser's localStorage. They are device-local convenience data, not an authenticated record of teacher approval or recall proficiency. Anyone with access to that browser profile or code executing on the same origin may access or change them.

## Trust Boundaries and Required Properties

- Treat submitted strings and persisted browser data as untrusted. Validate their structure and escape values for their HTML context before rendering; they must not execute script or inject markup through the card, search, detail, or personal review interfaces.
- Personal review approval applies only to a local library. It must not imply teacher verification, publication permission, or authority over other users' content.
- Only explicit recall ratings may alter FSRS review history. Viewing, swiping, saving, or automated assessments must not invent reviews or silently change the schedule.
- Keep private PDFs, extracted text, original diagram crops, transcription drafts, OCR working data, and agent credentials outside the public repository and deployed site. `.gitignore` is not HTTP access control. The local preview must remain loopback-only and serve its explicit public-file allowlist.
- Browser code and public assets must contain no service credentials. A future Jev integration requires an authenticated backend to hold credentials, authorize source retrieval, validate responses, and keep audit records. Model output is untrusted and cannot bypass human review or mutate scheduling directly. These backend requirements are design constraints, not controls already implemented by this static app.
- Workflow tokens should have only the permissions needed by the job. Untrusted PR code must not receive deployment credentials or execute through `pull_request_target`. Review changes to workflows, dependencies, and publication inputs as security-sensitive changes.

## Reportability and Limits

Report script injection, unexpected disclosure or publication of private materials or credentials, preview path/allowlist escapes, unauthorized external data transmission, workflow privilege escalation, and reachable dependency vulnerabilities. Explain the attacker-controlled input, execution path, and practical impact; dependency presence alone does not establish exploitability.

Local approval and storage are not server-side authorization mechanisms. Evaluate a finding against the actual browser and deployment boundary rather than assuming accounts or shared submissions exist. There are no project-specific exclusions or accepted vulnerability classes established by this policy. Historical files and private tooling still matter when a path from them can affect the public app or expose private data.

CI checks, schema validation, and automated dependency alerts do not establish factual correctness, teacher approval, or permission to distribute source material. GitHub Pages serves files that reach its configured publication source; a failed verification run alone does not prevent branch-based Pages deployment. See [repository security controls](docs/REPOSITORY_SECURITY.md) for checks and enforcement status.
