/**
 * Dependency-free dataset schemas shared by the docs client and the
 * playground-api worker. Sample rows are illustrative only; full curated rows
 * live in playground-datasets.ts (client-only).
 */

export type PlaygroundFieldType = "quantitative" | "temporal" | "ordinal" | "nominal";

export interface PlaygroundDatasetField {
  readonly name: string;
  readonly type: PlaygroundFieldType;
  readonly description: string;
  readonly example: string | number;
}

export interface PlaygroundDatasetSchema {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly fields: readonly PlaygroundDatasetField[];
  /** Up to 3 illustrative rows for the system prompt (not full data). */
  readonly sampleRows: readonly Record<string, string | number>[];
}

export const PLAYGROUND_DATASET_SCHEMAS = [
  {
    id: "penguins",
    label: "Penguins",
    description: "Palmer-style penguin measurements: flipper length, body mass, species.",
    fields: [
      {
        name: "flipper",
        type: "quantitative",
        description: "Flipper length in millimetres",
        example: 181,
      },
      {
        name: "mass",
        type: "quantitative",
        description: "Body mass in grams",
        example: 3750,
      },
      {
        name: "species",
        type: "nominal",
        description: "Species name (Adelie, Chinstrap, Gentoo)",
        example: "Adelie",
      },
      {
        name: "id",
        type: "nominal",
        description: "Stable row key for selection",
        example: "a1",
      },
    ],
    sampleRows: [
      { id: "a1", species: "Adelie", flipper: 181, mass: 3750 },
      { id: "c1", species: "Chinstrap", flipper: 196, mass: 4050 },
      { id: "g1", species: "Gentoo", flipper: 211, mass: 5000 },
    ],
  },
  {
    id: "monthly",
    label: "Monthly series",
    description: "Monthly metric values for a single series (ISO dates).",
    fields: [
      {
        name: "date",
        type: "temporal",
        description: "Month start as ISO date YYYY-MM-DD",
        example: "2024-01-01",
      },
      {
        name: "value",
        type: "quantitative",
        description: "Metric value for the month",
        example: 42,
      },
      {
        name: "id",
        type: "nominal",
        description: "Stable row key",
        example: "m1",
      },
    ],
    sampleRows: [
      { id: "m1", date: "2024-01-01", value: 42 },
      { id: "m2", date: "2024-02-01", value: 48 },
      { id: "m3", date: "2024-03-01", value: 39 },
    ],
  },
  {
    id: "categories",
    label: "Categories",
    description: "Categorical counts by region and channel.",
    fields: [
      {
        name: "region",
        type: "nominal",
        description: "Geographic region",
        example: "North",
      },
      {
        name: "channel",
        type: "nominal",
        description: "Acquisition channel",
        example: "email",
      },
      {
        name: "amount",
        type: "quantitative",
        description: "Pre-aggregated amount",
        example: 120,
      },
      {
        name: "id",
        type: "nominal",
        description: "Stable row key",
        example: "r1",
      },
    ],
    sampleRows: [
      { id: "r1", region: "North", channel: "email", amount: 120 },
      { id: "r2", region: "South", channel: "chat", amount: 85 },
      { id: "r3", region: "West", channel: "phone", amount: 64 },
    ],
  },
] as const satisfies readonly PlaygroundDatasetSchema[];

export type PlaygroundDatasetId = (typeof PLAYGROUND_DATASET_SCHEMAS)[number]["id"];

export function playgroundDatasetSchema(id: string): PlaygroundDatasetSchema | undefined {
  return PLAYGROUND_DATASET_SCHEMAS.find((entry) => entry.id === id);
}

export function isPlaygroundDatasetId(id: string): id is PlaygroundDatasetId {
  return PLAYGROUND_DATASET_SCHEMAS.some((entry) => entry.id === id);
}
