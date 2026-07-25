/**
 * Home code-path triptych: the same penguins chart as GrammarDemo, shown as
 * Svelte children, the TypeScript builder, and agent JSON.
 *
 * Hand-authored (not loadExample) so the JSON tab can use data: { name } and
 * never dump every row into a mile-tall panel. Matches the interactive demo
 * above the fold — not the hero Guerry chart.
 *
 * Interaction: GrammarDemo step 4 is only `inspect` (nearest-point hover/pin
 * tooltips). That is a GGPlot host prop — not a PortableSpec field and not a
 * builder method.
 * - Svelte / builder: set `inspect` on <GGPlot>
 * - JSON: agent envelope `{ interactions, spec }` (playground host maps
 *   interactions onto GGPlot props; bare PortableSpec is also accepted and
 *   defaults inspect on)
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

/** Builder produces PortableSpec; inspect is enabled on the host GGPlot. */
export const HOME_CODE_PATH_BUILDER = `<script lang="ts">
  import { aes, gg } from "@ggsvelte/spec";
  import { GGPlot } from "@ggsvelte/svelte";

  import { penguins } from "./penguins.js";

  const spec = gg(
    penguins,
    aes({ x: "flipper", y: "mass", color: "species" }),
  )
    .geomPoint({ alpha: 0.72 })
    .geomSmooth({ method: "loess", span: 0.75, se: false })
    .spec();
</script>

<GGPlot {spec} inspect width={640} height={400} />
`;

/**
 * Agent envelope: host interaction flags + named-data PortableSpec.
 * `spec` alone is valid PortableSpec; interactions are applied by the host.
 */
export const HOME_CODE_PATH_SPEC_JSON = `{
  "interactions": {
    "inspect": true
  },
  "spec": {
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
    language: "svelte",
  },
  {
    label: "Spec (JSON)",
    code: HOME_CODE_PATH_SPEC_JSON,
    language: "json",
  },
];
