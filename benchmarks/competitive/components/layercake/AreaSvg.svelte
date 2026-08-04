<script>
  import { getContext } from "svelte";
  import { area as d3Area } from "d3-shape";

  const { data, xGet, yGet, height } = getContext("LayerCake");

  // IDENTITY position: baseline is the plot floor ($height), matching the raw
  // d3 adapter's areaGen.y0(ih) — overlaid areas, NOT stacked (fair vs
  // competitors; see #1357).
  const grouped = $derived.by(() => {
    const bySeries = new Map();
    for (const d of $data) {
      let pts = bySeries.get(d.series);
      if (pts === undefined) {
        pts = [];
        bySeries.set(d.series, pts);
      }
      pts.push(d);
    }
    const gen = d3Area()
      .x((d) => $xGet(d))
      .y0($height)
      .y1((d) => $yGet(d));
    return [...bySeries.entries()].map(([series, pts]) => ({
      series,
      color: pts[0].color,
      d: gen(pts),
    }));
  });
</script>

{#each grouped as g (g.series)}
  <path d={g.d} fill={g.color} fill-opacity={0.4} stroke="none" />
{/each}
