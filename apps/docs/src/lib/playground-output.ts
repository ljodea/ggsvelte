import type { PortableSpec } from "@ggsvelte/spec";

import { playgroundBuilderOutput } from "./playground-output-builder";
import type { PlaygroundOutput } from "./playground-output-types";

export type { PlaygroundOutput, PlaygroundOutputKind } from "./playground-output-types";
export {
  playgroundBuilderOutput,
  rebuildPlaygroundSpecWithBuilder,
} from "./playground-output-builder";

function scriptSafeJSON(spec: PortableSpec): string {
  return JSON.stringify(spec, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function playgroundSvelteOutput(spec: PortableSpec): string {
  return `<script lang="ts">
  import { GGPlot, type PortableSpec } from "@ggsvelte/svelte";

  const spec: PortableSpec = ${scriptSafeJSON(spec)};
</script>

<GGPlot {spec} />
`;
}

const outputCache = new WeakMap<PortableSpec, readonly PlaygroundOutput[]>();

export function playgroundOutputs(spec: PortableSpec): readonly PlaygroundOutput[] {
  const cached = outputCache.get(spec);
  if (cached !== undefined) return cached;
  const outputs: readonly PlaygroundOutput[] = [
    {
      kind: "svelte",
      label: "Svelte",
      supported: true,
      code: playgroundSvelteOutput(spec),
    },
    playgroundBuilderOutput(spec),
    {
      kind: "portable-spec",
      label: "PortableSpec",
      supported: true,
      code: JSON.stringify(spec, null, 2),
    },
  ];
  outputCache.set(spec, outputs);
  return outputs;
}

/** Test helper proving generated source preserves the committed JSON value. */
export function parseSpecFromSvelteOutput(source: string): PortableSpec {
  const prefix = "const spec: PortableSpec = ";
  const start = source.indexOf(prefix);
  if (start === -1) throw new Error("Generated Svelte output has no spec declaration.");
  const valueStart = start + prefix.length;
  const end = source.indexOf(";\n</script>", valueStart);
  if (end === -1) throw new Error("Generated Svelte output has no complete spec declaration.");
  return JSON.parse(source.slice(valueStart, end)) as PortableSpec;
}
