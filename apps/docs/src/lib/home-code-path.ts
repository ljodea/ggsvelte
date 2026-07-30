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
 * axes) plus GuideLegend focus. Prefer `<Inspect>` for the host capability;
 * legend focus is a host-only prop on `<GuideLegend>` (not a PortableSpec field).
 * - Svelte: `<Inspect>` / `key` on <GGPlot>, `focus` on <GuideLegend>
 * - Builder + spec: same host children; inspect via `<Inspect>`
 * - JSON: agent envelope `{ interactions, spec }` still accepts legendFocus
 *   (deprecated host map until 0.20.0)
 */

const HOME_CODE_PATH_SVELTE = `<script lang="ts">
  import { GeomJitter, GeomSmooth, GGPlot, GuideLegend, Inspect, Labs } from "@ggsvelte/svelte";
  import { palmerPenguins } from "@ggsvelte/svelte/data";
</script>

<GGPlot
  data={palmerPenguins}
  key="id"
  aes={{ x: "flipperLengthMm", y: "bodyMassG", color: "species" }}
  width={640}
  height={400}
>
  <Inspect mode="xy" pin maxDistance={24} />
  <GuideLegend channel="color" focus />
  <Labs x="Flipper length mm" y="Body mass g" color="species" />
  <GeomJitter alpha={0.88} />
  <GeomSmooth method="loess" span={0.75} degree={1} se={false} />
</GGPlot>
`;

/** Builder produces PortableSpec; inspect is a host `<Inspect>` child; focus is GuideLegend. */
const HOME_CODE_PATH_BUILDER = `<script lang="ts">
  import { aes, gg } from "@ggsvelte/spec";
  import { GGPlot, GuideLegend, Inspect } from "@ggsvelte/svelte";
  import { palmerPenguins } from "@ggsvelte/svelte/data";

  const spec = gg(
    palmerPenguins,
    aes({ x: "flipperLengthMm", y: "bodyMassG", color: "species" }),
  )
    .geomJitter({ alpha: 0.88 })
    .geomSmooth({ method: "loess", span: 0.75, degree: 1, se: false })
    .labs({ x: "Flipper length mm", y: "Body mass g", color: "species" })
    .spec();
</script>

<GGPlot
  {spec}
  key="id"
  width={640}
  height={400}
>
  <Inspect mode="xy" pin maxDistance={24} />
  <GuideLegend channel="color" focus />
</GGPlot>
`;

/**
 * Agent envelope: host interaction flags + named-data PortableSpec.
 * `spec` alone is valid PortableSpec; interactions are applied by the host.
 * `inspect: true` still defaults mode "auto"; the homepage host opts into xy
 * via `<Inspect mode="xy" … />` in the Svelte tabs above.
 * `legendFocus` remains in the envelope as a deprecated host map (0.19–0.20).
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
        "geom": "jitter",
        "stat": "identity",
        "position": "jitter",
        "aes": {
          "x": { "field": "flipperLengthMm" },
          "y": { "field": "bodyMassG" },
          "color": { "field": "species" }
        },
        "params": { "alpha": 0.88 }
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
