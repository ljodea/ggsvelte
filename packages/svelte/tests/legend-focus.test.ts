import { describe, expect, it } from "vitest";

import CoincidentLegendFocusPlot from "./fixtures/CoincidentLegendFocusPlot.svelte";
import LinkedLegendFocusPlot from "./fixtures/LinkedLegendFocusPlot.svelte";
import LegendClearGeometryPlot from "./fixtures/LegendClearGeometryPlot.svelte";
import LocalLegendFocusPlot from "./fixtures/LocalLegendFocusPlot.svelte";
import { expectAccessible } from "./helpers/accessibility.js";
import { render } from "./helpers/render.js";
import { GGPlot } from "../src/lib/index.js";
import type { LegendFocusEvent } from "../src/lib/index.js";
import { until } from "./helpers/until.js";

function state(container: HTMLElement): DOMStringMap {
  return container.querySelector<HTMLElement>("[data-legend-state]")!.dataset;
}

function afterFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

function lastEvent(element: HTMLElement): Record<string, unknown> {
  const parsed: unknown = JSON.parse(element.dataset["lastEvent"] ?? "null");
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    throw new TypeError("Expected a legend event object");
  return parsed as Record<string, unknown>;
}

function overlaps(left: DOMRect, right: DOMRect): boolean {
  return !(
    left.right <= right.left ||
    left.left >= right.right ||
    left.bottom <= right.top ||
    left.top >= right.bottom
  );
}

