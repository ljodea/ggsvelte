import type { PortableSpec } from "@ggsvelte/spec";

function scriptSafeJSON(spec: PortableSpec): string {
  return JSON.stringify(spec, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function playgroundSvelteOutput(spec: PortableSpec): string {
  return `<script lang="ts">
  import type { PortableSpec } from "@ggsvelte/spec";
  import { GGPlot } from "@ggsvelte/svelte";

  const spec: PortableSpec = ${scriptSafeJSON(spec)};
</script>

<GGPlot {spec} />
`;
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
