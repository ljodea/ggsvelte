import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";

import type { PortableSpec } from "@ggsvelte/spec";

import {
  PLAYGROUND_CANDIDATE_EVENT,
  type PlaygroundCandidatePhaseDetail,
} from "../../apps/docs/src/lib/playground-candidate-lifecycle";
import { encodePlaygroundSeed } from "../../apps/docs/src/lib/playground-codec";
import { settleVisualState } from "./helpers/deterministic";

type CandidatePhaseLog = PlaygroundCandidatePhaseDetail[];

async function installCandidatePhaseLog(page: Page): Promise<void> {
  await page.addInitScript((eventName) => {
    const observedWindow = window as typeof window & {
      playgroundCandidatePhases?: CandidatePhaseLog;
    };
    const phases: CandidatePhaseLog = [];
    observedWindow.playgroundCandidatePhases = phases;
    window.addEventListener(eventName, (event) => {
      phases.push((event as CustomEvent<PlaygroundCandidatePhaseDetail>).detail);
    });
  }, PLAYGROUND_CANDIDATE_EVENT);
}

function candidatePhaseLog(page: Page): Promise<CandidatePhaseLog> {
  return page.evaluate(
    () =>
      (
        window as typeof window & {
          playgroundCandidatePhases?: CandidatePhaseLog;
        }
      ).playgroundCandidatePhases ?? [],
  );
}

function phasesForGeneration(log: CandidatePhaseLog, generation: number): CandidatePhaseLog {
  return log.filter((entry) => entry.generation === generation);
}

async function waitForGenerationTerminal(
  page: Page,
  generation: number,
): Promise<CandidatePhaseLog> {
  await expect
    .poll(async () => {
      const log = await candidatePhaseLog(page);
      return phasesForGeneration(log, generation).some(
        (entry) =>
          entry.phase === "promoted" || entry.phase === "failed" || entry.phase === "cancelled",
      );
    })
    .toBe(true);
  return phasesForGeneration(await candidatePhaseLog(page), generation);
}

const PIPELINE_FAILURE_SPEC = {
  edition: 2,
  data: {
    values: [
      { x: 1, y: 2, group: "A" },
      { x: 2, y: 3, group: "B" },
    ],
  },
  layers: [
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: {
        x: { field: "x" },
        y: { field: "y" },
        color: { field: "group" },
      },
    },
  ],
  scales: { color: { type: "ordinal", range: ["#d94841"], onExhaust: "error" } },
  labs: { title: "Must not replace the chart" },
} as const satisfies PortableSpec;

const PIPELINE_FAILURE_FRAGMENT = encodePlaygroundSeed({
  version: 1,
  source: { kind: "custom" },
  spec: PIPELINE_FAILURE_SPEC,
});

const VALID_INITIAL_FRAGMENT = encodePlaygroundSeed({
  version: 1,
  source: { kind: "custom" },
  spec: {
    ...PIPELINE_FAILURE_SPEC,
    scales: { color: { type: "ordinal", range: ["#d94841", "#2563eb"] } },
    labs: { title: "Initial candidate" },
  },
});

const SHARED_EDIT_FRAGMENT = encodePlaygroundSeed({
  version: 1,
  source: { kind: "custom" },
  spec: {
    edition: 2,
    data: {
      values: [
        { id: "a1", species: "Adelie", flipper: 181, mass: 3750 },
        { id: "g1", species: "Gentoo", flipper: 211, mass: 5000 },
      ],
    },
    layers: [
      {
        geom: "point",
        stat: "identity",
        position: "identity",
        aes: {
          x: { field: "flipper" },
          y: { field: "mass" },
          color: { field: "species" },
        },
      },
    ],
    labs: { title: "Shared edit" },
    height: 400,
  },
});

async function loadSample(page: Page, title: string | RegExp): Promise<void> {
  await page.getByRole("button", { name: title }).click();
}

test("landing page makes the gallery and local adaptation paths obvious", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Playground" }).first().click();
  await expect(page).toHaveURL(/\/playground$/);
  await expect(page.getByRole("heading", { name: "Playground" })).toBeVisible();
});

