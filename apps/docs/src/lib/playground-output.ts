import type { PortableSpec } from "@ggsvelte/spec";

import {
  defaultPlaygroundInteractions,
  type PlaygroundInteractions,
} from "./playground-agent-envelope";
import { isPlaygroundDatasetId } from "./playground-dataset-schemas";
import { playgroundBuilderOutput } from "./playground-output-builder";
import type { PlaygroundOutput } from "./playground-output-types";

export type { PlaygroundOutput, PlaygroundOutputKind } from "./playground-output-types";
export {
  playgroundBuilderOutput,
  rebuildPlaygroundSpecWithBuilder,
} from "./playground-output-builder";

function scriptSafeJSON(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

/**
 * The data seam is named after the curated dataset the caller selected — never
 * after the shape of the rows (#694). Dataset ids are the single source of
 * truth for dataset identity; an unknown or omitted id is a generic `rows`.
 */
function datasetVarName(datasetId: string | undefined): string {
  if (datasetId !== undefined && isPlaygroundDatasetId(datasetId)) return datasetId;
  return "rows";
}

function interactionPropsSource(interactions: PlaygroundInteractions): string {
  const parts: string[] = [];
  if (interactions.inspect) parts.push("inspect");
  if (interactions.select === "point") parts.push('select="point"');
  if (interactions.select === "interval") parts.push('select="interval"');
  if (interactions.zoom) parts.push("zoom");
  if (interactions.legendFilter) parts.push("legendFilter");
  if (interactions.legendFocus) parts.push("legendFocus");
  if (parts.length === 0) return "";
  return ` ${parts.join(" ")}`;
}

/**
 * Emit a paste-ready Svelte snippet. When the spec has data.values, rows are
 * extracted to a local const with a seam comment (OV1-A).
 */
export function playgroundSvelteOutput(
  spec: PortableSpec,
  interactions: PlaygroundInteractions = defaultPlaygroundInteractions(),
  datasetId?: string,
): string {
  const props = interactionPropsSource(interactions);
  const data = spec.data;

  if (data !== undefined && "values" in data && Array.isArray(data.values)) {
    const varName = datasetVarName(datasetId);
    const rowsLiteral = scriptSafeJSON(data.values);
    // Spec JSON with a sentinel string as data.values — replaced with the variable name.
    const placeholder = "__GG_PLAYGROUND_DATA_VALUES__";
    const withPlaceholder: PortableSpec = {
      ...spec,
      data: { values: placeholder as never },
    };
    let specLiteral = scriptSafeJSON(withPlaceholder);
    // `"values": "<placeholder>"` → `"values": varName` (identifier, not a string).
    // A spec value could forge the sentinel string elsewhere; exactly one
    // occurrence is required or we fall back to plain inline output below.
    const quoted = `"values": ${JSON.stringify(placeholder)}`;
    const occurrences = specLiteral.split(quoted).length - 1;
    if (occurrences !== 1) {
      return `<script lang="ts">
  import { GGPlot, type PortableSpec } from "@ggsvelte/svelte";

  const spec: PortableSpec = ${scriptSafeJSON(spec)};
</script>

<GGPlot {spec}${props} />
`;
    }
    specLiteral = specLiteral.replace(quoted, `"values": ${varName}`);
    return `<script lang="ts">
  import { GGPlot, type PortableSpec } from "@ggsvelte/svelte";

  const ${varName} = ${rowsLiteral}; // ← replace with your rows

  const spec: PortableSpec = ${specLiteral};
</script>

<GGPlot {spec}${props} />
`;
  }

  return `<script lang="ts">
  import { GGPlot, type PortableSpec } from "@ggsvelte/svelte";

  const spec: PortableSpec = ${scriptSafeJSON(spec)};
</script>

<GGPlot {spec}${props} />
`;
}

interface OutputCacheEntry {
  /** Spec-keyed outputs that do not depend on interactions. */
  builder: PlaygroundOutput | null;
  specJson: string | null;
  /** Svelte snippet + assembled tab list per interactions/dataset key. */
  readonly byVariant: Map<string, readonly PlaygroundOutput[]>;
}

const outputCache = new WeakMap<PortableSpec, OutputCacheEntry>();

function variantKey(interactions: PlaygroundInteractions, datasetId: string | undefined): string {
  return JSON.stringify([interactions, datasetId ?? null]);
}

export function playgroundOutputs(
  spec: PortableSpec,
  interactions: PlaygroundInteractions = defaultPlaygroundInteractions(),
  datasetId?: string,
): readonly PlaygroundOutput[] {
  const key = variantKey(interactions, datasetId);
  let entry = outputCache.get(spec);
  if (entry === undefined) {
    entry = { builder: null, specJson: null, byVariant: new Map() };
    outputCache.set(spec, entry);
  }
  const hit = entry.byVariant.get(key);
  if (hit !== undefined) return hit;

  const builder = (entry.builder ??= playgroundBuilderOutput(spec));
  // OV6-A: hide Builder tab when round-trip fails (never show unsupported panel).
  const outputs: PlaygroundOutput[] = [
    {
      kind: "svelte",
      label: "Svelte",
      supported: true,
      code: playgroundSvelteOutput(spec, interactions, datasetId),
    },
  ];
  if (builder.supported) {
    outputs.push(builder);
  }
  outputs.push({
    kind: "portable-spec",
    label: "Spec (JSON)",
    supported: true,
    code: (entry.specJson ??= JSON.stringify(spec, null, 2)),
  });

  const frozen = outputs as readonly PlaygroundOutput[];
  entry.byVariant.set(key, frozen);
  return frozen;
}

/**
 * Test helper: recover the PortableSpec from generated Svelte source.
 * Supports both inline JSON and the data-seam form (`const rows = […]; data.values = rows`).
 */
export function parseSpecFromSvelteOutput(source: string): PortableSpec {
  const prefix = "const spec: PortableSpec = ";
  const start = source.indexOf(prefix);
  if (start === -1) throw new Error("Generated Svelte output has no spec declaration.");
  const valueStart = start + prefix.length;
  const end = source.indexOf(";\n</script>", valueStart);
  if (end === -1) throw new Error("Generated Svelte output has no complete spec declaration.");
  let literal = source.slice(valueStart, end).trim();

  // Data-seam form: values: varName (unquoted identifier).
  const seam = /"values":\s*([A-Za-z_$][\w$]*)/u.exec(literal);
  if (seam?.[1] !== undefined) {
    const varName = seam[1];
    const declRe = new RegExp(`const ${varName} = ([\\s\\S]*?); // ← replace with your rows`, "u");
    const decl = declRe.exec(source);
    if (decl?.[1] === undefined) {
      throw new Error(`Generated Svelte output missing data seam for ${varName}.`);
    }
    const rows = JSON.parse(decl[1]) as unknown[];
    literal = literal.replace(
      new RegExp(`"values":\\s*${varName}`, "u"),
      `"values": ${JSON.stringify(rows)}`,
    );
  }

  return JSON.parse(literal) as PortableSpec;
}
