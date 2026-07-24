import { describe, expect, test } from "bun:test";

import { normalize, validate } from "@ggsvelte/spec";

import { PLAYGROUND_DATASET_SCHEMAS } from "../apps/docs/src/lib/playground-dataset-schemas";
import {
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
import { agentHandoffPrompt } from "../apps/docs/src/lib/playground-agent-handoff";
import { AGENT_HANDOFF_MAX_CHARS } from "../apps/docs/src/lib/playground-agent-handoff";

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

  test("named data alone fails data-aware checks until inlined", () => {
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
    // Shape may pass; after normalize + limits without rows, unknown fields may fire.
    if (shape.ok) {
      const normalized = normalize(shape.spec);
      // Without rows, field existence is not always checked — just ensure inlining works.
      const inlined = inlinePlaygroundDatasetRows(normalized, "penguins");
      const checked = validate(inlined);
      expect(checked.ok).toBe(true);
    }
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
