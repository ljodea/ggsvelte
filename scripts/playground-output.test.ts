import { describe, expect, test } from "bun:test";

import { normalize, type PortableSpec } from "@ggsvelte/spec";

import {
  parseSpecFromSvelteOutput,
  playgroundOutputs,
  playgroundSvelteOutput,
  rebuildPlaygroundSpecWithBuilder,
} from "../apps/docs/src/lib/playground-output";

const spec: PortableSpec = {
  edition: 1,
  data: {
    values: [
      { label: "</script><img src=x onerror=alert(1)>", value: 1 },
      { label: "line\u2028separator\u2029🧭", value: 2 },
    ],
  },
  layers: [
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "label" }, y: { field: "value" } },
    },
  ],
};

describe("playground outputs", () => {
  test("derives exact Svelte, Builder, and PortableSpec outputs from one committed spec", () => {
    const current: PortableSpec = { ...spec, height: 400 };
    const outputs = playgroundOutputs(current);

    expect(outputs.map((output) => output.kind)).toEqual(["svelte", "builder", "portable-spec"]);
    expect(outputs[0]?.supported).toBe(true);
    expect(outputs[1]?.supported).toBe(true);
    expect(outputs[2]).toEqual({
      kind: "portable-spec",
      label: "PortableSpec",
      supported: true,
      code: JSON.stringify(current, null, 2),
    });
    expect(rebuildPlaygroundSpecWithBuilder(current)).toEqual(current);
    expect(outputs[1]?.code).toContain('import { gg, type PortableSpec } from "@ggsvelte/spec";');
    expect(outputs[1]?.code).toContain(".layer(");
    expect(playgroundOutputs(current)).toBe(outputs);
  });

  test("covers every public Builder method before claiming exact equivalence", () => {
    const rich = normalize({
      $schema: "https://ggsvelte.sh/schema/v0.json",
      edition: 2,
      data: { values: [{ x: 1, y: 2, group: "A" }] },
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      facet: { wrap: "group" },
      coord: { type: "flip" },
      a11y: "force-svg",
      scales: { x: { type: "linear" } },
      legend: { order: "sorted" },
      labs: { title: "All builder methods" },
      theme: "minimal",
      width: 640,
      height: 360,
    });
    const builder = playgroundOutputs(rich)[1];

    expect(rebuildPlaygroundSpecWithBuilder(rich)).toEqual(rich);
    expect(builder?.supported).toBe(true);
    for (const method of ["layer", "facet", "coord", "a11y", "scales", "legend", "labs", "theme"]) {
      expect(builder?.code).toContain(`.${method}(`);
    }
    expect(builder?.code).toContain('"width": 640');
    expect(builder?.code).toContain('"height": 360');
  });

  test("turns an unexpected public Builder rejection into an unsupported result", () => {
    const malformed: PortableSpec = { ...spec, layers: [] };
    expect(rebuildPlaygroundSpecWithBuilder(malformed)).toBeNull();
    const builder = playgroundOutputs(malformed)[1];
    expect(builder).toMatchObject({
      kind: "builder",
      supported: false,
      code: "",
    });
    expect(builder?.reason).toContain("cannot reproduce");
  });

  test("refuses Builder output when the public builder would lose committed meaning", () => {
    const named: PortableSpec = {
      ...spec,
      edition: 2,
      data: { name: "rows" },
      datasets: { rows: { values: [{ label: "A", value: 1 }] } },
    };
    const builder = playgroundOutputs(named)[1];

    expect(builder).toMatchObject({
      kind: "builder",
      supported: false,
      code: "",
    });
    expect(builder?.reason).toContain("named inline datasets");
    expect(rebuildPlaygroundSpecWithBuilder(named)).toBeNull();
  });

  test("is one complete component containing the exact committed PortableSpec", () => {
    const output = playgroundSvelteOutput(spec);
    expect(output).toContain('import { GGPlot } from "@ggsvelte/svelte";');
    expect(output).toContain('import type { PortableSpec } from "@ggsvelte/spec";');
    expect(output).toContain("const spec: PortableSpec =");
    expect(output).toContain("<GGPlot {spec} />");
    expect(parseSpecFromSvelteOutput(output)).toEqual(spec);
  });

  test("cannot terminate the component script or embed raw JS separators", () => {
    const output = playgroundSvelteOutput(spec);
    expect(output.match(/<\/script>/gu)).toHaveLength(1);
    expect(output).not.toContain("<img src=x");
    expect(output).not.toContain("\u2028");
    expect(output).not.toContain("\u2029");
    expect(output).toContain("\\u003c/script>");
    expect(output).toContain("\\u2028");
    expect(output).toContain("\\u2029");
  });
});
