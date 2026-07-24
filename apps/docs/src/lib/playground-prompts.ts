/**
 * Example prompts with pre-validated canned envelopes (instant, offline).
 * Free-text prompts call the worker; example clicks never do.
 */

import type { PortableSpec } from "@ggsvelte/spec";

import type { PlaygroundAgentEnvelope } from "./playground-agent-envelope";
import { defaultPlaygroundInteractions } from "./playground-agent-envelope";
import type { PlaygroundDatasetId } from "./playground-dataset-schemas";

export interface PlaygroundExamplePrompt {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
  readonly datasetId: PlaygroundDatasetId;
  /** Pre-validated envelope; `spec.data` uses `{name}` until the client inlines rows. */
  readonly envelope: PlaygroundAgentEnvelope;
}

const named = (id: PlaygroundDatasetId): { name: string } => ({ name: id });

const penguinScatter: PortableSpec = {
  edition: 2,
  data: named("penguins"),
  layers: [
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: {
        x: { field: "flipper" },
        y: { field: "mass" },
        color: { field: "species" },
      },
      params: { size: 4, alpha: 0.85 },
    },
  ],
  labs: {
    title: "Penguin flippers and body mass",
    x: "Flipper length (mm)",
    y: "Body mass (g)",
    color: "Species",
  },
  height: 400,
};

const penguinFacet: PortableSpec = {
  edition: 2,
  data: named("penguins"),
  layers: [
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: {
        x: { field: "flipper" },
        y: { field: "mass" },
        color: { field: "species" },
      },
      params: { size: 3.5, alpha: 0.85 },
    },
  ],
  facet: { wrap: { field: "species" }, ncol: 3 },
  labs: {
    title: "Penguins by species",
    x: "Flipper length (mm)",
    y: "Body mass (g)",
    color: "Species",
  },
  height: 400,
};

const monthlyLine: PortableSpec = {
  edition: 2,
  data: named("monthly"),
  layers: [
    {
      geom: "line",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "date" }, y: { field: "value" } },
      params: { linewidth: 1.8 },
    },
    {
      geom: "point",
      stat: "identity",
      position: "identity",
      aes: { x: { field: "date" }, y: { field: "value" } },
      params: { size: 2.5 },
    },
  ],
  scales: { x: { type: "time", parse: "ymd" } },
  labs: { title: "Monthly series", x: "Month", y: "Value" },
  height: 400,
};

const categoryBars: PortableSpec = {
  edition: 2,
  data: named("categories"),
  layers: [
    {
      geom: "col",
      stat: "identity",
      position: "dodge",
      aes: {
        x: { field: "region" },
        y: { field: "amount" },
        fill: { field: "channel" },
      },
    },
  ],
  labs: {
    title: "Amount by region and channel",
    x: "Region",
    y: "Amount",
    fill: "Channel",
  },
  height: 400,
};

export const PLAYGROUND_EXAMPLE_PROMPTS: readonly PlaygroundExamplePrompt[] = [
  {
    id: "interactive-scatter",
    label: "Interactive scatterplot",
    prompt: "Make me an interactive scatterplot",
    datasetId: "penguins",
    envelope: {
      spec: penguinScatter,
      interactions: {
        inspect: true,
        select: "point",
        zoom: true,
        legendFilter: true,
        legendFocus: true,
      },
      title: "Penguin flippers and body mass",
    },
  },
  {
    id: "facet-species",
    label: "Facet by species",
    prompt: "Make the points larger and facet by species",
    datasetId: "penguins",
    envelope: {
      spec: penguinFacet,
      interactions: {
        inspect: true,
        select: false,
        zoom: false,
        legendFilter: true,
        legendFocus: true,
      },
      title: "Penguins by species",
    },
  },
  {
    id: "monthly-brush",
    label: "Brushable line chart",
    prompt: "Show a brushable monthly line chart",
    datasetId: "monthly",
    envelope: {
      spec: monthlyLine,
      interactions: {
        inspect: true,
        select: "interval",
        zoom: false,
        legendFilter: false,
        legendFocus: false,
      },
      title: "Monthly series",
    },
  },
  {
    id: "dodged-bars",
    label: "Dodged bars with legend filter",
    prompt: "Dodged column chart of amount by region, filterable by channel",
    datasetId: "categories",
    envelope: {
      spec: categoryBars,
      interactions: {
        inspect: true,
        select: false,
        zoom: false,
        legendFilter: true,
        legendFocus: true,
      },
      title: "Amount by region and channel",
    },
  },
];

/** Default free-text prefill — refinement of the seeded penguin chart (decision 8A). */
export const PLAYGROUND_DEFAULT_PROMPT = "Make the points larger and facet by species";

export const PLAYGROUND_DEFAULT_DATASET: PlaygroundDatasetId = "penguins";

/** Mock/dev canned envelope when the worker is not called. */
export function mockGenerateEnvelope(
  datasetId: PlaygroundDatasetId = "penguins",
): PlaygroundAgentEnvelope {
  const match = PLAYGROUND_EXAMPLE_PROMPTS.find((entry) => entry.datasetId === datasetId);
  if (match !== undefined) return match.envelope;
  return {
    spec: penguinScatter,
    interactions: defaultPlaygroundInteractions(),
    title: "Generated chart",
  };
}
