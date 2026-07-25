import { describe, expect, test } from "bun:test";

import {
  agentFailureIsRepairable,
  validateAgentEnvelope,
} from "../apps/docs/src/lib/playground-agent-validate";
import {
  defaultPlaygroundInteractions,
  type PlaygroundAgentEnvelope,
} from "../apps/docs/src/lib/playground-agent-envelope";

function envelope(spec: unknown): PlaygroundAgentEnvelope {
  return { spec, interactions: defaultPlaygroundInteractions(), title: null };
}

const scatter = {
  edition: 2,
  data: { name: "penguins" },
  layers: [{ geom: "point", aes: { x: { field: "flipper" }, y: { field: "mass" } } }],
};

describe("agent envelope repair gate", () => {
  test("spec errors are repairable — the model gets diagnostics to work from", () => {
    const result = validateAgentEnvelope(
      envelope({ ...scatter, layers: [{ geom: "point", aes: { x: { field: "nope" } } }] }),
      "penguins",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
    expect(agentFailureIsRepairable(result)).toBe(true);
  });

  // Seed bounds are share-codec limits, not SpecError codes, so the repair
  // round would send `priorErrors: []` — a second model call carrying zero
  // diagnostic signal while doubling the user's wait and the spend (#697).
  test("seed-bound failures are not repairable", () => {
    const result = validateAgentEnvelope(
      envelope({ ...scatter, labs: { subtitle: "x".repeat(3000) } }),
      "penguins",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([]);
    expect(result.message).toContain("code points");
    expect(agentFailureIsRepairable(result)).toBe(false);
  });

  test("a valid envelope is never repairable", () => {
    const result = validateAgentEnvelope(envelope(scatter), "penguins");
    expect(result.ok).toBe(true);
    expect(agentFailureIsRepairable(result)).toBe(false);
  });
});