test("interaction reference filters the exact public contract", async ({ page }) => {
  await page.goto("/reference/interactions");
  await page.getByLabel("Search capabilities and events").fill("diagnostic");

  await expect(page.getByText("1 result")).toBeVisible();
  await expect(page.getByRole("link", { name: /Diagnostics/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Inspect and pin/ })).toHaveCount(0);
});

test("gallery and interaction detail pages do not embed playground handoff", async ({ page }) => {
  // Product decision: example/interaction pages are specimens only — no
  // playground deep-link chrome. Fragment handoff coverage lives in the
  // playground hash-restore tests below.
  for (const path of [
    "/examples/point/scatter-color",
    "/examples/point/canvas-scatter",
    "/interactions/linked-views",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "Open in Playground" })).toHaveCount(0);
    const html = await page.content();
    expect(html).not.toMatch(/class="[^"]*playground-link/);
    expect(html).not.toMatch(/more than 500 inline rows/);
  }
});

test("first paint shows a seeded interactive chart, not an empty form", async ({ page }) => {
  await page.goto("/playground");
  await settleVisualState(page);
  await expect(page.locator(".active-chart .gg-title")).toBeVisible();
  await expect(page.getByLabel("Rewrite this chart")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Use this chart in your app" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Enabled interactions" })).toBeVisible();
});

test("initial candidate keeps the pending status until promotion", async ({ page }) => {
  await installCandidatePhaseLog(page);
  await page.goto(`/playground${VALID_INITIAL_FRAGMENT}`);

  await expect
    .poll(async () => {
      const log = await candidatePhaseLog(page);
      return log.find((entry) => entry.phase === "pending" && entry.origin === "initial-navigation")
        ?.generation;
    })
    .toEqual(expect.any(Number));

  const generation = (await candidatePhaseLog(page)).find(
    (entry) => entry.phase === "pending" && entry.origin === "initial-navigation",
  )!.generation;
  const phases = await waitForGenerationTerminal(page, generation);
  expect(phases.map((entry) => entry.phase)).toEqual(["pending", "ready", "promoted"]);
  expect(phases[0]).toMatchObject({
    origin: "initial-navigation",
    status: "Checking the next chart before replacing the last valid result.",
  });
  expect(phases[1]?.isolation).toMatchObject({
    inert: true,
    inertAttribute: true,
    ariaHidden: "true",
  });
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Initial candidate");
});

test("example prompts generate instantly without network (canned envelopes)", async ({ page }) => {
  await installCandidatePhaseLog(page);
  let networkHits = 0;
  await page.route("**/v1/generate", async (route) => {
    networkHits += 1;
    await route.abort();
  });

  await page.goto("/playground");
  await settleVisualState(page);
  const before = await candidatePhaseLog(page);

  await page.getByRole("button", { name: "Interactive scatterplot" }).click();

  await expect
    .poll(async () => {
      const log = await candidatePhaseLog(page);
      return log.find(
        (entry, index) =>
          index >= before.length && entry.phase === "pending" && entry.origin === "agent",
      )?.generation;
    })
    .toEqual(expect.any(Number));

  const generation = (await candidatePhaseLog(page)).find(
    (entry, index) =>
      index >= before.length && entry.phase === "pending" && entry.origin === "agent",
  )!.generation;
  const phases = await waitForGenerationTerminal(page, generation);
  expect(phases.map((entry) => entry.phase)).toEqual(["pending", "ready", "promoted"]);
  expect(networkHits).toBe(0);
  await expect(page.locator(".active-chart .gg-title")).toContainText(/Penguin/u);
});

