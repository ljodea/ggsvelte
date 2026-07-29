/**
 * Pure data/spec identity epoch tokens for inspection reconcile.
 *
 * Host-owned source identity comes from semantic-source-identity.ts (or any
 * stable id function). No runes.
 */

/**
 * O(R) order fingerprint for plot data — row *references* and length, not
 * deep cell values. In-place reverse bumps the token; in-place cell edits on
 * the same row objects do not (hosts should replace rows/arrays for identity).
 *
 * Avoids the former O(R·F) `JSON.stringify` of every cell on each epoch read.
 */
export function dataContentOrderToken(
  data: unknown,
  sourceIdentity: (value: unknown) => string,
): string {
  if (data === null || data === undefined) return "null";
  if (Array.isArray(data)) {
    let token = `v:${data.length}`;
    for (let index = 0; index < data.length; index++) token += `:${sourceIdentity(data[index])}`;
    return token;
  }
  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    const fieldKeys = Object.keys(record);
    // DataRef shapes only when single-key (matches packages/spec isDataRef).
    // A bare column map may own a field named `values`/`columns` alongside
    // other arrays and must not short-circuit (Codex P2).
    if (fieldKeys.length === 1 && fieldKeys[0] === "values" && Array.isArray(record["values"])) {
      const values = record["values"] as unknown[];
      let token = `v:${values.length}`;
      for (let index = 0; index < values.length; index++)
        token += `:${sourceIdentity(values[index])}`;
      return token;
    }
    if (
      fieldKeys.length === 1 &&
      fieldKeys[0] === "columns" &&
      record["columns"] !== null &&
      typeof record["columns"] === "object" &&
      !Array.isArray(record["columns"])
    )
      return `c:${columnMapOrderToken(record["columns"] as Record<string, unknown>, sourceIdentity)}`;
    if (fieldKeys.length === 1 && fieldKeys[0] === "name" && typeof record["name"] === "string")
      return `n:${record["name"]}`;
    // Bare column-oriented object (gg() wraps as { columns }) — fingerprint
    // each field's array identity so in-place column replacement bumps epoch.
    if (fieldKeys.length > 0 && fieldKeys.every((key) => Array.isArray(record[key])))
      return `c:${columnMapOrderToken(record, sourceIdentity)}`;
    return `o:${sourceIdentity(data)}`;
  }
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean")
    return `p:${String(data)}`;
  if (typeof data === "bigint") return `p:${data.toString()}`;
  return `p:${sourceIdentity(data)}`;
}

/** O(fields) fingerprint: each column array's identity (+ length), not cells. */
function columnMapOrderToken(
  columns: Record<string, unknown>,
  sourceIdentity: (value: unknown) => string,
): string {
  const keys = Object.keys(columns).toSorted();
  let token = `${keys.length}`;
  for (const key of keys) {
    const column = columns[key];
    token += `|${key}=${sourceIdentity(column)}`;
    if (Array.isArray(column)) token += `@${column.length}`;
  }
  return token;
}

function datasetsOrderToken(datasets: unknown, sourceIdentity: (value: unknown) => string): string {
  if (datasets === null || datasets === undefined) return "null";
  if (typeof datasets !== "object") return sourceIdentity(datasets);
  const keys = Object.keys(datasets).toSorted();
  let token = `d:${keys.length}`;
  for (const key of keys) {
    token += `|${key}=${dataContentOrderToken(
      (datasets as Record<string, unknown>)[key],
      sourceIdentity,
    )}`;
  }
  return token;
}

/**
 * O(layers) fingerprint of geom-child / layer-local data props.
 * Missing `layers` → `"null"` so legacy callers keep a stable suffix.
 */
function layersDataOrderToken(
  layers: readonly { readonly data?: unknown }[] | undefined,
  sourceIdentity: (value: unknown) => string,
): string {
  if (layers === undefined) return "null";
  let token = `L:${layers.length}`;
  for (let index = 0; index < layers.length; index++) {
    token += `|${index}=${dataContentOrderToken(layers[index]?.data, sourceIdentity)}`;
  }
  return token;
}

/**
 * Input bag for {@link dataIdentityEpochToken}. Built by the host (or
 * {@link buildDataIdentityEpochInput}) so epoch construction stays pure.
 */
export type DataIdentityEpochTokenInput = {
  readonly ready: boolean;
  readonly dataToken: string;
  readonly specToken: string;
  readonly data: unknown;
  readonly datasets: unknown;
  readonly layers?: readonly { readonly data?: unknown }[];
  readonly sourceIdentity: (value: unknown) => string;
};

/**
 * Host-side assembly of {@link DataIdentityEpochTokenInput} from plot props.
 *
 * Pure: no runes, no assembled PortableSpec. Owns the markLayers-vs-layers-prop
 * guard (#609), the ready-without-assembled rule, and the explicit-spec content
 * pick (prop `data` is ignored when `spec` is an object — matches
 * assemblePortableSpec).
 */
export function buildDataIdentityEpochInput(input: {
  readonly data: unknown;
  readonly spec: unknown;
  readonly layers: readonly { readonly data?: unknown }[] | undefined;
  readonly registryMarkLayers: readonly { readonly data?: unknown }[];
  readonly sourceIdentity: (value: unknown) => string;
}): DataIdentityEpochTokenInput {
  // MUST use markLayers when layers prop is absent: the widened Layer union
  // has no `.data` at the top level, so reading registry.layers would silently
  // drop layer-local data from the #609 epoch.
  const layerDescriptors =
    input.layers === undefined
      ? input.registryMarkLayers
      : input.layers.map((layer) => ({ data: layer.data }));
  const ready = input.spec !== undefined || layerDescriptors.length > 0;
  // assemblePortableSpec: explicit `spec` wins and ignores the data prop —
  // fingerprint the rendered source only.
  const contentData =
    input.spec !== undefined && typeof input.spec === "object"
      ? (input.spec as { data?: unknown }).data
      : input.data;
  const contentDatasets =
    input.spec !== undefined && typeof input.spec === "object"
      ? (input.spec as { datasets?: unknown }).datasets
      : undefined;
  return {
    ready,
    dataToken: input.sourceIdentity(input.data),
    specToken: input.sourceIdentity(input.spec),
    data: contentData ?? null,
    datasets: contentDatasets ?? null,
    layers: layerDescriptors,
    sourceIdentity: input.sourceIdentity,
  };
}

/**
 * Stable data/spec identity token for inspection reconcile epochs.
 *
 * Host supplies:
 * - `dataToken` / `specToken` — WeakMap identity of the raw `data` / `spec` props
 * - `data` / `datasets` — content to order-fingerprint (prefer **prop** values,
 *   not a freshly assembled PortableSpec shell, so theme/labs respecs do not
 *   force a re-walk)
 * - `layers` — optional geom-child descriptors whose `data` must also bump the
 *   epoch when plot-level data/spec are absent (#609)
 * - `sourceIdentity` — stable object ids for the O(R) order fingerprint
 *
 * Ready=false (no plot yet) → `"no-data"`. Complexity: O(R) over row refs,
 * not O(R·F) deep cell serialization.
 */
export function dataIdentityEpochToken(input: DataIdentityEpochTokenInput): string {
  if (!input.ready) return "no-data";
  return `${input.dataToken}:${input.specToken}:${dataContentOrderToken(input.data, input.sourceIdentity)}:${datasetsOrderToken(input.datasets, input.sourceIdentity)}:${layersDataOrderToken(input.layers, input.sourceIdentity)}`;
}
