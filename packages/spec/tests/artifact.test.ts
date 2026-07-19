/**
 * Schema artifact guards: the committed schema/v0.json must match a fresh
 * build, must compile under ajv (draft 2020-12), and ajv verdicts must match
 * the TypeBox runtime (one artifact, no drift — decision 0004).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Value } from "typebox/value";
import { Ajv2020 } from "ajv/dist/2020.js";

import { schemaArtifactJSON } from "../src/artifact.ts";
import { PlotSpecSchema, THEME_NAMES } from "../src/schema.ts";

const artifactPath = join(import.meta.dir, "..", "schema", "v0.json");
const committed = readFileSync(artifactPath, "utf8");

describe("schema/v0.json artifact", () => {
  it("is current (regenerate with `bun run schema:emit` when this fails)", () => {
    expect(committed).toBe(schemaArtifactJSON());
  });

  it("describes every registered theme name in the published schema", () => {
    const artifact = JSON.parse(committed) as {
      $defs: { ThemeName: { description?: string } };
    };
    const description = artifact.$defs.ThemeName.description ?? "";

    for (const theme of THEME_NAMES) expect(description).toContain(`"${theme}"`);
  });

  it("documents that a named scheme selects its scale family", () => {
    const artifact = JSON.parse(committed) as {
      $defs: { ColorScaleSpec: { properties: { scheme: { description?: string } } } };
    };

    expect(artifact.$defs.ColorScaleSpec.properties.scheme.description).toContain(
      "When type is omitted",
    );
  });

  it("documents the supported custom color syntax", () => {
    const artifact = JSON.parse(committed) as {
      $defs: { ColorScaleSpec: { properties: { range: { description?: string } } } };
    };

    expect(artifact.$defs.ColorScaleSpec.properties.range.description).toContain("#rgb or #rrggbb");
  });

  it("contains no TypeBox-style refs or patternProperties records", () => {
    expect(committed).not.toContain("patternProperties");
    const refs = committed.match(/"\$ref":\s*"([^"]+)"/g) ?? [];
    for (const ref of refs) expect(ref).toContain("#/$defs/");
  });

  it("compiles under ajv 2020-12 and matches TypeBox verdicts", () => {
    const ajv = new Ajv2020({ strict: false });
    const validateAjv = ajv.compile(JSON.parse(committed) as object);
    const fixtures: [unknown, boolean][] = [
      [{ layers: [{ geom: "point" }] }, true],
      [
        {
          data: { columns: { x: [1, "a", null] } },
          aes: { x: { field: "x" }, y: { value: 2, scale: true } },
          layers: [
            { geom: "point", params: { alpha: 0.2, shape: "triangle" } },
            { geom: "line", aes: { color: null }, params: { curve: "step" } },
          ],
          labs: { title: "T" },
          width: 100,
        },
        true,
      ],
      [{ layers: [] }, false],
      [{ layers: [{ geom: "bar" }] }, true],
      [{ layers: [{ geom: "boxplot" }] }, true],
      [{ layers: [{ geom: "violin" }] }, false],
      [{ layers: [{ geom: "bar", stat: "identity" }] }, false],
      [{ layers: [{ geom: "bar", stat: "bin", params: { binwidth: 0.5, boundary: 0 } }] }, true],
      [{ layers: [{ geom: "histogram", params: { bins: 20, closed: "left" } }] }, true],
      [{ layers: [{ geom: "histogram", stat: "count" }] }, false],
      [{ layers: [{ geom: "col", stat: "count" }] }, false],
      [{ layers: [{ geom: "col", params: { bins: 10 } }] }, false],
      [{ layers: [{ geom: "smooth", params: { method: "loess", span: 0.5, se: true } }] }, true],
      [{ layers: [{ geom: "smooth", params: { method: "gam" } }] }, false],
      [{ layers: [{ geom: "smooth", params: { span: 1.5 } }] }, false],
      [{ layers: [{ geom: "boxplot", params: { coef: 3, outlierSize: 2 } }] }, true],
      [{ layers: [{ geom: "boxplot", position: "stack" }] }, false],
      [{ layers: [{ geom: "density", params: { adjust: 0.5, n: 256, cut: 3 } }] }, true],
      [{ layers: [{ geom: "density", params: { bw: 0 } }] }, false],
      [{ layers: [{ geom: "errorbar", stat: "summary", params: { fun: "median" } }] }, true],
      [{ layers: [{ geom: "errorbar", params: { fun: "min" } }] }, false],
      [
        {
          aes: { x: { field: "a" }, ymin: { field: "lo" }, ymax: { field: "hi" } },
          layers: [{ geom: "errorbar" }],
        },
        true,
      ],
      [
        {
          layers: [{ geom: "point", position: "jitter", positionParams: { width: 0.2, seed: 7 } }],
        },
        true,
      ],
      [{ layers: [{ geom: "point", position: "jitter", positionParams: { seed: -1 } }] }, false],
      [{ layers: [{ geom: "point", position: "stack" }] }, false],
      [{ layers: [{ geom: "text", position: "nudge", positionParams: { y: -0.5 } }] }, true],
      [{ layers: [{ geom: "line", position: "nudge" }] }, false],
      [{ layers: [{ geom: "rule", params: { yintercept: 3 } }] }, true],
      [{ layers: [{ geom: "text", params: { anchor: "left" } }] }, false],
      [{ scales: { y: { type: "log", zero: false } }, layers: [{ geom: "point" }] }, true],
      [{ scales: { y: { type: "exp" } }, layers: [{ geom: "point" }] }, false],
      [{ theme: "dark", layers: [{ geom: "point" }] }, true],
      [{ theme: "darkk", layers: [{ geom: "point" }] }, false],
      [{ theme: { name: "dark", accent: "#f00" }, layers: [{ geom: "point" }] }, true],
      [{ legend: { order: "sorted" }, layers: [{ geom: "point" }] }, true],
      [{ legend: { order: "reverse" }, layers: [{ geom: "point" }] }, false],
      [{ aes: { x: "bare-string" }, layers: [{ geom: "point" }] }, false],
      [{ layers: [{ geom: "point", params: { alpha: 2 } }] }, false],
      [{ layers: [{ geom: "line", params: { size: 1 } }] }, false],
      [{ extra: 1, layers: [{ geom: "point" }] }, false],
      [{ data: { name: 7 }, layers: [{ geom: "point" }] }, false],
    ];
    for (const [fixture, expected] of fixtures) {
      expect(validateAjv(fixture)).toBe(expected);
      expect(Value.Check(PlotSpecSchema, fixture)).toBe(expected);
    }
  });
});
