import { describe, expect, it } from "vitest";
import { withGrammarAsSpec } from "../helpers/ggplot-input.js";

import { render } from "../helpers/render.js";
import { GGPlot } from "../../src/lib/index.js";
import type { LegendFocusEvent } from "../../src/lib/index.js";
import { until } from "../helpers/until.js";

function afterFrame(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  requestAnimationFrame(() => {
    resolve();
  });
  return promise;
}

describe("style legend focus", () => {
  it("focuses finite shape entries by semantic source value", async () => {
    const events: LegendFocusEvent[] = [];
    const { container } = render(
      GGPlot,
      withGrammarAsSpec({
        data: [
          { id: "north", x: 1, y: 2, group: "North" },
          { id: "south", x: 2, y: 3, group: "South" },
        ],
        aes: { x: "x", y: "y", shape: "group" },
        layers: [{ geom: "point" }],
        scales: { shape: { type: "ordinal", range: ["circle", "triangle"] } },
        key: "id",
        legendFocus: true,
        width: 640,
        height: 400,
        onlegendfocus: (event: LegendFocusEvent) => events.push(event),
      }),
    );
    await until(() => container.querySelectorAll(".gg-legend-target").length === 2);
    container.querySelector<HTMLButtonElement>(".gg-legend-target")!.click();
    await until(() => events.length === 1);

    expect(events[0]).toMatchObject({
      type: "legend-focus",
      phase: "change",
      state: "committed",
      scale: "shape",
      value: "North",
      keys: ["north"],
    });
    expect(container.querySelectorAll("[data-gg-focused='true']")).toHaveLength(1);
  });
});

