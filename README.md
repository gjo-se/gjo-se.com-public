# gjo-se.com — Code-Mirror

Deutsch · [English](README.en.md)

Der Quellcode hinter [gjo-se.com](https://www.gjo-se.com): rund 90 % Plattform für Admin und Backoffice — Akquise-Plattform, Projekte, CRM und LLM-Pipeline. Kuratierter Auszug des privaten Original-Repositories – nicht lauffähig; interne Teile sind nicht enthalten. Offen lizenziert unter [MIT](LICENSE).

### Tech Stack:

React · FastAPI · SQL / NoSQL · GenAI · Test Automation · Software Architecture · CI/CD

[Was dieser Code zeigt](#was-dieser-code-zeigt) · [Clean Code](#clean-code)

## TL;DR

<table>
<thead><tr><th align="left">Dimension</th><th align="left">Ziel</th><th>Frontend</th><th>Status</th><th>Backend</th><th>Status</th><th align="left">Erklärung</th></tr></thead>
<tbody>
<tr><td>Codezeilen</td><td>—</td><td>76.566</td><td>—</td><td>50.547</td><td>—</td><td>Lines of Produktionscode</td></tr>
<tr><td>Tests</td><td>—</td><td>41.692</td><td>—</td><td>39.974</td><td>—</td><td>Lines of Testcode</td></tr>
<tr><td>Aufwand</td><td>—</td><td>17,8 PJ</td><td>—</td><td>12,9 PJ</td><td>—</td><td>Vergleichsäquivalent Neubau · Prod 20 min/LOC + Tests 10 min/LOC (Punktwert, ±Schätzung)</td></tr>
<tr><td>Regeln</td><td>—</td><td>211</td><td>—</td><td>465</td><td>—</td><td>Verteilung nach Engine: ESLint 172 · Ruff 405 · Semgrep 14 (global) · Custom 102</td></tr>
<tr><td>Dead Code</td><td>0</td><td>0</td><td>🟢</td><td>0</td><td>🟢</td><td>ungenutzter Code</td></tr>
<tr><td>God Files</td><td>0</td><td>0</td><td>🟢</td><td>0</td><td>🟢</td><td>Datei &gt; 500 LOC</td></tr>
<tr><td>SRP</td><td>0</td><td>0</td><td>🟢</td><td>0</td><td>🟢</td><td>LCOM4 ≥ 2 · custom Check (Klasse/Modul)</td></tr>
<tr><td>DRY</td><td>≤ 3 %</td><td>0,6 %</td><td>🟢</td><td>0,8 %</td><td>🟢</td><td>doppelter Code</td></tr>
<tr><td>Debt Ratio</td><td>≤ 5 %</td><td>0,1 %</td><td>🟢</td><td>0,2 %</td><td>🟢</td><td>Behebungskosten ÷ Aufwand · Rating A = ≤ 5 %</td></tr>
</tbody>
<tfoot>
<tr><td colspan="7">Messbasis: frontend/src + backend/app · Stand: 19.10.2026</td></tr>
</tfoot>
</table>

## Was dieser Code zeigt

Generative KI schreibt Code in großem Maßstab — und ohne Leitplanken erodiert die Architektur:
DRY-Verstöße, Spaghetti-Code, tote Pfade und God Files. Dieses Repository löst genau dieses
Problem an sich selbst; der Produktivcode entsteht überwiegend KI-generiert.

Das System ist ein KI-gesteuertes Entwicklungs- und Automatisierungsportal: Akquise- und
Projekt-Pipeline, CRM, Datenanreicherung und Betrieb laufen in einem Backoffice, dessen Agenten
und Workflows produktiv arbeiten.

Der Kern ist ein duales Schutzsystem. **Viscera** macht Architektur prüfbar: spec-getriebene
Modellierung, automatisierte Code-Scans und strikte Modul-Guards in der CI-Pipeline halten
KI-Code im definierten Rahmen.

Das Backoffice-Framework sichert den Betrieb: automatisierte Anreicherung, Selbstheilung und
deterministische Qualitäts-Gates, die jeder Commit passiert.

Konzeption, multi-agentische Pipeline-Architektur, Gate-Design und LLMOps liegen in einer Hand —
der Code zeigt die gesamte Kette.

## Clean Code

Jeder Stapel misst sich an derselben Spaltenlogik. `Ziel` ist der Sollwert, den der Hook erzwingt: `0` = keine Abweichung zugelassen, `grün` = Build-/Health-Check, `100%` = Abdeckungsgrenze. `⚪` markiert beobachtende Hooks ohne Blockwirkung.

### Frontend

<table>
<thead><tr><th align="left">Dimension</th><th align="left">Ziel</th><th align="left">Hook</th><th>Status</th><th align="left">Erklärung</th></tr></thead>
<tbody>
<tr><td colspan="5"><h3>Quality</h3></td></tr>
<tr><td>Lint &amp; Stil</td><td>0</td><td><code>frontend-eslint</code></td><td>🟢</td><td>Stil- und Lint-Fehler</td></tr>
<tr><td>Typen</td><td>0</td><td><code>frontend-tsc</code></td><td>🟢</td><td>Typfehler</td></tr>
<tr><td>Dead Code</td><td>0</td><td><code>check-fe-dead-code</code></td><td>🟢</td><td>ungenutzter Code</td></tr>
<tr><td>Komplexität</td><td>0</td><td><code>check-fe-complexity</code></td><td>🟢</td><td>zu komplexe Einheiten</td></tr>
<tr><td>Duplikate</td><td>0</td><td><code>frontend-semantic-duplicates</code></td><td>🟢</td><td>FE-semantische Duplikate (LanceDB, eigene Metrik)</td></tr>
<tr><td>Docs</td><td>0</td><td><code>check-fe-jsdoc</code></td><td>⚪</td><td>FE Doc-Block-Qualität (eslint-plugin-jsdoc) – Spiegel BE check-interrogate (beobachtend FE)</td></tr>
<tr><td>Guardrail</td><td>0</td><td><code>check-linter-suppressions</code></td><td>🟢</td><td>FE-Suppression-Audit (eslint-disable etc.)</td></tr>
<tr><td>Docs</td><td>grün</td><td><code>generate-stories</code></td><td>🟢</td><td>Generiert fehlende FE-Stories</td></tr>
<tr><td>Build</td><td>grün</td><td><code>storybook-build</code></td><td>🟢</td><td>Storybook-Build-Check FE (Generate-Block-Selbst-Validierung)</td></tr>
<tr><td colspan="5"><h3>Architecture</h3></td></tr>
<tr><td>Routes</td><td>grün</td><td><code>routes-fe-be</code></td><td>🟢</td><td>FE-API-URLs gegen BE-Routen (Cross-Check)</td></tr>
<tr><td>Routes</td><td>grün</td><td><code>routes-fe-fe</code></td><td>🟢</td><td>FE-Routen-Liveness (stale navigate()/Link)</td></tr>
<tr><td>SRP</td><td>0</td><td><code>check-fe-single-responsibility</code></td><td>🟢</td><td>LCOM4 ≥ 2 · custom Check (Klasse/Modul)</td></tr>
<tr><td>God Files</td><td>0</td><td><code>check-fe-file-length</code></td><td>🟢</td><td>Datei &gt; 500 LOC</td></tr>
<tr><td>Boundaries</td><td>0</td><td><code>boundaries/dependencies</code></td><td>🟢</td><td>Boundaries</td></tr>
<tr><td>Datei-Komposition</td><td>0</td><td><code>project-structure/file-composition</code></td><td>🟢</td><td>Datei-Komposition</td></tr>
<tr><td>Ordner-Struktur</td><td>0</td><td><code>project-structure/folder-structure</code></td><td>🟢</td><td>Ordner-Struktur</td></tr>
<tr><td>Component-Props</td><td>0</td><td><code>react/forbid-component-props</code></td><td>🟢</td><td>Component-Props</td></tr>
<tr><td>Element-Verbote</td><td>0</td><td><code>react/forbid-elements</code></td><td>🟢</td><td>Element-Verbote</td></tr>
<tr><td>Naming</td><td>0</td><td><code>check-file/filename-naming-convention</code> · <code>check-file/folder-naming-convention</code></td><td>🟢</td><td>Naming</td></tr>
<tr><td>Keine Arbitrary Values</td><td>0</td><td><code>tailwindcss/no-arbitrary-value</code></td><td>🟢</td><td>Keine Arbitrary Values</td></tr>
<tr><td>Kein className</td><td>0</td><td><code>no-component-classname/no-component-classname</code></td><td>🟢</td><td>Kein className</td></tr>
<tr><td>Kein Styling-Wrapper</td><td>0</td><td><code>no-styling-wrapper/no-styling-wrapper</code></td><td>🟢</td><td>Kein Styling-Wrapper</td></tr>
<tr><td>Pages-Router</td><td>0</td><td><code>pages-router-sync/pages-router-sync</code></td><td>🟢</td><td>Pages-Router</td></tr>
<tr><td>React-Naming</td><td>0</td><td><code>react/no-multi-comp</code></td><td>🟢</td><td>React-Naming</td></tr>
<tr><td>Restricted Imports</td><td>0</td><td><code>restricted-imports/restricted-imports</code></td><td>🟢</td><td>Restricted Imports</td></tr>
<tr><td>Shared-Layer</td><td>0</td><td><code>shared-layer-purity/shared-layer-purity</code></td><td>🟢</td><td>Shared-Layer</td></tr>
<tr><td>Grenzen</td><td>0</td><td><code>frontend-depcruise</code></td><td>🟢</td><td>FE-Import-Graph – Runtime-Zyklen (dependency-cruiser no-cycles)</td></tr>
<tr><td>Struktur</td><td>0</td><td><code>check-fe-barrel-structure</code></td><td>🟢</td><td>FE-Barrel-Struktur (index.ts Pflicht/Verbot)</td></tr>
<tr><td>Struktur</td><td>0</td><td><code>check-fe-component-composition</code></td><td>🟢</td><td>FE-Component-File-Composition (Component-Golden-Rules)</td></tr>
<tr><td colspan="5"><h3>Security</h3></td></tr>
<tr><td>Secrets</td><td>0</td><td><code>gitleaks</code></td><td>🟢</td><td>eingecheckte Secrets</td></tr>
<tr><td>Dependency-Audit</td><td>0</td><td><code>npm-audit</code></td><td>🟢</td><td>verwundbare Dependencies</td></tr>
<tr><td colspan="5"><h3>Tests</h3></td></tr>
<tr><td>Test-Hygiene</td><td>0</td><td><code>frontend-eslint-test</code></td><td>🟢</td><td>ESLint Test FE (Test-Hygiene testing-library/*) – Spiegel BE check-test-antipatterns/-orphans</td></tr>
<tr><td>Test-Struktur</td><td>0</td><td><code>check-fe-test-structure</code></td><td>🟢</td><td>Tests im falschen Level</td></tr>
<tr><td>Test-Isolation</td><td>0</td><td><code>check-fe-unit-no-network</code></td><td>🟢</td><td>Netz-Ausführung/-Mock in FE-Unit-Tests (frontend/tests/unit) – Netz = Integration (MSW) – Spiegel BE check-unit-no-db</td></tr>
<tr><td>Test-Hygiene</td><td>0</td><td><code>check-fe-test-antipatterns</code></td><td>🟢</td><td>Test-Anti-Patterns</td></tr>
<tr><td>Test-Orphans</td><td>0</td><td><code>check-fe-test-orphans</code></td><td>🟢</td><td>Code ohne Spiegel-Test</td></tr>
<tr><td>Unit</td><td>grün</td><td><code>fe-vitest-unit</code></td><td>🟢</td><td>fehlgeschlagene Tests</td></tr>
<tr><td>Integration</td><td>grün</td><td><code>fe-vitest-integration</code></td><td>🟢</td><td>Schnittstellenfehler</td></tr>
</tbody>
</table>

### Backend

<table>
<thead><tr><th align="left">Dimension</th><th align="left">Ziel</th><th align="left">Hook</th><th>Status</th><th align="left">Erklärung</th></tr></thead>
<tbody>
<tr><td colspan="5"><h3>Quality</h3></td></tr>
<tr><td>Format</td><td>grün</td><td><code>ruff-format</code></td><td>🟢</td><td>Ruff-Formatierung BE (Autofix)</td></tr>
<tr><td>Lint &amp; Stil</td><td>0</td><td><code>ruff-check</code></td><td>🟢</td><td>Stil- und Lint-Fehler</td></tr>
<tr><td>Guardrail</td><td>0</td><td><code>be-noqa-guard</code></td><td>🟢</td><td>Verbot von Suppressions in BE (ENFORCED_RULES)</td></tr>
<tr><td>Namespace</td><td>0</td><td><code>check-init-files</code></td><td>🟢</td><td>Leere __init__.py – Namespace-Disziplin</td></tr>
<tr><td>Typen</td><td>0</td><td><code>basedpyright</code></td><td>🟢</td><td>Typfehler</td></tr>
<tr><td>Docs</td><td>100%</td><td><code>check-interrogate</code></td><td>🟢</td><td>Docstring-Coverage BE (interrogate)</td></tr>
<tr><td>Dead Code</td><td>0</td><td><code>vulture</code></td><td>🟢</td><td>ungenutzter Code</td></tr>
<tr><td>Komplexität</td><td>0</td><td><code>xenon</code></td><td>🟢</td><td>zu komplexe Einheiten</td></tr>
<tr><td>Async</td><td>0</td><td><code>check-async-blocking</code></td><td>🟢</td><td>Sync-Blocking-Calls in async def BE (Ruff-ASYNC-Lücke: tempfile-Familie)</td></tr>
<tr><td>Rekursion</td><td>0</td><td><code>check-infinite-recursion</code></td><td>🟢</td><td>Unbedingte Selbst-Rekursion in BE (Sonar S2190 – Endlos-Rekursion)</td></tr>
<tr><td>Duplikate</td><td>0</td><td><code>check-semantic-duplicates</code></td><td>🟢</td><td>BE-semantische Duplikate (Embeddings)</td></tr>
<tr><td colspan="5"><h3>Architecture</h3></td></tr>
<tr><td>Struktur</td><td>0</td><td><code>check-repositories-layout</code></td><td>🟢</td><td>Repositories: DB-Adapter direkt, Nicht-DB(Datei)-Adapter unter repositories/file/</td></tr>
<tr><td>SRP</td><td>0</td><td><code>check-single-responsibility</code></td><td>🟢</td><td>LCOM4 ≥ 2 · custom Check (Klasse/Modul)</td></tr>
<tr><td>SRP</td><td>0</td><td><code>check-module-lcom4</code></td><td>🟢</td><td>Modul-Kohäsion BE (LCOM4, modul-weit) – God-Module finden</td></tr>
<tr><td>Grenzen</td><td>0</td><td><code>check-aggregate-boundary</code></td><td>🟢</td><td>Aggregat-Grenze BE: Repository fasst nur sein eigenes Aggregat an (Fremd-Aggregat → Owner-Kontext/Port)</td></tr>
<tr><td>God Files</td><td>0</td><td><code>check-file-length</code></td><td>🟢</td><td>Datei &gt; 500 LOC</td></tr>
<tr><td>DI</td><td>0</td><td><code>check-dependency-injection</code></td><td>🟢</td><td>DI-/harte-Kopplung-Erkennung BE</td></tr>
<tr><td>State</td><td>0</td><td><code>check-module-state</code></td><td>🟢</td><td>Modul-globale Collaborator-Singletons BE (projekt-eigene Services/Repos)</td></tr>
<tr><td>Struktur</td><td>0</td><td><code>check-structure</code></td><td>🟢</td><td>Struktur-/API-Guard: Ordner-Kanon, Datei-/Klassen-Namen, Entity-/Namespace-Kanon, API-Prefix/Tag/Param</td></tr>
<tr><td>Modulgrenzen</td><td>0</td><td><code>import-linter</code></td><td>🟢</td><td>Grenzverletzungen</td></tr>
<tr><td>Grenzen</td><td>0</td><td><code>check-service-dto</code></td><td>🟢</td><td>Service-Grenze ist DTO/Domain (kein ORM-Modell/Session/Query, kein bare Any – auch unter TYPE_CHECKING)</td></tr>
<tr><td colspan="5"><h3>Security</h3></td></tr>
<tr><td>Secrets</td><td>0</td><td><code>detect-secrets</code></td><td>🟢</td><td>eingecheckte Secrets</td></tr>
<tr><td>SAST</td><td>0</td><td><code>bandit</code></td><td>🟢</td><td>unsichere Muster</td></tr>
<tr><td>Dependency-Audit</td><td>0</td><td><code>pip-audit</code></td><td>🟢</td><td>verwundbare Dependencies</td></tr>
<tr><td colspan="5"><h3>Tests</h3></td></tr>
<tr><td>Test-Struktur</td><td>0</td><td><code>check-test-structure</code></td><td>🟢</td><td>Tests im falschen Level</td></tr>
<tr><td>Test-Hygiene</td><td>0</td><td><code>check-test-antipatterns</code></td><td>🟢</td><td>Test-Anti-Patterns</td></tr>
<tr><td>Test-Orphans</td><td>0</td><td><code>check-test-orphans</code></td><td>🟢</td><td>Code ohne Spiegel-Test</td></tr>
<tr><td>Unit</td><td>grün</td><td><code>pytest-unit</code></td><td>🟢</td><td>fehlgeschlagene Tests</td></tr>
<tr><td>Integration</td><td>grün</td><td><code>pytest-integration</code></td><td>🟢</td><td>Schnittstellenfehler</td></tr>
<tr><td>Netzwerk</td><td>0</td><td><code>check-api-host-guard</code></td><td>🟢</td><td>Host-Guard: backend/tests/api spricht nur lokale/allowlistete Hosts an (kein Prod-URL/Drittanbieter)</td></tr>
<tr><td>Test-Coverage</td><td>0</td><td><code>check-api-route-coverage</code></td><td>🟢</td><td>Route-Coverage: jede Prod-Spec-Operation in genau einem API_ROUTES-Eintrag deklariert; Drift = Fund</td></tr>
<tr><td>Test-Contract</td><td>0</td><td><code>check-api-contract</code></td><td>🟢</td><td>Contract-Guard: jede Response schema-konform + nur dokumentierte Status-Codes (0 Verstöße)</td></tr>
<tr><td>Test-Isolation</td><td>0</td><td><code>check-unit-no-db</code></td><td>🟢</td><td>DB-Zugriff/-Infrastruktur in Unit-Tests (backend/tests/unit) – Persistenz = Integration</td></tr>
<tr><td>Tests</td><td>grün</td><td><code>pytest-api</code></td><td>🟢</td><td>BE-API-E2E (tests/api) am G3-Promotion-Punkt</td></tr>
<tr><td>Mutation</td><td>grün</td><td><code>pytest-unit-mutation</code></td><td>🟢</td><td>Mutation-Score je Katalog-Modul (Cosmic-Ray) unter Modul-Schwelle (kein org-weites Gate)</td></tr>
</tbody>
</table>

### Beide Stapel

Hooks mit beidseitiger Wirkung – einmal gepflegt statt je Stapel dupliziert.

<table>
<thead><tr><th align="left">Dimension</th><th align="left">Ziel</th><th align="left">Hook</th><th>Status</th><th align="left">Erklärung</th></tr></thead>
<tbody>
<tr><td colspan="5"><h3>Quality</h3></td></tr>
<tr><td>Duplikate</td><td>0</td><td><code>check-token-duplicates</code></td><td>🟢</td><td>Token-/Struktur-Duplikate (jscpd, BE+FE)</td></tr>
<tr><td colspan="5"><h4>Hygiene &amp; Guardrails</h4></td></tr>
<tr><td>Repo-Schutz</td><td>grün</td><td><code>llm-edit-guard</code></td><td>🟢</td><td>Guardrails, generierte Artefakte</td></tr>
<tr><td>Repo-Schutz</td><td>grün</td><td><code>check-root-guard</code></td><td>🟢</td><td>Guardrails, generierte Artefakte</td></tr>
<tr><td>Repo-Schutz</td><td>grün</td><td><code>hooks-manifest-drift</code></td><td>🟢</td><td>Guardrails, generierte Artefakte</td></tr>
<tr><td>Datei-Hygiene</td><td>0</td><td><code>trailing-whitespace</code></td><td>🟢</td><td>Whitespace, Final-Newline</td></tr>
<tr><td>Datei-Hygiene</td><td>0</td><td><code>end-of-file-fixer</code></td><td>🟢</td><td>Whitespace, Final-Newline</td></tr>
<tr><td>Syntax</td><td>0</td><td><code>check-yaml</code></td><td>🟢</td><td>Datei-Syntax</td></tr>
<tr><td>Syntax</td><td>0</td><td><code>check-json</code></td><td>🟢</td><td>Datei-Syntax</td></tr>
<tr><td>Repo-Schutz</td><td>grün</td><td><code>sync-schemas</code></td><td>🟢</td><td>Guardrails, generierte Artefakte</td></tr>
<tr><td>Architektur</td><td>grün</td><td><code>validate-architecture-yaml</code></td><td>🟢</td><td>Validiert Architektur-YAML (npm validate:architecture)</td></tr>
<tr><td>Datei-Hygiene</td><td>grün</td><td><code>check-merge-conflict</code></td><td>🟢</td><td>Findet Merge-Konfliktmarker nach gf_end</td></tr>
<tr><td colspan="5"><h3>Security</h3></td></tr>
<tr><td>Secrets</td><td>0</td><td><code>detect-private-key</code></td><td>🟢</td><td>Findet eingecheckte Private Keys</td></tr>
<tr><td>SAST</td><td>0</td><td><code>semgrep</code></td><td>🟢</td><td>unsichere Muster</td></tr>
<tr><td colspan="5"><h3>Tests</h3></td></tr>
<tr><td>Guardrail</td><td>grün</td><td><code>test-guardrails</code></td><td>🟢</td><td>Smoke-Tests der Guardrail-Wrapper</td></tr>
</tbody>
<tfoot>
<tr><td colspan="5">Quelle: hooks.manifest.yaml (75 Hooks) · Stand: 19.10.2026</td></tr>
</tfoot>
</table>
