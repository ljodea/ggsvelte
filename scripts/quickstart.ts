export const QUICKSTART_PAGE_FILENAME = "src/routes/+page.svelte";

/**
 * Complete first-chart fixture shared byte-for-byte by docs and packed consumers.
 * Keep this beginner surface to framework-native Svelte composition only.
 */
export const QUICKSTART_PAGE_SVELTE = `<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  const cars = [
    { weight: 1.8, economy: 37 },
    { weight: 2.4, economy: 31 },
    { weight: 3.1, economy: 25 },
    { weight: 4.0, economy: 19 },
  ];
</script>

<svelte:head><title>My first ggsvelte chart</title></svelte:head>

<h1>Fuel economy by vehicle weight</h1>
<GGPlot
  data={cars}
  aes={{ x: "weight", y: "economy" }}
  ariaLabel="Fuel economy decreases as vehicle weight increases"
>
  <GeomPoint />
</GGPlot>`;
