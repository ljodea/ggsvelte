import { describe, expect, test } from "bun:test";

import {
  JOB_CONTENT_INPUTS,
  classifyChangedPaths,
  matchPathPattern,
  planJobs,
  type JobName,
} from "../ci-routing";

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
      "scripts/llms-guide/getting-started.ts",
      "apps/docs/src/lib/catalog/guide.ts",
      "apps/docs/src/lib/generated/routes.ts",
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
      "scripts/docs-seo-image.ts",
      "scripts/docs-seo.test.ts",
      "scripts/gen-og-home.ts",
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
    // release-wiring/{ci,…}.test.ts (and other scripts/**/*.test.ts) used to
    // force the monolithic build job, which always ran vite build:docs.
    const plan = planJobs(classifyChangedPaths(["scripts/release-wiring/ci.test.ts"]));
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
      // package.json build/check invoke generators; build invokes docs-csp.
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
