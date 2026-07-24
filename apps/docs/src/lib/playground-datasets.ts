/**
 * Curated playground rows (~40–60 each). Model output uses data: {name};
 * the client inlines values before validation, render, and codegen.
 */

import type { PortableSpec } from "@ggsvelte/spec";

import { isPlaygroundDatasetId, type PlaygroundDatasetId } from "./playground-dataset-schemas";

export type { PlaygroundDatasetId };

/** Expand the 30-row example subset with stable ids and a few extra rows. */
const PENGUINS: readonly Record<string, string | number>[] = [
  { id: "a1", species: "Adelie", flipper: 181, mass: 3750 },
  { id: "a2", species: "Adelie", flipper: 186, mass: 3800 },
  { id: "a3", species: "Adelie", flipper: 195, mass: 3250 },
  { id: "a4", species: "Adelie", flipper: 193, mass: 3450 },
  { id: "a5", species: "Adelie", flipper: 190, mass: 3650 },
  { id: "a6", species: "Adelie", flipper: 191, mass: 3800 },
  { id: "a7", species: "Adelie", flipper: 198, mass: 4400 },
  { id: "a8", species: "Adelie", flipper: 185, mass: 3700 },
  { id: "a9", species: "Adelie", flipper: 195, mass: 4250 },
  { id: "a10", species: "Adelie", flipper: 184, mass: 3325 },
  { id: "a11", species: "Adelie", flipper: 188, mass: 3550 },
  { id: "a12", species: "Adelie", flipper: 192, mass: 3900 },
  { id: "a13", species: "Adelie", flipper: 189, mass: 3600 },
  { id: "a14", species: "Adelie", flipper: 194, mass: 4100 },
  { id: "a15", species: "Adelie", flipper: 187, mass: 3400 },
  { id: "c1", species: "Chinstrap", flipper: 192, mass: 3500 },
  { id: "c2", species: "Chinstrap", flipper: 196, mass: 3900 },
  { id: "c3", species: "Chinstrap", flipper: 193, mass: 3650 },
  { id: "c4", species: "Chinstrap", flipper: 188, mass: 3525 },
  { id: "c5", species: "Chinstrap", flipper: 197, mass: 3725 },
  { id: "c6", species: "Chinstrap", flipper: 198, mass: 3950 },
  { id: "c7", species: "Chinstrap", flipper: 178, mass: 2700 },
  { id: "c8", species: "Chinstrap", flipper: 202, mass: 4150 },
  { id: "c9", species: "Chinstrap", flipper: 205, mass: 4300 },
  { id: "c10", species: "Chinstrap", flipper: 200, mass: 3900 },
  { id: "c11", species: "Chinstrap", flipper: 199, mass: 4000 },
  { id: "c12", species: "Chinstrap", flipper: 191, mass: 3600 },
  { id: "c13", species: "Chinstrap", flipper: 203, mass: 4200 },
  { id: "c14", species: "Chinstrap", flipper: 194, mass: 3750 },
  { id: "c15", species: "Chinstrap", flipper: 201, mass: 4300 },
  { id: "g1", species: "Gentoo", flipper: 211, mass: 4500 },
  { id: "g2", species: "Gentoo", flipper: 230, mass: 5700 },
  { id: "g3", species: "Gentoo", flipper: 210, mass: 4450 },
  { id: "g4", species: "Gentoo", flipper: 218, mass: 5700 },
  { id: "g5", species: "Gentoo", flipper: 215, mass: 5400 },
  { id: "g6", species: "Gentoo", flipper: 219, mass: 5200 },
  { id: "g7", species: "Gentoo", flipper: 209, mass: 4800 },
  { id: "g8", species: "Gentoo", flipper: 215, mass: 5150 },
  { id: "g9", species: "Gentoo", flipper: 213, mass: 4650 },
  { id: "g10", species: "Gentoo", flipper: 217, mass: 5250 },
  { id: "g11", species: "Gentoo", flipper: 221, mass: 5550 },
  { id: "g12", species: "Gentoo", flipper: 222, mass: 5400 },
  { id: "g13", species: "Gentoo", flipper: 216, mass: 5000 },
  { id: "g14", species: "Gentoo", flipper: 224, mass: 5600 },
  { id: "g15", species: "Gentoo", flipper: 214, mass: 4900 },
];

const MONTHLY: readonly Record<string, string | number>[] = Array.from(
  { length: 48 },
  (_, index) => {
    const year = 2022 + Math.floor(index / 12);
    const month = (index % 12) + 1;
    const date = `${String(year)}-${String(month).padStart(2, "0")}-01`;
    const value = Math.round(40 + 12 * Math.sin(index / 3) + (index % 7) * 2);
    return { id: `m${index + 1}`, date, value };
  },
);

const REGIONS = ["North", "South", "East", "West"] as const;
const CHANNELS = ["email", "chat", "phone"] as const;
const CATEGORIES: readonly Record<string, string | number>[] = (() => {
  const rows: Record<string, string | number>[] = [];
  let n = 0;
  for (const region of REGIONS) {
    for (const channel of CHANNELS) {
      for (let i = 0; i < 4; i++) {
        n += 1;
        rows.push({
          id: `r${n}`,
          region,
          channel,
          amount: 40 + n * 7 + i * 3,
        });
      }
    }
  }
  return rows;
})();

const DATASET_ROWS: Record<PlaygroundDatasetId, readonly Record<string, string | number>[]> = {
  penguins: PENGUINS,
  monthly: MONTHLY,
  categories: CATEGORIES,
};

export function playgroundDatasetRows(
  id: PlaygroundDatasetId,
): readonly Record<string, string | number>[] {
  return DATASET_ROWS[id];
}

export function resolvePlaygroundDatasetId(id: string): PlaygroundDatasetId | null {
  return isPlaygroundDatasetId(id) ? id : null;
}

/**
 * Replace `data: { name }` with inlined `data: { values }` for the named
 * curated dataset. Specs that already use values/columns pass through.
 */
export function inlinePlaygroundDatasetRows(spec: PortableSpec, datasetId: string): PortableSpec {
  const data = spec.data;
  if (data === undefined || !("name" in data) || typeof data.name !== "string") {
    return spec;
  }
  const id = resolvePlaygroundDatasetId(datasetId);
  if (id === null) {
    // Fall back to the name claimed in the spec when the request dataset is unknown.
    const named = resolvePlaygroundDatasetId(data.name);
    if (named === null) return spec;
    return {
      ...spec,
      data: { values: [...playgroundDatasetRows(named)] },
    };
  }
  // Prefer the selected dataset over a mismatched name the model may emit.
  return {
    ...spec,
    data: { values: [...playgroundDatasetRows(id)] },
  };
}

/** Variable name used in emitted Svelte snippets for a dataset. */
export function playgroundDatasetVarName(id: PlaygroundDatasetId): string {
  switch (id) {
    case "penguins":
      return "penguins";
    case "monthly":
      return "monthly";
    case "categories":
      return "categories";
  }
}
