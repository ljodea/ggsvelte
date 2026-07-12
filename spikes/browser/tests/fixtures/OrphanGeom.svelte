<script lang="ts">
  import GeomPoint from "../../src/GeomPoint.svelte";
</script>

<!-- Geom with no <GGPlot> ancestor: must be inert, must not throw. -->
<GeomPoint label="orphan" alpha={0.5} />
<p data-after-orphan>still alive</p>
