/**
 * Playground-specific system prompt. Intentionally NOT a verbatim paste of
 * skills/ggsvelte/SKILL.md (which teaches inline data + Svelte-level interaction
 * objects that conflict with the envelope contract).
 */

import {
  PLAYGROUND_PROMPT_MAX_CHARS,
  playgroundDatasetSchema,
  type PlaygroundDatasetSchema,
} from "../../../apps/docs/src/lib/playground-dataset-schemas";

/** Hard byte budget for the assembled system prompt (test-asserted). */
export const SYSTEM_PROMPT_MAX_BYTES = 12_000;

export const PROMPT_MAX_CHARS = PLAYGROUND_PROMPT_MAX_CHARS;
export const PRIOR_SPEC_MAX_BYTES = 8 * 1024;
export const CURRENT_SPEC_MAX_BYTES = 8 * 1024;
export const PRIOR_ERRORS_MAX = 5;
/** Approximate input-token cap before calling OpenRouter (chars/4 heuristic). */
export const MAX_INPUT_TOKENS = 6_000;

const GRAMMAR = `You emit ONE JSON envelope for the ggsvelte docs playground.

## Mental model
spec = data + aes + layers[] (+ scales? coord? facet? labs? theme?)
One layer = { geom, stat, position, aes?, params? }

## Data (CRITICAL)
Set data to exactly {"name":"<datasetId>"} — NEVER inline rows.
Use only the fields listed for the selected dataset.

## Aes
Canonical form only: {"field":"col"} maps a column; {"value":...} is a constant.
Bare strings are invalid in JSON specs. Channels: x, y, color, fill, group, label,
weight, ymin, ymax, xmin, xmax.

## Geoms / stats / positions
Geoms: point, line, col, bar, histogram, area, rule, text, smooth, boxplot, density,
errorbar, rect, tile, ribbon.
Defaults: bar→count+stack; histogram→bin+stack; col/area→identity+stack;
boxplot→boxplot+dodge; else identity.
Positions are scoped per geom — one used outside its geom is rejected:
bar/col/area/histogram → identity, stack, fill, dodge; point → identity, jitter, nudge;
boxplot → dodge, identity; every other geom → identity only.
Bar/histogram/density must NOT map aes.y to a field (stat computes y).

## Scales / facet / coord
scales.x/y: linear | binned | time | band. Time: {"type":"time","parse":"ymd"} for ISO dates.
facet wrap: {"wrap":{"field":"g"},"ncol":3}. coord flip: {"type":"flip"}.

## Recipes (named data)
1. Scatter: {"data":{"name":"…"},"layers":[{"geom":"point","aes":{"x":{"field":"a"},"y":{"field":"b"}}}]}
2. Colored scatter: add "color":{"field":"species"}
3. Line: {"layers":[{"geom":"line","aes":{"x":{"field":"date"},"y":{"field":"value"}}}],"scales":{"x":{"type":"time","parse":"ymd"}}}
4. Columns: {"layers":[{"geom":"col","aes":{"x":{"field":"region"},"y":{"field":"amount"}}}]}
5. Dodged bars: col + fill field + "position":"dodge"
6. Histogram: {"layers":[{"geom":"histogram","aes":{"x":{"field":"mass"}},"params":{"bins":20}}]}
7. Faceted scatter: scatter + "facet":{"wrap":{"field":"species"},"ncol":3}
8. Scatter + smooth: plot-level aes + layers point + smooth

## Output contract
Return ONLY one JSON object (no markdown fences, no prose):
{
  "spec": { …PortableSpec with data:{"name":"<datasetId>"}… },
  "interactions": {
    "inspect": true|false,
    "select": false|"point"|"interval",
    "zoom": true|false,
    "legendFilter": true|false,
    "legendFocus": true|false
  },
  "title": "short plot title"
}
Defaults: inspect true. Enable select/zoom when the user asks for interactivity.
select "interval" and zoom are mutually exclusive (both use brush) — pick one.
legendFilter/legendFocus only when the chart has a discrete color/fill legend.
Keep specs minimal. Prefer height around 400.

## Refinement
If a current chart spec is provided and the request is a modification, return the
modified complete envelope (full spec, not a patch).`;

function formatDatasetBlock(schema: PlaygroundDatasetSchema): string {
  const fields = schema.fields
    .map((f) => `- ${f.name} (${f.type}): ${f.description} e.g. ${JSON.stringify(f.example)}`)
    .join("\n");
  const samples = JSON.stringify(schema.sampleRows, null, 2);
  return `## Selected dataset: ${schema.id} (${schema.label})
${schema.description}
Fields:
${fields}
Sample rows (do not copy into the spec — use data:{"name":"${schema.id}"}):
${samples}`;
}

// Prompt content is static per dataset — assemble (and budget-check) once.
const assembledPrompts = new Map<string, string>();

export function assembleSystemPrompt(datasetId: string): string {
  const cached = assembledPrompts.get(datasetId);
  if (cached !== undefined) return cached;
  const schema = playgroundDatasetSchema(datasetId);
  if (schema === undefined) {
    throw new Error(`unknown dataset: ${datasetId}`);
  }
  const prompt = `${GRAMMAR}\n\n${formatDatasetBlock(schema)}`;
  const bytes = new TextEncoder().encode(prompt).byteLength;
  if (bytes > SYSTEM_PROMPT_MAX_BYTES) {
    throw new Error(`system prompt exceeds budget: ${bytes} > ${SYSTEM_PROMPT_MAX_BYTES}`);
  }
  assembledPrompts.set(datasetId, prompt);
  return prompt;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatRepairUserMessage(priorErrors: unknown[]): string {
  return `The previous envelope failed validation. Here are the raw SpecError objects (preserve allowed and fix.example when correcting). Return the corrected complete envelope as one JSON object.\n\n${JSON.stringify(priorErrors.slice(0, PRIOR_ERRORS_MAX))}`;
}

export interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export function buildChatMessages(input: {
  readonly datasetId: string;
  readonly prompt: string;
  readonly currentSpec?: unknown;
  readonly priorEnvelope?: unknown;
  // Explicit `| undefined`: under exactOptionalPropertyTypes the callers pass an
  // `unknown[] | undefined` local rather than omitting the key, and the body
  // below already branches on `!== undefined`.
  readonly priorErrors?: unknown[] | undefined;
}): { readonly messages: readonly ChatMessage[]; readonly systemBytes: number } {
  const system = assembleSystemPrompt(input.datasetId);
  let userContent = input.prompt.trim();
  if (input.currentSpec !== undefined) {
    userContent += `\n\nCurrent chart spec (modify if this is a refinement request):\n${JSON.stringify(input.currentSpec)}`;
  }
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];

  if (input.priorEnvelope !== undefined && input.priorErrors !== undefined) {
    messages.push(
      { role: "assistant", content: JSON.stringify(input.priorEnvelope) },
      { role: "user", content: formatRepairUserMessage(input.priorErrors) },
    );
  }

  return {
    messages,
    systemBytes: new TextEncoder().encode(system).byteLength,
  };
}

export function totalMessageTokens(messages: readonly ChatMessage[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}
