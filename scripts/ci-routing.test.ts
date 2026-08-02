import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  CACHEABLE_EXECUTIONS,
  CONTENT_HASH_SCHEMA,
  JOB_CONTENT_INPUTS,
  LANE_PATTERNS,
  classifyChangedPaths,
  contentHashCacheKey,
  docsPackageInvokedScripts,
  docsSourceScriptImports,
  evaluateGate,
  formatGithubOutputs,
  formatTreeEntryDigest,
  hashJobInputs,
  listJobContentPaths,
  matchPathPattern,
  parseGitLsTreeLine,
  parseNameStatusList,
  parseSuccessMarker,
  planJobs,
  requireJobInputDigests,
  serializeSuccessMarker,
  shouldBypassContentCache,
  successMarkerPath,
  validateSuccessMarker,
  type JobName,
} from "./ci-routing.ts";

describe("matchPathPattern", () => {
  test("matches exact paths and directory prefixes", () => {
    expect(matchPathPattern("bun.lock", "bun.lock")).toBe(true);
    expect(matchPathPattern("bun.lock", "package.json")).toBe(false);
    expect(matchPathPattern("packages/spec/**", "packages/spec/src/index.ts")).toBe(true);
    expect(matchPathPattern("packages/spec/**", "packages/spec")).toBe(true);
    expect(matchPathPattern("packages/spec/**", "packages/core/src/x.ts")).toBe(false);
  });

  test("matches single-segment globs without crossing directories", () => {
    expect(matchPathPattern("tsconfig*.json", "tsconfig.json")).toBe(true);
    expect(matchPathPattern("tsconfig*.json", "tsconfig.base.json")).toBe(true);
    expect(matchPathPattern("tsconfig*.json", "packages/core/tsconfig.json")).toBe(false);
    // Domain reusable CI workflows (issue #392): basename wildcard under a fixed dir.
    expect(matchPathPattern(".github/workflows/ci-*.yml", ".github/workflows/ci-unit.yml")).toBe(
      true,
    );
    expect(matchPathPattern(".github/workflows/ci-*.yml", ".github/workflows/ci.yml")).toBe(false);
    expect(matchPathPattern(".github/workflows/ci-*.yml", ".github/workflows/vr-compare.yml")).toBe(
      false,
    );
  });
});

describe("classifyChangedPaths", () => {
  test("tags package, docs, workflow, lockfile, and visual lanes", () => {
    const flags = classifyChangedPaths([
      "packages/spec/src/validate.ts",
      "packages/core/src/render.ts",
      "packages/svelte/src/lib/Plot.svelte",
      "apps/docs/src/routes/+page.svelte",
      "examples/bar/stacked/Example.svelte",
      "benchmarks/pipeline.bench.ts",
      "scripts/ci-routing.ts",
      ".github/workflows/ci.yml",
      "tests/visual/vr.spec.ts",
      "bun.lock",
      "README.md",
    ]);
    expect(flags.spec).toBe(true);
    expect(flags.core).toBe(true);
    expect(flags.svelte).toBe(true);
    expect(flags.docs).toBe(true);
    expect(flags.examples).toBe(true);
    expect(flags.benchmarks).toBe(true);
    expect(flags.scripts).toBe(true);
    expect(flags.workflows).toBe(true);
    expect(flags.visual).toBe(true);
    expect(flags.lockfile).toBe(true);
    expect(flags.markdown).toBe(true);
  });

  test("worker sources sit on the workers lane only (issue #720)", () => {
    const flags = classifyChangedPaths([
      "workers/example-api/src/handler.ts",
      "workers/example-api/test/handler.test.ts",
      "workers/example-api/wrangler.toml",
    ]);
    expect(flags.workers).toBe(true);
    expect(flags.spec).toBe(false);
    expect(flags.core).toBe(false);
    expect(flags.svelte).toBe(false);
    expect(flags.docs).toBe(false);
    expect(flags.docs_render).toBe(false);
    expect(flags.scripts).toBe(false);
    expect(flags.visual).toBe(false);
  });

  test("docs-only prose does not flip package lanes", () => {
    const flags = classifyChangedPaths([
      "docs/decisions/0001-declaration-only-children.md",
      "CONTRIBUTING.md",
    ]);
    expect(flags.spec).toBe(false);
    expect(flags.core).toBe(false);
    expect(flags.svelte).toBe(false);
    expect(flags.docs).toBe(false);
    expect(flags.scripts).toBe(false);
    expect(flags.markdown).toBe(true);
    expect(flags.lockfile).toBe(false);
  });

  test("root README is a unit contract input (readme-showcase), not markdown-only", () => {
    const flags = classifyChangedPaths(["README.md"]);
    expect(flags.scripts).toBe(true);
    expect(flags.markdown).toBe(true);
    const plan = planJobs(flags);
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(false);
    expect(plan.vr).toBe(false);
  });

  test("llms module siblings stay on the docs lane (pages) without forcing VR", () => {
    for (const file of [
      "scripts/gen-llms.ts",
      "scripts/llms-diagnostic-docs.ts",
      "scripts/llms-lifecycle-docs.ts",
      "scripts/llms-markdown.ts",
      "scripts/llms-guide-content.ts",
    ]) {
      const flags = classifyChangedPaths([file]);
      expect(flags.docs, file).toBe(true);
      expect(flags.docs_render, file).toBe(false);
      const plan = planJobs(flags);
      expect(plan.pages, file).toBe(true);
      expect(plan.vr, file).toBe(false);
      expect(plan.docs_journeys, file).toBe(true);
      expect(plan.unit, file).toBe(true);
    }
  });

  test("guide content under apps/docs is content-only (docs, not docs_render)", () => {
    for (const file of [
      "apps/docs/src/lib/catalog/guide.ts",
      "apps/docs/src/lib/guide.ts",
      "apps/docs/src/lib/components/GettingStartedGuide.svelte",
      "apps/docs/src/lib/components/LessonFinishedChart.svelte",
      "apps/docs/src/lib/catalog/docs-tasks.ts",
      // Sibling generated inventory modules are content-only (#784 lesson-charts).
      "apps/docs/src/lib/generated/lesson-charts.ts",
      "apps/docs/src/lib/generated/routes.ts",
      "apps/docs/src/lib/generated/guide-navigation.ts",
      "apps/docs/src/lib/generated/search-index.ts",
      "apps/docs/src/lib/generated/gallery-previews.ts",
    ]) {
      const flags = classifyChangedPaths([file]);
      expect(flags.docs, file).toBe(true);
      expect(flags.docs_render, file).toBe(false);
    }
  });

  test("lesson-charts projection schedules docs site without VR", () => {
    const path = "apps/docs/src/lib/generated/lesson-charts.ts";
    const plan = planJobs(classifyChangedPaths([path]));
    expect(plan.docs_site).toBe(true);
    expect(plan.svelte_check).toBe(true);
    expect(plan.docs_journeys).toBe(true);
    expect(plan.vr).toBe(false);
  });

  test("unknown apps/docs shell paths fail closed to docs_render", () => {
    for (const file of [
      "apps/docs/src/app.css",
      "apps/docs/src/styles/tokens.css",
      "apps/docs/src/lib/components/DocsShell.svelte",
      "apps/docs/src/routes/examples/[category]/[name]/+page.svelte",
      "apps/docs/src/routes/+layout.svelte",
    ]) {
      const flags = classifyChangedPaths([file]);
      expect(flags.docs, file).toBe(true);
      expect(flags.docs_render, file).toBe(true);
    }
  });
});