test("free-text agent happy path exercises the live request path", async ({ page }) => {
  await installCandidatePhaseLog(page);
  let networkHits = 0;
  const seenBodies: Array<{ prompt?: string; datasetId?: string; currentSpec?: unknown }> = [];
  await page.route("**/v1/generate", async (route) => {
    networkHits += 1;
    const body = route.request().postDataJSON() as {
      prompt?: string;
      datasetId?: string;
      currentSpec?: unknown;
      priorErrors?: unknown;
    };
    seenBodies.push(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        model: "stub/model",
        envelope: {
          spec: {
            edition: 2,
            data: { name: body.datasetId ?? "penguins" },
            layers: [
              {
                geom: "point",
                aes: {
                  x: { field: "flipper" },
                  y: { field: "mass" },
                  color: { field: "species" },
                },
                params: { size: 5 },
              },
            ],
            labs: {
              title: "Stubbed agent chart",
              x: "Flipper",
              y: "Mass",
              color: "Species",
            },
            height: 400,
          },
          interactions: {
            inspect: true,
            select: "point",
            zoom: true,
            legendFilter: true,
            legendFocus: false,
          },
          title: "Stubbed agent chart",
        },
      }),
    });
  });

  // ?gg-api=live forces the live transport so the route stub is actually
  // exercised (the static test build otherwise defaults to mock mode).
  await page.goto("/playground?gg-api=live");
  await settleVisualState(page);
  await page.getByLabel("Rewrite this chart").fill("Make a custom scatter for testing");
  const before = await candidatePhaseLog(page);
  await page.getByRole("button", { name: "Generate" }).click();

  await expect
    .poll(async () => {
      const log = await candidatePhaseLog(page);
      return log.some(
        (entry, index) =>
          index >= before.length && entry.phase === "promoted" && entry.origin === "agent",
      );
    })
    .toBe(true);

  // The stub must actually be hit with the typed prompt. The first request's
  // currentSpec carries the sample-seeded chart (sample rows are not a curated
  // dataset, so they ship inline — nothing to elide yet).
  expect(networkHits).toBe(1);
  expect(seenBodies[0]?.prompt).toBe("Make a custom scatter for testing");
  expect(seenBodies[0]?.datasetId).toBe("penguins");
  expect(seenBodies[0]?.currentSpec).toBeDefined();

  await expect(page.locator(".active-chart .gg-title")).toHaveText("Stubbed agent chart");
  await expect(page.getByRole("tab", { name: "Svelte" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Spec (JSON)" })).toBeVisible();

  // A refinement of the agent chart (curated rows now inlined in committed)
  // must elide back to named data — never contradicting the system prompt.
  await page.getByLabel("Rewrite this chart").fill("Now facet it by species");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect.poll(() => networkHits).toBe(2);
  expect(seenBodies[1]?.currentSpec).toMatchObject({ data: { name: "penguins" } });
});

test("repair round sends raw SpecError contract in the second request", async ({ page }) => {
  await installCandidatePhaseLog(page);
  const bodies: Array<{ priorSpec?: unknown; priorErrors?: Array<Record<string, unknown>> }> = [];
  await page.route("**/v1/generate", async (route) => {
    const body = route.request().postDataJSON() as (typeof bodies)[number];
    bodies.push(body);
    const goodSpec = {
      edition: 2,
      data: { name: "penguins" },
      layers: [{ geom: "point", aes: { x: { field: "flipper" }, y: { field: "mass" } } }],
      labs: { title: "Repaired chart" },
      height: 400,
    };
    const badSpec = {
      ...goodSpec,
      layers: [{ geom: "point", aes: { x: { field: "no_such_field" }, y: { field: "mass" } } }],
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        model: "stub/model",
        envelope: {
          spec: bodies.length === 1 ? badSpec : goodSpec,
          interactions: {
            inspect: true,
            select: false,
            zoom: false,
            legendFilter: false,
            legendFocus: false,
          },
          title: "Repaired chart",
        },
      }),
    });
  });

  await page.goto("/playground?gg-api=live");
  await settleVisualState(page);
  await page.getByLabel("Rewrite this chart").fill("Chart something that needs repair");
  await page.getByRole("button", { name: "Generate" }).click();

  await expect(page.locator(".active-chart .gg-title")).toHaveText("Repaired chart");
  expect(bodies.length).toBe(2);
  // The repair request carries the prior envelope and the raw SpecError
  // agent contract (code/path/message survive; never stripped diagnostics).
  expect(bodies[1]?.priorSpec).toBeDefined();
  const firstError = bodies[1]?.priorErrors?.[0];
  expect(firstError).toBeDefined();
  expect(firstError).toHaveProperty("code");
  expect(firstError).toHaveProperty("path");
  expect(firstError).toHaveProperty("message");
});

