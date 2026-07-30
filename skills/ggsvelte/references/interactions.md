<!-- Source of truth: packages/svelte/src/lib/plot-props.ts, packages/svelte/src/lib/interaction/ (controller, config, diagnostics), packages/svelte/src/lib/index.ts. -->

# Svelte interactions

`@ggsvelte/svelte` requires Svelte `^5.33.1` (peerDependency). Interactions are
opt-in host capabilities — they are not PortableSpec fields. Prefer declaration
children where they exist (`<Inspect>`, `<GuideLegend focus>`). Row identity for
selection, legend focus, and coordinated intervals **defaults** to an `id`
column when present, otherwise the row index — ordinary charts omit `key`.
Pass `key` only as an override for a non-`id` durable field or a custom
accessor (for example `key="year"` on a time series without an `id` column).

## Inspect capability (preferred: child)

```svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot, Inspect } from "@ggsvelte/svelte";
</script>

<GGPlot data={rows} aes={{ x: "x", y: "y" }}>
  <Inspect mode="xy" />
  <GeomPoint />
</GGPlot>
```

Empty `<Inspect />` enables defaults (same as the legacy `inspect={true}` prop).
Options match `InspectOptions`: `mode`, `pin`, `maxDistance`, `contentMode`,
`muteSiblings`, `content` (Snippet). The GGPlot `inspect` prop still works.

### Mark eligibility (opt-out)

