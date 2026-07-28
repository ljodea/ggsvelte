/**
 * Builder geom-mixin parity with KNOWN_GEOMS (#1081 PR C).
 * Every catalog geom has a geom* method that is exact sugar for
 * `.layer(layerFrom(geom, options))`, except geomJitter which folds
 * flat width/height/seed into positionParams.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg, GGBuilder } from "../src/builder.ts";
import { KNOWN_GEOMS } from "../src/schema-catalog.ts";

/** snake_case geom → geomPascal method name (mirrors gen-geom-children). */
function methodNameForGeom(geom: string): string {
  const pascal = geom
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `geom${pascal}`;
}

const rows = [
  { x: 1, y: 2, g: "a" },
  { x: 2, y: 3, g: "b" },
];

describe("GGBuilder geom mixin ↔ KNOWN_GEOMS", () => {
  it("exposes a geom* method for every catalog geom", () => {
    const builder = gg(rows, aes({ x: "x", y: "y" }));
    expect(builder).toBeInstanceOf(GGBuilder);
    for (const geom of KNOWN_GEOMS) {
      const name = methodNameForGeom(geom);
      expect(typeof (builder as unknown as Record<string, unknown>)[name], name).toBe("function");
    }
  });

  it("one-liner geoms equal .layer({ geom, ... }) for empty options", () => {
    for (const geom of KNOWN_GEOMS) {
      // jitter: special positionParams assembly. function/map require params.
      if (geom === "jitter" || geom === "function" || geom === "map") continue;
      const name = methodNameForGeom(geom);
      const viaMixin = (
        gg(rows, aes({ x: "x", y: "y" })) as unknown as Record<string, (opts?: object) => GGBuilder>
      )[name]!({}).spec();
      const viaLayer = gg(rows, aes({ x: "x", y: "y" }))
        .layer({ geom })
        .spec();
      expect(viaMixin.layers, name).toEqual(viaLayer.layers);
    }
  });

  it("geomFunction is sugar for .layer with required fun param", () => {
    const opts = { fun: "identity" as const };
    const viaMixin = gg(rows, aes({ x: "x", y: "y" }))
      .geomFunction(opts)
      .spec();
    const viaLayer = gg(rows, aes({ x: "x", y: "y" }))
      .layer({ geom: "function", params: { fun: "identity" } })
      .spec();
    expect(viaMixin.layers).toEqual(viaLayer.layers);
  });

  it("geomJitter folds flat width/height/seed into positionParams", () => {
    const viaMixin = gg(rows, aes({ x: "x", y: "y" }))
      .geomJitter({ width: 0.2, height: 0.1, seed: 7 })
      .spec();
    const viaLayer = gg(rows, aes({ x: "x", y: "y" }))
      .layer({
        geom: "jitter",
        positionParams: { width: 0.2, height: 0.1, seed: 7 },
      })
      .spec();
    expect(viaMixin.layers).toEqual(viaLayer.layers);
  });
});
