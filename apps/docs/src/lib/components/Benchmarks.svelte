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
    readonly sp: Cell;
    readonly lc: Cell;
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
   * Bun's homepage table leads with its flaw (Node compat) before the wins;
   * same here: bundle size and pre-1.0 up top, then where ggsvelte pulls
   * ahead. Claims verified against svelteplot@0.14 / layercake@10 sources.
   */
  const rows: readonly Row[] = [
    {
      feature: "Bundle size",
      desc: "Min+gzip, 1k scatter app",
      gg: { mark: "partial", note: kb(BENCHMARK_BUNDLE_KB.ggsvelteKb) },
      sp: { mark: "yes", note: kb(BENCHMARK_BUNDLE_KB.svelteplotKb) },
      lc: { mark: "yes", note: kb(BENCHMARK_BUNDLE_KB.layercakeKb) },
    },
    {
      feature: "API stability",
      desc: "Pre-1.0: minors can still break",
      gg: { mark: "partial", note: `v${BENCHMARK_VERSIONS.ggsvelte}` },
      sp: { mark: "partial", note: `v${BENCHMARK_VERSIONS.svelteplot}` },
      lc: { mark: "yes", note: `v${BENCHMARK_VERSIONS.layercake}` },
    },
    {
      feature: "Headless server-side SVG",
      desc: "data → SVG string, no DOM",
      gg: yes,
      sp: { mark: "no", note: "empty shell" },
      lc: { mark: "partial", note: "opt-in ssr" },
    },
    {
      feature: "Portable JSON spec + schema",
      gg: yes,
      sp: no,
      lc: no,
    },
    {
      feature: "CLI validator + renderer",
      gg: yes,
      sp: no,
      lc: no,
    },
    {
      feature: "Agent skill",
      gg: yes,
      sp: no,
      lc: no,
    },
    {
      feature: "Automatic temporal detection",
      gg: yes,
      sp: { mark: "partial", note: "Date only" },
      lc: no,
    },
    {
      feature: "Built-in interactions",
      desc: "Tooltip, select, zoom, link",
      gg: yes,
      sp: { mark: "partial", note: "tooltip + brush" },
      lc: { mark: "no", note: "bring your own" },
    },
    {
      feature: "ggplot2 API",
      gg: yes,
      sp: no,
      lc: no,
    },
    {
      feature: "Scale, axis & coord control",
      gg: yes,
      sp: yes,
      lc: { mark: "partial", note: "hand-configured d3" },
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
        <col class="bench-col-lib" span="3" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Capability</th>
          <th scope="col">ggsvelte</th>
          <th scope="col">SveltePlot</th>
          <th scope="col">LayerCake</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.feature)}
          <tr>
            <th scope="row">
              {row.feature}
              {#if row.desc !== undefined}<small>{row.desc}</small>{/if}
            </th>
            {#each [row.gg, row.sp, row.lc] as cell, i (i)}
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
