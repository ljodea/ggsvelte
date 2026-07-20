import { CURRENT_EDITION, gg, type PortableSpec } from "@ggsvelte/spec";

export type PlaygroundOutputKind = "svelte" | "builder" | "portable-spec";

export interface PlaygroundOutput {
  readonly kind: PlaygroundOutputKind;
  readonly label: string;
  readonly supported: boolean;
  readonly code: string;
  readonly reason?: string;
}

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

function builderUnsupportedReason(spec: PortableSpec): string | null {
  if (spec.datasets !== undefined) {
    return "Builder output cannot preserve named inline datasets yet. Copy Svelte or PortableSpec instead.";
  }
  return null;
}

/** Rebuild through the public fluent API used by generated Builder output. */
export function rebuildPlaygroundSpecWithBuilder(spec: PortableSpec): PortableSpec | null {
  if (builderUnsupportedReason(spec) !== null) return null;
  try {
    let builder = gg(spec.data, spec.aes);
    for (const layer of spec.layers) builder = builder.layer(layer);
    if (spec.facet !== undefined) builder = builder.facet(spec.facet);
    if (spec.coord !== undefined) builder = builder.coord(spec.coord);
    if (spec.a11y !== undefined) builder = builder.a11y(spec.a11y);
    if (spec.scales !== undefined) builder = builder.scales(spec.scales);
    if (spec.legend !== undefined) builder = builder.legend(spec.legend);
    if (spec.labs !== undefined) builder = builder.labs(spec.labs);
    if (spec.theme !== undefined) builder = builder.theme(spec.theme);
    return {
      ...builder.spec(),
      ...(spec.$schema === undefined ? {} : { $schema: spec.$schema }),
      edition: spec.edition ?? CURRENT_EDITION,
      ...(spec.width === undefined ? {} : { width: spec.width }),
      ...(spec.height === undefined ? {} : { height: spec.height }),
    };
  } catch {
    return null;
  }
}

function builderJSON(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function sortedJSONValue(input: unknown): unknown {
  if (Array.isArray(input)) return input.map((entry) => sortedJSONValue(entry));
  if (typeof input !== "object" || input === null) return input;
  return Object.fromEntries(
    Object.entries(input)
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortedJSONValue(entry)]),
  );
}

function sortedJSON(value: unknown): string {
  return JSON.stringify(sortedJSONValue(value));
}

function builderCall(name: string, value: unknown): string {
  return `  .${name}(${builderJSON(value)})`;
}

export function playgroundBuilderOutput(spec: PortableSpec): PlaygroundOutput {
  const unsupported = builderUnsupportedReason(spec);
  if (unsupported !== null) {
    return {
      kind: "builder",
      label: "Builder",
      supported: false,
      code: "",
      reason: unsupported,
    };
  }

  const rebuilt = rebuildPlaygroundSpecWithBuilder(spec);
  if (rebuilt === null || sortedJSON(rebuilt) !== sortedJSON(spec)) {
    return {
      kind: "builder",
      label: "Builder",
      supported: false,
      code: "",
      reason:
        "The public Builder cannot reproduce this normalized PortableSpec exactly. Copy Svelte or PortableSpec instead.",
    };
  }

  const startArguments = [spec.data, spec.aes]
    .map((value) => (value === undefined ? "undefined" : builderJSON(value)))
    .join(", ")
    .replace(/, undefined$/u, "");
  const calls = [
    ...spec.layers.map((layer) => builderCall("layer", layer)),
    ...(spec.facet === undefined ? [] : [builderCall("facet", spec.facet)]),
    ...(spec.coord === undefined ? [] : [builderCall("coord", spec.coord)]),
    ...(spec.a11y === undefined ? [] : [builderCall("a11y", spec.a11y)]),
    ...(spec.scales === undefined ? [] : [builderCall("scales", spec.scales)]),
    ...(spec.legend === undefined ? [] : [builderCall("legend", spec.legend)]),
    ...(spec.labs === undefined ? [] : [builderCall("labs", spec.labs)]),
    ...(spec.theme === undefined ? [] : [builderCall("theme", spec.theme)]),
  ];
  const metadata = {
    ...(spec.$schema === undefined ? {} : { $schema: spec.$schema }),
    edition: spec.edition ?? CURRENT_EDITION,
    ...(spec.width === undefined ? {} : { width: spec.width }),
    ...(spec.height === undefined ? {} : { height: spec.height }),
  };
  const metadataLines = Object.entries(metadata)
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${builderJSON(value)},`)
    .join("\n");
  return {
    kind: "builder",
    label: "Builder",
    supported: true,
    code: `import { gg, type PortableSpec } from "@ggsvelte/svelte";\n\nconst built = gg(${startArguments})\n${calls.join("\n")}\n  .spec();\n\nconst spec: PortableSpec = {\n  ...built,\n${metadataLines}\n};\n\nexport { spec };\n`,
  };
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