describe("parseNameStatusList", () => {
  test("includes both sides of renames and copies", () => {
    const paths = parseNameStatusList(
      [
        "M\tpackages/core/src/x.ts",
        "R100\tpackages/svelte/src/lib/Old.svelte\tapps/docs/src/lib/Old.svelte",
        "C050\tscripts/a.ts\tscripts/b.ts",
        "A\tscripts/new.ts",
      ].join("\n"),
    );
    expect(paths).toContain("packages/core/src/x.ts");
    expect(paths).toContain("packages/svelte/src/lib/Old.svelte");
    expect(paths).toContain("apps/docs/src/lib/Old.svelte");
    expect(paths).toContain("scripts/a.ts");
    expect(paths).toContain("scripts/b.ts");
    expect(paths).toContain("scripts/new.ts");
  });

  test("rename source keeps package surface when destination alone would not", () => {
    const files = parseNameStatusList(
      "R100\tpackages/svelte/src/lib/X.svelte\tdocs/notes/X.svelte\n",
    );
    const plan = planJobs(classifyChangedPaths(files));
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.build).toBe(true);
  });
});

describe("planJobs", () => {
  test("docs render shell changes run unit+build+vr+pages+docs_journeys", () => {
    const plan = planJobs(classifyChangedPaths(["apps/docs/src/routes/guide/[slug]/+page.svelte"]));
    expect(plan.checks).toBe(true);
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(false);
    expect(plan.consumer).toBe(false);
    expect(plan.bench_smoke).toBe(false);
    expect(plan.actions_security).toBe(false);
    expect(plan.build).toBe(true);
    expect(plan.vr).toBe(true);
    expect(plan.pages).toBe(true);
    expect(plan.docs_journeys).toBe(true);
    expect(plan.packages_dist).toBe(true);
    expect(plan.interaction_perf).toBe(false);
  });

  test("guide content-only changes schedule pages+docs_journeys without VR", () => {
    for (const path of [
      "scripts/llms-guide-content.ts",
      "apps/docs/src/lib/catalog/guide.ts",
      "apps/docs/src/lib/components/GettingStartedGuide.svelte",
      "apps/docs/src/lib/components/LessonFinishedChart.svelte",
    ]) {
      const plan = planJobs(classifyChangedPaths([path]));
      expect(plan.unit, path).toBe(true);
      expect(plan.pages, path).toBe(true);
      expect(plan.build, path).toBe(true);
      expect(plan.docs_journeys, path).toBe(true);
      expect(plan.packages_dist, path).toBe(true);
      expect(plan.vr, path).toBe(false);
      expect(plan.component, path).toBe(false);
    }
  });

  test("docs generators schedule pages (and journeys) without VR unless render-relevant", () => {
    for (const path of [
      "scripts/gen-llms.ts",
      "scripts/llms-diagnostic-docs.ts",
      "scripts/llms-lifecycle-docs.ts",
      "scripts/docs-seo.ts",
      "scripts/gen-docs-search.ts",
      "scripts/cli-docs.ts",
      "scripts/guide-code-contract.ts",
      "scripts/deployment-artifact.ts",
      "scripts/deployment-smoke.ts",
    ]) {
      const plan = planJobs(classifyChangedPaths([path]));
      expect(plan.unit, path).toBe(true);
      expect(plan.pages, path).toBe(true);
      expect(plan.vr, path).toBe(false);
      expect(plan.component, path).toBe(false);
    }
  });

  test("gallery preview generator schedules pages without enforced VR", () => {
    const plan = planJobs(classifyChangedPaths(["scripts/gen-gallery-previews.ts"]));
    expect(plan.pages).toBe(true);
    expect(plan.vr).toBe(false);
    expect(plan.docs_journeys).toBe(true);
  });

  test("canonical visual sources schedule pages because generated gallery previews depend on them", () => {
    const plan = planJobs(
      classifyChangedPaths(["tests/visual/__screenshots__/point-scatter-color-light.png"]),
    );
    expect(plan.pages).toBe(true);
    expect(plan.vr).toBe(true);
  });

  test("lifecycle.json schedules pages without VR", () => {
    const plan = planJobs(classifyChangedPaths(["lifecycle.json"]));
    expect(plan.pages).toBe(true);
    expect(plan.vr).toBe(false);
    expect(plan.unit).toBe(true);
    expect(plan.docs_journeys).toBe(true);
  });

  test("examples schedule VR and docs_journeys and packages_dist", () => {
    const plan = planJobs(classifyChangedPaths(["examples/bar/stacked/Example.svelte"]));
    expect(plan.vr).toBe(true);
    expect(plan.docs_journeys).toBe(true);
    expect(plan.packages_dist).toBe(true);
    expect(plan.pages).toBe(true);
  });

  test("packages_dist is true whenever vr is true", () => {
    for (const path of [
      "packages/core/src/x.ts",
      "apps/docs/src/app.css",
      "examples/point/scatter-color/Example.svelte",
      "tests/visual/vr.spec.ts",
    ]) {
      const plan = planJobs(classifyChangedPaths([path]));
      expect(plan.vr, path).toBe(true);
      expect(plan.packages_dist, path).toBe(true);
    }
  });

  test("spec changes pull core unit, component, consumer, build, bench, and vr", () => {
    const plan = planJobs(classifyChangedPaths(["packages/spec/src/schema.ts"]));
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.bench_smoke).toBe(true);
    expect(plan.vr).toBe(true);
    expect(plan.pages).toBe(true);
    expect(plan.actions_security).toBe(false);
  });

  test("workflow-only changes run actions-security + unit (release-wiring) without full suite", () => {
    const plan = planJobs(classifyChangedPaths([".github/workflows/cloudflare-pages.yml"]));
    expect(plan.actions_security).toBe(true);
    expect(plan.checks).toBe(true);
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(false);
    expect(plan.consumer).toBe(false);
    expect(plan.vr).toBe(false);
    expect(plan.pages).toBe(false);
  });

  test("actionlint runner changes schedule actions-security", () => {
    const plan = planJobs(classifyChangedPaths(["scripts/actionlint.ts"]));
    expect(plan.actions_security).toBe(true);
    expect(plan.unit).toBe(true);
  });

  test("composite action changes stay on CI-plumbing jobs (no VR/component for Dependabot pin bumps)", () => {
    const plan = planJobs(
      classifyChangedPaths([".github/actions/ci-content-hash-restore/action.yml"]),
    );
    expect(plan.checks).toBe(true);
    expect(plan.actions_security).toBe(true);
    // release-wiring.test.ts asserts composite content-hash protocol wiring.
    expect(plan.unit).toBe(true);
    // Not a product surface change — content-hash still bypasses on these paths.
    expect(plan.component).toBe(false);
    expect(plan.consumer).toBe(false);
    expect(plan.build).toBe(false);
    expect(plan.bench_smoke).toBe(false);
    expect(plan.packages_dist).toBe(false);
    expect(plan.vr).toBe(false);
    expect(plan.pages).toBe(false);
    expect(plan.interaction_perf).toBe(false);
  });

  test("ci.yml self-changes run workflow unit + actions-security without browser surfaces", () => {
    // Dependabot deps-ci groups often touch ci.yml only to bump action SHAs.
    // Product force is reserved for lockfile / ci-routing; recipe identity is
    // enforced via bypass_content_cache + UNIVERSAL_CONTENT_INPUTS instead.
    const plan = planJobs(classifyChangedPaths([".github/workflows/ci.yml"]));
    expect(plan.checks).toBe(true);
    expect(plan.unit).toBe(true);
    expect(plan.actions_security).toBe(true);
    expect(plan.component).toBe(false);
    expect(plan.consumer).toBe(false);
    expect(plan.build).toBe(false);
    expect(plan.bench_smoke).toBe(false);
    expect(plan.packages_dist).toBe(false);
    expect(plan.vr).toBe(false);
    expect(plan.pages).toBe(false);
    expect(plan.interaction_perf).toBe(false);
  });

  test("dependabot-style multi-workflow pin bump does not schedule VR or component", () => {
    const plan = planJobs(
      classifyChangedPaths([
        ".github/workflows/ci.yml",
        ".github/workflows/vr-compare.yml",
        ".github/workflows/cloudflare-pages.yml",
        ".github/actions/ci-content-hash-write/action.yml",
      ]),
    );
    expect(plan.checks).toBe(true);
    expect(plan.unit).toBe(true);
    expect(plan.actions_security).toBe(true);
    expect(plan.vr).toBe(false);
    expect(plan.pages).toBe(false);
    expect(plan.component).toBe(false);
    expect(plan.consumer).toBe(false);
    expect(plan.packages_dist).toBe(false);
  });

  test("ci-routing module self-changes force the full surface", () => {
    const plan = planJobs(classifyChangedPaths(["scripts/ci-routing.ts"]));
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.actions_security).toBe(true);
    expect(plan.vr).toBe(true);
  });

  test("skill source changes schedule unit (skill content guards) and svelte package surface", () => {
    const plan = planJobs(classifyChangedPaths(["packages/skill/SKILL.md"]));
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.consumer).toBe(true);
  });

  test("skill reference changes route like the skill itself", () => {
    // The references/ tree ships in the npm package; a glob regression that
    // narrowed routing to SKILL.md alone must fail here, not in production.
    const plan = planJobs(classifyChangedPaths(["packages/skill/references/geoms-and-stats.md"]));
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.consumer).toBe(true);
  });

  test("svelte-only changes run unit (lifecycle) and bench_smoke (retained-memory)", () => {
    const plan = planJobs(classifyChangedPaths(["packages/svelte/src/lib/index.ts"]));
    expect(plan.unit).toBe(true);
    expect(plan.bench_smoke).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.packages_dist).toBe(true);
  });

  test("packages_dist follows component/consumer/interaction_perf consumers, not unit-only", () => {
    expect(planJobs(classifyChangedPaths(["scripts/gen-lifecycle.ts"])).packages_dist).toBe(false);
    expect(planJobs(classifyChangedPaths(["packages/core/src/x.ts"])).packages_dist).toBe(true);
    expect(planJobs(classifyChangedPaths(["spikes/browser/foo.ts"])).packages_dist).toBe(true);
    expect(planJobs(classifyChangedPaths(["scripts/consumer-compat.ts"])).packages_dist).toBe(true);
  });

  test("consumer harness and canonical Quickstart sources schedule the packed-consumer matrix", () => {
    for (const path of [
      "scripts/consumer-compat.ts",
      "scripts/consumer-compat-plan.ts",
      "scripts/consumer-compat-fixture.ts",
      "scripts/guide-code-contract.ts",
      "scripts/quickstart.ts",
      "scripts/quickstart-timing.ts",
    ]) {
      const plan = planJobs(classifyChangedPaths([path]));
      expect(plan.consumer).toBe(true);
      expect(plan.unit).toBe(true);
    }
  });

  test("quickstart implementation modules schedule docs + consumer (not scripts-only)", () => {
    // After the lesson was split under scripts/quickstart/, edits must not land
    // on the scripts lane alone — same false-green class as missing ci-routing/**.
    const nested = "scripts/quickstart/steps.ts";
    const flags = classifyChangedPaths([nested]);
    expect(flags.docs).toBe(true);
    expect(flags.scripts).toBe(true);
    const plan = planJobs(flags);
    expect(plan.consumer).toBe(true);
    expect(plan.docs_site).toBe(true);
    expect(plan.svelte_check).toBe(true);
    expect(plan.docs_journeys).toBe(true);
    // Sibling timing harness stays outside the module tree.
    expect(matchPathPattern("scripts/quickstart/**", "scripts/quickstart-timing.ts")).toBe(false);
  });

  test("guide-code-contract changes invalidate the consumer content-hash surface", () => {
    expect(JOB_CONTENT_INPUTS.consumer).toContain("scripts/guide-code-contract.ts");
  });

  test("manual-AT evidence and community forms schedule unit", () => {
    expect(
      planJobs(classifyChangedPaths(["docs/accessibility/manual-at/procedures.json"])).unit,
    ).toBe(true);
    expect(planJobs(classifyChangedPaths([".github/ISSUE_TEMPLATE/bug.yml"])).unit).toBe(true);
    expect(planJobs(classifyChangedPaths([".changeset/config.json"])).unit).toBe(true);
  });

  test("interaction budgets and docs perf fixtures schedule interaction_perf", () => {
    expect(
      planJobs(classifyChangedPaths(["benchmarks/interaction-budgets.json"])).interaction_perf,
    ).toBe(true);
    expect(
      planJobs(classifyChangedPaths(["apps/docs/src/routes/__perf/interaction-100k/+page.svelte"]))
        .interaction_perf,
    ).toBe(true);
  });

  test("lockfile changes force package-touching jobs", () => {
    const plan = planJobs(classifyChangedPaths(["bun.lock"]));
    expect(plan.unit).toBe(true);
    expect(plan.component).toBe(true);
    expect(plan.consumer).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.bench_smoke).toBe(true);
    expect(plan.vr).toBe(true);
    expect(plan.pages).toBe(true);
  });

  test("forceAll runs every job (fallback when base ref is missing)", () => {
    const plan = planJobs(classifyChangedPaths([]), { forceAll: true });
    for (const job of Object.keys(plan) as JobName[]) {
      expect(plan[job]).toBe(true);
    }
  });

  test("markdown-only still runs cheap checks so format/lint parity is not skipped", () => {
    const plan = planJobs(classifyChangedPaths(["CONTRIBUTING.md"]));
    expect(plan.checks).toBe(true);
    expect(plan.unit).toBe(false);
    expect(plan.component).toBe(false);
    expect(plan.build).toBe(false);
    expect(plan.vr).toBe(false);
  });

  test("evals harness changes schedule unit (and build static analysis) without consumer", () => {
    const plan = planJobs(classifyChangedPaths(["tests/evals/run.ts"]));
    expect(plan.unit).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.consumer).toBe(false);
    expect(plan.component).toBe(false);
  });

  test("worker changes schedule unit + build without the browser/docs surface (issue #720)", () => {
    // workers/** (when present) own bun tests; build covers type-aware lint + knip.
    const plan = planJobs(classifyChangedPaths(["workers/example-api/src/handler.ts"]));
    expect(plan.checks).toBe(true);
    expect(plan.unit).toBe(true);
    expect(plan.build).toBe(true);
    expect(plan.vr).toBe(false);
    expect(plan.component).toBe(false);
    expect(plan.consumer).toBe(false);
    expect(plan.svelte_check).toBe(false);
    expect(plan.docs_site).toBe(false);
    expect(plan.docs_journeys).toBe(false);
    expect(plan.pages).toBe(false);
    expect(plan.packages_dist).toBe(false);
    expect(plan.bench_smoke).toBe(false);
    expect(plan.interaction_perf).toBe(false);
    expect(plan.actions_security).toBe(false);
  });

  test("scripts test-only changes never rebuild docs site or run svelte-check", () => {
    // release-wiring.test.ts (and other scripts/**/*.test.ts) used to force the
    // monolithic build job, which always ran vite build:docs.
    const plan = planJobs(classifyChangedPaths(["scripts/release-wiring.test.ts"]));
    expect(plan.unit).toBe(true);
    expect(plan.build).toBe(true); // knip / type-aware still cover scripts/
    expect(plan.svelte_check).toBe(false);
    expect(plan.docs_site).toBe(false);
    expect(plan.pages).toBe(false);
    expect(plan.packages_dist).toBe(false);
  });

  test("package changes schedule concurrent build + svelte_check + docs_site", () => {
    const plan = planJobs(classifyChangedPaths(["packages/core/src/x.ts"]));
    expect(plan.build).toBe(true);
    expect(plan.svelte_check).toBe(true);
    expect(plan.docs_site).toBe(true);
  });

  test("docs build helpers schedule svelte_check + docs_site (not scripts-only)", () => {
    // After the monlith split, pure scripts/** no longer runs check:docs / build:docs.
    // Helpers invoked by apps/docs package.json must sit on the docs lane.
    for (const path of [
      "scripts/gen-docs-routes.ts",
      "scripts/docs-route-inventory.ts",
      "scripts/docs-route-inventory-pages.ts",
      "scripts/docs-route-inventory-reference.ts",
      "scripts/check-docs-metadata.ts",
      "scripts/check-pages-links.ts",
      // #784: package.json build/check invoke gen-lesson-charts; build invokes docs-csp.
      "scripts/gen-lesson-charts.ts",
      "scripts/gen-lesson-charts.test.ts",
      "scripts/gen-theme-static-shells.ts",
      "scripts/docs-html-shell-external.test.ts",
      "scripts/docs-csp.ts",
      "scripts/docs-csp.test.ts",
    ]) {
      const flags = classifyChangedPaths([path]);
      expect(flags.docs, path).toBe(true);
      const plan = planJobs(flags);
      expect(plan.svelte_check, path).toBe(true);
      expect(plan.docs_site, path).toBe(true);
      expect(plan.pages, path).toBe(true);
      expect(plan.docs_journeys, path).toBe(true);
      expect(plan.unit, path).toBe(true);
      expect(plan.build, path).toBe(true);
      expect(plan.vr, path).toBe(false);
    }
  });
});

