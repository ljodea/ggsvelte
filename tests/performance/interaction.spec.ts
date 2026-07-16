import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface InteractionBudgets {
  version: 2;
  warmupOperations: number;
  operationsPerSample: number;
  samples: number;
  pointerDispatchP95Ms: number;
  legendWarmupOperations: number;
  legendOperationsPerSample: number;
  legendSamples: number;
  legendNavigationP95Ms: number;
  threeViewPropagationP95Ms: number;
}

const budgets = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../benchmarks/interaction-budgets.json"), "utf8"),
) as InteractionBudgets;

function median(values: readonly number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

test("100k-candidate public inspection meets the reviewed 50/500 × 5 p50/p95 gate", async ({
  page,
}) => {
  expect(budgets).toMatchObject({
    warmupOperations: 50,
    operationsPerSample: 500,
    samples: 5,
  });
  await page.goto("/__perf/interaction-100k");
  await expect(page.locator('.gg-plot-root[data-gg-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  const fixture = page.locator("[data-interaction-perf-fixture]");
  await expect(fixture).toHaveAttribute("data-candidate-count", "100000");
  await expect(fixture).toHaveAttribute("data-grouped-member-count", "1000");
  await expect(fixture).toHaveAttribute("data-pipeline-commits", "1");

  const metrics = await page.locator(".gg-capture").evaluate((capture, config) => {
    const bounds = capture.getBoundingClientRect();
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const dispatch = () => {
      capture.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId: 41,
          pointerType: "mouse",
          clientX: x,
          clientY: y,
        }),
      );
    };
    for (let index = 0; index < config.warmupOperations; index++) dispatch();
    const samples: Array<{ p50: number; p95: number }> = [];
    for (let sample = 0; sample < config.samples; sample++) {
      const timings: number[] = [];
      for (let operation = 0; operation < config.operationsPerSample; operation++) {
        const started = performance.now();
        dispatch();
        timings.push(performance.now() - started);
      }
      timings.sort((a, b) => a - b);
      samples.push({
        p50: timings[Math.floor(timings.length * 0.5)]!,
        p95: timings[Math.floor(timings.length * 0.95)]!,
      });
    }
    return {
      samples,
      ready: document.querySelector<HTMLElement>(".gg-plot-root")?.dataset["ggReady"],
    };
  }, budgets);

  expect(metrics.ready).toBe("true");
  expect(metrics.samples).toHaveLength(5);
  expect(metrics.samples.every(({ p50, p95 }) => p50 >= 0 && p95 >= p50)).toBe(true);
  const aggregateP50 = median(metrics.samples.map(({ p50 }) => p50));
  const aggregateP95 = median(metrics.samples.map(({ p95 }) => p95));
  test.info().annotations.push({
    type: "interaction-performance",
    description: `p50 ${aggregateP50.toFixed(3)}ms; p95 ${aggregateP95.toFixed(3)}ms`,
  });
  expect(aggregateP95).toBeLessThan(budgets.pointerDispatchP95Ms);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      }),
  );
  await expect(fixture).toHaveAttribute("data-pipeline-commits", "1");
});

test("100k legend navigation and three-view focus propagation meet separate gates", async ({
  page,
}) => {
  await page.goto("/__perf/legend-focus-100k");
  await expect(page.locator('.gg-plot-root[data-gg-ready="true"]')).toHaveCount(4, {
    timeout: 30_000,
  });
  const fixture = page.locator("[data-legend-perf-fixture]");
  await expect(fixture).toHaveAttribute("data-row-count", "100000");
  await expect(fixture).toHaveAttribute("data-linked-row-count", "1000");
  await expect(fixture).toHaveAttribute("data-commits-a", "1");
  await expect(fixture).toHaveAttribute("data-commits-b", "1");
  await expect(fixture).toHaveAttribute("data-commits-c", "1");

  const navigation = await page
    .locator('[data-perf-plot="navigation"] .gg-legend-target')
    .first()
    .evaluate((first, config) => {
      const timings: number[] = [];
      (first as HTMLButtonElement).focus();
      for (let index = 0; index < config.legendWarmupOperations; index++)
        first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      for (let index = 0; index < config.legendOperationsPerSample; index++) {
        const started = performance.now();
        first.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: index % 2 === 0 ? "End" : "Home",
            bubbles: true,
          }),
        );
        timings.push(performance.now() - started);
      }
      return timings.toSorted((a, b) => a - b)[Math.floor(timings.length * 0.95)]!;
    }, budgets);
  expect(navigation).toBeLessThan(budgets.legendNavigationP95Ms);

  const propagationSamples = await page.evaluate(async (config) => {
    const fixtureElement = document.querySelector<HTMLElement>("[data-legend-perf-fixture]");
    const buttons = document.querySelectorAll<HTMLButtonElement>(
      '[data-perf-plot="A"] .gg-legend-target',
    );
    if (!fixtureElement || buttons.length < 2)
      throw new Error("Legend performance fixture is incomplete");

    const commit = async (button: HTMLButtonElement): Promise<number> => {
      const expectedRevision = String(Number(fixtureElement.dataset["revision"]) + 1);
      const completed = new Promise<void>((resolve) => {
        const observer = new MutationObserver(() => {
          if (fixtureElement.dataset["revision"] !== expectedRevision) return;
          observer.disconnect();
          resolve();
        });
        observer.observe(fixtureElement, {
          attributes: true,
          attributeFilter: ["data-revision"],
        });
      });
      const started = performance.now();
      button.click();
      await completed;
      return performance.now() - started;
    };

    const samples: number[] = [];
    for (let sample = 0; sample < config.legendSamples; sample++) {
      const timings: number[] = [];
      for (let operation = 0; operation < config.legendOperationsPerSample; operation++)
        timings.push(await commit(buttons[operation % 2]!));
      timings.sort((a, b) => a - b);
      samples.push(timings[Math.floor(timings.length * 0.95)]!);
    }
    return samples;
  }, budgets);
  const propagationP95 = median(propagationSamples);
  test.info().annotations.push({
    type: "legend-performance",
    description: `navigation p95 ${navigation.toFixed(3)}ms; three-view propagation p95 ${propagationP95.toFixed(3)}ms`,
  });
  expect(propagationP95).toBeLessThan(budgets.threeViewPropagationP95Ms);
  await expect(fixture).toHaveAttribute("data-commits-a", "1");
  await expect(fixture).toHaveAttribute("data-commits-b", "1");
  await expect(fixture).toHaveAttribute("data-commits-c", "1");
});
