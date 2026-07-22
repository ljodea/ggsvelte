import type { PortableSpec } from "@ggsvelte/spec";

export interface PlaygroundSample {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly spec: PortableSpec;
}

export const PLAYGROUND_SAMPLES = [
  {
    id: "starter-scatter",
    title: "Penguin scatter",
    description: "Compare flipper length and body mass by species.",
    spec: {
      edition: 1,
      data: {
        values: [
          { id: "a1", species: "Adelie", flipper: 181, mass: 3750 },
          { id: "a2", species: "Adelie", flipper: 186, mass: 3800 },
          { id: "c1", species: "Chinstrap", flipper: 196, mass: 4050 },
          { id: "c2", species: "Chinstrap", flipper: 201, mass: 4300 },
          { id: "g1", species: "Gentoo", flipper: 211, mass: 5000 },
          { id: "g2", species: "Gentoo", flipper: 221, mass: 5550 },
        ],
      },
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
          params: { size: 4, alpha: 0.82 },
        },
      ],
      labs: {
        title: "Penguin flippers and body mass",
        x: "Flipper length (mm)",
        y: "Body mass (g)",
        color: "Species",
      },
      height: 400,
    },
  },
  {
    id: "monthly-line",
    title: "Monthly line",
    description: "Edit a compact time series with an explicit date parser.",
    spec: {
      edition: 1,
      data: {
        values: [
          { date: "2024-01-01", value: 4 },
          { date: "2024-02-01", value: 7 },
          { date: "2024-03-01", value: 5 },
          { date: "2024-04-01", value: 9 },
        ],
      },
      layers: [
        {
          geom: "line",
          stat: "identity",
          position: "identity",
          aes: { x: { field: "date" }, y: { field: "value" } },
          params: { linewidth: 1.8 },
        },
      ],
      scales: { x: { type: "time", parse: "ymd" } },
      labs: { title: "Monthly series", x: "Month", y: "Value" },
      height: 400,
    },
  },
  {
    id: "raw-years",
    title: "Raw years",
    description: "Infer a calendar axis from unprocessed four-digit year strings.",
    spec: {
      edition: 1,
      data: {
        values: [
          { year: "1835", value: 12 },
          { year: "1900", value: 19 },
          { year: "2026", value: 31 },
        ],
      },
      layers: [
        {
          geom: "line",
          stat: "identity",
          position: "identity",
          aes: { x: { field: "year" }, y: { field: "value" } },
          params: { linewidth: 1.8 },
        },
      ],
      labs: { title: "Raw year inference", x: "Year", y: "Value" },
      height: 400,
    },
  },
  {
    id: "iso-dates",
    title: "ISO dates",
    description: "Infer a calendar axis from unprocessed ISO date strings.",
    spec: {
      edition: 1,
      data: {
        values: [
          { date: "2024-01-01", value: 4 },
          { date: "2024-02-01", value: 7 },
          { date: "2024-03-01", value: 5 },
        ],
      },
      layers: [
        {
          geom: "line",
          stat: "identity",
          position: "identity",
          aes: { x: { field: "date" }, y: { field: "value" } },
          params: { linewidth: 1.8 },
        },
      ],
      labs: { title: "ISO date inference", x: "Date", y: "Value" },
      height: 400,
    },
  },
  {
    id: "ambiguous-dates",
    title: "Ambiguous dates",
    description: "Keep ambiguous day/month strings discrete until a parser is explicit.",
    spec: {
      edition: 1,
      data: {
        values: [
          { date: "03/04/2024", value: 4 },
          { date: "05/06/2024", value: 7 },
          { date: "07/08/2024", value: 5 },
        ],
      },
      layers: [
        {
          geom: "line",
          stat: "identity",
          position: "identity",
          aes: { x: { field: "date" }, y: { field: "value" } },
          params: { linewidth: 1.8 },
        },
      ],
      labs: { title: "Ambiguous dates stay discrete", x: "Date", y: "Value" },
      height: 400,
    },
  },
  {
    id: "post-stat-coordinate",
    title: "Post-stat coordinate transform",
    description: "Fit in ordinary scale space, then project the final x coordinate through log10.",
    spec: {
      edition: 2,
      data: {
        values: [
          { exposure: 1, response: 2.2 },
          { exposure: 2, response: 2.1 },
          { exposure: 5, response: 2.4 },
          { exposure: 10, response: 2.2 },
          { exposure: 20, response: 2.5 },
          { exposure: 50, response: 2.8 },
          { exposure: 100, response: 3.1 },
          { exposure: 200, response: 4.2 },
          { exposure: 500, response: 7.1 },
          { exposure: 1000, response: 12.3 },
        ],
      },
      layers: [
        {
          geom: "point",
          stat: "identity",
          position: "identity",
          aes: { x: { field: "exposure" }, y: { field: "response" } },
          params: { size: 3 },
        },
        {
          geom: "smooth",
          stat: "smooth",
          position: "identity",
          aes: { x: { field: "exposure" }, y: { field: "response" } },
          params: { method: "lm", se: false, n: 80 },
        },
      ],
      coord: { type: "transform", x: { transform: "log10" } },
      labs: {
        title: "Post-stat coordinate transform",
        subtitle: "The linear fit is computed before the x coordinate is projected",
        x: "Exposure (log10 coordinate)",
        y: "Response",
      },
      height: 400,
    },
  },
  {
    id: "fixed-aspect-coordinate",
    title: "Fixed physical data units",
    description:
      "Fit an equal-unit data rectangle after chart chrome so a unit circle stays circular.",
    spec: {
      edition: 2,
      data: {
        values: [
          { x: 1, y: 0 },
          { x: 0.7, y: 0.7 },
          { x: 0, y: 1 },
          { x: -0.7, y: 0.7 },
          { x: -1, y: 0 },
          { x: -0.7, y: -0.7 },
          { x: 0, y: -1 },
          { x: 0.7, y: -0.7 },
          { x: 1, y: 0 },
        ],
      },
      layers: [
        {
          geom: "line",
          stat: "identity",
          position: "identity",
          aes: { x: { field: "x" }, y: { field: "y" } },
          params: { linewidth: 2 },
        },
      ],
      coord: { type: "fixed" },
      labs: {
        title: "Equal units stay circular",
        x: "x",
        y: "y",
      },
      height: 440,
    },
  },
  {
    id: "binned-colorsteps",
    title: "Binned colorsteps",
    description: "Translate quantitative values into deterministic semantic color intervals.",
    spec: {
      edition: 2,
      data: {
        values: [
          { hour: 0, pm25: 4 },
          { hour: 6, pm25: 18 },
          { hour: 12, pm25: 42 },
          { hour: 18, pm25: 76 },
          { hour: 22, pm25: 11 },
        ],
      },
      layers: [
        {
          geom: "point",
          stat: "identity",
          position: "identity",
          aes: {
            x: { field: "hour" },
            y: { field: "pm25" },
            color: { field: "pm25" },
          },
          params: { size: 5 },
        },
      ],
      scales: {
        color: {
          type: "binned",
          breaks: [0, 12, 35, 55, 100],
          range: ["#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
        },
      },
      labs: {
        title: "Particle pollution by hour",
        x: "Hour",
        y: "PM2.5 (µg/m³)",
        color: "PM2.5 band",
      },
      height: 400,
    },
  },
  {
    id: "category-columns",
    title: "Category columns",
    description: "Compare a few named categories with direct values.",
    spec: {
      edition: 1,
      data: {
        values: [
          { category: "North", value: 14 },
          { category: "South", value: 9 },
          { category: "East", value: 17 },
          { category: "West", value: 12 },
        ],
      },
      layers: [
        {
          geom: "col",
          stat: "identity",
          position: "stack",
          aes: { x: { field: "category" }, y: { field: "value" } },
        },
      ],
      labs: { title: "Category totals", x: "Region", y: "Value" },
      height: 400,
    },
  },
] as const satisfies readonly PlaygroundSample[];
