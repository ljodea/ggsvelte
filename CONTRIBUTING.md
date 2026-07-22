# Contributing to ggsvelte

## Start in the right place

- Reproducible rendering, runtime, packaging, and grammar defects use the
  [bug form](https://github.com/ljodea/ggsvelte/issues/new?template=bug.yml).
- Inspection, selection, zoom, keyboard, touch, focus, and assistive-technology
  problems use the
  [interaction and accessibility form](https://github.com/ljodea/ggsvelte/issues/new?template=interaction-accessibility.yml).
- Scoped additions use the
  [feature form](https://github.com/ljodea/ggsvelte/issues/new?template=feature.yml);
  explore early API and design ideas in
  [Ideas](https://github.com/ljodea/ggsvelte/discussions/categories/ideas).
- Documentation gaps use the
  [documentation form](https://github.com/ljodea/ggsvelte/issues/new?template=documentation.yml).
- Usage questions belong in
  [Q&A](https://github.com/ljodea/ggsvelte/discussions/categories/q-a), and
  reusable examples belong in
  [Show and tell](https://github.com/ljodea/ggsvelte/discussions/categories/show-and-tell).
- Suspected vulnerabilities must follow the [private security policy](SECURITY.md),
  not a public issue or Discussion.

The project has no guaranteed response times. See [SUPPORT.md](SUPPORT.md) for
tested support boundaries and what information helps the community respond.

## Setup

1. **bun** — the package manager, script runner, and unit-test runner.
   Pinned via `packageManager` in `package.json` and `mise.toml` (currently
   **bun 1.3.14**). Install with `mise install` or <https://bun.sh> →
   `~/.bun/bin/bun` must be on `PATH`.
2. **Install dependencies**: `bun install` (text lockfile `bun.lock`; CI uses
   `--frozen-lockfile`).
3. **uv + pre-commit + zizmor** (Python-side tooling):

   ```sh
   uv tool install pre-commit   # or pipx install pre-commit / brew install pre-commit
   uv tool install zizmor       # GitHub Actions security auditor (Rust, shipped via PyPI)
   pre-commit install           # installs the fast pre-commit hook only (no pre-push)
   ```

4. **Playwright browsers** (needed for component tests, the VR suite, and
   the retired browser spikes): `bunx --bun playwright install chromium firefox webkit`
   from the repo root (the root pins `@playwright/test` 1.61.1; all
   playwright pins share one browser cache).

`bun` must be on `PATH` when git hooks run — hooks invoke lockfile-installed
binaries via `bun`/`bun run`, never network `bunx`.

## The arm64/x64 machine quirk (read this if tools crash with MODULE_NOT_FOUND)

Some dev machines (notably this project's original one) run an **arm64 bun**
with an **x64 (Rosetta) node** at `/usr/local/bin/node`. bun installs
arm64-only native bindings (oxlint, oxfmt, tsgolint, rolldown/rollup, esbuild),
which x64 node cannot load — symptoms are `Cannot find module
'@oxlint/binding-darwin-x64'`-style errors or vitest dying on missing
`darwin-x64` bindings.

Rules that make this a non-issue:

- Always run tools through bun: `bun run <script>` (the repo's scripts already
  invoke binaries as `bun node_modules/.bin/<tool>`), and `bunx --bun vitest`
  (never bare `bunx vitest`).
- Where a tool spawns `node` itself (oxlint's type-aware mode spawning
  tsgolint), the script uses `bun run --bun`, which shims `node` → bun for
  child processes. Keep that pattern.
- Alternatively, install an arm64 node. CI containers are single-arch, so this
  is a local-only concern.

A second, distinct bun-runtime issue: oxfmt 0.58 routes `.svelte`/`.md`/`.yaml`
through embedded prettier plugins that throw `DataCloneError` under the bun
runtime (worker structured-clone incompatibility; fine under real node). Since
everything here runs under bun, those extensions are formatted by **prettier
directly** (see Formatting below). Re-test when bumping oxfmt or bun; if fixed
upstream, `.md`/`.yaml`/`.svelte` can fold back into oxfmt (`.oxfmtrc.json`
`"svelte": true` enables its prettier-plugin-svelte path).

## Tool roster and versions (verified working, July 2026)

| Tool                                         | Version                | Role                                                                                  |
| -------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| bun                                          | 1.3.14 (pinned)        | PM / runner / unit tests                                                              |
| typescript                                   | 6.0.3                  | `tsc -b` project references (spec, core)                                              |
| oxlint                                       | 1.73.0                 | JS/TS linting (correctness+suspicious error, pedantic warn)                           |
| oxlint-tsgolint                              | 0.24.0                 | type-aware rules via `oxlint --type-aware` (no standalone CLI)                        |
| oxfmt                                        | 0.58.0                 | formatter for ts/js/json/jsonc/css/toml                                               |
| prettier + prettier-plugin-svelte            | 3.9.5 / 4.1.1          | formatter for .svelte/.md/.yaml (see quirk above)                                     |
| markdownlint-cli2                            | 0.23.0                 | markdown lint (pre-commit stage; config `.markdownlint-cli2.jsonc`)                   |
| svelte-check                                 | 4.7.3                  | Svelte template + type checking (packages/svelte)                                     |
| knip                                         | 6.26.0                 | unused files/exports/deps (spikes ignored)                                            |
| publint / @arethetypeswrong/cli              | 0.3.21 / 0.18.5        | package publish shape (skips unbuilt stubs)                                           |
| actionlint (npm, wasm)                       | 2.0.6                  | workflow lint via `scripts/actionlint.ts` (no shellcheck integration — wasm build)    |
| zizmor                                       | 1.26.1 (uv tool)       | Actions security audit                                                                |
| @changesets/cli                              | 2.31.0                 | versioning/release (spec+core+ggsvelte linked, access public)                         |
| vitest + @vitest/browser-playwright          | 4.1.10                 | browser-mode component tests (factory `playwright()` provider)                        |
| playwright / @playwright/test                | 1.61.1 (exact pins)    | must match CI container `mcr.microsoft.com/playwright:v1.61.1-noble` — asserted in CI |
| @sveltejs/kit + @sveltejs/adapter-static     | 2.x / 3.x              | apps/docs static docs site (the VR screenshot target)                                 |
| svelte / vite / @sveltejs/vite-plugin-svelte | 5.56.4 / 8.1.4 / 7.2.0 | spike + adapter toolchain                                                             |
| pre-commit                                   | 4.6.0                  | hook framework (both stages)                                                          |

## Dependency updates (Dependabot)

[`.github/dependabot.yml`](.github/dependabot.yml) opens weekly PRs for:

- **Bun** workspace manifests (root + packages/apps/examples/benchmarks/spikes)
  on Mondays — grouped so one dependency update lands across every `package.json`
  that lists it.
- **GitHub Actions** on Tuesdays — workflows plus local composites under
  `.github/actions/*` (Dependabot does not walk composites from `/` alone).
  Third-party actions are SHA-pinned (zizmor-enforced); bumps group by action
  name across every pin site.

Dependabot does **not** auto-bump these (human-authored locksteps / release flow):

- `playwright` / `@playwright/test` — exact pins must match every
  `mcr.microsoft.com/playwright:v…-noble` container tag (asserted in CI).
- `pnpm` — root pin must match `support-matrix.json` `packageManagers.pnpm`
  (asserted in `scripts/support-matrix.test.ts`).
- `@ggsvelte/*` — internal publish ranges are owned by Changesets, not registry
  bumps from Dependabot.

Majors for `svelte`, `vite`, `@sveltejs/*`, `typescript`, and `vitest` are also
ignored — land those as deliberate migrations.

## Running the checks

| Command                                               | What it does                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run check`                                       | `tsc -b` project references (packages/spec, packages/core) — EMITS `dist/` since M0c                                                              |
| `bun run build`                                       | `bun run check` + `svelte-package` for packages/svelte (everything the publish shape needs)                                                       |
| `bun run check:svelte`                                | svelte-check `--fail-on-warnings` in packages/svelte (needs `bun run check` first: dist types)                                                    |
| `bun run lint`                                        | oxlint over the repo (`.oxlintrc.json`; spikes excluded)                                                                                          |
| `bun run lint:md`                                     | markdownlint-cli2 over `**/*.md` (`.markdownlint-cli2.jsonc`; spikes + node_modules ignored)                                                      |
| `bun run lint:type-aware`                             | oxlint `--type-aware --deny-warnings` (tsgolint; permanent CI gate)                                                                               |
| `bun run fmt` / `bun run fmt:check`                   | oxfmt (ts/js/json/css/toml) + prettier (.svelte/.md/.yaml)                                                                                        |
| `bun run test`                                        | bun unit tests (spec + core + scripts + evals harness; needs `bun run check` first)                                                               |
| `bun run test:temporal-parser`                        | focused strict-parser, schema/helper, Date.parse gate, and parsed-column cache loop                                                               |
| `bun run test:temporal-pipeline`                      | focused temporal pipeline and calendar-tick loop                                                                                                  |
| `bun run test:components`                             | packages/svelte component tests (Chromium, Firefox, WebKit) followed by the Node SSR suite                                                        |
| `cd packages/svelte && bun run test:coverage`         | browser (chromium) + SSR coverage reports; browser config enforces thresholds; CI runs the same chromium+ssr coverage and uploads lcov to Codecov |
| `bun run check:examples`                              | tsc over the examples corpus's .ts files (needs `bun run check` first: dist types)                                                                |
| `bun run check:docs`                                  | svelte-kit sync + svelte-check for apps/docs (needs `bun run build` first)                                                                        |
| `bun run build:docs`                                  | static docs site → `apps/docs/build/` (needs `bun run build` first; the VR target)                                                                |
| `bun run manifest:gen` / `bun run manifest:check`     | (re)generate / staleness-check `examples/manifest.ts` from the corpus                                                                             |
| `bun run test:visual`                                 | Playwright VR suite against `apps/docs/build` (see the VR workflow section)                                                                       |
| `bun run schema:emit`                                 | regenerate `packages/spec/schema/v0.json` (staleness-guarded by a spec test)                                                                      |
| `bun run lifecycle:gen` / `bun run lifecycle:check`   | (re)generate / staleness-check `lifecycle.json` from the index-file lifecycle tags                                                                |
| `bun run evals`                                       | held-out NL→spec eval harness (tests/evals; OpenRouter API, model via EVAL_MODEL; dry-run with a mock model without OPENROUTER_API_KEY)           |
| `bun run bench:json`                                  | run the named workloads once, write `bench-results.json` (github-action-benchmark format)                                                         |
| `bun run bench:budgets`                               | compare `bench-results.json` against `benchmarks/budgets.json` (provisional budgets, +50%)                                                        |
| `bun run bench:memory` / `bun run bench:memory:check` | capture the forced-GC retained-memory sample / enforce `benchmarks/memory-baselines.json`                                                         |
| `bun run bench` / `bun run bench:smoke`               | mitata pipeline+renderer benchmarks (full / 1k CI smoke)                                                                                          |
| `bun packages/svelte/bin/ggsvelte-render.js`          | the `ggsvelte-render` CLI (spec JSON -> SVG on stdout; JSON-line diagnostics on stderr)                                                           |
| `Rscript packages/core/tests/fixtures/*/generate.R`   | regenerate the ggplot2-parity fixtures (grouping, stats/positions; needs R + ggplot2)                                                             |
| `bun run knip`                                        | unused files/exports/dependencies                                                                                                                 |
| `bun run lint:package`                                | publint + attw (esm-only profile) over built packages — build first                                                                               |
| `bun run lint:actions`                                | actionlint (wasm) over `.github/workflows` (local soft-skip if wasm cannot load; fatal in CI actions-security job)                                |
| `bun run lint:actions:security`                       | zizmor over `.github/workflows` (needs `uv tool install zizmor`; CI runs it in actions-security)                                                  |
| `bun run test:spikes`                                 | retired M0a browser/ssr spike suites (vitest 4 browser mode)                                                                                      |
| `cd spikes/pure && bun test`                          | retired M0a pure spike suites                                                                                                                     |
| `pre-commit run --all-files`                          | fast staged-file parity (oxfmt/prettier/oxlint/markdownlint/manifest/path guards)                                                                 |

CI (`.github/workflows/ci.yml`) runs a `checks` job for pre-commit parity
plus unit / component / build / actions-security / bench-smoke jobs.
**CI is the contract.** Local git hooks are commit-only and sub-second;
there is no pre-push mega-suite (build, type-aware lint, svelte-check, knip,
package tests all live in CI). If an old clone still has a pre-push hook,
remove it with `pre-commit uninstall -t pre-push` then `pre-commit install`.

### Path routing + content-hash skip

Path routing (`scripts/ci-routing.ts`) schedules jobs from the changed-file
set. Content-hash skip (issue #245) is a second layer: when a job is still
scheduled, it may early-exit success if a validated success marker (or
`packages-dist` cache) exists for the same **physical execution identity**
(content hash of `JOB_CONTENT_INPUTS` + recipe files including `ci.yml` and
`.github/actions/**`).

The success-marker protocol is implemented once in local composite actions
(`.github/actions/ci-content-hash-restore`, `ci-content-hash-write`); `ci.yml`
jobs call those instead of pasting the steps. The `packages-dist` producer keeps
its specialized dist-payload cache path.

| Control                                                    | Effect                                         |
| ---------------------------------------------------------- | ---------------------------------------------- |
| Change any path in that execution’s `JOB_CONTENT_INPUTS`   | New hash → cache miss → full run               |
| Expand/edit `JOB_CONTENT_INPUTS` patterns                  | Patterns are inside the digest → miss          |
| Bump `CONTENT_HASH_SCHEMA` in `scripts/ci-routing.ts`      | Global bust of all content-hash caches         |
| force-all, lockfile, `ci.yml`, `ci-routing`, or composites | `bypass_content_cache=true` → no short-circuit |
| Repo variable `CI_DISABLE_CONTENT_HASH=1`                  | Disable short-circuit for all jobs             |

Hashes are fail-closed (missing digests abort). Component shards and each
consumer matrix cell have distinct cache keys. GHA cache is ref-scoped —
treat reuse as best-effort for re-runs / default-branch restore, not a
guaranteed cross-PR registry. Exact keys only (no `restore-keys` fallback
for job markers).

## packages/svelte layout and coverage

### `src/lib` map

The Svelte package is organized by feature under `packages/svelte/src/lib/`:

| Directory / file              | Role                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `geoms/`                      | Declaration-only geom children (`GeomPoint`, …) and the geom factory/registry                                                    |
| `assembly/`                   | Labels, layout helpers, chrome-adjacent pure assembly                                                                            |
| `runtime/`                    | Runtime paint, announcer, semantic-key services                                                                                  |
| `scene/`                      | SVG scene tree (`SceneView`, `Batch`, axes, legends paint, strata)                                                               |
| `a11y/`                       | Canvas-stratum accessibility surface + row materialization                                                                       |
| `interaction/`                | Tools, reducer, capability, controller                                                                                           |
| `surface/`                    | Capture surface controller (pointer/keyboard/brush)                                                                              |
| `inspection/`                 | Tooltip, inspection coordinator/resolver, inspection state                                                                       |
| `selection/`                  | Point-selection state                                                                                                            |
| `interval/`                   | Interval selection, bounds editor, query                                                                                         |
| `zoom/`                       | Brush-zoom state                                                                                                                 |
| `legend/`                     | Legend filter/focus controllers, targets, pure surface helpers                                                                   |
| `chrome/`                     | Tool rail, status chrome, theme CSS, chrome state                                                                                |
| `fonts/`                      | Packaged font assets (not TypeScript sources)                                                                                    |
| `GGPlot.svelte`               | Public component shell                                                                                                           |
| `plot-orchestrator.svelte.ts` | Controller wiring; owns the construction/effect-order DAG contract (read the file header before reordering factories or effects) |
| `plot-props.ts`               | GGPlot's **internal** props contract — not re-exported from `index.ts`                                                           |
| `index.ts`                    | The **only** public package entry                                                                                                |

### No per-directory barrels

Feature directories do **not** ship `index.ts` re-export barrels. Imports use
direct relative specifiers with extensions
(e.g. `../inspection/resolver.js`). Rationale: knip can flag dead exports
without barrel noise; the published `dist/` shape stays flat and intentional;
and hub-style barrels invite import cycles across feature controllers.

### Tests mirror `src`

- Feature suites live under `packages/svelte/tests/<feature>/` and track
  `src/lib/<feature>/` (e.g. `tests/surface/` ↔ `src/lib/surface/`).
- Cross-cutting suites (`component.test.ts`, harnesses, release matrix) sit
  at `packages/svelte/tests/` root.
- Shared helpers and fixtures: `tests/helpers/`, `tests/fixtures/`.
- Prefer `@total-typescript/shoehorn` for partial test fixtures instead of `as`
  / `as unknown as` / `as never` on object literals:
  - `fromPartial({ ... })` when the shape is a valid deep-partial of the target type
  - `fromAny({ ... })` when the data is intentionally wrong or untyped for the test
  - Keep `as const`, error/DOM narrowing, and post-pipeline batch narrowing as-is

### Coverage workflow

```sh
cd packages/svelte && bun run test:coverage
```

That runs:

1. **Browser** coverage (`vitest --coverage --project chromium`) →
   `packages/svelte/coverage/browser/`. Thresholds live in
   `vitest.config.ts` (after the `coverageBase` spread): statements 90,
   branches 80, functions 90, lines 90. They ratchet against regression on
   the mature browser report; they are **not** in `coverageBase` so the SSR
   config stays threshold-free.
2. **SSR** coverage (`vitest.ssr.config.ts`) →
   `packages/svelte/coverage/ssr/`. Numbers are structurally lower (SSR
   paths only) — do not chase SSR-report gaps or put thresholds there.

CI (`.github/workflows/ci.yml`) runs chromium browser coverage on the
`component-svelte` job (parallel with coverage-free `component-svelte-fx` for
firefox + webkit) and unit-suite coverage (`bun test --coverage`) on the
`unit` job, then uploads lcov to Codecov via `codecov/codecov-action` (flags
`unit` / `svelte`, path components for package badges). SSR coverage is **not**
collected in CI: `@vitest/coverage-v8` needs Node inspector Coverage APIs that
bun does not implement; use local `test:coverage` (under node) if you need the
SSR report. Content-hash skips omit uploads; Codecov carryforward keeps flag
totals stable. `fail_ci_if_error: true` on the upload steps — set
`CODECOV_TOKEN` in repo secrets. Package badges live in the package READMEs
(`component=packages-spec|packages-core|packages-svelte`); the monorepo root
badge is overall project coverage.

## Formatting policy

- **oxfmt** owns `.ts .tsx .js .jsx .mjs .cjs .json .jsonc .css .toml`.
- **prettier (+prettier-plugin-svelte)** owns `.svelte .md .yml .yaml` —
  fallback per the plan after verifying oxfmt 0.58: it _does_ format `.svelte`
  (via its embedded prettier-plugin-svelte, config `"svelte": true`, verified
  idempotent on the spike components under node) but its embedded-prettier
  worker path crashes under the bun runtime, which this repo standardizes on.
- `spikes/**` is excluded from both formatters, from oxlint, and from knip:
  spike code is retired M0a evidence — still runnable, no longer groomed. The
  spike `.svelte` files were one-time formatted with prettier during the M0b
  verification (all 41 spike tests still pass).

## Guards

- The oxlint config bans `Math.random` / `Date.now` inside `examples/**`
  (visual-regression determinism) — use the seeded `mulberry32` helper in
  `examples/rng.ts` instead.
- The `manifest-current` hook runs `bun run manifest:check` whenever staged
  files touch `examples/`: `examples/manifest.ts` is GENERATED from the
  corpus — regenerate with `bun run manifest:gen`, never hand-edit.
- The `block-output-paths` hook refuses commits touching `test-results/`,
  `playwright-report/`, `.vitest-attachments/`, or `__screenshots__/` paths.
  VR baselines land only via the `vr-approve` workflow; if you must commit
  baselines locally, `SKIP=block-output-paths git commit …` and say why in the
  PR.

## Examples corpus (one source, three uses)

`examples/<category>/<name>/` is the shared corpus feeding (1) the docs
gallery + per-example pages, (2) the VR matrix, and (3) `llms-full.txt` (M3).
Authoring a new example:

1. Create the directory with the four files:
   - **`spec.ts`** — `export default defineExample(gg(...)....spec())`
     (import `defineExample` from `../../define.js`). The default export is
     the canonical `PortableSpec`; it is validated at tier 2 on import, and
     its JSON is the docs "Spec" tab.
   - **`Example.svelte`** — idiomatic component usage (`<GGPlot ...>` with
     `<GeomX>` children), importing data from `./data.js`. Render at an
     explicit `width={640} height={400}` (or `height={vrHeight}` if you set
     one) — VR needs fixed sizes.
   - **`meta.json`** — `{ title, description, tags, docsSection, vrHeight? }`
     (validated by the generator; `docsSection` groups the gallery).
   - **`data.ts`** (optional) — static rows or `mulberry32`-seeded
     generation only. `Math.random`/`Date.now` are lint-banned here.
2. `bun run manifest:gen` (the `manifest-current` hook enforces freshness).
3. `bun run check:examples && bun run build:docs` to see it typed and built;
   the VR matrix picks it up automatically (examples × light/dark).
4. Keep spec.ts and Example.svelte semantically identical — they are two
   surfaces of the same plot (the docs triptych shows both plus the JSON).

## Visual-regression workflow

Enforced VR is a **smoke suite** (`tests/visual/smoke-matrix.ts` +
`vr.spec.ts`, ~15–18 shots including ≥2 dark). It screenshots the BUILT docs
site: example pages support `?vr&theme=light|dark`, which strips chrome,
freezes animations, and pins `.gg-example-frame`. Full dual-theme × every
example is intentionally gone. Gallery lights live under
`apps/docs/static/previews/` and may lag. Non-pixel docs structure/a11y runs
in `component-journeys` (docs_journeys routing). Determinism + fonts:
docs/decisions/0009.

- **Smoke baselines** land in `tests/visual/__screenshots__/` from the pinned
  container. Prefer **same-PR** updates: change render-relevant code + smoke
  PNGs together. Baseline-only PRs are rejected by `vr-baseline-guard`.
- **Local runs use a throwaway snapshot dir** (macOS fonts ≠ container fonts):

  ```sh
  bun run build && bun run build:docs
  VR_SNAPSHOT_DIR=.local-baselines bun run test:visual:smoke -- --update-snapshots
  VR_SNAPSHOT_DIR=.local-baselines bun run test:visual:smoke
  ```

  `.local-baselines/` is gitignored. `maxDiffPixels` is 0 and `retries` 0 —
  a diff is a real change, never flake to retry away.

## Visual-regression trust model

`vr-compare.yml` is the only workflow that executes **unmerged** PR code. It
has no secrets or write permissions, renders in the pinned container, and
uploads inert PNG candidates. After source lands, `vr-approve.yml` independently
verifies the comment, permission, default-branch merge, timestamp, and immutable
`merge_commit_sha`. It checks out only that already-merged base-repository
commit, verifies the PNG artifact, and runs the matching preview generator
without `GH_TOKEN` in its environment. Only the final script-free commit/push
step receives the write credential.

The source-first landing order is deliberate:

1. Inspect the source PR's candidate report. For an intentional pixel change,
   the red VR comparison is expected; keep VR Compare non-required so it cannot
   deadlock this flow. `ci-gate`, code review, and the baseline evidence still
   gate the source merge.
2. Merge the source PR into the default branch.
3. Comment `/approve-visuals` on the **merged** PR. A pre-merge command is
   rejected, including one recorded in the same second as the merge.
4. Review and merge the generated `vr-update/pr-<n>` PR.

This creates a short, explicit window where source has landed but its approved
baselines have not. Finish step 4 promptly. Never merge an unexplained visual
diff, and do not make VR Compare a required branch-protection check without
redesigning this source-first protocol.

## Lifecycle policy (Hadley lesson 13)

Every public export of `@ggsvelte/spec`, `@ggsvelte/core` (both entries), and
`@ggsvelte/svelte` carries a lifecycle tag, annotated in the package index files
(file default `// @lifecycle-default`, statement-level one-line
`@lifecycle` JSDoc markers, per-name trailing `// @lifecycle` comments) and
collected into the generated `lifecycle.json` (`bun run lifecycle:gen`;
staleness-tested). The docs lifecycle page and llms surfaces render from it.

- **experimental** — may change or disappear in any 0.x release without
  ceremony. The default for everything pre-0.1.0.
- **stable-intent** — the agent core path: `PortableSpec`, `normalize`,
  `validate` (+ `ValidateResult`/`SpecError` contracts), `renderToSVGString`,
  `GGPlot`. Not frozen pre-1.0, but changes are treated as breaking: they get
  a changeset with a `Migration:` marker, an upgrading-guide section, and a
  deprecation window of at least one full minor release. The precise rules
  (windows, fixtures, runtime checks, codemod bar) are decision 0013
  (`docs/decisions/0013-post-0-1-migration-policy.md`).
- **stable** — committed API under semver. Nothing is `stable` pre-1.0.
- **superseded** — keeps working but stops being recommended; docs point at
  the replacement. This tag exists to protect agent-generated code from
  silent breakage (superseded surfaces are removed only at a major).

Related: `normalize()` stamps the current defaults edition (`edition: 2`) on
every unstamped spec (defaults-edition mechanism, decision 0012) — default aesthetics are keyed by edition in
`@ggsvelte/core`'s `EDITION_DEFAULTS`, so improving defaults later never
restyles existing specs.

## No time estimates

Milestones are dependency-ordered scopes, never durations. **No time units
appear in issues, PRs, plans, or docs** — don't add "this should take a day"
to anything.

## Decision records

Significant, hard-to-reverse choices get a record in `docs/decisions/`
(`NNNN-title.md`, sequential). Records are written at decision time, state
status/date/verdict, the evidence (spikes reference their code + test runs),
and what later milestones must know. The six M0a records are the template.

## Milestone context (M0c — walking skeleton)

The packages are real since M0c and their exports point at **built `dist/`**
output (`bun run check` emits spec/core; `bun run build` adds svelte-package).
Consequences:

- Run `bun run check` after a fresh clone before `bun run test`,
  `check:svelte`, or `lint:type-aware` — cross-package imports resolve
  through `dist/`. CI jobs already sequence this.
- `@ggsvelte/spec`: TypeBox schemas (decision 0004) + `Static<>` types,
  `normalize()`, tier-1 `validate()` with the agent error contract, the
  `gg()/aes()` builder, portability (`isPortable`/`toPortable`/
  `toPortableLossy`), and the JSON Schema artifact `schema/v0.json`
  (generated — `bun run schema:emit`; oxfmt-ignored; staleness-tested).
- `@ggsvelte/core` (pure entry): ColumnTable, grouping (decision 0005),
  value-stable scale state (decision 0002), two-pass layout (decision 0003),
  `runPipeline()`, `renderToSVGString()`. No DOM globals — enforced by the
  Node smoke test. `/dom` stays a stub until M2 canvas work.
- `@ggsvelte/svelte`: props-first `<GGPlot>`, declaration-only `<GeomPoint>`/
  `<GeomLine>` sugar (decision 0001, mechanism A), vitest-4 browser-mode
  component tests (`bun run test:components`).
- Benchmarks live in `benchmarks/` (mitata; `bench-smoke` CI job runs the 1k
  workload). Graduation notes, d3 choices, and deviations: decision 0007.

## Milestone context (M1)

M1 added 7 geoms / stacks / scales / legends / themes / CLI (decision 0008)
plus the VR-and-examples workstream (decision 0009): the `examples/` corpus
and generated `examples/manifest.ts`, the `apps/docs` SvelteKit +
adapter-static site, `<GGPlot>`'s `data-gg-ready` readiness signal, the
`tests/visual` Playwright suite, and a real (un-guarded) `vr-compare.yml`.
CI consequence: build jobs run **package-build** (`bun run build`, not just
`tsc -b`) before docs/examples checks because those imports resolve through
the built `@ggsvelte/svelte` package.

## Milestone context (M2 — statistical layer)

The statistical half of M2 (decision 0010) added stats bin / smooth
(lm + loess) / boxplot / density / summary, the histogram alias
(canonicalized to bar + stat bin), the smooth ribbon / boxplot composite /
density area / errorbar geometry, and SEEDED jitter + nudge positions
(`positionParams`; jitter determinism is a documented divergence from
ggplot2). R-parity fixtures live in `packages/core/tests/fixtures/stats/`
(`generate.R` needs R + ggplot2 4.0.3); the achieved numeric tolerances are
recorded in decision 0010 — loess matches R's `surface = "direct",
statistics = "exact"` path to float noise, and the fixture tolerances
quantify the gap to ggplot2's default interpolated loess. Every stat's
module header documents its generated columns (`STAT_COLUMNS` in
@ggsvelte/spec is the `{ stat }` channel contract) and its missing-value
policy. Loess attribution: see the repo NOTICE file.

## Milestone context (M2 — facets, coord flip, canvas strata, interaction)

The interaction half of M2 (decision 0011) added `facet` (wrap + grid,
fixed/free scales — partition runs BEFORE stats), `coord: {type: "flip"}`
(the single orientation mechanism), per-layer `render` backends with canvas
strata (spike 0006 graduated; `@ggsvelte/core/dom` is real now: canvas batch
renderers + the unified hit index), hover/tooltip/brush/brush-to-zoom in
`<GGPlot>`, `width="container"`, `RenderModel.dispose()`, and the a11y pass
(focusable SVG marks, canvas description block + data-table toggle,
`a11y: "force-svg"`). Facet/flip R fixtures live in
`packages/core/tests/fixtures/facets/` (`generate.R`). Both renderers now
clip marks to panel rects. Scene panels carry per-panel axes/grid/strips;
batches carry `panelIndex`. Interactions are component-tested, never
VR-screenshotted (`?vr` pages render static).

## Milestone context (M3 — agent affordances + hardening)

M3 (decision 0012) added: the audited error catalogs (`ERROR_CATALOG` in
spec; `PIPELINE_ERROR_CATALOG`/`PIPELINE_WARNING_CATALOG`/`ADVISORY_CATALOG`/
`CLI_DIAGNOSTIC_CATALOG` in core — completeness enforced by tests that scan
the sources); `lintSpec()` spec-lint advisories (wired into
`validate(spec, { lint: true })` and the CLI); lifecycle tags + generated
`lifecycle.json`; defaults editions (`spec.edition`, stamped by normalize);
the docs guide pages GENERATED from those catalogs (`scripts/gen-llms.ts` is
the one source for guide markdown, `/llms.txt`, and `/llms-full.txt` — the
docs pages and llms endpoints cannot drift from the code); `/schema/v0.json`
served from the docs build; `skills/ggsvelte/SKILL.md` (copy shipped in the
ggsvelte package, sync-tested); the held-out eval harness (`tests/evals/`,
44 cases, dry-run mock without a key); benchmark budgets
(`benchmarks/budgets.json`, provisional) + `bench:json`/`bench:budgets`;
the completed VR approval flow (`/approve-visuals` comment gate,
vr-approve verification, `vr-baseline-guard` in CI); `release.yml`
(changesets + npm trusted publishing, OIDC, no tokens); `evals.yml` and
`bench.yml` workflows; READMEs, LICENSE, and package publish metadata.
