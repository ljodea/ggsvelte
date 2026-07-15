<script lang="ts">
  import type { PortableSpec, SpecInput } from "@ggsvelte/spec";

  import GGPlot from "../../src/lib/GGPlot.svelte";

  interface Datum {
    id: string;
    sequence: number;
    x: number;
    y: number;
  }

  const rows: Datum[] = [
    { id: "a", sequence: 1, x: 1, y: 2 },
    { id: "b", sequence: 2, x: 2, y: 3 },
  ];
  const columns = {
    id: rows.map((row) => row.id),
    sequence: rows.map((row) => row.sequence),
    x: rows.map((row) => row.x),
    y: rows.map((row) => row.y),
  };
  const namedSpec: SpecInput = {
    data: { name: "points" },
    datasets: { points: { values: rows } },
    aes: { x: "x", y: "y" },
    layers: [{ geom: "point" }],
  };
  const portableSpec: PortableSpec = {
    version: 0,
    edition: 1,
    data: { columns },
    aes: { x: { field: "x" }, y: { field: "y" } },
    layers: [{ geom: "point", stat: "identity", position: "identity" }],
  };
</script>

<!-- These assignments are compile-time regression locks for field/accessor
     identity inference across semantic callbacks. -->
<GGPlot
  data={rows}
  aes={{ x: "x", y: "y" }}
  layers={[{ geom: "point" }]}
  key="id"
  inspect
  oninspect={(event) => {
    if (event.phase === "change") {
      const key: string | null = event.focus.key;
      void key;
    }
  }}
/>

<GGPlot
  data={columns}
  aes={{ x: "x", y: "y" }}
  layers={[{ geom: "point" }]}
  key={(row: Datum) => row.sequence}
  inspect
  oninspect={(event) => {
    if (event.phase === "change") {
      const row: Datum | null = event.focus.row;
      const key: number | null = event.focus.key;
      void row;
      void key;
    }
  }}
/>

<GGPlot
  spec={namedSpec}
  key={(row: Datum) => row.id}
  inspect
  oninspect={(event) => {
    if (event.phase === "change") {
      const row: Datum | null = event.focus.row;
      const key: string | null = event.focus.key;
      void row;
      void key;
    }
  }}
/>

<GGPlot
  spec={portableSpec}
  key={(row: Datum) => row.sequence}
  select="point"
  onselect={(event) => {
    const keys: readonly number[] = event.keys;
    void keys;
  }}
/>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y" }}
  layers={[{ geom: "point" }]}
  key={(row) => row.sequence}
  select="point"
  onselect={(event) => {
    const keys: readonly number[] = event.keys;
    void keys;
  }}
/>
