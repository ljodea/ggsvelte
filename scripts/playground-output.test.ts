import { describe, expect, test } from "bun:test";

import { normalize, type PortableSpec } from "@ggsvelte/spec";

import {
  parseSpecFromSvelteOutput,
  playgroundOutputs,
  playgroundSvelteOutput,
  rebuildPlaygroundSpecWithBuilder,
} from "../apps/docs/src/lib/playground-output";
import { defaultPlaygroundInteractions } from "../apps/docs/src/lib/playground-agent-envelope";
import { PLAYGROUND_DATASET_SCHEMAS } from "../apps/docs/src/lib/playground-dataset-schemas";

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
  test("derives exact Svelte, Builder, and Spec (JSON) outputs from one committed spec", () => {
    const current: PortableSpec = { ...spec, height: 400 };
    const outputs = playgroundOutputs(current);

    expect(outputs.map((output) => output.kind)).toEqual(["svelte", "builder", "portable-spec"]);
    expect(outputs[0]?.supported).toBe(true);
    expect(outputs[1]?.supported).toBe(true);
    expect(outputs[2]).toEqual({
      kind: "portable-spec",
      label: "Spec (JSON)",
      supported: true,
      code: JSON.stringify(current, null, 2),
    });
    expect(rebuildPlaygroundSpecWithBuilder(current)).toEqual(current);
    expect(outputs[1]?.code).toContain('import { gg, type PortableSpec } from "@ggsvelte/svelte";');
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
    const builder = playgroundOutputs(rich).find((o) => o.kind === "builder");

    expect(rebuildPlaygroundSpecWithBuilder(rich)).toEqual(rich);
    expect(builder?.supported).toBe(true);
    for (const method of ["layer", "facet", "coord", "a11y", "scales", "legend", "labs", "theme"]) {
      expect(builder?.code).toContain(`.${method}(`);
    }
    expect(builder?.code).toContain('"width": 640');
    expect(builder?.code).toContain('"height": 360');
  });

  test("hides Builder tab when round-trip fails (OV6-A)", () => {
    const malformed: PortableSpec = { ...spec, layers: [] };
    expect(rebuildPlaygroundSpecWithBuilder(malformed)).toBeNull();
    const outputs = playgroundOutputs(malformed);
    expect(outputs.map((o) => o.kind)).toEqual(["svelte", "portable-spec"]);
    expect(outputs.find((o) => o.kind === "builder")).toBeUndefined();
  });

  test("hides Builder tab for named datasets that would lose meaning", () => {
    const named: PortableSpec = {
      ...spec,
      edition: 2,
      data: { name: "rows" },
      datasets: { rows: { values: [{ label: "A", value: 1 }] } },
    };
    const outputs = playgroundOutputs(named);
    expect(outputs.map((o) => o.kind)).toEqual(["svelte", "portable-spec"]);
    expect(rebuildPlaygroundSpecWithBuilder(named)).toBeNull();
  });

  test("is one complete component containing the exact committed PortableSpec", () => {
    const output = playgroundSvelteOutput(spec);
    expect(output).toContain('import { GGPlot, type PortableSpec } from "@ggsvelte/svelte";');
    expect(output).not.toContain('from "@ggsvelte/spec";');
    expect(output).toContain("const spec: PortableSpec =");
    expect(output).toContain("← replace with your rows");
    expect(output).toContain("<GGPlot {spec} inspect />");
    expect(parseSpecFromSvelteOutput(output)).toEqual(spec);
  });

  test("emits non-default interaction props and keys the memo on interactions", () => {
    const interactive = playgroundSvelteOutput(spec, {
      inspect: true,
      select: "interval",
      zoom: false,
      legendFilter: true,
      legendFocus: false,
    });
    expect(interactive).toContain('select="interval"');
    expect(interactive).toContain("legendFilter");
    expect(interactive).not.toContain(" zoom");

    const a = playgroundOutputs(spec, defaultPlaygroundInteractions());
    const b = playgroundOutputs(spec, {
      inspect: true,
      select: "point",
      zoom: true,
      legendFilter: false,
      legendFocus: false,
    });
    expect(a).not.toBe(b);
    expect(b[0]?.code).toContain('select="point"');
    expect(b[0]?.code).toContain("zoom");
  });

  test("names the data seam after the dataset the caller selected", () => {
    for (const schema of PLAYGROUND_DATASET_SCHEMAS) {
      const dataset: PortableSpec = { ...spec, data: { values: [...schema.sampleRows] } };
      const output = playgroundSvelteOutput(dataset, defaultPlaygroundInteractions(), schema.id);

      expect(output).toContain(`const ${schema.id} = `);
      expect(output).toContain(`"values": ${schema.id}`);
      expect(parseSpecFromSvelteOutput(output)).toEqual(dataset);
    }
  });

  test("trusts the dataset id over the column names in the rows", () => {
    const penguinShaped: PortableSpec = {
      ...spec,
      data: { values: [{ id: "a1", species: "Adelie", flipper: 181, mass: 3750 }] },
    };
    const output = playgroundSvelteOutput(
      penguinShaped,
      defaultPlaygroundInteractions(),
      "monthly",
    );

    expect(output).toContain("const monthly = ");
    expect(output).not.toContain("const penguins = ");
  });

  test("falls back to rows for an omitted or unknown dataset id without sniffing columns", () => {
    const penguinShaped: PortableSpec = {
      ...spec,
      data: { values: [{ id: "a1", species: "Adelie", flipper: 181, mass: 3750 }] },
    };

    for (const output of [
      playgroundSvelteOutput(penguinShaped),
      playgroundSvelteOutput(penguinShaped, defaultPlaygroundInteractions(), "not-a-dataset"),
    ]) {
      expect(output).toContain("const rows = ");
      expect(output).not.toContain("const penguins = ");
    }
  });

  test("keys the memo on the dataset id as well as the interactions", () => {
    const dataset: PortableSpec = { ...spec, data: { values: [{ id: "m1", value: 1 }] } };
    const interactions = defaultPlaygroundInteractions();
    const asMonthly = playgroundOutputs(dataset, interactions, "monthly");
    const asCategories = playgroundOutputs(dataset, interactions, "categories");

    expect(asMonthly).not.toBe(asCategories);
    expect(asMonthly[0]?.code).toContain("const monthly = ");
    expect(asCategories[0]?.code).toContain("const categories = ");
    expect(playgroundOutputs(dataset, interactions, "monthly")).toBe(asMonthly);
  });

  test("every curated dataset id is usable as a JavaScript identifier", () => {
    for (const schema of PLAYGROUND_DATASET_SCHEMAS) {
      expect(schema.id).toMatch(/^[A-Za-z_$][\w$]*$/u);
    }
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