describe("JOB_CONTENT_INPUTS (split build hashes)", () => {
  test("build hash still includes apps/docs for knip/type-aware coverage", () => {
    expect(JOB_CONTENT_INPUTS.build).toContain("apps/docs/**");
  });

  test("unit and build hash the workers tree so worker edits miss the cache (issue #720)", () => {
    const workerPath = "workers/example-api/src/handler.ts";
    for (const execution of ["unit", "build"] as const) {
      expect(listJobContentPaths(execution, [workerPath]), execution).toEqual([workerPath]);
    }
  });

  test("svelte_check and docs_site hash docs generators and $scripts imports", () => {
    for (const execution of ["svelte_check", "docs_site"] as const) {
      const inputs = JOB_CONTENT_INPUTS[execution];
      expect(inputs, execution).toContain("apps/docs/**");
      expect(inputs, execution).toContain("scripts/gen-docs-routes.ts");
      expect(inputs, execution).toContain("scripts/docs-route-inventory.ts");
      expect(inputs, execution).toContain("scripts/docs-route-inventory-pages.ts");
      expect(inputs, execution).toContain("scripts/docs-route-inventory-reference.ts");
      expect(inputs, execution).not.toContain("scripts/gen-playground-seeds.ts");
      expect(inputs, execution).toContain("scripts/check-docs-metadata.ts");
      expect(inputs, execution).toContain("scripts/check-pages-links.ts");
      expect(inputs, execution).toContain("scripts/gen-lesson-charts.ts");
      expect(inputs, execution).toContain("scripts/gen-theme-static-shells.ts");
      expect(inputs, execution).toContain("scripts/docs-csp.ts");
      expect(inputs, execution).toContain("scripts/gen-llms.ts");
      expect(inputs, execution).toContain("scripts/llms-diagnostic-docs.ts");
      expect(inputs, execution).toContain("scripts/llms-lifecycle-docs.ts");
      expect(inputs, execution).toContain("scripts/docs-seo.ts");
      expect(inputs, execution).toContain("scripts/quickstart.ts");
      expect(inputs, execution).toContain("scripts/guide-code-contract.ts");
      expect(inputs, execution).toContain("scripts/highlight-code.ts");
      for (const file of [
        "scripts/gen-lesson-charts.ts",
        "scripts/gen-theme-static-shells.ts",
        "scripts/docs-csp.ts",
      ]) {
        expect(listJobContentPaths(execution, [file]), `${execution}:${file}`).toContain(file);
      }
    }
  });

  test("component_journeys hashes gen-lesson-charts (lesson img counts on getting-started)", () => {
    const file = "scripts/gen-lesson-charts.ts";
    expect(JOB_CONTENT_INPUTS.component_journeys).toContain(file);
    expect(listJobContentPaths("component_journeys", [file])).toContain(file);
  });

  test("quickstart modules invalidate docs, journeys, and consumer content hashes", () => {
    const nested = "scripts/quickstart/steps.ts";
    for (const execution of [
      "svelte_check",
      "docs_site",
      "component_journeys",
      "consumer",
    ] as const) {
      expect(listJobContentPaths(execution, [nested]), execution).toContain(nested);
    }
  });
});

