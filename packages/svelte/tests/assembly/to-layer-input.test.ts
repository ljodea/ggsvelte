import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import { toLayerInput } from "../../src/lib/assembly/assemble.js";

describe("toLayerInput", () => {
  it("copies geom and omits undefined optional fields", () => {
    expect(toLayerInput({ geom: "point" })).toEqual({ geom: "point" });
  });

  it("reads live getters on every invocation (registry contract)", () => {
    let geom: "point" | "line" = "point";
    let aes: { x: string } | undefined = { x: "a" };
    const descriptor = {
      get geom() {
        return geom;
      },
      get aes() {
        return aes;
      },
    };
    expect(toLayerInput(descriptor)).toEqual({
      geom: "point",
      aes: { x: "a" },
    });
    geom = "line";
    aes = undefined;
    expect(toLayerInput(descriptor)).toEqual({ geom: "line" });
  });

  it("forwards all optional descriptor fields when present", () => {
    expect(
      toLayerInput({
        geom: "smooth",
        stat: "smooth",
        position: "identity",
        positionParams: { width: 0.5 },
        render: "canvas",
        aes: { x: "x", y: "y" },
        params: { method: "lm" },
      }),
    ).toEqual({
      geom: "smooth",
      stat: "smooth",
      position: "identity",
      positionParams: { width: 0.5 },
      render: "canvas",
      aes: { x: "x", y: "y" },
      params: { method: "lm" },
    });
  });

  /**
   * layerDataRef / isWrappedDataRef: geom `data` props must round-trip as
   * DataRef shapes without double-wrapping already-valid bags.
   */
  it("wraps row arrays as { values } and bare column maps as { columns }", () => {
    const rows = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ];
    expect(toLayerInput({ geom: "point", data: rows }).data).toEqual({ values: rows });
    const columns = { x: [1, 3], y: [2, 4] };
    expect(toLayerInput({ geom: "point", data: columns }).data).toEqual({ columns });
  });

  it("passes through single-key DataRef bags without double wrapping", () => {
    const valuesBag = { values: [{ x: 1 }] };
    expect(toLayerInput({ geom: "point", data: valuesBag }).data).toBe(valuesBag);
    const columnsBag = { columns: { x: [1], y: [2] } };
    expect(toLayerInput({ geom: "point", data: columnsBag }).data).toBe(columnsBag);
    const nameBag = { name: "mpg" };
    expect(toLayerInput({ geom: "point", data: nameBag }).data).toBe(nameBag);
  });

  it("does not treat multi-key or malformed single-key objects as DataRefs", () => {
    // Multi-key object is a bare column map (or mixed) — wrap as columns.
    const multi = { values: [{ x: 1 }], y: [2] };
    expect(toLayerInput({ geom: "point", data: multi }).data).toEqual({ columns: multi });
    // Single-key but wrong value types → not a DataRef; wrap as columns.
    // Intentionally wrong shapes use fromAny (CONTRIBUTING fixture rule).
    const nameNotString = fromAny({ name: 12 });
    expect(toLayerInput({ geom: "point", data: nameNotString }).data).toEqual({
      columns: nameNotString,
    });
    const valuesNotArray = fromAny({ values: { x: 1 } });
    expect(toLayerInput({ geom: "point", data: valuesNotArray }).data).toEqual({
      columns: valuesNotArray,
    });
    const columnsIsArray = { columns: [1, 2] };
    expect(toLayerInput({ geom: "point", data: columnsIsArray }).data).toEqual({
      columns: columnsIsArray,
    });
    const columnsNull = fromAny({ columns: null });
    expect(toLayerInput({ geom: "point", data: columnsNull }).data).toEqual({
      columns: columnsNull,
    });
    // Unknown single key is not a DataRef.
    const other = fromAny({ rows: [{ x: 1 }] });
    expect(toLayerInput({ geom: "point", data: other }).data).toEqual({ columns: other });
  });

  it("falls back to empty values for non-array non-object data", () => {
    // Runtime guard when a geom data prop is neither rows nor a column bag.
    expect(toLayerInput({ geom: "point", data: fromAny(null) }).data).toEqual({ values: [] });
    expect(toLayerInput({ geom: "point", data: fromAny(42) }).data).toEqual({ values: [] });
    expect(toLayerInput({ geom: "point", data: fromAny("rows") }).data).toEqual({ values: [] });
  });
});
