import { describe, expect, test } from "bun:test";

import { normalize, validate } from "@ggsvelte/spec";

import { PLAYGROUND_DATASET_SCHEMAS } from "../apps/docs/src/lib/playground-dataset-schemas";
import {
  elidePlaygroundDatasetRows,
  inlinePlaygroundDatasetRows,
  playgroundDatasetRows,
} from "../apps/docs/src/lib/playground-datasets";
import { PLAYGROUND_EXAMPLE_PROMPTS } from "../apps/docs/src/lib/playground-prompts";
import { validateAgentEnvelope } from "../apps/docs/src/lib/playground-agent-validate";
import {
  PLAYGROUND_MAX_DECODED_BYTES,
  PLAYGROUND_MAX_ROWS,
  encodePlaygroundSeed,
} from "../apps/docs/src/lib/playground-codec";
import {
  agentHandoffPrompt,
  AGENT_HANDOFF_MAX_CHARS,
} from "../apps/docs/src/lib/playground-agent-handoff";

describe("playground datasets", () => {
  test("each curated dataset is 40–60 rows and within codec limits", () => {
    for (const schema of PLAYGROUND_DATASET_SCHEMAS) {
      const rows = playgroundDatasetRows(schema.id);
      expect(rows.length).toBeGreaterThanOrEqual(40);
      expect(rows.length).toBeLessThanOrEqual(60);
      expect(rows.length).toBeLessThanOrEqual(PLAYGROUND_MAX_ROWS);
    }
  });

  test("inlinePlaygroundDatasetRows replaces data.name with values", () => {
    const inlined = inlinePlaygroundDatasetRows(
      {
        edition: 2,
        data: { name: "penguins" },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "flipper" }, y: { field: "mass" } },
          },
        ],
      } as never,
      "penguins",
    );
    expect(inlined.data && "values" in inlined.data).toBe(true);
    if (inlined.data && "values" in inlined.data) {
      expect(inlined.data.values.length).toBeGreaterThan(0);
    }
  });

  test("every example prompt envelope validates after inlining", () => {
    for (const example of PLAYGROUND_EXAMPLE_PROMPTS) {
      const result = validateAgentEnvelope(example.envelope, example.datasetId);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        console.error(example.id, result.message, result.errors);
        continue;
      }
      const seedBytes = new TextEncoder().encode(JSON.stringify(result.seed)).byteLength;
      expect(seedBytes).toBeLessThanOrEqual(PLAYGROUND_MAX_DECODED_BYTES);
      // Share codec must accept the seed.
      const fragment = encodePlaygroundSeed(result.seed);
      expect(fragment.startsWith("#play=v1.")).toBe(true);
    }
  });

  test("named dataset validates after inlining", () => {
    const shape = validate({
      edition: 2,
      data: { name: "penguins" },
      layers: [
        {
          geom: "point",
          aes: { x: { field: "flipper" }, y: { field: "mass" } },
        },
      ],
    });
    // Assert explicitly — a silent shape rejection must fail this test,
    // not skip its body (testing review).
    expect(shape.ok).toBe(true);
    if (!shape.ok) return;
    const normalized = normalize(shape.spec);
    const inlined = inlinePlaygroundDatasetRows(normalized, "penguins");
    const checked = validate(inlined);
    expect(checked.ok).toBe(true);
  });

  test("elidePlaygroundDatasetRows is the inverse of inlining", () => {
    const named = {
      edition: 2,
      data: { name: "penguins" },
      layers: [{ geom: "point", aes: { x: { field: "flipper" }, y: { field: "mass" } } }],
    };
    const shape = validate(named);
    expect(shape.ok).toBe(true);
    if (!shape.ok) return;
    const inlined = inlinePlaygroundDatasetRows(normalize(shape.spec), "penguins");
    const elided = elidePlaygroundDatasetRows(inlined, "penguins");
    expect(elided.data).toEqual({ name: "penguins" });
    // Rows that do NOT match the curated dataset pass through untouched.
    const custom = { ...inlined, data: { values: [{ flipper: 1, mass: 2, species: "x" }] } };
    expect(elidePlaygroundDatasetRows(custom, "penguins")).toBe(custom);
  });

  test("invalid envelope keeps raw SpecError contract for the repair round", () => {
    const result = validateAgentEnvelope(
      {
        spec: {
          edition: 2,
          data: { name: "penguins" },
          layers: [{ geom: "point", aes: { x: { field: "not_a_field" }, y: { field: "mass" } } }],
        },
        interactions: {
          inspect: true,
          select: false,
          zoom: false,
          legendFilter: false,
          legendFocus: false,
        },
        title: null,
      },
      "penguins",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
    // The raw SpecError agent contract survives to the repair payload.
    expect(result.errors[0]).toHaveProperty("code");
    expect(result.errors[0]).toHaveProperty("path");
    expect(result.errors[0]).toHaveProperty("message");
  });
});

describe("agent handoff prompt", () => {
  test("is self-contained under size cap with install + contract + SKILL link", () => {
    const text = agentHandoffPrompt({
      currentSpec: {
        edition: 2,
        data: { values: [{ x: 1, y: 2 }] },
        layers: [
          {
            geom: "point",
            aes: { x: { field: "x" }, y: { field: "y" } },
          },
        ],
      } as never,
      userGoal: "Make it interactive",
    });
    expect(text).toContain("bun add @ggsvelte/svelte");
    expect(text).toContain("PortableSpec");
    expect(text).toContain("llms.txt");
    expect(text).toContain("Current chart");
    expect(text).toContain("Make it interactive");
    expect(text.length).toBeLessThanOrEqual(AGENT_HANDOFF_MAX_CHARS);
  });
});

describe("agent handoff size cap", () => {
  test("large specs stay under AGENT_HANDOFF_MAX_CHARS", () => {
    const rows = Array.from({ length: 400 }, (_, i) => ({
      x: i,
      y: i * 2,
      label: `row-${i}-padding-padding-padding`,
    }));
    const text = agentHandoffPrompt({
      currentSpec: {
        edition: 2,
        data: { values: rows },
        layers: [{ geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } }],
      },
      userGoal: "continue from this chart",
    });
    expect(text.length).toBeLessThanOrEqual(AGENT_HANDOFF_MAX_CHARS);
    expect(text).toContain("bun add @ggsvelte/svelte");
  });
});