describe("linked legend focus", () => {
  it("maps encoded legend values to stable row keys with one transition and no rerun", async () => {
    const { container } = render(LinkedLegendFocusPlot);
    await until(() => container.querySelectorAll("[data-plot-a] .gg-legend-target").length === 2);
    const before = {
      rendersA: state(container)["rendersA"],
      rendersB: state(container)["rendersB"],
      rendersC: state(container)["rendersC"],
    };
    const north = container.querySelectorAll<HTMLButtonElement>(
      "[data-plot-a] .gg-legend-target",
    )[0];
    const target = north.getBoundingClientRect();
    expect(
      document.elementFromPoint(target.left + target.width / 2, target.top + target.height / 2),
    ).toBe(north);
    north.click();
    await until(() => state(container)["transitions"] === "1");

    expect(state(container)["emphasized"]).toBe("a,c");
    expect(state(container)["emphasized"]).not.toContain("north");
    expect(state(container)["callbacksA"]).toBe("1");
    expect(state(container)["callbacksB"]).toBe("0");
    expect(state(container)["callbacksC"]).toBe("0");
    expect(state(container)["rendersA"]).toBe(before["rendersA"]);
    expect(state(container)["rendersB"]).toBe(before["rendersB"]);
    expect(state(container)["rendersC"]).toBe(before["rendersC"]);
    expect(container.querySelectorAll("[data-plot-a] [data-gg-focused='true']")).toHaveLength(2);
    expect(container.querySelectorAll("[data-plot-c] [data-gg-focused='true']")).toHaveLength(2);
    expect(container.querySelectorAll("[data-plot-other] [data-gg-focused]")).toHaveLength(0);

    north.click();
    await until(() => state(container)["transitions"] === "2");
    expect(state(container)["emphasized"]).toBe("");
    await expectAccessible(container);
  });

  it("previews without mutating the shared controller", async () => {
    const { container } = render(LinkedLegendFocusPlot);
    const north = container.querySelector<HTMLButtonElement>("[data-plot-a] .gg-legend-target")!;
    north.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await until(
      () => container.querySelectorAll("[data-plot-a] [data-gg-focused='true']").length === 2,
    );
    expect(state(container)["transitions"]).toBe("0");
    expect(state(container)["emphasized"]).toBe("");
    expect(container.querySelectorAll("[data-plot-b] [data-gg-focused]")).toHaveLength(0);
    north.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    await until(() => container.querySelectorAll("[data-plot-a] [data-gg-focused]").length === 0);
  });

  it("uses deterministic non-wrapping roving focus and supports Enter, Space, and Escape", async () => {
    const { container } = render(LinkedLegendFocusPlot);
    await until(() => container.querySelectorAll("[data-plot-a] .gg-legend-target").length === 2);
    const targets = [
      ...container.querySelectorAll<HTMLButtonElement>("[data-plot-a] .gg-legend-target"),
    ];
    const [north, south] = targets as [HTMLButtonElement, HTMLButtonElement];

    expect(targets.map((target) => target.tabIndex)).toEqual([0, -1]);
    north.focus();
    north.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(document.activeElement).toBe(north);

    north.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    await until(() => document.activeElement === south);
    expect(targets.map((target) => target.tabIndex)).toEqual([-1, 0]);
    south.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(south);

    south.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await until(() => state(container)["emphasized"] === "b");
    expect(south.getAttribute("aria-pressed")).toBe("true");

    south.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    await until(() => document.activeElement === north);
    north.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await until(() => state(container)["emphasized"] === "a,c");
    expect(north.getAttribute("aria-pressed")).toBe("true");

    north.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await until(() => state(container)["emphasized"] === "");
    expect(north.getAttribute("aria-pressed")).toBe("false");
  });

  it("commits one touch activation and suppresses its compatibility click", async () => {
    const { container } = render(LinkedLegendFocusPlot);
    await until(() => container.querySelectorAll("[data-plot-a] .gg-legend-target").length === 2);
    const targets = [
      ...container.querySelectorAll<HTMLButtonElement>("[data-plot-a] .gg-legend-target"),
    ];
    const [north, south] = targets as [HTMLButtonElement, HTMLButtonElement];

    south.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" }),
    );
    south.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" }),
    );
    south.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

    await until(() => state(container)["emphasized"] === "b");
    expect(state(container)["transitions"]).toBe("1");
    expect(south.getAttribute("aria-pressed")).toBe("true");

    // Suppress must clear: a subsequent real click must still activate.
    north.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => state(container)["emphasized"] === "a,c");
    expect(state(container)["transitions"]).toBe("2");
    expect(north.getAttribute("aria-pressed")).toBe("true");
  });

  it("cancels a touch sequence without committing emphasis", async () => {
    const { container } = render(LinkedLegendFocusPlot);
    await until(() => container.querySelectorAll("[data-plot-a] .gg-legend-target").length === 2);
    const south = container.querySelectorAll<HTMLButtonElement>(
      "[data-plot-a] .gg-legend-target",
    )[1];

    south.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 8, pointerType: "touch" }),
    );
    south.dispatchEvent(
      new PointerEvent("pointercancel", { bubbles: true, pointerId: 8, pointerType: "touch" }),
    );
    south.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 8, pointerType: "touch" }),
    );
    await afterFrame();

    expect(state(container)["transitions"]).toBe("0");
    expect(state(container)["emphasized"]).toBe("");
    expect(south.getAttribute("aria-pressed")).toBe("false");
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

  it("diagnoses a missing stable key without exposing inert legend controls", async () => {
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

    await until(() =>
      diagnostics.some((diagnostic) => diagnostic.code === "INTERACTION_LEGEND_REQUIRES_KEY"),
    );
    expect(container.querySelector(".gg-legend-target")).toBeNull();
    expect(container.querySelector(".gg-capture")).toBeNull();
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
        prop: "legendFocus",
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

describe("chart-local legend focus", () => {
  it("commits and clears without a controller, emitting stable keys without rerunning", async () => {
    const { container } = render(LocalLegendFocusPlot);
    await until(() => container.querySelectorAll(".gg-legend-target").length === 2);
    const stateElement = container.querySelector<HTMLElement>("[data-local-legend-state]")!;
    const rendersBefore = stateElement.dataset["renders"];
    const north = container.querySelector<HTMLButtonElement>(".gg-legend-target")!;

    north.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => container.querySelectorAll("[data-gg-focused='true']").length === 2);
    expect(north.getAttribute("aria-pressed")).toBe("true");
    expect(JSON.parse(stateElement.dataset["lastEvent"]!)).toMatchObject({
      type: "legend-focus",
      phase: "change",
      state: "committed",
      source: "pointer",
      scale: "color",
      value: "north",
      label: "north",
      keys: ["a", "c"],
    });

    const clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    expect(clear.getAttribute("aria-label")).toBe("Clear legend focus");
    clear.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => container.querySelectorAll("[data-gg-focused]").length === 0);
    expect(document.activeElement).toBe(north);
    expect(JSON.parse(stateElement.dataset["lastEvent"]!)).toMatchObject({
      type: "legend-focus",
      phase: "clear",
      source: "pointer",
    });
    expect(stateElement.dataset["renders"]).toBe(rendersBefore);
  });

  it("reports keyboard, pointer, and touch activation sources accurately", async () => {
    const { container } = render(LocalLegendFocusPlot);
    await until(() => container.querySelectorAll(".gg-legend-target").length === 2);
    const stateElement = container.querySelector<HTMLElement>("[data-local-legend-state]")!;
    const north = container.querySelector<HTMLButtonElement>(".gg-legend-target")!;

    north.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await until(() => stateElement.dataset["lastEvent"] !== "");
    expect(lastEvent(stateElement)["source"]).toBe("keyboard");
    let clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    clear.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    await until(() => lastEvent(stateElement)["phase"] === "clear");
    expect(lastEvent(stateElement)["source"]).toBe("keyboard");

    north.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => lastEvent(stateElement)["phase"] === "change");
    expect(lastEvent(stateElement)["source"]).toBe("pointer");
    clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    clear.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    clear.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => lastEvent(stateElement)["phase"] === "clear");
    expect(lastEvent(stateElement)["source"]).toBe("pointer");

    north.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 9, pointerType: "touch" }),
    );
    north.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 9, pointerType: "touch" }),
    );
    await until(() => lastEvent(stateElement)["phase"] === "change");
    expect(lastEvent(stateElement)["source"]).toBe("touch");
    clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    clear.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 10, pointerType: "touch" }),
    );
    clear.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => lastEvent(stateElement)["phase"] === "clear");
    expect(lastEvent(stateElement)["source"]).toBe("touch");
  });

  it("places the 44px recovery target outside every legend, title, and legend target", async () => {
    const { container } = render(LegendClearGeometryPlot);
    await until(() => container.querySelectorAll(".gg-legend-target").length === 4);
    container
      .querySelector<HTMLButtonElement>(".gg-legend-target")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => container.querySelector(".gg-legend-clear") !== null);

    const clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    const clearBounds = clear.getBoundingClientRect();
    expect(clearBounds.width).toBeGreaterThanOrEqual(44);
    expect(clearBounds.height).toBeGreaterThanOrEqual(44);
    const protectedElements = container.querySelectorAll<SVGGraphicsElement | HTMLButtonElement>(
      ".gg-legend, .gg-title, .gg-subtitle, .gg-legend-target",
    );
    for (const element of protectedElements)
      expect(overlaps(clearBounds, element.getBoundingClientRect())).toBe(false);
    expect(
      document.elementFromPoint(
        clearBounds.left + clearBounds.width / 2,
        clearBounds.top + clearBounds.height / 2,
      ),
    ).toBe(clear);
  });
});

