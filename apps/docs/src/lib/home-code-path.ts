/**
 * Home code-path triptych: the same penguins chart as GrammarDemo, shown as
 * Svelte children, the TypeScript builder, and a named-data PortableSpec.
 *
 * Hand-authored (not loadExample) so the JSON tab can use data: { name } and
 * never dump every row into a mile-tall panel. Matches the interactive demo
 * above the fold — not the hero Guerry chart.
 */

export const HOME_CODE_PATH_SVELTE = `<script lang="ts">
  import { GeomPoint, GeomSmooth, GGPlot } from "@ggsvelte/svelte";

  import { penguins } from "./penguins.js";
</script>

<GGPlot
  data={penguins}
  aes={{ x: "flipper", y: "mass", color: "species" }}
  inspect
  width={640}
  height={400}
>
  <GeomPoint alpha={0.72} />
  <GeomSmooth method="loess" span={0.75} se={false} />
</GGPlot>
`;

export const HOME_CODE_PATH_BUILDER = `import { aes, gg } from "@ggsvelte/spec";

import { penguins } from "./penguins.js";

export const spec = gg(
  penguins,
  aes({ x: "flipper", y: "mass", color: "species" }),
)
  .geomPoint({ alpha: 0.72 })
  .geomSmooth({ method: "loess", span: 0.75, se: false })
  .spec();
`;

/** Named-data form agents emit when rows are supplied separately at render time. */
export const HOME_CODE_PATH_SPEC_JSON = `{
  "edition": 2,
  "data": { "name": "penguins" },
  "layers": [
    {
      "geom": "point",
      "stat": "identity",
      "position": "identity",
      "aes": {
        "x": { "field": "flipper" },
        "y": { "field": "mass" },
        "color": { "field": "species" }
      },
      "params": { "alpha": 0.72 }
    },
    {
      "geom": "smooth",
      "stat": "smooth",
      "position": "identity",
      "aes": {
        "x": { "field": "flipper" },
        "y": { "field": "mass" },
        "color": { "field": "species" }
      },
      "params": {
        "method": "loess",
        "span": 0.75,
        "se": false
      }
    }
  ]
}
`;

export const HOME_CODE_PATH_TABS: {
  label: string;
  code: string;
  language: string;
}[] = [
  { label: "Svelte", code: HOME_CODE_PATH_SVELTE, language: "svelte" },
  {
    label: "Builder (TS)",
    code: HOME_CODE_PATH_BUILDER,
    language: "typescript",
  },
  {
    label: "Spec (JSON)",
    code: HOME_CODE_PATH_SPEC_JSON,
    language: "json",
  },
];