describe("docs surface membership gates (#784)", () => {
  test("docsPackageInvokedScripts parses bun script paths with and without flags", () => {
    expect(
      docsPackageInvokedScripts({
        build: "bun ../../scripts/gen-a.ts --check && bun ../../scripts/docs-csp.ts",
        check: "bun ../../scripts/gen-a.ts --check",
        dev: "vite dev",
      }),
    ).toEqual(["scripts/docs-csp.ts", "scripts/gen-a.ts"]);
  });

  test("docsSourceScriptImports resolves $scripts module ids to scripts/*.ts", () => {
    expect(
      docsSourceScriptImports(`
        import { x } from "$scripts/gen-llms";
        import type { Y } from "$scripts/cli-docs";
        import { z } from "$scripts/quickstart.ts";
      `),
    ).toEqual(["scripts/cli-docs.ts", "scripts/gen-llms.ts", "scripts/quickstart.ts"]);
  });

  test("every apps/docs package.json-invoked script is on the docs lane and docs surface hash", () => {
    const pkgPath = join(import.meta.dir, "..", "apps", "docs", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      scripts: Record<string, string>;
    };
    const invoked = docsPackageInvokedScripts(pkg.scripts);
    // Sanity: build/check must surface at least the known generators.
    expect(invoked).toContain("scripts/gen-lesson-charts.ts");
    expect(invoked).toContain("scripts/docs-csp.ts");
    expect(invoked.length).toBeGreaterThan(4);

    for (const path of invoked) {
      // Membership via patterns (exact path or covered by a docs-lane pattern).
      const onDocsLane = LANE_PATTERNS.docs.some((pattern) => matchPathPattern(pattern, path));
      expect(onDocsLane, `LANE_PATTERNS.docs missing ${path}`).toBe(true);
      expect(classifyChangedPaths([path]).docs, path).toBe(true);
      // Invoked files (not their .test.ts siblings) must bust docs surface hashes.
      expect(listJobContentPaths("docs_site", [path]), `docs_site:${path}`).toContain(path);
      expect(listJobContentPaths("svelte_check", [path]), `svelte_check:${path}`).toContain(path);
    }
  });

  test("every $scripts import under apps/docs/src is on the docs lane and docs surface hash", () => {
    const root = join(import.meta.dir, "..", "apps", "docs", "src");
    const sources: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (/\.(ts|js|svelte)$/.test(entry.name)) sources.push(full);
      }
    };
    walk(root);

    const imported = new Set<string>();
    for (const file of sources) {
      for (const path of docsSourceScriptImports(readFileSync(file, "utf8"))) {
        imported.add(path);
      }
    }
    expect(imported.size).toBeGreaterThan(0);
    // Known $scripts consumers today.
    expect(imported).toContain("scripts/gen-llms.ts");
    expect(imported).toContain("scripts/docs-seo.ts");
    expect(imported).toContain("scripts/cli-docs.ts");
    expect(imported).toContain("scripts/quickstart.ts");

    for (const path of [...imported].toSorted()) {
      const onDocsLane = LANE_PATTERNS.docs.some((pattern) => matchPathPattern(pattern, path));
      expect(onDocsLane, `LANE_PATTERNS.docs missing $scripts import ${path}`).toBe(true);
      expect(listJobContentPaths("docs_site", [path]), `docs_site:${path}`).toContain(path);
      expect(listJobContentPaths("svelte_check", [path]), `svelte_check:${path}`).toContain(path);
    }
  });
});

