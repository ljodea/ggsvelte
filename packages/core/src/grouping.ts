/**
 * Group derivation with ggplot2 parity — graduated from the M0a-5 spike
 * (decision 0005; the R-generated fixtures in tests/fixtures/grouping are the
 * executable spec).
 *
 * Runs after data binding and scale-type inference, per facet panel (one
 * panel in M0c), before stats and positions. Rules (see decision 0005):
 *
 * 1. Explicit `aes.group` wins outright: a field-mapped group groups by that
 *    column's values regardless of discreteness; a constant group yields a
 *    single group.
 * 2. Otherwise the effective group is the interaction of every *discrete*
 *    mapped aesthetic, excluding the non-grouping channels `group` and
 *    `label`. String/boolean constants join the interaction (one level —
 *    they can never split rows).
 * 3. Continuous channels never participate.
 * 4. No discrete aesthetic -> a single implicit group (ggplot2's NO_GROUP,
 *    canonicalized to "all rows in group 0", source: "none").
 * 5. Nulls form their own group level.
 * 6. Group ids are canonicalized by first occurrence in row order (0-based).
 *
 * M0c additions over the spike: channel mappings are the spec's canonical
 * ChannelValue forms — `{ stat }` channels and `null` channels never
 * participate in grouping (grouping is pre-stat by construction; normalize
 * resolves null-unset before the pipeline runs).
 */
import type { ChannelValue } from "@ggsvelte/spec";

import type { CellValue, Columns, Discreteness } from "./table.js";

/** Channel-name -> canonical channel form (a resolved layer aes). */
export type AesMapping = Readonly<Record<string, ChannelValue | undefined>>;

/** Per-field discreteness declarations (field name -> declared type). */
export type DeclaredDiscreteness = Readonly<Record<string, Discreteness>>;

export interface GroupDerivation {
  /** Canonical group id per row, renumbered by first occurrence (0-based). */
  readonly groups: readonly number[];
  readonly groupCount: number;
  /**
   * How the groups came about:
   * - "explicit": aes.group was mapped and won
   * - "derived":  interaction of discrete aesthetics
   * - "none":     no discrete aesthetic (ggplot2 NO_GROUP; single group 0)
   */
  readonly source: "explicit" | "derived" | "none";
  /** Fields whose interaction produced the groups ([] for constant group / none). */
  readonly groupedBy: readonly string[];
}

/** Channels that never participate in the discrete interaction. */
const NON_GROUPING_CHANNELS: ReadonlySet<string> = new Set(["group", "label"]);

/** Distinct sentinel for null cells so null forms its own interaction level. */
const NULL_KEY = "\u0000null";
/** Unit separator between interaction components (never occurs in data keys). */
const SEP = "\u001f";

function cellKey(v: CellValue): string {
  if (v === null) return NULL_KEY;
  if (v instanceof Date) return `d${v.getTime()}`;
  return `${typeof v}${SEP}${String(v)}`;
}

function rowCount(columns: Columns): number {
  const cols = Object.values(columns);
  if (cols.length === 0) return 0;
  const n = cols[0]!.length;
  for (const c of cols) {
    if (c.length !== n) throw new Error("deriveGroups: columns have unequal lengths");
  }
  return n;
}

/** Infer a column's discreteness from its values (declaration handled by caller). */
export function inferDiscreteness(column: readonly CellValue[]): Discreteness {
  for (const v of column) {
    if (typeof v === "string" || typeof v === "boolean") return "discrete";
  }
  return "continuous";
}

function fieldDiscreteness(
  field: string,
  columns: Columns,
  declared: DeclaredDiscreteness,
): Discreteness {
  const d = declared[field];
  if (d !== undefined) return d;
  const column = columns[field];
  if (column === undefined) throw new Error(`deriveGroups: unknown field "${field}"`);
  return inferDiscreteness(column);
}

/**
 * Canonicalize row keys to group ids numbered by first occurrence.
 * `groupCount` is the Map size (O(1) after the O(R) pass) — never re-derived
 * via `Math.max(...groups)`, which re-scans R rows and can RangeError when
 * spreading large arrays into call arguments.
 */
function canonicalGroups(
  n: number,
  keyOf: (row: number) => string,
): { groups: number[]; groupCount: number } {
  const ids = new Map<string, number>();
  const groups = Array.from<number>({ length: n });
  for (let i = 0; i < n; i++) {
    const key = keyOf(i);
    let id = ids.get(key);
    if (id === undefined) {
      id = ids.size;
      ids.set(key, id);
    }
    groups[i] = id;
  }
  return { groups, groupCount: ids.size };
}

export function deriveGroups(
  columns: Columns,
  aes: AesMapping,
  declaredDiscreteness: DeclaredDiscreteness = {},
): GroupDerivation {
  const n = rowCount(columns);

  // 1. Explicit aes.group override wins.
  const groupChannel = aes["group"];
  if (groupChannel !== undefined && groupChannel !== null && !("stat" in groupChannel)) {
    if ("value" in groupChannel) {
      // Constant group (e.g. ggplot2's aes(group = 1)): a single group.
      return {
        groups: Array.from({ length: n }, () => 0),
        groupCount: n === 0 ? 0 : 1,
        source: "explicit",
        groupedBy: [],
      };
    }
    const column = columns[groupChannel.field];
    if (column === undefined) {
      throw new Error(`deriveGroups: unknown field "${groupChannel.field}" in aes.group`);
    }
    // Group by value regardless of discreteness (matches ggplot2's id()).
    const { groups, groupCount } = canonicalGroups(n, (i) => cellKey(column[i]!));
    return {
      groups,
      groupCount,
      source: "explicit",
      groupedBy: [groupChannel.field],
    };
  }

  // 2. Interaction of discrete mapped aesthetics.
  const discreteColumns: { field: string; column: readonly CellValue[] }[] = [];
  const constantParts: string[] = [];
  for (const [channel, mapping] of Object.entries(aes)) {
    if (mapping === undefined || mapping === null) continue;
    if (NON_GROUPING_CHANNELS.has(channel)) continue;
    if ("stat" in mapping) continue; // after-stat channels are pre-stat invisible
    if ("value" in mapping) {
      // A literal string/boolean constant is a discrete column of one value in
      // ggplot2; it joins the interaction but can never split rows apart.
      if (typeof mapping.value === "string" || typeof mapping.value === "boolean") {
        constantParts.push(cellKey(mapping.value));
      }
      continue;
    }
    if (fieldDiscreteness(mapping.field, columns, declaredDiscreteness) === "discrete") {
      discreteColumns.push({ field: mapping.field, column: columns[mapping.field]! });
    }
  }

  if (discreteColumns.length === 0 && constantParts.length === 0) {
    // 3. No discrete aesthetic -> ggplot2 NO_GROUP (-1): single implicit group.
    return {
      groups: Array.from({ length: n }, () => 0),
      groupCount: n === 0 ? 0 : 1,
      source: "none",
      groupedBy: [],
    };
  }

  const constantKey = constantParts.join(SEP);
  const { groups, groupCount } = canonicalGroups(n, (i) => {
    const parts = discreteColumns.map(({ column }) => cellKey(column[i]!));
    if (constantKey !== "") parts.push(constantKey);
    return parts.join(SEP);
  });
  return {
    groups,
    groupCount,
    source: "derived",
    groupedBy: discreteColumns.map((c) => c.field),
  };
}
