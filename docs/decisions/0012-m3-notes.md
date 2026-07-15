# 0012 — M3 agent affordances, hardening, 0.1.0 readiness

- **Status:** accepted (milestone M3 engineering complete; publishing itself
  is user-blocked — see the checklist at the end)
- **Date:** 2026-07-11
- **Scope:** plan milestone M3 — error-catalog audit, spec-lint advisories
  (Hadley #16), lifecycle tags + defaults editions (Hadley #13), SKILL.md +
  DataProfile→geom recommendations (Hadley #20), llms.txt/llms-full.txt,
  held-out eval harness, benchmark budgets + trend tracking, VR approval
  flow completion, release automation, docs completion.

## Error-catalog audit (one source per catalog, tests enforce completeness)

- `@ggsvelte/spec` `ERROR_CATALOG` (errors.ts): every validation code now
  carries `{ tier, summary, fix }`; `ERROR_CODES` derives from its keys.
  **Near-duplicate killed:** `bar-y-mapped` folded into `computed-y-mapped`
  (same grammar rule — "this stat computes y"; the bar/histogram instance
  keeps its geom-specific message and the `geom: "col"` fix.example).
- `@ggsvelte/core` `diagnostics.ts`: `PIPELINE_ERROR_CATALOG` (21 codes),
  `PIPELINE_WARNING_CATALOG` (17), `ADVISORY_CATALOG` (8),
  `CLI_DIAGNOSTIC_CATALOG` (6). `palette-exhausted` is deliberately both an
  error (onExhaust "error") and a warning (default cycle); documented there.
- **Enforcement:** `packages/core/tests/diagnostics.test.ts` scans the core
  sources (`new PipelineError(`, `code: "..."` literals, the ScaleWarningCode
  union) and asserts catalog membership in BOTH directions (no uncataloged
  emit, no dead entry). `packages/spec/tests/catalog-coverage.test.ts` holds
  one minimal trigger per validation code and snapshots
  `{ catalog, instance }` — snapshot coverage is complete by construction.
- Docs `/guide/errors` renders from these catalogs (below) — no hand-written
  error docs anywhere.

## Spec lint (Hadley #16) — `lintSpec(spec, options?)`

- New `packages/spec/src/lint.ts`: advisories (never errors) for
  valid-but-questionable specs, with `LINT_CATALOG` as the docs source.
  Rules: `line-over-nominal-x`, `many-discrete-colors` (>10 distinct),
  `stacked-area-negative`, `discrete-discrete-scatter` (suggests jitter),
  `log-nonpositive-data` (mixed-sign under a log scale). Evidence comes from
  inline data or a DataProfile; rules skip silently without evidence.
- Deliberately absent (documented in the module header): dual-axis and pie
  equivalents (unrepresentable in this grammar), text-without-label (already
  the `missing-required-channel` ERROR), all-non-positive log data (pipeline
  warning/error territory).
- Wiring: `validate(spec, { lint: true })` attaches `advisories` to either
  result variant; the CLI always emits them as stderr JSON lines
  (`kind: "advisory", source: "spec-lint"`). Tests cover each rule's
  fire/silent/skip cases + catalog coverage.

## Lifecycle tags + defaults editions (Hadley #13)

- Index files of spec / core / core-dom / svelte carry lifecycle annotations
  (`// @lifecycle-default experimental` per file; one-line
  `/** @lifecycle ... */` statement markers; trailing `// @lifecycle ...`
  per-name tags). `scripts/gen-lifecycle.ts` parses them (unsupported export
  forms are ERRORS, so nothing dodges tagging) and generates the committed
  `lifecycle.json` (424 exports; staleness-tested). Tag meanings documented
  in CONTRIBUTING ("Lifecycle policy").
- **stable-intent set** (the agent core path): spec `PortableSpec`,
  `normalize`, `validate`, `ValidateResult`, `SpecError`/`SpecErrorCode`/
  `SpecErrorFix`, `SpecValidationError`; core `renderToSVGString`,
  `RenderSVGOptions`; svelte `GGPlot` + the re-exported path. Everything
  else `experimental`.
- **Editions:** schema gains optional integer `edition` (min 1);
  `normalize()` stamps `CURRENT_EDITION` (= 1) when absent — old specs are
  frozen to the defaults they were authored against. Core resolves default
  theme table / categorical palette / sequential ramp through
  `EDITION_DEFAULTS` keyed by `spec.edition` (`editions.ts`), overridable
  per run via `RunOptions.editions` (no global registry — Hadley #14).
  Unknown editions fall back to the latest known + `unknown-edition`
  warning. For edition 1 the pipeline passes NOTHING to the scale trainers
  (palette fingerprints stay byte-stable with pre-edition scale state).
  `packages/core/tests/editions.test.ts` proves the plan's demand: with a
  fake edition-2 palette registered, an edition-1 spec keeps edition-1
  colors; an edition-2 spec gets the new ones; theme accent follows too.

## Docs = catalogs (one source), llms endpoints, schema

- `scripts/gen-llms.ts` is the single content source: guide markdown BUILT
  from the catalogs (`buildErrorsMd`, `buildAdvisoriesMd`,
  `buildLifecycleMd(lifecycle.json)`, `GETTING_STARTED_MD`) + a minimal
  tested markdown renderer. The docs guide pages
  (`/guide/{getting-started,errors,advisories,lifecycle}`, one dynamic
  route) render exactly that markdown; `/llms.txt` (curated index) and
  `/llms-full.txt` (all guide prose + every example's canonical spec JSON +
  Svelte source, from the manifest + import.meta.glob) serve it as text.
  Inline data in llms-full is pruned to 20 rows per dataset
  (`pruneSpecData`, tested) so the 10k-point canvas example cannot dominate.
- `/schema/v0.json` is prerendered from the same committed artifact the spec
  package ships. Docs aliases: `$scripts` → repo scripts/, `$lifecycle` →
  lifecycle.json.
- Everything is exercised by `scripts/gen-llms.test.ts` (catalog coverage,
  manifest coverage — every example appears; zero manual upkeep).

## SKILL.md (Hadley #20)

`skills/ggsvelte/SKILL.md`: trigger-phrase description, the spec→layers
mental model, the validation-error contract ("errors include fix.example —
apply it"), the DataProfile→geom recommendation table, 20 recipes as
canonical spec JSON (every explicit recipe machine-validated during
authoring), links to schema + llms-full. A byte-identical copy ships inside
the `@ggsvelte/svelte` package (`files: ["dist","bin","skills"]`),
`scripts/skill-sync.test.ts` enforces sync.

## Held-out eval harness (tests/evals)

44 fresh cases (36 chart / 8 adversarial: 2 unsupported-refusal, 3
missing-field, 3 ambiguous) over datasets disjoint from the examples corpus;
golds are normalize() fixed points that validate and render (test-enforced).
Runner: Anthropic Messages API via plain fetch when ANTHROPIC_API_KEY is set
(model via EVALS_MODEL), deterministic MockResponder otherwise (dry-run —
also what CI-less environments and the harness tests use). Rubric per plan:
schema-validity hard gate (pre/post one repair round), structural score
(geoms 0.4, bindings 0.4, scales/facet/coord 0.2; PASS ≥ 0.8), headless
render success required. Refusal contract:
`{"unsupported": reason, "closestAlternative": spec|null}`. Outputs
`tests/evals/out/{scoreboard.json,report.md}` (gitignored). Dry-run
mechanics proof: passRate 0.932, validityAfterRepair 1.0, refusalAccuracy
1.0 (mock's three deliberate misses documented in the harness).
**No ANTHROPIC_API_KEY was available in the M3 environment — no real-model
scores yet; `evals.yml` (manual dispatch + `run-evals` label, same-repo PRs
only) is ready once the secret exists.**

## Benchmarks: budgets + trend

`benchmarks/budgets.json`: 18 named workloads (plan list: scatter 1k/10k/
100k pipeline+render, line series 10×10k, faceted bars 50 panels, canvas
cold/redraw 100k, hit index, histogram/density/loess), budgets = local
medians × 1.5, marked PROVISIONAL pending CI-runner re-baselining.
`bench:json` emits github-action-benchmark customSmallerIsBetter format from
the same workload table mitata uses (`workloads.ts` — one source);
`bench:budgets` gates results against budgets (set-equality both ways).
`bench.yml`: main-branch trend job (gh-pages via github-action-benchmark,
alert 150%, not a gate) + `run-bench` label job (budget-gated). PR
bench-smoke unchanged.

## VR approval flow (completed) + release

- `vr-compare.yml` gains the `/approve-visuals` path: issue_comment trigger,
  OWNER/MEMBER/COLLABORATOR author association, PR head resolved via API,
  checkout of that exact SHA, pinned-container `--update-snapshots` run,
  `vr-baselines-approved` artifact (PNGs + pr/head_sha/comment metadata).
  Still unprivileged (read-only token) — PR code executes only here.
- `vr-approve.yml`: the gate is real — approval flavor only, artifact
  verified as inert data (PNG magic bytes, ≤500 files, ≤50 MiB), the
  approval INDEPENDENTLY re-verified via the API (comment body/author
  permission/PR match; created_at not older than the head commit;
  head_sha must equal the PR's CURRENT head — deliberately stronger than
  the workflow_run.head_sha field, which is useless for comment-triggered
  runs), idempotent per head SHA, commits only to `vr-update/pr-<n>`.
- CI guard: new `vr-baseline-guard` job rejects PR diffs touching
  `tests/visual/__screenshots__/` unless the head is a same-repo
  `vr-update/pr-N` branch.
- `release.yml`: changesets/action, `id-token: write`, npm trusted
  publishing (OIDC + provenance via publishConfig; NO tokens), publish =
  `changeset publish` after `bun run build`; setup-node 24 for npm OIDC.
  Verified: zero npm lifecycle scripts in all three packages. Dormant until
  the remote + npm trusted-publisher config exist.
- actionlint + zizmor clean across all six workflows.

## Release metadata

LICENSE (MIT, Liam O'Dea) at root + copied into each package; READMEs (root

- three packages: install, the three surfaces, links); package.json
  description/keywords (grammar-of-graphics, ggplot2, svelte, charts, ...)/
  license/author/publishConfig; `repository`/`homepage` point at the
  PLACEHOLDER `github.com/ggsvelte/ggsvelte` — **must be updated when the real
  repo exists** (user-blocked list below).

## Other mechanics

- Root gains workspace devDeps on @ggsvelte/spec/core (scripts + tests/evals
  resolve the packages through root node_modules).
- `bun run test` (+ pre-push hook + CI unit job) now includes `tests/evals`.
- New root scripts: `lifecycle:gen/check`, `evals`, `bench:json`,
  `bench:budgets`. `.gitignore`: `/bench-results.json`, `tests/evals/out/`.
- Docs vite `fs.allow` widened to the repo root; `$scripts`/`$lifecycle`
  aliases added.

## Follow-ups (M4 candidates)

1. Re-baseline benchmark budgets on the CI runner once a remote exists;
   promote budgets from provisional.
2. Real-model eval run + scoreboard commit once ANTHROPIC_API_KEY exists;
   nightly automation stays post-0.1.0 per plan.
3. Lifecycle tags render only as a name list on the docs page; per-export
   links into API docs when API docs exist.
4. lint rule candidates: many-discrete-colors from a DataProfile with
   cardinality (profile lacks distinct counts today).
5. Inherited from 0011: facet strip theming, faceted/band brush-zoom,
   `{ stat }` channels beyond y, canvas-threshold re-tuning, VR container
   baseline bootstrap (first CI run), tooltip positioning under CSS zoom.

## USER-BLOCKED for 0.1.0 (nothing below is automatable from this machine)

1. **GitHub repo**: create it, add the remote, push the first commit (repo
   history is still uncommitted by instruction). Update `repository`/
   `homepage`/`bugs` in all three package.jsons + README/CONTRIBUTING links
   if the org/name differs from `ggsvelte/ggsvelte`.
2. **npm**: reserve the `@ggsvelte/svelte` name and the `@ggsvelte` org; configure
   **trusted publishing** (OIDC) for `@ggsvelte/svelte`, `@ggsvelte/spec`,
   `@ggsvelte/core` pointing at `.github/workflows/release.yml`.
3. **Secrets**: `ANTHROPIC_API_KEY` (evals.yml). No NPM_TOKEN — trusted
   publishing only.
4. **First CI run**: bootstraps VR container baselines via the
   vr-compare → `/approve-visuals` → vr-approve path; then enable branch
   protection with the required checks.
5. **Domain** (`ggsvelte.dev` or equivalent): optional pre-0.1.0; schema
   stays served from the repo/docs build until then.
6. **Publish**: merge the changesets "Version Packages" PR → release.yml
   publishes 0.1.0 (explicitly unstable).

## Amendment (2026-07-11): eval harness moved from Anthropic to OpenRouter

User mandate: the eval workflow must NOT use the Anthropic API. The
references above to the Anthropic Messages API, `ANTHROPIC_API_KEY`, and
`EVALS_MODEL` describe the harness as built during M3 and are left intact as
the historical record; the current contract is:

- **API**: OpenRouter chat-completions (`https://openrouter.ai/api/v1`,
  OpenAI-compatible), plain fetch, still zero deps
  (`tests/evals/model.ts` `OpenRouterResponder`).
- **Secret / env**: `OPENROUTER_API_KEY` (evals.yml and the runner); the
  user-blocked secrets item above now means this key, not
  `ANTHROPIC_API_KEY`.
- **Model selection**: `--model` flag, else `EVAL_MODEL` env (renamed from
  `EVALS_MODEL`), else the default `openai/gpt-5.5` — chosen as a strong,
  stable (non-preview) non-Anthropic frontier model on OpenRouter that
  supports structured outputs, per the mandate to avoid Anthropic.
- **Structured output**: schema-in-prompt + validate-and-repair (the
  existing ONE repair round), NOT `json_schema` response_format — the reply
  is a union of PortableSpec | refusal shape, the v0 schema's keywords are
  hostile to provider structured-output implementations (see 0004), and
  decode-time enforcement would hollow out the validity metric. Documented
  in model.ts.
- **Unchanged**: dry-run MockResponder remains the default whenever the key
  is absent; rubric, refusal contract, repair round, outputs, and the
  fork-safety model of evals.yml are untouched.

Same date, user-blocked item 1 partially resolved: the real repository is
`https://github.com/ljodea/ggsvelte` — `repository`/`homepage`/`bugs` in all
three package.jsons and the placeholder `github.com/ggsvelte/ggsvelte` links
(package READMEs, docs-site layout) now point there. npm scope names
(`@ggsvelte/*`, `ggsvelte`) are unchanged.

## Amendment (2026-07-15): Svelte adapter uses the organization scope

npm rejected the unscoped `ggsvelte` name under its anti-typosquatting rule
because it is too similar to `svelte`. The public adapter is therefore
`@ggsvelte/svelte`; `@ggsvelte/spec` and `@ggsvelte/core` retain their planned
names. This keeps all public packages under the project-owned scope and leaves
room for future framework adapters.