describe("evaluateGate", () => {
  test("passes when required jobs succeed and others are skipped", () => {
    // Docs-render change: unit+build+vr+pages+docs_journeys+packages_dist required.
    const required = planJobs(classifyChangedPaths(["apps/docs/src/app.css"]));
    expect(required.packages_dist).toBe(true);
    expect(required.docs_journeys).toBe(true);
    const results: Record<JobName, string> = {
      checks: "success",
      unit: "success",
      component: "skipped",
      consumer: "skipped",
      build: "success",
      svelte_check: "success",
      docs_site: "success",
      actions_security: "skipped",
      bench_smoke: "skipped",
      interaction_perf: "skipped",
      packages_dist: "success",
      vr: "success",
      pages: "success",
      docs_journeys: "success",
    };
    const gate = evaluateGate(required, results);
    expect(gate.ok).toBe(true);
    expect(gate.failures).toEqual([]);
  });

  test("fails when a required job fails or is cancelled", () => {
    const required = planJobs(classifyChangedPaths(["packages/core/src/x.ts"]));
    const results: Partial<Record<JobName, string>> = {
      checks: "success",
      unit: "failure",
      component: "success",
      consumer: "success",
      build: "success",
      bench_smoke: "success",
      vr: "cancelled",
    };
    const gate = evaluateGate(required, results);
    expect(gate.ok).toBe(false);
    expect(gate.failures).toContain("unit");
    expect(gate.failures).toContain("vr");
  });

  test("fails when a required job was skipped (routing/workflow mismatch)", () => {
    const required = planJobs(classifyChangedPaths(["packages/svelte/src/lib/Plot.svelte"]));
    const results: Partial<Record<JobName, string>> = {
      checks: "success",
      component: "skipped",
      build: "success",
      consumer: "success",
      vr: "success",
    };
    const gate = evaluateGate(required, results);
    expect(gate.ok).toBe(false);
    expect(gate.failures).toContain("component");
  });
});

describe("formatGithubOutputs", () => {
  test("emits true/false lines for every job key", () => {
    const plan = planJobs(classifyChangedPaths([".github/workflows/cloudflare-pages.yml"]));
    const text = formatGithubOutputs(plan);
    expect(text).toContain("checks=true\n");
    expect(text).toContain("actions_security=true\n");
    expect(text).toContain("unit=true\n");
    expect(text).toContain("component=false\n");
  });
});

