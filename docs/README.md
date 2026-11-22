# Documentation

These guides explain what code cannot: the problem being solved, the requirements, the choices made, the alternatives rejected, and the rules that must remain true. They do not narrate implementation. When a fact is visible in source, configuration, tests or command help, link to it instead of copying it.

## How to read

| Question | Read |
| --- | --- |
| What is this product for, and what is in scope? | [Project README](../README.md) |
| Why was a major choice made? | [Decision log](DECISIONS.md) |
| What owns what, and where are the boundaries? | [Architecture](ARCHITECTURE.md) |
| How do I change something safely? | [Contributing](../CONTRIBUTING.md), [Testing](TESTING.md) |
| How do branches, reviews and releases work? | [Git workflow](GIT_WORKFLOW.md) |
| How are cards authored, reviewed and delivered? | [Content pipeline](CONTENT_PIPELINE.md) |
| How does private OCR and graph reconstruction work? | [OCR operations](OCR_OPERATIONS.md), [Graph workflow](GRAPH_WORKFLOW.md) |
| What must never be exposed? | [Security policy](../SECURITY.md), [Repository security](REPOSITORY_SECURITY.md) |
| What is planned for hosting, accounts or AI? | [Deployment plan](DEPLOYMENT_PLAN.md), [Jev integration](JEV_INTEGRATION.md) |

Historical records: [graph fidelity failure](GRAPH_FIDELITY_POSTMORTEM.md), [superseded diagram proposal](DIAGRAM_RECONSTRUCTION.md), [earlier planning notes](superpowers/README.md).

## Writing rules

- Lead with the user need or constraint. Explain the decision and the alternative that was rejected.
- State what must remain true after a refactor. Do not describe function names, CSS selectors or call order unless a maintainer cannot discover them.
- Keep one source of truth. Link to code, tests or `--help` for mechanics; link to the [decision log](DECISIONS.md) for rationale.
- Separate current behaviour from plans. Mark planned work explicitly.
- Keep uncertainty visible. Do not turn an assumption, source claim or automated check into teacher approval or publication permission.
- Prefer short sections and tables over narrative. Delete a sentence that does not change a decision or prevent a mistake.

## Authority

`README.md` states product intent and current scope. `DECISIONS.md` records why the main choices were made. `AGENTS.md` states operating rules for coding agents. `SECURITY.md` states security requirements. Architecture, content, graph, OCR, testing and git guides explain the policy for their area.

Code and tests show current behaviour. If a guide and the implementation disagree, inspect both, then either correct the guide or change the implementation. Do not treat an old plan as a current requirement.

`DIAGRAM_RECONSTRUCTION.md`, `GRAPH_FIDELITY_POSTMORTEM.md` and `superpowers/` are historical records. They explain past failures and superseded proposals; they are not the current specification.
