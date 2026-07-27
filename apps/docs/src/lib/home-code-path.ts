/**
 * Home code-path triptych: the same penguins chart as GrammarDemo, shown as
 * Svelte children, the TypeScript builder, and agent JSON.
 *
 * Hand-authored (not loadExample) so the JSON tab can use data: { name } and
 * never dump every row into a mile-tall panel. Matches the interactive demo
 * above the fold — not the hero Guerry chart.
 *
 * Interaction: GrammarDemo step 4 uses exact inspect (nearest-point hover/pin
 * tooltips, no vertical axis guide). That is a GGPlot host prop — not a
 * PortableSpec field and not a builder method.
 * - Svelte / builder: set `inspect` on <GGPlot>
 * - JSON: agent envelope `{ interactions, spec }` (playground host maps
 *   interactions onto GGPlot props; bare PortableSpec is also accepted and
 *   defaults inspect on)
 *
 * Smooth params: local-linear loess (degree 1, span 0.9). The specimen has
 * ~10 rows per species; default degree-2 / span 0.75 overfits and jaggeds.
 */

const HOME_CODE_PATH_SVELTE = `<script lang="ts">
  import { GeomPoint, GeomSmooth, GGPlot } from "@ggsvelte/svelte";

  import { penguins } from "./penguins.js";
</script>

<GGPlot
  data={penguins}
  aes={{ x: "flipper", y: "mass", color: "species" }}
  inspect={{ mode: "exact", pin: true, maxDistance: 24 }}
  width={640}
  height={400}
>
  <GeomPoint alpha={0.72} />
  <GeomSmooth method="loess" span={0.9} degree={1} se={false} />
</GGPlot>
`;

/** Builder produces PortableSpec; inspect is enabled on the host GGPlot. */
const HOME_CODE_PATH_BUILDER = `<script lang="ts">
  import { aes, gg } from "@ggsvelte/spec";
  import { GGPlot } from "@ggsvelte/svelte";

  import { penguins } from "./penguins.js";

  const spec = gg(
    penguins,
    aes({ x: "flipper", y: "mass", color: "species" }),
  )
    .geomPoint({ alpha: 0.72 })
    .geomSmooth({ method: "loess", span: 0.9, degree: 1, se: false })
    .spec();
</script>

<GGPlot
  {spec}
  inspect={{ mode: "exact", pin: true, maxDistance: 24 }}
  width={640}
  height={400}
/>
`;

/**
 * Agent envelope: host interaction flags + named-data PortableSpec.
 * `spec` alone is valid PortableSpec; interactions are applied by the host.
 * `inspect: true` still defaults mode "auto" (path layers use x-crosshair);
 * the homepage host opts into exact via the Svelte/builder tabs above.
 */
const HOME_CODE_PATH_SPEC_JSON = `{
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
          "span": 0.9,
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
