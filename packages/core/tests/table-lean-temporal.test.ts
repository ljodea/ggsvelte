import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { installTemporal } from "../src/install-temporal.ts";
import { runPipeline } from "../src/pipeline.ts";
import { ColumnTable } from "../src/table.ts";
import { getTemporalRuntime, resetTemporalRuntimeForTests } from "../src/temporal-runtime.ts";

/**
 * Lean `@ggsvelte/core/render` leaves the temporal runtime unset. Unit tests
 * preload the full runtime (bunfig), so this suite clears it and restores after.
 */
describe("lean ColumnTable temporal detection (no runtime)", () => {
  beforeAll(() => {
    resetTemporalRuntimeForTests();
    expect(getTemporalRuntime()).toBeNull();
  });

  afterAll(() => {
    installTemporal();
    expect(getTemporalRuntime()).not.toBeNull();
  });

  it("does not treat ISO strings mixed with numbers as temporal", () => {
    const table = ColumnTable.fromColumns({
      x: ["2024-01-01", 5, "2024-01-03"],
    });
    expect(table.fieldType("x")).toBe("nominal");
    // Numbers must not collapse to epoch-ms near 1970 on a date axis.
    const parsed = table.parsed("x");
    expect(parsed.decision.status).not.toBe("temporal");
    expect(parsed.semantic[1]).toBe(5);
  });

  it("still treats an all-ISO column as temporal", () => {
    const table = ColumnTable.fromColumns({
      x: ["2024-01-01", "2024-01-02", null],
    });
    expect(table.fieldType("x")).toBe("temporal");
    expect(table.parsed("x").decision.status).toBe("temporal");
  });
});

describe("lean pipeline: date-axis charts without temporal runtime", () => {
  beforeAll(() => {
    resetTemporalRuntimeForTests();
    expect(getTemporalRuntime()).toBeNull();
  });

  afterAll(() => {
    installTemporal();
    expect(getTemporalRuntime()).not.toBeNull();
  });

  it("renders a plain ISO date-axis chart instead of crashing on planTemporalAxis", () => {
    const model = runPipeline(
      gg(
        [
          { date: "2024-01-01", value: 1 },
          { date: "2024-01-02", value: 2 },
          { date: "2024-01-03", value: 3 },
        ],
        aes({ x: "date", y: "value" }),
      )
        .geomPoint()
        .spec(),
      { width: 400, height: 300 },
    );
    expect(model.scales.x.type).toBe("time");
    expect(model.scene.panels).toHaveLength(1);
    const axisX = model.scene.panels[0]?.axisX ?? [];
    expect(axisX.length).toBeGreaterThan(0);
    // Labels come from the lean timeTicks path (formatTime), not a thrown runtime error.
    expect(axisX.some((tick) => tick.label.length > 0)).toBe(true);
  });
});
