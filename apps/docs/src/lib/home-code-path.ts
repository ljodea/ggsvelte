/**
 * Home code-path triptych: the same penguins chart as GrammarDemo, shown as
 * Svelte children, the TypeScript builder, and agent JSON.
 *
 * Hand-authored (not loadExample) so the JSON tab can use data: { name } and
 * never dump every row into a mile-tall panel. Matches the interactive demo
 * above the fold — not the hero Guerry chart.
 *
 * Data: bundled `palmerPenguins` from `@ggsvelte/svelte/data` (333 complete
 * cases). Field names match the published dataset, not the short theme-specimen
 * aliases.
 *
 * Interaction: GrammarDemo step 4 uses xy inspect (numeric crosshair on both
 * axes) plus legendFocus. Those are GGPlot host props — not PortableSpec
 * fields and not builder methods.
 * - Svelte / builder: set `inspect` / `legendFocus` / `key` on <GGPlot>
 * - JSON: agent envelope `{ interactions, spec }` (host maps interactions onto
 *   GGPlot props; bare PortableSpec is also accepted and defaults inspect on)
 */

const HOME_CODE_PATH_SVELTE = `<script lang="ts">
  import { GeomPoint, GeomSmooth, GGPlot } from "@ggsvelte/svelte";
  import { palmerPenguins } from "@ggsvelte/svelte/data";
</script>

<GGPlot
  data={palmerPenguins}
  key="id"
  aes={{ x: "flipperLengthMm", y: "bodyMassG", color: "species" }}
  inspect={{ mode: "xy", pin: true, maxDistance: 24 }}
  legendFocus
  width={640}
  height={400}
>
  <GeomPoint alpha={0.72} />
  <GeomSmooth method="loess" span={0.75} degree={1} se={false} />
</GGPlot>
`;

/** Builder produces PortableSpec; inspect/legendFocus are host GGPlot props. */
const HOME_CODE_PATH_BUILDER = `<script lang="ts">
  import { aes, gg } from "@ggsvelte/spec";
  import { GGPlot } from "@ggsvelte/svelte";
  import { palmerPenguins } from "@ggsvelte/svelte/data";

  const spec = gg(
    palmerPenguins,
    aes({ x: "flipperLengthMm", y: "bodyMassG", color: "species" }),
  )
    .geomPoint({ alpha: 0.72 })
    .geomSmooth({ method: "loess", span: 0.75, degree: 1, se: false })
    .spec();
</script>

<GGPlot
  {spec}
  key="id"
  inspect={{ mode: "xy", pin: true, maxDistance: 24 }}
  legendFocus
  width={640}
  height={400}
/>
`;

/**
 * Agent envelope: host interaction flags + named-data PortableSpec.
 * `spec` alone is valid PortableSpec; interactions are applied by the host.
 * `inspect: true` still defaults mode "auto"; the homepage host opts into xy.
 */
const HOME_CODE_PATH_SPEC_JSON = `{
  "interactions": {
    "inspect": true,
    "legendFocus": true
  },
  "spec": {
    "edition": 2,
    "data": { "name": "palmerPenguins" },
    "layers": [
      {
        "geom": "point",
        "stat": "identity",
        "position": "identity",
        "aes": {
          "x": { "field": "flipperLengthMm" },
          "y": { "field": "bodyMassG" },
          "color": { "field": "species" }
        },
        "params": { "alpha": 0.72 }
      },
      {
        "geom": "smooth",
        "stat": "smooth",
        "position": "identity",
        "aes": {
          "x": { "field": "flipperLengthMm" },
          "y": { "field": "bodyMassG" },
          "color": { "field": "species" }
        },
        "params": {
          "method": "loess",
          "span": 0.75,
          "degree": 1,
          "se": false
        }
      }
    ]
  }
}
`;

/** Only public home code-path surface — tab labels + sources for CodeTabs. */
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
