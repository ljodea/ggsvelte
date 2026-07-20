import { describe, expect, test } from "bun:test";

import type { PortableSpec } from "@ggsvelte/spec";

import {
  parseSpecFromSvelteOutput,
  playgroundSvelteOutput,
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

describe("playground Svelte output", () => {
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
