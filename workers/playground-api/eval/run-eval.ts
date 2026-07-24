#!/usr/bin/env bun
/**
 * Phase-0 free-model eval gate (OV7-A).
 *
 * Measures valid-envelope rate after at most one repair round.
 * Gate: ≥70% before enabling live generation in production.
 *
 * Requires OPENROUTER_API_KEY. Do not run in CI without a secret.
 * Canned example envelopes are hand-authored separately and validated
 * by unit tests — this script is for maintainer model selection only.
 *
 * Usage:
 *   OPENROUTER_API_KEY=… bun workers/playground-api/eval/run-eval.ts
 */

import { normalize, validate, type SpecError } from "@ggsvelte/spec";

import { isPlaygroundDatasetId } from "../../../apps/docs/src/lib/playground-dataset-schemas";
import { inlinePlaygroundDatasetRows } from "../../../apps/docs/src/lib/playground-datasets";
import { parsePlaygroundAgentEnvelope } from "../../../apps/docs/src/lib/playground-agent-envelope";
import { buildChatMessages } from "../src/prompt";
import { DEFAULT_MODELS } from "../src/handler";

const GATE = 0.7;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface EvalCase {
  readonly id: string;
  readonly prompt: string;
  readonly datasetId: string;
  readonly currentSpec?: unknown;
}

const CORPUS: readonly EvalCase[] = [
  { id: "scatter", prompt: "Make me an interactive scatterplot", datasetId: "penguins" },
  {
    id: "facet",
    prompt: "Make the points larger and facet by species",
    datasetId: "penguins",
  },
  { id: "histogram", prompt: "Histogram of body mass colored by species", datasetId: "penguins" },
  { id: "smooth", prompt: "Scatter with a smooth trend line", datasetId: "penguins" },
  { id: "line", prompt: "Show a brushable monthly line chart", datasetId: "monthly" },
  { id: "area", prompt: "Area chart of the monthly series", datasetId: "monthly" },
  {
    id: "bars",
    prompt: "Dodged column chart of amount by region, fill by channel",
    datasetId: "categories",
  },
  { id: "bar-count", prompt: "Bar chart counting rows by region", datasetId: "categories" },
  { id: "flip", prompt: "Horizontal columns of amount by channel", datasetId: "categories" },
  {
    id: "mod-color",
    prompt: "Color the points by species and enable legend filter",
    datasetId: "penguins",
    currentSpec: {
      edition: 2,
      data: { name: "penguins" },
      layers: [
        {
          geom: "point",
          aes: { x: { field: "flipper" }, y: { field: "mass" } },
        },
      ],
    },
  },
];

async function callOpenRouter(
  apiKey: string,
  models: string[],
  messages: ReturnType<typeof buildChatMessages>["messages"],
): Promise<{ model: string; content: string } | { error: string }> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ggsvelte.sh",
      "X-Title": "ggsvelte playground eval",
    },
    body: JSON.stringify({
      models,
      messages,
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    return { error: `upstream ${response.status}` };
  }
  const json = (await response.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string") return { error: "empty content" };
  return { model: json.model ?? models[0]!, content };
}

function validateEnvelope(
  raw: unknown,
  datasetId: string,
): { ok: true } | { ok: false; errors: SpecError[] } {
  const parsed = parsePlaygroundAgentEnvelope(raw);
  if (!parsed.ok) return { ok: false, errors: [] };
  const shape = validate(parsed.envelope.spec);
  if (!shape.ok) return { ok: false, errors: [...shape.errors] };
  if (!isPlaygroundDatasetId(datasetId)) {
    return { ok: false, errors: [] };
  }
  const inlined = inlinePlaygroundDatasetRows(shape.spec, datasetId);
  const normalized = normalize(inlined);
  const checked = validate(normalized, {
    limits: { maxRows: 500, maxBytes: 12_288, maxDepth: 32, maxDiagnostics: 50 },
  });
  if (!checked.ok) return { ok: false, errors: [...checked.errors] };
  return { ok: true };
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    console.error(
      "OPENROUTER_API_KEY is not set. This eval is maintainer-only; canned envelopes are validated by unit tests without a key.",
    );
    process.exit(2);
  }

  const models = (process.env.MODEL_ALLOWLIST ?? DEFAULT_MODELS.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let valid = 0;
  const rows: Array<Record<string, unknown>> = [];

  for (const testCase of CORPUS) {
    const { messages } = buildChatMessages({
      datasetId: testCase.datasetId,
      prompt: testCase.prompt,
      currentSpec: testCase.currentSpec,
    });
    const first = await callOpenRouter(apiKey, models, messages);
    if ("error" in first) {
      rows.push({ id: testCase.id, ok: false, stage: "upstream", error: first.error });
      continue;
    }
    let envelope: unknown;
    try {
      envelope = JSON.parse(first.content) as unknown;
    } catch {
      rows.push({ id: testCase.id, ok: false, stage: "parse" });
      continue;
    }
    let result = validateEnvelope(envelope, testCase.datasetId);
    let repairUsed = false;
    if (!result.ok && result.errors.length > 0) {
      repairUsed = true;
      const repair = buildChatMessages({
        datasetId: testCase.datasetId,
        prompt: testCase.prompt,
        currentSpec: testCase.currentSpec,
        priorEnvelope: envelope,
        priorErrors: result.errors,
      });
      const second = await callOpenRouter(apiKey, models, repair.messages);
      if (!("error" in second)) {
        try {
          envelope = JSON.parse(second.content) as unknown;
          result = validateEnvelope(envelope, testCase.datasetId);
        } catch {
          result = { ok: false, errors: [] };
        }
      }
    }
    if (result.ok) valid += 1;
    rows.push({
      id: testCase.id,
      ok: result.ok,
      repair_used: repairUsed,
      model: first.model,
    });
  }

  const rate = valid / CORPUS.length;
  console.log(JSON.stringify({ valid, total: CORPUS.length, rate, gate: GATE, rows }, null, 2));
  if (rate < GATE) {
    console.error(
      `FAIL: valid-envelope rate ${(rate * 100).toFixed(1)}% < ${(GATE * 100).toFixed(0)}% gate. Keep live generation disabled.`,
    );
    process.exit(1);
  }
  console.error(
    `PASS: valid-envelope rate ${(rate * 100).toFixed(1)}% ≥ ${(GATE * 100).toFixed(0)}% gate.`,
  );
}

await main();