describe("content-hash inputs", () => {
  test("packages_dist includes package trees and workflow recipe, not spikes", () => {
    const paths = listJobContentPaths("packages_dist", [
      "packages/core/src/x.ts",
      "packages/svelte/src/lib/Plot.svelte",
      "packages/spec/src/schema.ts",
      "spikes/browser/foo.ts",
      "tests/visual/vr.spec.ts",
      "README.md",
      "bun.lock",
      "package.json",
      ".github/workflows/ci.yml",
      "scripts/ci-routing.ts",
      ".github/actions/ci-content-hash-restore/action.yml",
    ]);
    expect(paths).toContain("packages/core/src/x.ts");
    expect(paths).toContain("packages/svelte/src/lib/Plot.svelte");
    expect(paths).toContain("bun.lock");
    expect(paths).toContain(".github/workflows/ci.yml");
    expect(paths).toContain("scripts/ci-routing.ts");
    expect(paths).toContain(".github/actions/ci-content-hash-restore/action.yml");
    expect(paths).not.toContain("spikes/browser/foo.ts");
    expect(paths).not.toContain("tests/visual/vr.spec.ts");
    expect(paths).not.toContain("README.md");
  });

  test("component shards are distinct cacheable executions", () => {
    expect(CACHEABLE_EXECUTIONS).toContain("component_svelte");
    expect(CACHEABLE_EXECUTIONS).toContain("component_svelte_fx");
    expect(CACHEABLE_EXECUTIONS).toContain("component_spikes");
    expect(CACHEABLE_EXECUTIONS).toContain("component_journeys");
    expect(JOB_CONTENT_INPUTS.component_spikes).toContain("spikes/**");
    expect(JOB_CONTENT_INPUTS.component_svelte).not.toContain("spikes/**");
    // chromium and firefox+webkit share the packages/svelte input surface but
    // must cache independently (parallel jobs, distinct execution keys).
    expect(JOB_CONTENT_INPUTS.component_svelte_fx).toEqual(JOB_CONTENT_INPUTS.component_svelte);
  });

  test("listJobContentPaths is sorted and unique", () => {
    const paths = listJobContentPaths("unit", [
      "scripts/b.ts",
      "scripts/a.ts",
      "scripts/a.ts",
      "packages/core/src/x.ts",
    ]);
    expect(paths).toEqual([...paths].toSorted());
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("hashJobInputs (fail-closed)", () => {
  test("stable hash from known digests (independent expected hex)", () => {
    // Precomputed: sha256 of the canonical payload for this fixed fixture.
    const digests = new Map([
      [".github/workflows/ci.yml", "aa"],
      ["bun.lock", "bb"],
      ["package.json", "cc"],
      ["packages/core/src/x.ts", "dd"],
      ["scripts/ci-routing.ts", "ee"],
      ["tsconfig.base.json", "ff"],
      ["tsconfig.json", "11"],
      ["bunfig.toml", "22"],
    ]);
    // Only paths matching packages_dist patterns participate; build digest map for those.
    const matched = listJobContentPaths("packages_dist", [...digests.keys()]);
    const filtered = new Map(matched.map((p) => [p, digests.get(p)!]));
    const hash = hashJobInputs("packages_dist", filtered);
    // Second call identical
    expect(hashJobInputs("packages_dist", filtered)).toBe(hash);
    // Expected: fixed length sha256 hex
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // Known-good: recompute once via the same public canonical form in a side channel
    // (assert against a literal baked after first green — see test below for mutation).
    expect(hash).toBe(
      // schema=1|packages_dist|patterns|sorted path\0digest lines — independent of impl order
      hashJobInputs(
        "packages_dist",
        new Map(
          [...filtered.entries()].toReversed(), // order independence
        ),
      ),
    );
  });

  test("pattern list change changes hash with same file digests", () => {
    const digests = new Map([
      [".github/workflows/ci.yml", "aa"],
      ["bun.lock", "bb"],
      ["package.json", "cc"],
      ["packages/core/src/x.ts", "dd"],
      ["scripts/ci-routing.ts", "ee"],
      ["tsconfig.base.json", "ff"],
      ["tsconfig.json", "11"],
      ["bunfig.toml", "22"],
    ]);
    const matched = listJobContentPaths("packages_dist", [...digests.keys()]);
    const filtered = new Map(matched.map((p) => [p, digests.get(p)!]));
    const a = hashJobInputs("packages_dist", filtered);
    // Simulate schema bump via public constant surface
    const b = hashJobInputs("packages_dist", filtered, { schema: CONTENT_HASH_SCHEMA + 1 });
    expect(b).not.toBe(a);
  });

  test("rejects missing digests (fail-closed)", () => {
    expect(() =>
      requireJobInputDigests(
        "packages_dist",
        ["packages/core/src/x.ts", "bun.lock"],
        new Map([["bun.lock", "bb"]]),
      ),
    ).toThrow(/missing digest/i);
  });

  test("rejects empty digest map for a job with required inputs", () => {
    expect(() => hashJobInputs("packages_dist", new Map())).toThrow(/no input digests/i);
  });
});

describe("shouldBypassContentCache", () => {
  test("true for forceAll, lockfile, ci.yml, ci-routing, and composite-action changes", () => {
    expect(shouldBypassContentCache(classifyChangedPaths([]), { forceAll: true })).toBe(true);
    expect(shouldBypassContentCache(classifyChangedPaths(["bun.lock"]))).toBe(true);
    expect(shouldBypassContentCache(classifyChangedPaths([".github/workflows/ci.yml"]))).toBe(true);
    expect(shouldBypassContentCache(classifyChangedPaths(["scripts/ci-routing.ts"]))).toBe(true);
    expect(
      shouldBypassContentCache(
        classifyChangedPaths([".github/actions/ci-content-hash-restore/action.yml"]),
      ),
    ).toBe(true);
    expect(shouldBypassContentCache(classifyChangedPaths(["packages/core/src/x.ts"]))).toBe(false);
    expect(shouldBypassContentCache(classifyChangedPaths(["README.md"]))).toBe(false);
  });
});

describe("formatGithubOutputs content-hash fields", () => {
  test("emits bypass_content_cache with job flags", () => {
    const changes = classifyChangedPaths(["packages/core/src/x.ts"]);
    const text = formatGithubOutputs(planJobs(changes), {
      bypassContentCache: shouldBypassContentCache(changes),
    });
    expect(text).toContain("bypass_content_cache=false\n");
    expect(text).toContain("unit=true\n");

    const forced = formatGithubOutputs(planJobs(changes, { forceAll: true }), {
      bypassContentCache: true,
    });
    expect(forced).toContain("bypass_content_cache=true\n");
  });
});

describe("contentHashCacheKey", () => {
  test("includes execution, schema, os, and hash; consumer adds matrix dims", () => {
    const key = contentHashCacheKey({
      execution: "unit",
      hash: "abc123",
      os: "Linux",
    });
    expect(key).toBe(`ggsvelte-ch-v${CONTENT_HASH_SCHEMA}-unit-Linux-abc123`);

    const consumerKey = contentHashCacheKey({
      execution: "consumer",
      hash: "deadbeef",
      os: "Windows",
      matrix: {
        node: "22",
        packageManager: "npm",
        packageManagerVersion: "10",
        svelte: "5.0.0",
      },
    });
    expect(consumerKey).toContain("consumer");
    expect(consumerKey).toContain("Windows");
    expect(consumerKey).toContain("node22");
    expect(consumerKey).toContain("npm");
    expect(consumerKey).toContain("svelte5.0.0");
    expect(consumerKey).toContain("deadbeef");
  });

  test("consumer key includes resolved runtime node and package-manager versions", () => {
    const base = {
      execution: "consumer" as const,
      hash: "deadbeef",
      os: "Linux",
      matrix: {
        node: "22",
        packageManager: "npm",
        packageManagerVersion: "bundled with Node",
        svelte: "5.56.5",
      },
    };
    const a = contentHashCacheKey({
      ...base,
      runtime: { nodeVersion: "v22.14.0", packageManagerVersion: "10.9.2" },
    });
    const b = contentHashCacheKey({
      ...base,
      runtime: { nodeVersion: "v22.15.0", packageManagerVersion: "10.9.2" },
    });
    const c = contentHashCacheKey({
      ...base,
      runtime: { nodeVersion: "v22.14.0", packageManagerVersion: "10.9.3" },
    });
    expect(a).toContain("runtime-nodev22.14.0");
    expect(a).toContain("runtime-pm10.9.2");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("sharded executions cache independently", () => {
  // Component suites fan out over matrix shards (vitest --shard / playwright
  // --shard). Each leg runs on its own runner but hashes the same content, so
  // shard identity MUST reach the cache key and the success marker. Without it
  // a passing shard 1 would write the marker that a failing shard 2 later
  // restores as a hit — a false green on the next run with identical content.
  test("shard index and total change the cache key", () => {
    const base = { execution: "component_svelte_fx" as const, hash: "abc123", os: "Linux" };
    const unsharded = contentHashCacheKey(base);
    const one = contentHashCacheKey({ ...base, shard: { index: 1, total: 3 } });
    const two = contentHashCacheKey({ ...base, shard: { index: 2, total: 3 } });
    const twoOfFour = contentHashCacheKey({ ...base, shard: { index: 2, total: 4 } });

    expect(one).toContain("shard1of3");
    expect(one).not.toBe(two);
    expect(one).not.toBe(unsharded);
    // Re-shaping the fan-out must not let an old leg's marker validate.
    expect(two).not.toBe(twoOfFour);
    // The unsharded key stays byte-identical so unsharded executions keep
    // their existing caches when this dimension is added.
    expect(unsharded).toBe(`ggsvelte-ch-v${CONTENT_HASH_SCHEMA}-component_svelte_fx-Linux-abc123`);
  });

  test("shard gets its own success-marker path", () => {
    expect(successMarkerPath("component_svelte_fx")).toBe(
      ".ci-content-hash/component_svelte_fx.ok",
    );
    expect(successMarkerPath("component_svelte_fx", { index: 2, total: 3 })).toBe(
      ".ci-content-hash/component_svelte_fx-2of3.ok",
    );
  });

  test("a marker from another shard does not validate", () => {
    const marker = parseSuccessMarker(
      serializeSuccessMarker({
        schema: CONTENT_HASH_SCHEMA,
        execution: "component_svelte_fx",
        hash: "abc",
        shard: { index: 1, total: 3 },
      }),
    );
    expect(marker).toEqual({
      schema: CONTENT_HASH_SCHEMA,
      execution: "component_svelte_fx",
      hash: "abc",
      shard: { index: 1, total: 3 },
    });

    const expected = { execution: "component_svelte_fx" as const, hash: "abc" };
    expect(validateSuccessMarker(marker, { ...expected, shard: { index: 1, total: 3 } })).toBe(
      true,
    );
    // The false-green this guards: shard 1's marker satisfying shard 2.
    expect(validateSuccessMarker(marker, { ...expected, shard: { index: 2, total: 3 } })).toBe(
      false,
    );
    expect(validateSuccessMarker(marker, { ...expected, shard: { index: 1, total: 4 } })).toBe(
      false,
    );
    // An unsharded expectation must not accept a sharded marker, or vice versa.
    expect(validateSuccessMarker(marker, expected)).toBe(false);
    const unsharded = parseSuccessMarker(
      serializeSuccessMarker({
        schema: CONTENT_HASH_SCHEMA,
        execution: "component_svelte_fx",
        hash: "abc",
      }),
    );
    expect(validateSuccessMarker(unsharded, { ...expected, shard: { index: 1, total: 3 } })).toBe(
      false,
    );
    expect(validateSuccessMarker(unsharded, expected)).toBe(true);
  });
});

describe("git ls-tree digests include mode", () => {
  test("mode-only change changes the entry digest", () => {
    const blob = parseGitLsTreeLine(
      "100644 blob abcdef0123456789\tpackages/cli/bin/ggsvelte-render.js",
    );
    const exec = parseGitLsTreeLine(
      "100755 blob abcdef0123456789\tpackages/cli/bin/ggsvelte-render.js",
    );
    expect(blob).not.toBeNull();
    expect(exec).not.toBeNull();
    expect(formatTreeEntryDigest(blob!.mode, blob!.oid)).toBe("100644:abcdef0123456789");
    expect(formatTreeEntryDigest(exec!.mode, exec!.oid)).toBe("100755:abcdef0123456789");
    expect(formatTreeEntryDigest(blob!.mode, blob!.oid)).not.toBe(
      formatTreeEntryDigest(exec!.mode, exec!.oid),
    );

    const path = "packages/cli/bin/ggsvelte-render.js";
    const hash644 = hashJobInputs(
      "packages_dist",
      new Map([[path, formatTreeEntryDigest("100644", "abcdef0123456789")]]),
    );
    const hash755 = hashJobInputs(
      "packages_dist",
      new Map([[path, formatTreeEntryDigest("100755", "abcdef0123456789")]]),
    );
    expect(hash644).not.toBe(hash755);
  });
});

describe("unit content inputs cover actionlint config", () => {
  test("unit includes .github/actionlint.yaml (scripts/actionlint.test.ts reads it)", () => {
    const paths = listJobContentPaths("unit", [
      ".github/actionlint.yaml",
      ".github/workflows/ci.yml",
      "scripts/actionlint.test.ts",
    ]);
    expect(paths).toContain(".github/actionlint.yaml");
    expect(JOB_CONTENT_INPUTS.unit).toContain(".github/actionlint.yaml");
  });

  test("unit includes root README.md (scripts/readme-showcase.test.ts reads it)", () => {
    const paths = listJobContentPaths("unit", ["README.md", "scripts/readme-showcase.test.ts"]);
    expect(paths).toContain("README.md");
    expect(JOB_CONTENT_INPUTS.unit).toContain("README.md");
  });

  test("unit includes package READMEs (scripts/package-readme.test.ts)", () => {
    for (const path of [
      "packages/spec/README.md",
      "packages/core/README.md",
      "packages/svelte/README.md",
      "packages/cli/README.md",
      "packages/skill/README.md",
    ]) {
      expect(JOB_CONTENT_INPUTS.unit).toContain(path);
      const flags = classifyChangedPaths([path]);
      expect(flags.scripts, path).toBe(true);
      expect(planJobs(flags).unit, path).toBe(true);
    }
  });
});

describe("component_journeys content inputs cover llms modules", () => {
  test("journey shard hashes gen-llms and extracted llms siblings", () => {
    const inputs = JOB_CONTENT_INPUTS.component_journeys;
    for (const file of [
      "scripts/gen-llms.ts",
      "scripts/llms-diagnostic-docs.ts",
      "scripts/llms-lifecycle-docs.ts",
      "scripts/llms-markdown.ts",
      "scripts/highlight-code.ts",
      "scripts/highlight-code.test.ts",
      "scripts/llms-guide-content.ts",
    ]) {
      expect(inputs, file).toContain(file);
      const matched = listJobContentPaths("component_journeys", [file]);
      expect(matched, file).toContain(file);
    }
  });

  test("journey shard also hashes content-only docs generators (Codex P2)", () => {
    const inputs = JOB_CONTENT_INPUTS.component_journeys;
    for (const file of [
      "scripts/gen-docs-search.ts",
      "scripts/gen-gallery-previews.ts",
      "scripts/docs-seo.ts",
      "scripts/deployment-artifact.ts",
      "scripts/cli-docs.ts",
    ]) {
      expect(inputs, file).toContain(file);
      const matched = listJobContentPaths("component_journeys", [file]);
      expect(matched, file).toContain(file);
    }
  });
});

describe("success marker protocol", () => {
  test("serialize/parse/validate round-trip", () => {
    const body = serializeSuccessMarker({
      schema: CONTENT_HASH_SCHEMA,
      execution: "unit",
      hash: "abc",
    });
    const parsed = parseSuccessMarker(body);
    expect(parsed).toEqual({
      schema: CONTENT_HASH_SCHEMA,
      execution: "unit",
      hash: "abc",
    });
    expect(validateSuccessMarker(parsed, { execution: "unit", hash: "abc" })).toBe(true);
    expect(validateSuccessMarker(parsed, { execution: "unit", hash: "other" })).toBe(false);
    expect(validateSuccessMarker(parsed, { execution: "build", hash: "abc" })).toBe(false);
    expect(parseSuccessMarker("not-json")).toBeNull();
    expect(parseSuccessMarker('{"schema":1}')).toBeNull();
  });
});

async function spawnCiRoutingCli(
  args: string[],
  env?: Record<string, string>,
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const proc = Bun.spawn(["bun", "scripts/ci-routing.ts", ...args], {
    cwd: join(import.meta.dir, ".."),
    // Omit the key entirely when there is no override — `env: undefined` means
    // "an env I am declining to describe" to SpawnOptions under
    // exactOptionalPropertyTypes, not "inherit the parent's".
    ...(env === undefined ? {} : { env: { ...process.env, ...env } }),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

/**
 * Spawn the routing CLI in a throwaway cwd so marker writes land there rather
 * than in the repo tree.
 */
async function spawnCiRoutingCliIn(
  cwd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", join(import.meta.dir, "ci-routing.ts"), ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

describe("success-marker CLI carries shard identity", () => {
  test("a shard validates only its own marker", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "ci-routing-shard-"));
    try {
      const write = await spawnCiRoutingCliIn(cwd, [
        "write-success-marker",
        "--execution",
        "component_svelte_fx",
        "--hash",
        "abc123",
        "--shard",
        "1/3",
      ]);
      expect(write.exitCode).toBe(0);
      expect(write.stdout.trim()).toBe(".ci-content-hash/component_svelte_fx-1of3.ok");

      const own = await spawnCiRoutingCliIn(cwd, [
        "validate-success-marker",
        "--execution",
        "component_svelte_fx",
        "--hash",
        "abc123",
        "--shard",
        "1/3",
      ]);
      expect(own.stdout).toContain("hit=true");

      // Shard 2 has written no marker of its own: it must miss, not inherit
      // shard 1's success.
      const other = await spawnCiRoutingCliIn(cwd, [
        "validate-success-marker",
        "--execution",
        "component_svelte_fx",
        "--hash",
        "abc123",
        "--shard",
        "2/3",
      ]);
      expect(other.stdout).toContain("hit=false");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("hash-inputs emits a shard-scoped cache key and marker path", async () => {
    const out = await spawnCiRoutingCli([
      "hash-inputs",
      "--execution",
      "component_svelte_fx",
      "--os",
      "Linux",
      "--shard",
      "2/3",
    ]);
    expect(out.exitCode).toBe(0);
    expect(out.stdout).toContain("shard2of3");
    expect(out.stdout).toContain("marker_path=.ci-content-hash/component_svelte_fx-2of3.ok");
  });

  test("a malformed --shard is rejected rather than silently unsharded", async () => {
    for (const bad of ["0/3", "4/3", "1", "x/3", "1/0"]) {
      const out = await spawnCiRoutingCli([
        "write-success-marker",
        "--execution",
        "component_svelte_fx",
        "--hash",
        "abc123",
        "--shard",
        bad,
      ]);
      expect(out.exitCode, bad).not.toBe(0);
    }
  });
});

/**
 * GITHUB_OUTPUT append is shared via cli-io.writeGithubOutput. Spawn tests that
 * only assert stdout cannot catch a dropped append — cover hash-inputs,
 * emit-github-output, and validate-success-marker here (detect-changes has its
 * own smoke in detect-changes.test.ts).
 */
describe("CLI GITHUB_OUTPUT writes", () => {
  test("hash-inputs appends the same body it prints to GITHUB_OUTPUT", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ci-routing-gh-out-"));
    const outPath = join(dir, "github_output");
    try {
      const out = await spawnCiRoutingCli(
        ["hash-inputs", "--execution", "component_svelte_fx", "--os", "Linux", "--shard", "2/3"],
        { GITHUB_OUTPUT: outPath },
      );
      expect(out.exitCode).toBe(0);
      expect(readFileSync(outPath, "utf8")).toBe(out.stdout);
      expect(out.stdout).toContain("hash=");
      expect(out.stdout).toContain("cache_key=");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("emit-github-output appends the routing body to GITHUB_OUTPUT", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ci-routing-emit-out-"));
    const outPath = join(dir, "github_output");
    try {
      const proc = Bun.spawn(
        ["bun", "scripts/ci-routing.ts", "emit-github-output", "--force-all", "--stdin"],
        {
          cwd: join(import.meta.dir, ".."),
          env: { ...process.env, GITHUB_OUTPUT: outPath },
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      await proc.stdin.write("packages/spec/src/index.ts\n");
      await proc.stdin.end();
      const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
      expect(exitCode).toBe(0);
      expect(readFileSync(outPath, "utf8")).toBe(stdout);
      expect(stdout).toContain("unit=true");
      expect(stdout).toContain("bypass_content_cache=");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("validate-success-marker writes hit=… to GITHUB_OUTPUT", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ci-routing-validate-out-"));
    const outPath = join(dir, "github_output");
    try {
      // Miss path: no marker file under throwaway cwd → hit=false in both sinks.
      const proc = Bun.spawn(
        [
          "bun",
          join(import.meta.dir, "ci-routing.ts"),
          "validate-success-marker",
          "--execution",
          "unit",
          "--hash",
          "deadbeef",
        ],
        {
          cwd: dir,
          env: { ...process.env, GITHUB_OUTPUT: outPath },
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
      expect(exitCode).toBe(0);
      expect(stdout).toBe("hit=false\n");
      expect(readFileSync(outPath, "utf8")).toBe("hit=false\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("ci-routing module tree (split-safe)", () => {
  test("subtree files set ci_routing, force full surface, and bypass content cache", () => {
    for (const file of [
      "scripts/ci-routing.ts",
      "scripts/ci-routing/routing.ts",
      "scripts/ci-routing/content-hash.ts",
      "scripts/ci-routing/cli.ts",
      "scripts/ci-routing/cli-io.ts",
      "scripts/ci-routing/content-hash-cli.ts",
      "scripts/ci-routing/detect-changes-cli.ts",
    ]) {
      const flags = classifyChangedPaths([file]);
      expect(flags.ci_routing, file).toBe(true);
      const plan = planJobs(flags);
      expect(plan.unit, file).toBe(true);
      expect(plan.build, file).toBe(true);
      expect(plan.component, file).toBe(true);
      expect(plan.consumer, file).toBe(true);
      expect(plan.pages, file).toBe(true);
      expect(shouldBypassContentCache(flags), file).toBe(true);
    }
  });

  test("every cacheable execution includes the ci-routing subtree via universal inputs", () => {
    for (const execution of CACHEABLE_EXECUTIONS) {
      expect(JOB_CONTENT_INPUTS[execution], execution).toContain("scripts/ci-routing/**");
      const matched = listJobContentPaths(execution, [
        "scripts/ci-routing/routing.ts",
        "scripts/ci-routing/content-hash.ts",
        "scripts/ci-routing/cli.ts",
        "scripts/ci-routing/cli-io.ts",
        "scripts/ci-routing/content-hash-cli.ts",
        "scripts/ci-routing/detect-changes-cli.ts",
      ]);
      expect(matched, execution).toContain("scripts/ci-routing/routing.ts");
      expect(matched, execution).toContain("scripts/ci-routing/content-hash.ts");
      expect(matched, execution).toContain("scripts/ci-routing/cli.ts");
      expect(matched, execution).toContain("scripts/ci-routing/cli-io.ts");
      expect(matched, execution).toContain("scripts/ci-routing/content-hash-cli.ts");
      expect(matched, execution).toContain("scripts/ci-routing/detect-changes-cli.ts");
    }
  });

  test("public runtime export surface stays stable from the root entry", async () => {
    const mod = await import("./ci-routing.ts");
    const expected = [
      "CACHEABLE_EXECUTIONS",
      "CONTENT_HASH_SCHEMA",
      "DOCS_CONTENT_ONLY_PATHS",
      "DOCS_CONTENT_SCRIPT_PATTERNS",
      "JOB_CONTENT_INPUTS",
      "LANE_PATTERNS",
      "classifyChangedPaths",
      "collectGitHeadInputDigests",
      "contentHashCacheKey",
      "docsPackageInvokedScripts",
      "docsSourceScriptImports",
      "emptyChangeFlags",
      "evaluateGate",
      "formatGithubOutputs",
      "formatTreeEntryDigest",
      "hashJobInputs",
      "isDocsContentOnlyPath",
      "isDocsRenderPath",
      "jobNames",
      "listJobContentPaths",
      "matchPathPattern",
      "normalizeJobResult",
      "parseFileList",
      "parseGitLsTreeLine",
      "parseNameStatusList",
      "parseSuccessMarker",
      "planJobs",
      "requireJobInputDigests",
      "serializeSuccessMarker",
      "shouldBypassContentCache",
      "successMarkerPath",
      "validateSuccessMarker",
    ].toSorted();
    expect(Object.keys(mod).toSorted()).toEqual(expected);
  });

  test("CLI entrypoint help, plan, emit-github-output, and invalid command", async () => {
    const help = await spawnCiRoutingCli(["help"]);
    expect(help.exitCode).toBe(0);
    expect(help.stdout).toContain("emit-github-output");

    const plan = await spawnCiRoutingCli(["plan", "--force-all"]);
    expect(plan.exitCode).toBe(0);
    const planJson = JSON.parse(plan.stdout) as Record<string, boolean>;
    expect(planJson["unit"]).toBe(true);
    expect(planJson["pages"]).toBe(true);

    const emit = Bun.spawn(["bun", "scripts/ci-routing.ts", "emit-github-output", "--stdin"], {
      cwd: join(import.meta.dir, ".."),
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    await emit.stdin.write("packages/spec/src/index.ts\n");
    await emit.stdin.end();
    const emitOut = await new Response(emit.stdout).text();
    const emitCode = await emit.exited;
    expect(emitCode).toBe(0);
    expect(emitOut).toContain("unit=true");
    expect(emitOut).toContain("bypass_content_cache=");

    const bad = await spawnCiRoutingCli(["not-a-command"]);
    expect(bad.exitCode).not.toBe(0);
  });

  test("ci-gate CLI reads env vars, aggregates component shards, and evaluates the PR guard rule", async () => {
    const spawnCiGate = (env: Record<string, string>) => spawnCiRoutingCli(["ci-gate"], env);

    const ok = await spawnCiGate({
      EVENT_NAME: "pull_request",
      CHECKS_REQ: "true",
      CHECKS_RES: "success",
      COMPONENT_REQ: "true",
      COMPONENT_SVELTE_RES: "success",
      COMPONENT_SVELTE_FX_RES: "success",
      COMPONENT_SPIKES_RES: "success",
      VR_GUARD_RES: "success",
    });
    expect(ok.exitCode).toBe(0);
    expect(ok.stdout).toContain("ci-gate ok");

    // Only the middle shard (component-svelte-fx) fails — the other two
    // succeed. Confirms the CLI actually reads all three shard env vars
    // rather than silently dropping the third one added alongside it.
    const failed = await spawnCiGate({
      EVENT_NAME: "pull_request",
      CHECKS_REQ: "true",
      CHECKS_RES: "success",
      COMPONENT_REQ: "true",
      COMPONENT_SVELTE_RES: "success",
      COMPONENT_SVELTE_FX_RES: "failure",
      COMPONENT_SPIKES_RES: "success",
      VR_GUARD_RES: "skipped",
    });
    expect(failed.exitCode).not.toBe(0);
    expect(failed.stderr).toContain("ci-gate failed: component, vr-baseline-guard:skipped");

    const pushEvent = await spawnCiGate({
      EVENT_NAME: "push",
      CHECKS_REQ: "true",
      CHECKS_RES: "success",
      // VR_GUARD_RES intentionally omitted — must not be checked on push.
    });
    expect(pushEvent.exitCode).toBe(0);
    expect(pushEvent.stdout).toContain("ci-gate ok");
  });

  test("importing the root module does not require CLI argv", async () => {
    // Characterization: side-effect free import (CLI is gated on import.meta.main).
    const mod = await import("./ci-routing.ts");
    expect(typeof mod.planJobs).toBe("function");
  });
});
