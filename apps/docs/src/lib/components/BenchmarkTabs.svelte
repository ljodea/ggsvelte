<script lang="ts">
  /**
   * Hero benchmark charts: bun-style compact tabs, one tab per scenario
   * (claim discipline enforced by scripts/gen-benchmark-charts.ts). Styles
   * live in styles/shell.css next to the rest of the benchmark chrome
   * (external stylesheet ↔ CSP, see the .benchmarks comment there).
   */
  import { base } from "$app/paths";

  import { Tabs } from "bits-ui";

  import { benchmarkChartSrc } from "$lib/benchmarks/asset-url";
  import { BENCHMARK_CHART_CARDS } from "$lib/generated/benchmark-charts";

  const cards = BENCHMARK_CHART_CARDS;
</script>

<div class="bench-tabs">
  <Tabs.Root value={cards[0]?.id ?? ""}>
    <Tabs.List class="bench-tabs-list" aria-label="Benchmark scenarios">
      {#each cards as card (card.id)}
        <Tabs.Trigger class="bench-tabs-trigger" value={card.id}>
          {card.tab}
        </Tabs.Trigger>
      {/each}
    </Tabs.List>
    {#each cards as card (card.id)}
      <Tabs.Content class="bench-tabs-content" value={card.id}>
        <!-- Title + subtitle are drawn inside the SVG (labs) so README
             embeds stay self-describing; no HTML echo here. -->
        <div class="bench-tabs-chart">
          <img
            class="bench-chart-img bench-chart--light"
            src={`${base}${benchmarkChartSrc(card.path, card.sha256)}`}
            alt={card.alt}
            width={card.width}
            height={card.height}
            loading="lazy"
          />
          <img
            class="bench-chart-img bench-chart--dark"
            src={`${base}${benchmarkChartSrc(card.darkPath, card.sha256)}`}
            alt={card.alt}
            width={card.width}
            height={card.height}
            loading="lazy"
          />
        </div>
      </Tabs.Content>
    {/each}
  </Tabs.Root>
</div>