test("degraded mode on failed fetch shows alert and keeps samples usable", async ({ page }) => {
  await page.route("**/v1/generate", async (route) => {
    await route.abort("failed");
  });

  await page.goto("/playground?gg-api=live");
  await settleVisualState(page);
  await page.getByLabel("Rewrite this chart").fill("Something novel that uses the generator");
  await page.getByRole("button", { name: "Generate" }).click();

  // One degradation design: quiet alert, previous chart intact, samples primary.
  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Could not reach the generate service");
  await expect(page.locator(".active-chart .gg-title")).toBeVisible();
  await expect(alert.getByRole("button", { name: "Monthly line" })).toBeVisible();

  // Samples still work from the failed state (the alert's primary next action).
  await alert.getByRole("button", { name: "Monthly line" }).click();
  await expect(page.getByText("Rendered monthly-line.")).toBeVisible();
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Monthly series");
});

test("cancel during generation reaches the aborted state", async ({ page }) => {
  await page.route("**/v1/generate", async () => {
    // Never fulfil — the request hangs until the client aborts it.
    await new Promise(() => {});
  });

  await page.goto("/playground?gg-api=live");
  await settleVisualState(page);
  await page.getByLabel("Rewrite this chart").fill("Slow generation to cancel");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByRole("alert")).toContainText("Generation cancelled");
  // The machine is idle again — Generate is clickable.
  await expect(page.getByRole("button", { name: "Generate" })).toBeEnabled();
});

test("capability toggles change codegen output", async ({ page }) => {
  await page.goto("/playground");
  await settleVisualState(page);

  await page.getByRole("button", { name: "Select interval", exact: true }).click();
  await page.getByRole("tab", { name: "Svelte" }).click();
  await expect(page.getByLabel("Code example")).toContainText('select="interval"');

  await page.getByRole("button", { name: "Select interval", exact: true }).click();
  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  await expect(page.getByLabel("Code example")).toContainText("zoom");
});