describe("legend focus precedence", () => {
  it("does not infer a pressed legend when color and fill entries have identical keys", async () => {
    const { container } = render(CoincidentLegendFocusPlot);
    await until(() => container.querySelectorAll(".gg-legend-target").length === 4);
    const targets = [...container.querySelectorAll<HTMLButtonElement>(".gg-legend-target")];
    expect(targets.map((target) => target.getAttribute("aria-label"))).toEqual([
      "group: north (color legend)",
      "group: south (color legend)",
      "group: north (fill legend)",
      "group: south (fill legend)",
    ]);

    container.querySelector<HTMLButtonElement>("[data-external-focus]")!.click();
    await until(() => container.querySelectorAll("[data-gg-focused='true']").length === 2);
    expect(targets.map((target) => target.getAttribute("aria-pressed"))).toEqual([
      "false",
      "false",
      "false",
      "false",
    ]);

    container.querySelector<HTMLButtonElement>("[data-external-clear]")?.click();
    targets[2].click();
    await until(() => targets[2].getAttribute("aria-pressed") === "true");
    expect(targets.map((target) => target.getAttribute("aria-pressed"))).toEqual([
      "false",
      "false",
      "true",
      "false",
    ]);
  });

  it("keeps legend focus committed while an inspected muted mark is presented on top", async () => {
    const { container } = render(CoincidentLegendFocusPlot);
    await until(() => container.querySelectorAll(".gg-legend-target").length === 4);
    const north = container.querySelector<HTMLButtonElement>(
      ".gg-legend-target[aria-label='group: north (color legend)']",
    )!;
    north.click();
    await until(() => container.querySelectorAll("[data-gg-focused='true']").length === 2);
    const southMark = container.querySelector<SVGGraphicsElement>("[data-gg-focused='false']")!;
    const markBounds = southMark.getBoundingClientRect();
    const capture = container.querySelector<HTMLElement>(".gg-capture")!;
    capture.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: markBounds.left + markBounds.width / 2,
        clientY: markBounds.top + markBounds.height / 2,
        pointerType: "mouse",
      }),
    );

    await until(() => container.querySelector(".gg-tooltip") !== null);
    await until(() => southMark.dataset.ggFocused === "true");
    expect(north.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".gg-hover-ring")).not.toBeNull();
    expect(container.querySelectorAll("[data-gg-focused='true']")).toHaveLength(3);

    capture.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    await until(() => container.querySelector(".gg-tooltip") === null);
    await until(() => southMark.dataset.ggFocused === "false");
    expect(north.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-gg-focused='true']")).toHaveLength(2);
  });
});