describe("legend focus capability edges", () => {
  const rows = [
    { id: "a", x: 1, y: 4, group: "north" },
    { id: "b", x: 2, y: 2, group: "south" },
    { id: "c", x: 3, y: 3, group: "north" },
  ];

  it("does not add the inspection capture surface for legend-only interaction", async () => {
    const interactions: Array<{ type: string }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" }],
      key: "id",
      legendFocus: true,
      oninteraction: (event: { type: string }) => interactions.push(event),
      width: 360,
      height: 260,
    });

    await until(() => container.querySelectorAll(".gg-legend-target").length === 2);
    expect(container.querySelector(".gg-capture")).toBeNull();
    expect(container.querySelector(".gg-tooltip")).toBeNull();
    expect(interactions).toEqual([]);
  });

  it("enables legend focus without an explicit key when rows carry id", async () => {
    const diagnostics: Array<{ code: string }> = [];
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" }],
      legendFocus: true,
      ondiagnostic: (diagnostic: { code: string }) => diagnostics.push(diagnostic),
      width: 360,
      height: 260,
    });

    await until(() => container.querySelectorAll(".gg-legend-target").length === 2);
    expect(
      diagnostics.some((diagnostic) => diagnostic.code === "INTERACTION_LEGEND_REQUIRES_KEY"),
    ).toBe(false);
    expect(container.querySelector(".gg-capture")).toBeNull();
  });

  it("enables legend focus without an explicit key via row-index default", async () => {
    const diagnostics: Array<{ code: string }> = [];
    const { container } = render(GGPlot, {
      data: [
        { x: 1, y: 2, group: "North" },
        { x: 2, y: 3, group: "South" },
      ],
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" }],
      legendFocus: true,
      ondiagnostic: (diagnostic: { code: string }) => diagnostics.push(diagnostic),
      width: 360,
      height: 260,
    });

    await until(() => container.querySelectorAll(".gg-legend-target").length === 2);
    expect(
      diagnostics.some((diagnostic) => diagnostic.code === "INTERACTION_LEGEND_REQUIRES_KEY"),
    ).toBe(false);
  });

  it("keeps hover and DOM focus inert when preview is disabled", async () => {
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" }],
      key: "id",
      legendFocus: { preview: false },
      width: 360,
      height: 260,
    });
    await until(() => container.querySelectorAll(".gg-legend-target").length === 2);
    const north = container.querySelector<HTMLButtonElement>(".gg-legend-target")!;

    north.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));
    north.focus();
    await afterFrame();
    expect(container.querySelectorAll("[data-gg-focused]")).toHaveLength(0);

    north.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => container.querySelectorAll("[data-gg-focused='true']").length === 2);
    expect(north.getAttribute("aria-pressed")).toBe("true");
  });

  it("delivers the discrete-only advisory through the public diagnostic callback", async () => {
    const diagnostics: Array<{ code: string; prop: string; actual?: unknown }> = [];
    const { container } = render(GGPlot, {
      data: rows.map((row, index) => ({ ...row, score: index + 0.5 })),
      aes: { x: "x", y: "y", color: "score" },
      layers: [{ geom: "point" }],
      key: "id",
      legendFocus: true,
      ondiagnostic: (diagnostic: { code: string; prop: string; actual?: unknown }) =>
        diagnostics.push(diagnostic),
      width: 360,
      height: 260,
    });

    await until(() =>
      diagnostics.some((diagnostic) => diagnostic.code === "INTERACTION_LEGEND_DISCRETE_ONLY"),
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: "INTERACTION_LEGEND_DISCRETE_ONLY",
        prop: "focus",
        actual: ["ramp"],
      }),
    );
    expect(container.querySelector(".gg-legend-ramp")).not.toBeNull();
    expect(container.querySelector(".gg-legend-target")).toBeNull();
  });

  it("keeps memberships from two fields sharing one scale", async () => {
    let lastKeys: readonly PropertyKey[] = [];
    const data = rows.map((row, index) => ({
      ...row,
      cohort: index === 1 ? "beta" : "alpha",
    }));
    const { container } = render(GGPlot, {
      data,
      aes: { x: "x", y: "y" },
      layers: [
        { geom: "point", aes: { color: "group" } },
        { geom: "point", aes: { color: "cohort" } },
      ],
      key: "id",
      legendFocus: true,
      onlegendfocus: (event: LegendFocusEvent) => {
        if (event.phase === "change" && event.state === "committed") lastKeys = event.keys;
      },
      width: 420,
      height: 280,
    });
    await until(() => container.querySelectorAll(".gg-legend-target").length === 4);
    const alpha = [...container.querySelectorAll<HTMLButtonElement>(".gg-legend-target")].find(
      (target) => target.getAttribute("aria-label")?.includes(": alpha ") === true,
    );
    expect(alpha).not.toBeUndefined();
    alpha?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => lastKeys.length === 2);
    expect(lastKeys).toEqual(["a", "c"]);
  });

  it("keeps one tab stop and restores focus when reactive data removes entries", async () => {
    const view = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" }],
      key: "id",
      legendFocus: true,
      width: 360,
      height: 260,
    });
    await until(() => view.container.querySelectorAll(".gg-legend-target").length === 2);
    const original = [...view.container.querySelectorAll<HTMLButtonElement>(".gg-legend-target")];
    original[1].focus();
    original[1].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));

    await view.rerender({ data: [rows[0], rows[2]] });
    await until(() => view.container.querySelectorAll(".gg-legend-target").length === 1);
    const remaining = view.container.querySelector<HTMLButtonElement>(".gg-legend-target")!;
    await until(() => document.activeElement === remaining);
    expect(remaining.tabIndex).toBe(0);
  });

  it("clears chart-local committed identity when its legend entry disappears", async () => {
    const view = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" }],
      key: "id",
      legendFocus: true,
      width: 360,
      height: 260,
    });
    await until(() => view.container.querySelectorAll(".gg-legend-target").length === 2);
    view.container
      .querySelector<HTMLButtonElement>(".gg-legend-target")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => view.container.querySelectorAll("[data-gg-focused='true']").length === 2);

    await view.rerender({ data: [rows[1]] });
    await until(() => view.container.querySelectorAll(".gg-legend-target").length === 1);
    await until(() => view.container.querySelectorAll("[data-gg-focused]").length === 0);
    expect(view.container.querySelector(".gg-legend-clear")).toBeNull();
    expect(
      view.container
        .querySelector<HTMLButtonElement>(".gg-legend-target")
        ?.getAttribute("aria-pressed"),
    ).toBe("false");
  });
});
