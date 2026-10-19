# gjo-se.com — Code-Mirror

English · [Deutsch](README.md)

The source code behind [gjo-se.com](https://www.gjo-se.com): about 90 % platform for admin and backoffice — acquisition platform, projects, CRM and LLM pipeline. Curated excerpt of the private source repository — not runnable; internal parts are not included. Openly licensed under [MIT](LICENSE).

### Focus areas:

React · FastAPI · SQL / NoSQL · GenAI · Test Automation · Software Architecture · CI/CD — built with a quality-assured workflow.

[What this code shows](#what-this-code-shows) · [Clean Code](#clean-code)

## TL;DR

<table>
<thead><tr><th align="left">Dimension</th><th align="left">Target</th><th>Frontend</th><th>Status</th><th>Backend</th><th>Status</th><th align="left">Explanation</th></tr></thead>
<tbody>
<tr><td>Lines of Code</td><td>—</td><td>76,566</td><td>—</td><td>50,547</td><td>—</td><td>Lines of production code</td></tr>
<tr><td>Tests</td><td>—</td><td>41,692</td><td>—</td><td>39,974</td><td>—</td><td>Lines of test code</td></tr>
<tr><td>Effort</td><td>—</td><td>17.8 PJ</td><td>—</td><td>12.9 PJ</td><td>—</td><td>new-build equivalent · prod 20 min/LOC + tests 10 min/LOC (point estimate, ±uncertainty)</td></tr>
<tr><td>Rules</td><td>—</td><td>211</td><td>—</td><td>465</td><td>—</td><td>Breakdown by engine: ESLint 172 · Ruff 405 · Semgrep 14 (global) · Custom 102</td></tr>
<tr><td>Dead Code</td><td>0</td><td>0</td><td>🟢</td><td>0</td><td>🟢</td><td>unused code</td></tr>
<tr><td>God Files</td><td>0</td><td>0</td><td>🟢</td><td>0</td><td>🟢</td><td>File &gt; 500 LOC</td></tr>
<tr><td>SRP</td><td>0</td><td>0</td><td>🟢</td><td>0</td><td>🟢</td><td>LCOM4 ≥ 2 · custom check (class/module)</td></tr>
<tr><td>DRY</td><td>≤ 3 %</td><td>0.6 %</td><td>🟢</td><td>0.8 %</td><td>🟢</td><td>duplicated code</td></tr>
<tr><td>Debt Ratio</td><td>≤ 5 %</td><td>0.1 %</td><td>🟢</td><td>0.2 %</td><td>🟢</td><td>remediation cost ÷ development cost · Rating A = ≤ 5 %</td></tr>
</tbody>
<tfoot>
<tr><td colspan="7">Measurement basis: frontend/src + backend/app · Date: 2026-10-19</td></tr>
</tfoot>
</table>

## What this code shows

Generative AI writes code at scale — and without guardrails, architecture erodes: DRY
violations, spaghetti code, dead paths and God Files. This repository solves exactly this
problem on itself; the production code is predominantly AI-generated.

The system is an AI-driven development and automation portal: acquisition and project
pipeline, CRM, data enrichment and operations run in a backoffice whose agents and workflows
work productively.

At its core is a dual protection system. **Viscera** makes architecture verifiable:
spec-driven modeling, automated code scans and strict module guards in the CI pipeline keep
AI code within the defined frame.

The backoffice framework secures operations: automated enrichment, self-healing and
deterministic quality gates that every commit passes.

Conception, multi-agent pipeline architecture, gate design and LLMOps are in one hand — the
code shows the entire chain.

## Clean Code

Each stack is measured by the same column logic. `Target` is the value the hook enforces: `0` = no deviation allowed, `green` = build/health check, `100%` = coverage floor. `⚪` marks observing hooks without blocking effect.

### Frontend

<table>
<thead><tr><th align="left">Dimension</th><th align="left">Target</th><th align="left">Hook</th><th>Status</th><th align="left">Explanation</th></tr></thead>
<tbody>
<tr><td colspan="5"><h3>Quality</h3></td></tr>
<tr><td>Lint &amp; Style</td><td>0</td><td><code>frontend-eslint</code></td><td>🟢</td><td>Style and lint errors</td></tr>
<tr><td>Types</td><td>0</td><td><code>frontend-tsc</code></td><td>🟢</td><td>Type errors</td></tr>
<tr><td>Dead Code</td><td>0</td><td><code>check-fe-dead-code</code></td><td>🟢</td><td>unused code</td></tr>
<tr><td>Complexity</td><td>0</td><td><code>check-fe-complexity</code></td><td>🟢</td><td>overly complex units</td></tr>
<tr><td>Duplication</td><td>0</td><td><code>frontend-semantic-duplicates</code></td><td>🟢</td><td>Duplication</td></tr>
<tr><td>Docs</td><td>0</td><td><code>check-fe-jsdoc</code></td><td>⚪</td><td>Docs (beobachtend FE)</td></tr>
<tr><td>Guardrail</td><td>0</td><td><code>check-linter-suppressions</code></td><td>🟢</td><td>Guardrail</td></tr>
<tr><td>Docs</td><td>grün</td><td><code>generate-stories</code></td><td>🟢</td><td>Docs</td></tr>
<tr><td>Build</td><td>grün</td><td><code>storybook-build</code></td><td>🟢</td><td>Build</td></tr>
<tr><td colspan="5"><h3>Architecture</h3></td></tr>
<tr><td>Routes</td><td>grün</td><td><code>routes-fe-be</code></td><td>🟢</td><td>Routes</td></tr>
<tr><td>Routes</td><td>grün</td><td><code>routes-fe-fe</code></td><td>🟢</td><td>Routes</td></tr>
<tr><td>SRP</td><td>0</td><td><code>check-fe-single-responsibility</code></td><td>🟢</td><td>LCOM4 ≥ 2 · custom check (class/module)</td></tr>
<tr><td>God Files</td><td>0</td><td><code>check-fe-file-length</code></td><td>🟢</td><td>File &gt; 500 LOC</td></tr>
<tr><td>Boundaries</td><td>0</td><td><code>boundaries/dependencies</code></td><td>🟢</td><td>Boundaries</td></tr>
<tr><td>File composition</td><td>0</td><td><code>project-structure/file-composition</code></td><td>🟢</td><td>File composition</td></tr>
<tr><td>Folder structure</td><td>0</td><td><code>project-structure/folder-structure</code></td><td>🟢</td><td>Folder structure</td></tr>
<tr><td>Component props</td><td>0</td><td><code>react/forbid-component-props</code></td><td>🟢</td><td>Component props</td></tr>
<tr><td>Forbidden elements</td><td>0</td><td><code>react/forbid-elements</code></td><td>🟢</td><td>Forbidden elements</td></tr>
<tr><td>Naming</td><td>0</td><td><code>check-file/filename-naming-convention</code> · <code>check-file/folder-naming-convention</code></td><td>🟢</td><td>Naming</td></tr>
<tr><td>No arbitrary values</td><td>0</td><td><code>tailwindcss/no-arbitrary-value</code></td><td>🟢</td><td>No arbitrary values</td></tr>
<tr><td>No className</td><td>0</td><td><code>no-component-classname/no-component-classname</code></td><td>🟢</td><td>No className</td></tr>
<tr><td>No styling wrapper</td><td>0</td><td><code>no-styling-wrapper/no-styling-wrapper</code></td><td>🟢</td><td>No styling wrapper</td></tr>
<tr><td>Pages router</td><td>0</td><td><code>pages-router-sync/pages-router-sync</code></td><td>🟢</td><td>Pages router</td></tr>
<tr><td>React naming</td><td>0</td><td><code>react/no-multi-comp</code></td><td>🟢</td><td>React naming</td></tr>
<tr><td>Restricted imports</td><td>0</td><td><code>restricted-imports/restricted-imports</code></td><td>🟢</td><td>Restricted imports</td></tr>
<tr><td>Shared layer</td><td>0</td><td><code>shared-layer-purity/shared-layer-purity</code></td><td>🟢</td><td>Shared layer</td></tr>
<tr><td>Boundaries</td><td>0</td><td><code>frontend-depcruise</code></td><td>🟢</td><td>Boundaries</td></tr>
<tr><td>Structure</td><td>0</td><td><code>check-fe-barrel-structure</code></td><td>🟢</td><td>Structure</td></tr>
<tr><td>Structure</td><td>0</td><td><code>check-fe-component-composition</code></td><td>🟢</td><td>Structure</td></tr>
<tr><td colspan="5"><h3>Security</h3></td></tr>
<tr><td>Secrets</td><td>0</td><td><code>gitleaks</code></td><td>🟢</td><td>committed secrets</td></tr>
<tr><td>Dependency audit</td><td>0</td><td><code>npm-audit</code></td><td>🟢</td><td>vulnerable dependencies</td></tr>
<tr><td colspan="5"><h3>Tests</h3></td></tr>
<tr><td>Test hygiene</td><td>0</td><td><code>frontend-eslint-test</code></td><td>🟢</td><td>Test hygiene</td></tr>
<tr><td>Test structure</td><td>0</td><td><code>check-fe-test-structure</code></td><td>🟢</td><td>tests in the wrong level</td></tr>
<tr><td>Test isolation</td><td>0</td><td><code>check-fe-unit-no-network</code></td><td>🟢</td><td>Test isolation</td></tr>
<tr><td>Test hygiene</td><td>0</td><td><code>check-fe-test-antipatterns</code></td><td>🟢</td><td>test anti-patterns</td></tr>
<tr><td>Test orphans</td><td>0</td><td><code>check-fe-test-orphans</code></td><td>🟢</td><td>code without mirror test</td></tr>
<tr><td>Unit</td><td>green</td><td><code>fe-vitest-unit</code></td><td>🟢</td><td>failed tests</td></tr>
<tr><td>Integration</td><td>green</td><td><code>fe-vitest-integration</code></td><td>🟢</td><td>interface errors</td></tr>
</tbody>
</table>

### Backend

<table>
<thead><tr><th align="left">Dimension</th><th align="left">Target</th><th align="left">Hook</th><th>Status</th><th align="left">Explanation</th></tr></thead>
<tbody>
<tr><td colspan="5"><h3>Quality</h3></td></tr>
<tr><td>Format</td><td>grün</td><td><code>ruff-format</code></td><td>🟢</td><td>Format</td></tr>
<tr><td>Lint &amp; Style</td><td>0</td><td><code>ruff-check</code></td><td>🟢</td><td>Style and lint errors</td></tr>
<tr><td>Guardrail</td><td>0</td><td><code>be-noqa-guard</code></td><td>🟢</td><td>Guardrail</td></tr>
<tr><td>Namespace</td><td>0</td><td><code>check-init-files</code></td><td>🟢</td><td>Namespace</td></tr>
<tr><td>Types</td><td>0</td><td><code>basedpyright</code></td><td>🟢</td><td>Type errors</td></tr>
<tr><td>Docs</td><td>100%</td><td><code>check-interrogate</code></td><td>🟢</td><td>Docs</td></tr>
<tr><td>Dead Code</td><td>0</td><td><code>vulture</code></td><td>🟢</td><td>unused code</td></tr>
<tr><td>Complexity</td><td>0</td><td><code>xenon</code></td><td>🟢</td><td>overly complex units</td></tr>
<tr><td>Async</td><td>0</td><td><code>check-async-blocking</code></td><td>🟢</td><td>Async</td></tr>
<tr><td>Recursion</td><td>0</td><td><code>check-infinite-recursion</code></td><td>🟢</td><td>Recursion</td></tr>
<tr><td>Duplication</td><td>0</td><td><code>check-semantic-duplicates</code></td><td>🟢</td><td>Duplication</td></tr>
<tr><td colspan="5"><h3>Architecture</h3></td></tr>
<tr><td>Structure</td><td>0</td><td><code>check-repositories-layout</code></td><td>🟢</td><td>Structure</td></tr>
<tr><td>SRP</td><td>0</td><td><code>check-single-responsibility</code></td><td>🟢</td><td>LCOM4 ≥ 2 · custom check (class/module)</td></tr>
<tr><td>SRP</td><td>0</td><td><code>check-module-lcom4</code></td><td>🟢</td><td>SRP</td></tr>
<tr><td>Boundaries</td><td>0</td><td><code>check-aggregate-boundary</code></td><td>🟢</td><td>Boundaries</td></tr>
<tr><td>God Files</td><td>0</td><td><code>check-file-length</code></td><td>🟢</td><td>File &gt; 500 LOC</td></tr>
<tr><td>DI</td><td>0</td><td><code>check-dependency-injection</code></td><td>🟢</td><td>DI</td></tr>
<tr><td>State</td><td>0</td><td><code>check-module-state</code></td><td>🟢</td><td>State</td></tr>
<tr><td>Structure</td><td>0</td><td><code>check-structure</code></td><td>🟢</td><td>Structure</td></tr>
<tr><td>Module boundaries</td><td>0</td><td><code>import-linter</code></td><td>🟢</td><td>Boundary violations</td></tr>
<tr><td>Boundaries</td><td>0</td><td><code>check-service-dto</code></td><td>🟢</td><td>Boundaries</td></tr>
<tr><td colspan="5"><h3>Security</h3></td></tr>
<tr><td>Secrets</td><td>0</td><td><code>detect-secrets</code></td><td>🟢</td><td>committed secrets</td></tr>
<tr><td>SAST</td><td>0</td><td><code>bandit</code></td><td>🟢</td><td>insecure patterns</td></tr>
<tr><td>Dependency audit</td><td>0</td><td><code>pip-audit</code></td><td>🟢</td><td>vulnerable dependencies</td></tr>
<tr><td colspan="5"><h3>Tests</h3></td></tr>
<tr><td>Test structure</td><td>0</td><td><code>check-test-structure</code></td><td>🟢</td><td>tests in the wrong level</td></tr>
<tr><td>Test hygiene</td><td>0</td><td><code>check-test-antipatterns</code></td><td>🟢</td><td>test anti-patterns</td></tr>
<tr><td>Test orphans</td><td>0</td><td><code>check-test-orphans</code></td><td>🟢</td><td>code without mirror test</td></tr>
<tr><td>Unit</td><td>green</td><td><code>pytest-unit</code></td><td>🟢</td><td>failed tests</td></tr>
<tr><td>Integration</td><td>green</td><td><code>pytest-integration</code></td><td>🟢</td><td>interface errors</td></tr>
<tr><td>Network</td><td>0</td><td><code>check-api-host-guard</code></td><td>🟢</td><td>Network</td></tr>
<tr><td>Test coverage</td><td>0</td><td><code>check-api-route-coverage</code></td><td>🟢</td><td>Test coverage</td></tr>
<tr><td>Test contract</td><td>0</td><td><code>check-api-contract</code></td><td>🟢</td><td>Test contract</td></tr>
<tr><td>Test isolation</td><td>0</td><td><code>check-unit-no-db</code></td><td>🟢</td><td>Test isolation</td></tr>
<tr><td>Tests</td><td>grün</td><td><code>pytest-api</code></td><td>🟢</td><td>Tests</td></tr>
<tr><td>Mutation</td><td>grün</td><td><code>pytest-unit-mutation</code></td><td>🟢</td><td>Mutation</td></tr>
</tbody>
</table>

### Both stacks

Hooks that apply to both stacks – maintained once instead of duplicated per stack.

<table>
<thead><tr><th align="left">Dimension</th><th align="left">Target</th><th align="left">Hook</th><th>Status</th><th align="left">Explanation</th></tr></thead>
<tbody>
<tr><td colspan="5"><h3>Quality</h3></td></tr>
<tr><td>Duplication</td><td>0</td><td><code>check-token-duplicates</code></td><td>🟢</td><td>Duplication</td></tr>
<tr><td colspan="5"><h4>Hygiene &amp; Guardrails</h4></td></tr>
<tr><td>Repo protection</td><td>green</td><td><code>llm-edit-guard</code></td><td>🟢</td><td>Guardrails, generated artifacts</td></tr>
<tr><td>Repo protection</td><td>green</td><td><code>check-root-guard</code></td><td>🟢</td><td>Guardrails, generated artifacts</td></tr>
<tr><td>Repo protection</td><td>green</td><td><code>hooks-manifest-drift</code></td><td>🟢</td><td>Guardrails, generated artifacts</td></tr>
<tr><td>File hygiene</td><td>0</td><td><code>trailing-whitespace</code></td><td>🟢</td><td>Whitespace, final newline</td></tr>
<tr><td>File hygiene</td><td>0</td><td><code>end-of-file-fixer</code></td><td>🟢</td><td>Whitespace, final newline</td></tr>
<tr><td>Syntax</td><td>0</td><td><code>check-yaml</code></td><td>🟢</td><td>File syntax</td></tr>
<tr><td>Syntax</td><td>0</td><td><code>check-json</code></td><td>🟢</td><td>File syntax</td></tr>
<tr><td>Repo protection</td><td>green</td><td><code>sync-schemas</code></td><td>🟢</td><td>Guardrails, generated artifacts</td></tr>
<tr><td>Architecture</td><td>grün</td><td><code>validate-architecture-yaml</code></td><td>🟢</td><td>Architecture</td></tr>
<tr><td>File hygiene</td><td>green</td><td><code>check-merge-conflict</code></td><td>🟢</td><td>Finds merge conflict markers after gf_end</td></tr>
<tr><td colspan="5"><h3>Security</h3></td></tr>
<tr><td>Secrets</td><td>0</td><td><code>detect-private-key</code></td><td>🟢</td><td>Secrets</td></tr>
<tr><td>SAST</td><td>0</td><td><code>semgrep</code></td><td>🟢</td><td>insecure patterns</td></tr>
<tr><td colspan="5"><h3>Tests</h3></td></tr>
<tr><td>Guardrail</td><td>grün</td><td><code>test-guardrails</code></td><td>🟢</td><td>Guardrail</td></tr>
</tbody>
<tfoot>
<tr><td colspan="5">Source: hooks.manifest.yaml (75 Hooks) · Date: 2026-10-19</td></tr>
</tfoot>
</table>