test("temporal samples render and keep ambiguous dates discrete", async ({ page }) => {
  await page.goto("/playground");
  await settleVisualState(page);

  await loadSample(page, "Raw years");
  await expect(page.getByText("Rendered raw-years.")).toBeVisible();
  await expect(page.locator(".active-chart .gg-title")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Axis plans" })).toHaveCount(0);

  await loadSample(page, "ISO dates");
  await expect(page.getByText("Rendered iso-dates.")).toBeVisible();

  await loadSample(page, "Ambiguous dates");
  await expect(page.getByText("Rendered ambiguous-dates.")).toBeVisible();
});

test("191-year temporal guide stays collision-free with complete labels", async ({ page }) => {
  for (const width of [320, 640, 1200]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/examples/line/time-axis");
    await settleVisualState(page);

    const ticks = page.locator(".gg-axis-x .gg-tick:not(.gg-tick-minor)");
    await expect(ticks.first()).toBeVisible();
    const evidence = await ticks.evaluateAll((elements) =>
      elements.map((element) => {
        const text = element.querySelector("text");
        const title = element.querySelector("title");
        const box = text?.getBoundingClientRect();
        return {
          left: box?.left ?? 0,
          right: box?.right ?? 0,
          full: title?.textContent ?? "",
          titleIsFirst: element.firstElementChild === title,
        };
      }),
    );
    expect(evidence.length, String(width)).toBeGreaterThanOrEqual(3);
    expect(evidence.every((tick) => tick.full.length > 0 && tick.titleIsFirst)).toBe(true);
    for (let index = 1; index < evidence.length; index++) {
      expect(
        evidence[index - 1]!.right + 6,
        `${String(width)}px tick ${String(index)}`,
      ).toBeLessThanOrEqual(evidence[index]!.left);
    }
  }
});

test("code tabs use Spec (JSON) label and copy works", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/playground");
  await settleVisualState(page);

  await expect(page.getByRole("tab")).toHaveText(["Svelte", "Builder", "Spec (JSON)"]);
  await page.getByRole("tab", { name: "Builder" }).click();
  await expect(page.getByLabel("Code example")).toContainText(
    'import { gg, type PortableSpec } from "@ggsvelte/svelte";',
  );
  await page.getByRole("button", { name: "Copy code" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("const built = gg(");

  await page.getByRole("tab", { name: "Spec (JSON)" }).click();
  await expect(page.getByLabel("Code example")).toContainText("Penguin");
  await page.getByRole("button", { name: "Copy code" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('"title"');
});

test("Previous chart undo restores a render-confirmed snapshot", async ({ page }) => {
  await installCandidatePhaseLog(page);
  await page.goto("/playground");
  await settleVisualState(page);

  await page.getByRole("button", { name: "Interactive scatterplot" }).click();
  await expect
    .poll(async () => {
      const log = await candidatePhaseLog(page);
      return log.some((e) => e.origin === "agent" && e.phase === "promoted");
    })
    .toBe(true);

  await page.getByRole("button", { name: "Facet by species" }).click();
  await expect
    .poll(async () => {
      const log = await candidatePhaseLog(page);
      return log.filter((e) => e.origin === "agent" && e.phase === "promoted").length >= 2;
    })
    .toBe(true);

  await page.getByRole("button", { name: "Previous chart" }).click();
  await expect
    .poll(async () => {
      const log = await candidatePhaseLog(page);
      return log.some((e) => e.origin === "undo" && e.phase === "promoted");
    })
    .toBe(true);
});

test("SVG export downloads complete output and reports browser download failures", async ({
  page,
}) => {
  await page.goto("/playground");
  await settleVisualState(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ggsvelte-chart.svg");
  const path = await download.path();
  if (path === null) throw new Error("expected a downloaded SVG path");
  expect(await readFile(path, "utf8")).toMatch(/^<svg[\s>]/u);
  await expect(page.getByRole("status").filter({ hasText: "SVG downloaded" })).toBeVisible();

  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error("Downloads disabled for test");
    };
  });
  await page.getByRole("button", { name: "Download SVG" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "export/download-failed" }),
  ).toContainText("The chart and outputs were retained.");
});

test("semantic event inspection is local, bounded, clearable, and reset by promotion", async ({
  page,
}) => {
  await page.goto("/playground");
  await settleVisualState(page);
  const inspector = page.locator("details.event-inspector");
  // May auto-open on first event; start closed check after load without interaction.
  const chart = page.locator(".active-chart [role='group']").first();
  await chart.focus();
  await chart.press("ArrowRight");
  // OV4-A: auto-expands on first event
  await expect(inspector).toHaveAttribute("open", "");
  await expect(page.getByRole("list", { name: "Semantic event log" })).toContainText(
    "inspect/change",
  );

  await page.getByRole("button", { name: "Clear events" }).click();
  await expect(page.getByText("No semantic events yet.", { exact: false })).toBeVisible();

  await chart.press("ArrowRight");
  await expect(page.getByRole("list", { name: "Semantic event log" })).toBeVisible();

  await page.getByRole("button", { name: "Interactive scatterplot" }).click();
  await expect(page.getByText(/Rendered custom chart|Loading example|Drawing/u)).toBeVisible({
    timeout: 15_000,
  });
  await expect.poll(() => page.locator(".active-chart .gg-title").textContent()).not.toBe("");
});

test("pipeline-failing shared links restore truthful URL and keep last valid chart", async ({
  page,
}) => {
  await page.goto(`/playground${PIPELINE_FAILURE_FRAGMENT}`);
  await expect(page.getByRole("alert").or(page.getByText(/palette|could not render/i))).toBeVisible(
    { timeout: 15_000 },
  );
  await expect(page).toHaveURL(/\/playground$/u);
  await expect(page.locator(".active-chart .gg-title")).toBeVisible();
});

test("share owns only the fragment, preserves query state, and Back/Forward restores charts", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/playground?theme=dark");
  await settleVisualState(page);

  // Promote a custom shared chart via hash navigation rather than hand-editing.
  await page.goto(`/playground?theme=dark${SHARED_EDIT_FRAGMENT}`);
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Shared edit", {
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Share this chart" }).click();
  await expect(page).toHaveURL(/\/playground\?theme=dark#play=v1\./u);

  await page.goBack();
  // May land on seeded or prior entry.
  await expect(page).toHaveURL(/\/playground\?theme=dark/);

  await page.goForward();
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Shared edit", {
    timeout: 15_000,
  });
});