Layers are inspectable by default. Set `inspect={false}` on a geom (or
`"inspect": false` in the portable layer) so decorative bands, labels, or
full-panel rects never become tooltip targets (#1065 / #1068). This is portable
and unrelated to the host `<Inspect>` capability.

## Capability props

| Prop / surface | Input                                                            | What it enables                                                                                                                                                                                                                                                                                                                                                                            |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `inspect`      | `boolean \| InspectOptions` on `<GGPlot>`, or `<Inspect>` child  | Tooltip, semantic crosshair, keyboard traversal, pinning. Prefer `<Inspect>`. Options: `mode` (`"auto" \| "exact" \| "x" \| "y" \| "xy"`), `pin`, `maxDistance` (CSS px), `contentMode` (`"informational" \| "interactive"`), `muteSiblings`, `content` (Snippet, see Tooltip below).                                                                                                      |
| `select`       | `false \| "point" \| "interval" \| SelectOptions`                | Point or interval selection. Options: `type` (`"point" \| "interval"`), `mode` (`"x" \| "y" \| "xy"`, interval only), `multiple`, `persistent`, `preset` (faceted intervals, below).                                                                                                                                                                                                       |
| `zoom`         | `boolean \| ZoomOptions`                                         | Brush zoom. Options: `mode` (`"x" \| "y" \| "xy"`), `trigger` (`"brush"`). Currently requires one unfaceted panel.                                                                                                                                                                                                                                                                         |
| `focus`        | `boolean \| { preview?: boolean }` on `<GuideLegend>`            | Discrete legend preview, focus, and linked emphasis **for that aesthetic channel**. Emphasis only — never changes included rows. Discrete legends only; continuous ramps stay static. Mute de-emphasizes non-focused marks; dashed rings appear only on sparse point marks (≤48 anchors), never on paths/areas/bars/segments/text. Host-only — not a PortableSpec / `guideLegend()` field. |
| `legendFilter` | `boolean \| LegendFilterOptions` on `<GGPlot>`                   | Data-changing filtering through discrete legend controls: changes the included rows and reruns the grammar while preserving stable color identity. Options: `mode` (`"exclude" \| "include"`), `multiple`.                                                                                                                                                                                 |
| `key`          | column name or `(row, index) => PropertyKey` (optional override) | Durable row identity for public interaction payloads. **Default:** `id` column when present, else row index. Override only for a non-`id` natural key or a custom accessor. Duplicate or unstable keys are diagnostic errors.                                                                                                                                                              |
| `tool`         | `"inspect" \| "point" \| "select-area" \| "zoom-area"`           | Controlled initial/active tool; observe changes with `ontoolchange`.                                                                                                                                                                                                                                                                                                                       |
| `ariaLabel`    | `string`                                                         | Accessible chart name; falls back to the plot title or a generated label.                                                                                                                                                                                                                                                                                                                  |
| `a11y`         | `A11yMode`                                                       | `"force-svg"` keeps every layer as SVG marks.                                                                                                                                                                                                                                                                                                                                              |

### Deprecated: `legendFocus` on `<GGPlot>`

Since 0.19.0, prefer `<GuideLegend channel="color" focus />`. The plot prop
still enables focus plot-wide until 0.20.0 and emits `DEPRECATED_PLOT_PROP`.

After an interval or zoom commit, accessible controls accept exact bounds.

## Faceted interval presets

`select={{ type: "interval", preset }}` coordinates durable intervals across
facet panels:

- `independent` — only the matching panel consumes its interval.
- `union` — matching rows from every stored panel interval are combined.
- `cross-panel` — the sole origin interval is projected into compatible panels.

`union` and `cross-panel` use the resolved row identity (default `id` / index,
or an explicit `key` override). The engine always supplies an identity, so
these presets no longer fail solely because `key` was omitted.

## Controller: durable shared state

`createPlotInteraction<Key>()` creates chart-independent semantic state that
outlives any one plot. Pass the same controller to every plot that should link,
via the `interaction` prop. The controller owns stable keys and scoped data
domains only; each chart translates them to its own render model.

- Mutation methods: `setSelection(keys, {scope, source?})`, `toggleSelection`,
  `clearSelection`, `setEmphasis`, `clearEmphasis`, `setInterval`,
  `clearInterval`, `clearIntervals`, `setZoom(domains, {scope, source?})`,
  `resetZoom`, `reconcileKeys` (call after replacing rows).
- Reads: `selected(scope)`, `emphasized(scope)`, `isSelected(key, scope)`,
  `intervals(scope)`, `zoom(scope)`, `snapshot`, `revision` (reactive).
- `createPlotInteraction({ onchange })` observes every transition
  (`kind`, `source`, `revision`).

`interactionScope` (`{ keys, x?, y?, intervals? }`) names the identity
namespaces used for linking: key state crosses charts only through `keys`;
data-space zoom crosses one positional channel only when that channel's scope
also matches; `intervals` defaults to `keys`. Give plots matching scope
channels only when they should coordinate.

A `<GGPlot>` component instance also exports `resetScales()` and
`setZoom(domains)` for imperative per-chart control.

## Handlers

`oninspect`, `onselect`, `onzoom`, `onlegendfocus`, `onlegendfilter`,
`oninteraction` (union of all five event types), `ondiagnostic`,
`ontoolchange`, and `onrender(model, spec)` — called after each committed
render with the RenderModel (warnings, advisories, scales) and the normalized
PortableSpec.

A handler without its matching capability (for example `onselect` without
`select` or an enabled capability child), or `interactionScope` without an
`interaction` controller, is inert and emits a development advisory
(`INTERACTION_HANDLER_WITHOUT_CAPABILITY`, `INTERACTION_SCOPE_WITHOUT_CONTROLLER`).
Two `<Inspect>` children last-win with
`INTERACTION_DUPLICATE_INSPECT_CAPABILITY`.

## Tooltip

Enabling inspect (`<Inspect />` or the `inspect` prop) renders the default HTML
tooltip; no extra component is needed. Customize its body with the
`content` prop on `<Inspect>` (or `inspect.content` on the prop form), which
receives a `PlotInspectionChange` (`focus`/`members` are `PlotDatum` values
whose `fields` are `TooltipField` rows: `{ channel, field, value }`). The
exported `Tooltip` component is the same positioned shell for advanced custom
rendering. `TooltipContext` is a deprecated (0.1.0) alias of
`PlotInspectionChange`.

## Diagnostics

`ondiagnostic` receives `PlotDiagnostic`, the union of three catalogs (each
entry has `severity`, `code`, `message`, `prop`, `suggestions`, `docUrl`):

- `INTERACTION_DIAGNOSTIC_CATALOG` — capability/key/lineage checks, e.g.
  `INTERACTION_POINT_REQUIRES_KEY`, `INTERACTION_DUPLICATE_KEY`,
  `INTERACTION_UNSTABLE_KEY`, `INTERACTION_INTERVAL_FACET_UNSUPPORTED`,
  `INTERACTION_INTERVAL_SCALE_UNSUPPORTED` (continuous linear/log/time only),
  `INTERACTION_LEGEND_DISCRETE_ONLY`, `INTERACTION_TOOL_UNAVAILABLE`,
  `INTERACTION_INSPECT_X_ON_COL` / `INTERACTION_INSPECT_X_ON_BAR` (vertical
  guide through columns/bars), `INTERACTION_INSPECT_X_BISECTS_COL_LABELS` /
  `INTERACTION_INSPECT_X_BISECTS_BAR_LABELS` (same guide through on-bar value
  labels), and the two wiring advisories named above.
- `DEPRECATION_DIAGNOSTIC_CATALOG` — one code, `DEPRECATED_PLOT_PROP`, for
  every grammar prop deprecated in 0.11.0 (`prop` carries the name).
- `COMPOSITION_DIAGNOSTIC_CATALOG` — child-layer composition collisions:
  `DUPLICATE_PLOT_LAYER`, `DUPLICATE_SCALE_CHANNEL`, `DUPLICATE_MERGE_KEY`.

## Worked example: linked faceted selection

```svelte fragment
<script lang="ts">
  import {
    createPlotInteraction,
    Facet,
    GeomPoint,
    GGPlot,
    GuideLegend,
  } from "@ggsvelte/svelte";

  const interaction = createPlotInteraction<number>();
  const scope = { keys: "sales-rows", intervals: "sales-range" } as const;
</script>

<GGPlot
  data={rows}
  aes={{ x: "date", y: "value", color: "series" }}
  select={{ type: "interval", mode: "x", preset: "cross-panel" }}
  legendFilter
  {interaction}
  interactionScope={scope}
  oninteraction={(event) => console.log(event.type, event)}
>
  <GuideLegend channel="color" focus />
  <Facet wrap="region" ncol={3} />
  <GeomPoint />
</GGPlot>
```

Any second plot given the same `interaction` controller and a matching
`interactionScope` stays linked: brushing an interval in one panel projects it
cross-panel, external UI can call `interaction.setSelection(...)`, and legend
filtering reruns the grammar without reshuffling series colors.
