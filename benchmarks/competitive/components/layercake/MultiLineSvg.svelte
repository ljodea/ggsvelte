<script>
  import { getContext } from "svelte";
  import { line as d3line } from "d3-shape";

  const { data, xGet, yGet } = getContext("LayerCake");

  // Group rows by series, then compute one path `d` per series from the
  // LayerCake getters. Done in a single $derived so $-store reads stay valid.
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
    const gen = d3line()
      .x((d) => $xGet(d))
      .y((d) => $yGet(d));
    return [...bySeries.entries()].map(([series, pts]) => ({
      series,
      color: pts[0].color,
      d: gen(pts),
    }));
  });
</script>

{#each grouped as g (g.series)}
  <path d={g.d} stroke={g.color} fill="none" stroke-width={1.5} />
{/each}