test("custom agent chart requires confirm before sample load", async ({ page }) => {
  await installCandidatePhaseLog(page);
  await page.goto("/playground");
  await settleVisualState(page);

  await page.getByRole("button", { name: "Interactive scatterplot" }).click();
  await expect
    .poll(async () =>
      (await candidatePhaseLog(page)).some((e) => e.origin === "agent" && e.phase === "promoted"),
    )
    .toBe(true);

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Monthly line" }).click();
  // Still the agent chart title
  await expect(page.locator(".active-chart .gg-title")).toContainText(/Penguin/u);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Monthly line" }).click();
  await expect(page.getByText("Rendered monthly-line.")).toBeVisible();
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Monthly series");
});

test("denied clipboard shows truthful share fallback text", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) },
    });
  });
  await page.goto("/playground");
  await settleVisualState(page);
  await page.getByRole("button", { name: "Share this chart" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /Share link selected|Clipboard unavailable/u })
      .first(),
  ).toBeVisible();
});

test("playground is chart-first, operable, and axe-clean at a touch-size viewport", async ({
  page,
}) => {
  await page.addInitScript({ content: axe.source });
  const viewport = { width: 390, height: 844 };
  await page.setViewportSize(viewport);
  await page.goto("/playground");
  await settleVisualState(page);

  await expect(page.locator(".active-chart")).toBeVisible();
  await expect(page.getByLabel("Rewrite this chart")).toBeVisible();
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  // Chart-first is a layout claim, not a slogan (#708): the chart's top edge
  // must land inside the first screen, and the browse catalogue sits BELOW it.
  const layout = await page.evaluate(() => {
    const top = (selector: string): number => {
      const element = document.querySelector(selector);
      return element === null ? Number.NaN : element.getBoundingClientRect().top + window.scrollY;
    };
    return { chart: top(".active-chart"), browse: top(".quiet-links") };
  });
  expect(layout.chart).toBeLessThan(viewport.height);
  expect(layout.browse).toBeGreaterThan(layout.chart);
  // Every example and sample stays in the DOM and clickable, just lower down.
  for (const name of ["Raw years", "ISO dates", "Ambiguous dates"]) {
    const box = await page
      .locator(".quiet-links")
      .getByRole("button", { name, exact: true })
      .boundingBox();
    expect(box, name).not.toBeNull();
    expect(box!.height, name).toBeGreaterThanOrEqual(44);
  }
  // Primary controls must meet 44px; skip icon-only copy buttons inside CodeTabs.
  for (const name of ["Generate", "Share this chart", "Download SVG", "Inspect"]) {
    const box = await page.getByRole("button", { name, exact: true }).first().boundingBox();
    expect(box, name).not.toBeNull();
    expect(box!.height, name).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share this chart" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy code" })).toBeVisible();
  await expect(page.locator("details.event-inspector")).toBeVisible();

  const violations = await page.evaluate(async () => {
    const runner = (globalThis as typeof globalThis & { axe: typeof axe }).axe;
    return (await runner.run(document.querySelector(".playground")!)).violations.map(
      ({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => node.target.join(" ")),
      }),
    );
  });
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});
