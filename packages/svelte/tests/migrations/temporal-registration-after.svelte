<script lang="ts">
  import { GGPlot, installTemporal } from "../../src/lib/index.js";

  installTemporal();

  const temporalSpec = {
    data: {
      values: [
        { when: "2026-01-01", value: 10 },
        { when: "2026-02-01", value: 20 },
        { when: "2026-03-01", value: 15 },
      ],
    },
    layers: [{ geom: "point" as const, aes: { x: "when", y: "value" } }],
    scales: {
      x: {
        type: "time" as const,
        temporalKind: "date" as const,
      },
    },
  };
</script>

<GGPlot spec={temporalSpec} width={480} height={320} />
