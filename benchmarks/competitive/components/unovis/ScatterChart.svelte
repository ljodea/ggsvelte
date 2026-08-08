<script lang="ts">
  /**
   * Unovis colored scatter — VisXYContainer + VisScatter + dual VisAxis.
   * Color is a per-point accessor over the categorical `cls` field (same
   * 5-class palette as the other Svelte peers). Updates via setRows.
   */
  import { VisXYContainer, VisScatter, VisAxis } from "@unovis/svelte";

  import { COLORS } from "../../scenarios";

  type Row = { x: number; y: number; cls: string };

  let {
    rows: initialRows,
    width,
    height,
  }: { rows: Row[]; width: number; height: number } = $props();
  // Plain-props mount (zero proxy cost); updates flow through the exported
  // setRows — component exports land on the object returned by svelte's
  // mount(). $state.raw: 30k-row datasets must NOT be deep-proxied.
  let rows = $state.raw(initialRows);
  export function setRows(next: Row[]) {
    rows = next;
  }

  const classColor = new Map<string, string>(
    ["series-0", "series-1", "series-2", "series-3", "series-4"].map(
      (name, i) => [name, COLORS[i % COLORS.length]!],
    ),
  );
  const x = (d: Row) => d.x;
  const y = (d: Row) => d.y;
  const color = (d: Row) => classColor.get(d.cls) ?? COLORS[0]!;
</script>

<div style="width:{width}px; height:{height}px; position:relative;">
  <VisXYContainer data={rows} {width} {height}>
    <VisScatter {x} {y} {color} size={3} />
    <VisAxis type="x" />
    <VisAxis type="y" />
  </VisXYContainer>
</div>
