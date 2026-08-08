<script lang="ts">
  import {
    BENCHMARK_BUNDLE_KB,
    BENCHMARK_VERSIONS,
  } from "$lib/generated/benchmark-charts";

  type Mark = "yes" | "partial" | "no";

  interface Cell {
    readonly mark: Mark;
    readonly note?: string;
  }

  interface Row {
    readonly feature: string;
    readonly desc?: string;
    readonly gg: Cell;
    readonly lc: Cell;
    readonly uv: Cell;
    readonly sp: Cell;
  }

  const GLYPH: Record<Mark, string> = { yes: "✓", partial: "⚠", no: "✗" };
  const WORD: Record<Mark, string> = {
    yes: "yes",
    partial: "partial",
    no: "no",
  };

  const yes: Cell = { mark: "yes" };
  const no: Cell = { mark: "no" };

  const kb = (value: number): string => `${String(Math.round(value))} KB`;

  /*
   * Column order matches cold-mount chart rank (ggsvelte → LayerCake →
   * Unovis → SveltePlot). Bun's homepage table leads with its flaw before
   * the wins; same here: bundle size and pre-1.0 up top. Claims verified
   * against layercake@10 / @unovis/svelte@1.6 / svelteplot@0.14 sources.
   */
  const rows: readonly Row[] = [
    {
      feature: "Bundle size",
      desc: "Min+gzip, 1k scatter app",
      gg: { mark: "partial", note: kb(BENCHMARK_BUNDLE_KB.ggsvelteKb) },
      lc: { mark: "yes", note: kb(BENCHMARK_BUNDLE_KB.layercakeKb) },
      uv: { mark: "yes", note: kb(BENCHMARK_BUNDLE_KB.unovisKb) },
      sp: { mark: "yes", note: kb(BENCHMARK_BUNDLE_KB.svelteplotKb) },
    },
    {
      feature: "API stability",
      desc: "Pre-1.0: minors can still break",
      gg: { mark: "partial", note: `v${BENCHMARK_VERSIONS.ggsvelte}` },
      lc: { mark: "yes", note: `v${BENCHMARK_VERSIONS.layercake}` },
      uv: { mark: "yes", note: `v${BENCHMARK_VERSIONS.unovis}` },
      sp: { mark: "partial", note: `v${BENCHMARK_VERSIONS.svelteplot}` },
    },
    {
      feature: "Headless server-side SVG",
      desc: "data → SVG string, no DOM",
      gg: yes,
      lc: { mark: "partial", note: "opt-in ssr" },
      uv: { mark: "no", note: "client onMount" },
      sp: { mark: "no", note: "empty shell" },
    },
    {
      feature: "Portable JSON spec + schema",
      gg: yes,
      lc: no,
      uv: no,
      sp: no,
    },
    {
      feature: "CLI validator + renderer",
      gg: yes,
      lc: no,
      uv: no,
      sp: no,
    },
    {
      feature: "Agent skill",
      gg: yes,
      lc: no,
      uv: no,
      sp: no,
    },
    {
      feature: "Automatic temporal detection",
      gg: yes,
      lc: no,
      uv: no,
      sp: { mark: "partial", note: "Date only" },
    },
    {
      feature: "Built-in interactions",
      desc: "Tooltip, select, zoom, link",
      gg: yes,
      lc: { mark: "no", note: "bring your own" },
      uv: { mark: "partial", note: "tooltip + crosshair" },
      sp: { mark: "partial", note: "tooltip + brush" },
    },
    {
      feature: "ggplot2 API",
      gg: yes,
      lc: no,
      uv: no,
      sp: no,
    },
    {
      feature: "Scale, axis & coord control",
      gg: yes,
      lc: { mark: "partial", note: "d3 scales" },
      uv: yes,
      sp: yes,
    },
  ];
</script>

<section class="benchmarks" aria-labelledby="benchmarks-heading">
  <header class="bench-intro">
    <h2 id="benchmarks-heading">Why ggsvelte?</h2>
  </header>

  <div class="bench-table-wrap">
    <table>
      <colgroup>
        <col class="bench-col-feature" />
        <col class="bench-col-lib" span="4" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Capability</th>
          <th scope="col">ggsvelte</th>
          <th scope="col">LayerCake</th>
          <th scope="col">Unovis</th>
          <th scope="col">SveltePlot</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.feature)}
          <tr>
            <th scope="row">
              {row.feature}
              {#if row.desc !== undefined}<small>{row.desc}</small>{/if}
            </th>
            {#each [row.gg, row.lc, row.uv, row.sp] as cell, i (i)}
              <td>
                <span class={`mark mark--${cell.mark}`} aria-hidden="true"
                  >{GLYPH[cell.mark]}</span
                ><span class="sr-only">{WORD[cell.mark]}</span>
                {#if cell.note !== undefined}<small>{cell.note}</small>{/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
