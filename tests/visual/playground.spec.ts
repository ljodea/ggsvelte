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

async function readSpec(page: Page): Promise<Record<string, unknown>> {
  return JSON.parse(await page.getByLabel("PortableSpec JSON").inputValue()) as Record<
    string,
    unknown
  >;
}

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

async function applyTitle(page: Page, title: string): Promise<void> {
  const spec = await readSpec(page);
  spec["labs"] = { ...(spec["labs"] as Record<string, unknown> | undefined), title };
  await page.getByLabel("PortableSpec JSON").fill(JSON.stringify(spec, null, 2));
  await page.getByRole("button", { name: "Apply draft" }).click();
  await expect(page.getByText("Rendered custom draft.")).toBeVisible();
}

test("landing page makes the gallery and local adaptation paths obvious", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Example source" })).toHaveAttribute(
    "href",
    /examples\/interactions\/inspection$/,
  );
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

test("compatible gallery details open the exact fragment while oversized examples explain why", async ({
  page,
}) => {
  await page.goto("/examples/point/scatter-color");
  const handoff = page.getByRole("link", { name: "Open in Playground" });
  await expect(handoff).toHaveAttribute("href", /\/playground#play=v1\.[A-Za-z0-9_-]+$/u);
  await handoff.click();
  await expect(page).toHaveURL(/\/playground#play=v1\./u);
  await expect(page.getByText("Rendered point/scatter-color.")).toBeVisible();
  await expect(page.getByLabel("PortableSpec JSON")).toHaveValue(/Penguin flippers vs body mass/u);

  await page.goto("/examples/point/canvas-scatter");
  await expect(page.getByRole("link", { name: "Open in Playground" })).toHaveCount(0);
  await expect(page.getByText(/more than 500 inline rows/u)).toBeVisible();
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

test("valid edits render before Svelte copy becomes available and candidates stay inert", async ({
  page,
}) => {
  await installCandidatePhaseLog(page);
  await page.goto("/playground");
  await settleVisualState(page);
  await expect(page.getByRole("button", { name: "Copy Svelte" })).toBeEnabled();
  // Capture the active-chart element identity before apply. Promotion must not
  // replace this node while the candidate is pending (Svelte may rewrite attrs).
  await page.locator(".active-chart").evaluate((node) => {
    (
      window as typeof window & { playgroundRetainedActive?: Element | null }
    ).playgroundRetainedActive = node;
    (node as HTMLElement).dataset["retainedDuringCandidate"] = "true";
  });

  const before = await candidatePhaseLog(page);
  const spec = await readSpec(page);
  spec["labs"] = { ...(spec["labs"] as Record<string, unknown>), title: "Edited locally" };
  await page.getByLabel("PortableSpec JSON").fill(JSON.stringify(spec, null, 2));
  await expect(page.getByRole("button", { name: "Copy Svelte" })).toBeDisabled();
  await page.getByRole("button", { name: "Apply draft" }).click();

  await expect
    .poll(async () => {
      const log = await candidatePhaseLog(page);
      return log.find(
        (entry, index) =>
          index >= before.length && entry.phase === "pending" && entry.origin === "apply",
      )?.generation;
    })
    .toEqual(expect.any(Number));

  const generation = (await candidatePhaseLog(page)).find(
    (entry, index) =>
      index >= before.length && entry.phase === "pending" && entry.origin === "apply",
  )!.generation;
  const phases = await waitForGenerationTerminal(page, generation);
  expect(phases.map((entry) => entry.phase)).toEqual(["pending", "ready", "promoted"]);
  expect(phases[1]?.isolation).toMatchObject({
    inert: true,
    inertAttribute: true,
    ariaHidden: "true",
    // Last-valid active chart content retained while candidate paints.
    activeTitle: "Penguin flippers and body mass",
  });
  // Identity probe: the pre-apply .active-chart node must still be mounted at ready.
  expect(phases[1]?.isolation?.activeRetained).toBe(true);

  await expect(page.getByText("Rendered custom draft.")).toBeVisible();
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Edited locally");
  await expect(page.getByRole("button", { name: "Copy Svelte" })).toBeEnabled();
  await expect(page.getByLabel("Generated Svelte component")).toContainText(
    "const spec: PortableSpec",
  );
});

test("temporal samples expose privacy-safe guide plans and keep ambiguous dates discrete", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/playground");
  await settleVisualState(page);

  await page.getByLabel("Start from a sample").selectOption("raw-years");
  await expect(page.getByText("Rendered raw-years.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Axis plans" })).toBeVisible();
  await expect(page.getByText(/temporal · year/u)).toBeVisible();

  await page.getByRole("button", { name: "Copy privacy-safe scale report" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Copied a privacy-safe" })).toBeVisible();
  const report = await page.evaluate(() => navigator.clipboard.readText());
  const serialized = report.toLowerCase();
  expect(JSON.parse(report)).toMatchObject({
    decisions: [{ aesthetic: "x", status: "temporal", parser: "year", precision: "year" }],
    guides: expect.any(Array),
  });
  expect(serialized).not.toContain('"data"');
  expect(serialized).not.toContain('"field"');
  expect(serialized).not.toContain('"domain"');
  expect(serialized).not.toContain('"label"');
  expect(serialized).not.toContain("1835");

  await page.getByLabel("Start from a sample").selectOption("iso-dates");
  await expect(page.getByText("Rendered iso-dates.")).toBeVisible();
  await expect(page.getByText(/temporal · iso/u)).toBeVisible();

  await page.getByLabel("Start from a sample").selectOption("ambiguous-dates");
  await expect(page.getByText("Rendered ambiguous-dates.")).toBeVisible();
  await expect(page.getByText(/nominal · none/u)).toBeVisible();
});

test("axis-plan inspection supports multiple temporal decisions on one aesthetic", async ({
  page,
}) => {
  await page.goto("/playground");
  await settleVisualState(page);
  await page.getByLabel("PortableSpec JSON").fill(
    JSON.stringify({
      edition: 1,
      data: {
        values: [
          { group: "a", low: "2024-01-01", high: "2024-01-03" },
          { group: "b", low: "2024-02-01", high: "2024-02-04" },
        ],
      },
      layers: [
        {
          geom: "errorbar",
          stat: "identity",
          position: "identity",
          aes: {
            x: { field: "group" },
            ymin: { field: "low" },
            ymax: { field: "high" },
          },
        },
      ],
      scales: { y: { type: "time", parse: "ymd" } },
      labs: { title: "Temporal bounds", x: "Group", y: "Date" },
    }),
  );
  await page.getByRole("button", { name: "Apply draft" }).click();
  await expect(page.getByText("Rendered custom draft.")).toBeVisible();
  await expect(page.getByText(/temporal · ymd/u)).toHaveCount(2);
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

test("advanced outputs stay ordered and undo restores one render-confirmed snapshot", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/playground");
  await settleVisualState(page);
  await applyTitle(page, "First committed chart");
  await applyTitle(page, "Second committed chart");

  await expect(page.getByRole("tab")).toHaveText(["Svelte", "Builder", "PortableSpec"]);
  await page.getByRole("tab", { name: "Builder" }).click();
  await expect(page.getByLabel("Generated Builder output")).toContainText(
    'import { gg, type PortableSpec } from "@ggsvelte/svelte";',
  );
  await page.getByRole("button", { name: "Copy Builder" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("const built = gg(");
  await page.getByRole("tab", { name: "PortableSpec" }).click();
  await expect(page.getByLabel("Generated PortableSpec output")).toContainText(
    "Second committed chart",
  );
  await page.getByRole("button", { name: "Copy PortableSpec" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    '"title": "Second committed chart"',
  );

  await page.getByLabel("PortableSpec JSON").fill("draft to preserve before undo");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Undo chart" }).click();
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Second committed chart");
  await expect(page.getByLabel("PortableSpec JSON")).toHaveValue("draft to preserve before undo");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Undo chart" }).click();
  await expect(page.locator(".active-chart .gg-title")).toHaveText("First committed chart");
  await expect(page.getByLabel("PortableSpec JSON")).toHaveValue(/First committed chart/u);
  await expect(page.getByLabel("Generated PortableSpec output")).toContainText(
    "First committed chart",
  );
});

test("output copy fallback stays bound to the selected representation", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise((_resolve, reject) => {
            setTimeout(() => {
              reject(new DOMException("Denied", "NotAllowedError"));
            }, 1000);
          }),
      },
    });
  });
  await page.goto("/playground");
  await settleVisualState(page);
  const manualCopySource = page.locator(".manual-copy-source");
  await expect(manualCopySource).toHaveAttribute("aria-hidden", "true");
  await expect(manualCopySource.locator("pre")).toHaveAttribute("tabindex", "-1");
  const builderTab = page.getByRole("tab", { name: "Builder" });
  const portableTab = page.getByRole("tab", { name: "PortableSpec" });
  await builderTab.click();
  await page.getByRole("button", { name: "Copy Builder" }).evaluate((button: HTMLButtonElement) => {
    button.click();
  });
  await portableTab.evaluate((button: HTMLButtonElement) => {
    button.click();
  });
  await expect(builderTab).toHaveAttribute("aria-selected", "true");

  await expect(page.locator(".manual-copy-source.visible")).toContainText(
    'import { gg, type PortableSpec } from "@ggsvelte/svelte";',
  );
  await expect(page.locator(".manual-copy-source.visible")).toContainText(
    "Copy the selected Builder output manually",
  );
  expect(await page.evaluate(() => getSelection()?.toString())).toContain("const built = gg(");
  await portableTab.click();
  await expect(portableTab).toHaveAttribute("aria-selected", "true");

  await applyTitle(page, "Fallback invalidated by promotion");
  await expect(manualCopySource).toHaveAttribute("aria-hidden", "true");
  await expect(manualCopySource).not.toHaveClass(/visible/u);
  await expect(manualCopySource.locator("code")).toBeEmpty();
  expect(await page.evaluate(() => getSelection()?.toString() ?? "")).toBe("");
});

test("Builder output explains rather than lowers unsupported named datasets", async ({ page }) => {
  await page.goto("/playground");
  await settleVisualState(page);
  const spec = await readSpec(page);
  const data = spec["data"] as { values: unknown[] };
  spec["datasets"] = { rows: { values: data.values } };
  spec["data"] = { name: "rows" };
  await page.getByLabel("PortableSpec JSON").fill(JSON.stringify(spec, null, 2));
  await page.getByRole("button", { name: "Apply draft" }).click();
  await expect(page.getByText("Rendered custom draft.")).toBeVisible();

  await page.getByRole("tab", { name: "Builder" }).click();
  await expect(page.getByText("Builder output unavailable for this chart")).toBeVisible();
  await expect(page.getByText(/cannot preserve named inline datasets/u)).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy Builder" })).toBeDisabled();
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
  await expect(inspector).not.toHaveAttribute("open", "");
  await inspector.locator("summary").click();

  const chart = page.getByRole("group", {
    name: "Penguin flippers and body mass",
  });
  await chart.focus();
  await chart.press("ArrowRight");
  await expect(page.getByRole("list", { name: "Semantic event log" })).toContainText(
    "inspect/change",
  );
  await expect(
    page.getByRole("list", { name: "Semantic event log" }).locator("pre").first(),
  ).toContainText('"source": "keyboard"');

  await page.getByRole("button", { name: "Clear events" }).click();
  await expect(page.getByText("No semantic events yet.", { exact: false })).toBeVisible();

  await chart.press("ArrowRight");
  await expect(page.getByRole("list", { name: "Semantic event log" })).toBeVisible();
  await applyTitle(page, "Events reset on promotion");
  await expect(page.getByRole("list", { name: "Semantic event log" })).toHaveCount(0);
  await expect(page.getByText("No semantic events yet.", { exact: false })).toBeVisible();
});

test("schema and pipeline failures preserve and label the last render-confirmed chart", async ({
  page,
}) => {
  await page.goto("/playground");
  await settleVisualState(page);
  const baselineTitle = "Penguin flippers and body mass";
  const baselineSpec = await readSpec(page);
  await expect(page.locator(".active-chart .gg-title")).toHaveText(baselineTitle);

  await page.getByLabel("PortableSpec JSON").fill('{"layers":[]}');
  await page.getByRole("button", { name: "Apply draft" }).click();
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByRole("alert")).toContainText("validation");
  await expect(page.getByRole("alert")).toContainText("empty-layers");
  await expect(page.getByText("Last valid result", { exact: true })).toBeVisible();
  await expect(page.locator(".active-chart .gg-title")).toHaveText(baselineTitle);
  await expect(page.getByRole("button", { name: "Copy Svelte" })).toBeDisabled();

  await page.getByLabel("PortableSpec JSON").fill(JSON.stringify(baselineSpec, null, 2));
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByLabel("PortableSpec JSON").fill('{"layers":[]}');
  await page.getByRole("button", { name: "Apply draft" }).click();
  await expect(page.getByRole("alert")).toBeFocused();

  await page.getByLabel("PortableSpec JSON").fill(JSON.stringify(PIPELINE_FAILURE_SPEC, null, 2));
  await page.getByRole("button", { name: "Apply draft" }).click();
  await expect(page.getByRole("alert")).toContainText("pipeline");
  await expect(page.getByRole("alert")).toContainText("palette-exhausted");
  await expect(page.locator(".active-chart .gg-title")).toHaveText(baselineTitle);
  await expect(page.locator(".active-chart .gg-title")).not.toHaveText(
    "Must not replace the chart",
  );
});

test("share owns only the fragment, preserves query state, and Back/Forward restores complete charts", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/playground?theme=dark");
  await settleVisualState(page);
  await applyTitle(page, "Shared edit");
  await page.getByRole("button", { name: "Share this chart" }).click();

  await expect(page).toHaveURL(/\/playground\?theme=dark#play=v1\./u);
  await expect(page.getByRole("status").filter({ hasText: "Share link copied" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);

  const dirtySpec = await readSpec(page);
  dirtySpec["labs"] = { title: "Dirty unshared edit" };
  await page.getByLabel("PortableSpec JSON").fill(JSON.stringify(dirtySpec, null, 2));
  await expect(page.locator(".share-result")).toHaveCount(0);
  await expect(page).toHaveURL(/#play=v1\./u);

  await page.goBack();
  await expect(page).toHaveURL(/\/playground\?theme=dark$/u);
  await expect(page.locator(".active-chart .gg-title")).toHaveText(
    "Penguin flippers and body mass",
  );
  await expect(page.getByLabel("PortableSpec JSON")).not.toHaveValue(/Shared edit/u);
  await expect(page.locator(".share-result")).toHaveCount(0);

  await page.goForward();
  await expect(page).toHaveURL(/#play=v1\./u);
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Shared edit");
  await expect(page.getByLabel("PortableSpec JSON")).toHaveValue(/Shared edit/u);

  await applyTitle(page, "Unshared follow-up");
  await expect(page).toHaveURL(/\/playground\?theme=dark$/u);
  await expect(page.locator(".share-result")).toHaveCount(0);
});

test("render-failing initial and dirty history entries restore truthful URL and state", async ({
  page,
  context,
}) => {
  await page.goto(`/playground${PIPELINE_FAILURE_FRAGMENT}`);
  await expect(page.getByRole("alert")).toContainText("palette-exhausted");
  await expect(page).toHaveURL(/\/playground$/u);
  await expect(page.locator(".active-chart .gg-title")).toHaveText(
    "Penguin flippers and body mass",
  );

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await applyTitle(page, "Retained history chart");
  await page.getByRole("button", { name: "Share this chart" }).click();
  const retainedHash = new URL(page.url()).hash;
  await page.getByLabel("PortableSpec JSON").fill("dirty draft that must survive failure");

  await page.evaluate(
    ({ failing, retained }) => {
      history.pushState({}, "", failing);
      history.pushState({}, "", retained);
      history.back();
    },
    { failing: PIPELINE_FAILURE_FRAGMENT, retained: retainedHash },
  );
  await expect(page.getByRole("alert")).toContainText("palette-exhausted");
  await expect(page).toHaveURL(new RegExp(`${retainedHash.replaceAll(".", "\\.")}$`, "u"));
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Retained history chart");
  await expect(page.getByLabel("PortableSpec JSON")).toHaveValue(
    "dirty draft that must survive failure",
  );

  await page.goForward();
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Retained history chart");
  await expect(page.getByLabel("PortableSpec JSON")).toHaveValue(/Retained history chart/u);
});

test("dirty sample changes require explicit discard", async ({ page }) => {
  await page.goto("/playground");
  await page.getByLabel("PortableSpec JSON").fill("draft to keep");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByLabel("Start from a sample").selectOption("monthly-line");
  await expect(page.getByLabel("Start from a sample")).toHaveValue("starter-scatter");
  await expect(page.getByLabel("PortableSpec JSON")).toHaveValue("draft to keep");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Start from a sample").selectOption("monthly-line");
  await expect(page.getByText("Rendered monthly-line.")).toBeVisible();
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Monthly series");

  await applyTitle(page, "Custom work to preserve");
  await expect(page.getByLabel("Start from a sample")).toHaveValue("");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByLabel("Start from a sample").selectOption("starter-scatter");
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Custom work to preserve");
  await expect(page.getByLabel("PortableSpec JSON")).toHaveValue(/Custom work to preserve/u);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Start from a sample").selectOption("monthly-line");
  await expect(page.getByText("Rendered monthly-line.")).toBeVisible();
  await expect(page.locator(".active-chart .gg-title")).toHaveText("Monthly series");
});

test("denied clipboard selects the share URL with truthful fallback text", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) },
    });
  });
  await page.goto("/playground");
  await settleVisualState(page);
  await page.getByRole("button", { name: "Share this chart" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Share link selected" })).toContainText(
    "Clipboard unavailable. Share link selected for manual copy.",
  );
  expect(await page.evaluate(() => getSelection()?.toString())).toContain("#play=v1.");

  await page.getByRole("button", { name: "Copy privacy-safe scale report" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "scale report is selected" }),
  ).toBeVisible();
  expect(await page.evaluate(() => getSelection()?.toString())).toContain('"guides"');
});

test("playground is preview-first, operable, and axe-clean at a touch-size viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/playground");
  await settleVisualState(page);

  const preview = await page.locator(".preview-surface").boundingBox();
  const editor = await page.locator(".editor-surface").boundingBox();
  expect(preview?.y).toBeLessThan(editor?.y ?? 0);
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  for (const button of await page.getByRole("button").all()) {
    const box = await button.boundingBox();
    if (box !== null) expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByLabel("Start from a sample")).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply draft" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share this chart" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy Svelte" })).toBeVisible();
  await expect(page.locator("details.event-inspector")).not.toHaveAttribute("open", "");

  await page.addScriptTag({ content: axe.source });
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

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`Playground ${viewport.name} visual contract`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/playground");
    await settleVisualState(page);
    await expect(page).toHaveScreenshot(`docs-playground-${viewport.name}.png`, {
      fullPage: true,
    });
  });
}
