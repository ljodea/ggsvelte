<script lang="ts">
  import { base } from "$app/paths";

  import {
    BENCHMARK_BUNDLE_KB,
    BENCHMARK_CHART_CARDS,
    BENCHMARK_VERSIONS,
  } from "$lib/generated/benchmark-charts";

  type Mark = "yes" | "partial" | "no";

  interface Cell {
    readonly mark: Mark;
    readonly note?: string;
  }

  interface Row {
    readonly feature: string;
    readonly desc: string;
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
      desc: "Min+gzip, 1,000-point scatter app — the price of the full grammar runtime",
      gg: { mark: "partial", note: kb(BENCHMARK_BUNDLE_KB.ggsvelteKb) },
      sp: { mark: "yes", note: kb(BENCHMARK_BUNDLE_KB.svelteplotKb) },
      lc: { mark: "yes", note: kb(BENCHMARK_BUNDLE_KB.layercakeKb) },
    },
    {
      feature: "API stability",
      desc: "Pre-1.0: minors can still break (lifecycle-tracked)",
      gg: { mark: "partial", note: `v${BENCHMARK_VERSIONS.ggsvelte}` },
      sp: { mark: "partial", note: `v${BENCHMARK_VERSIONS.svelteplot}` },
      lc: { mark: "yes", note: `v${BENCHMARK_VERSIONS.layercake}` },
    },
    {
      feature: "Headless server-side SVG",
      desc: "data → SVG string in Node/Bun, no DOM",
      gg: yes,
      sp: { mark: "no", note: "renders an empty shell" },
      lc: { mark: "partial", note: "opt-in ssr flag" },
    },
    {
      feature: "Portable JSON spec + schema",
      desc: "validate() returns machine-applicable fixes",
      gg: yes,
      sp: no,
      lc: no,
    },
    {
      feature: "CLI validator + renderer",
      desc: "ggsvelte-render spec.json > out.svg",
      gg: yes,
      sp: no,
      lc: no,
    },
    {
      feature: "Agent skill",
      desc: "SKILL.md + llms.txt corpus for coding agents",
      gg: yes,
      sp: no,
      lc: no,
    },
    {
      feature: "Automatic temporal detection",
      desc: "ISO dates, year-months, and quarters infer time scales",
      gg: yes,
      sp: { mark: "partial", note: "Date objects only" },
      lc: no,
    },
    {
      feature: "Built-in interactions",
      desc: "Tooltips, selection, zoom, linked views",
      gg: yes,
      sp: { mark: "partial", note: "tooltip + brush marks" },
      lc: { mark: "no", note: "bring your own" },
    },
    {
      feature: "Grammar-of-graphics API",
      desc: "Geoms, stats, positions, and facets as composable layers",
      gg: yes,
      sp: yes,
      lc: { mark: "no", note: "hand-written marks" },
    },
    {
      feature: "Scale, axis & coord control",
      desc: "Transforms, breaks, expansion, and flips declared as data",
      gg: yes,
      sp: yes,
      lc: { mark: "partial", note: "hand-configured d3 scales" },
    },
  ];
</script>

<section class="benchmarks" aria-labelledby="benchmarks-heading">
  <header class="bench-intro">
    <h2 id="benchmarks-heading">Benchmarks we win</h2>
    <p>
      Against its two direct Svelte peers, ggsvelte mounts real datasets faster
      — and ships the agent tooling they don't. Only benchmarks ggsvelte wins
      outright get a chart; the full matrix (d3, uPlot, Chart.js, and ECharts
      included) lives in
      <a
        href="https://github.com/ljodea/ggsvelte/tree/main/benchmarks/competitive"
        >benchmarks/competitive</a
      >.
    </p>
  </header>

  <div class="bench-grid">
    {#each BENCHMARK_CHART_CARDS as card (card.id)}
      <figure class="bench-card">
        <figcaption>
          <h3>{card.title}</h3>
          <p>{card.subtitle}</p>
        </figcaption>
        <div class="bench-chart">
          <img
            class="bench-chart-img bench-chart--light"
            src={`${base}${card.path}`}
            alt={card.alt}
            width={card.width}
            height={card.height}
            loading="lazy"
          />
          <img
            class="bench-chart-img bench-chart--dark"
            src={`${base}${card.darkPath}`}
            alt=""
            aria-hidden="true"
            width={card.width}
            height={card.height}
            loading="lazy"
          />
        </div>
        <p class="bench-foot">{card.footnote}</p>
      </figure>
    {/each}
  </div>

  <div class="bench-table-wrap">
    <table>
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
              <small>{row.desc}</small>
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

  <p class="bench-method">
    ggsvelte {BENCHMARK_VERSIONS.ggsvelte} · SveltePlot {BENCHMARK_VERSIONS.svelteplot}
    · LayerCake {BENCHMARK_VERSIONS.layercake} · median of 11 cold mounts, Chromium
    (Playwright), Linux x64 · charts drawn with ggsvelte's headless renderer · reproduce:
    <code
      >cd benchmarks/competitive && bun run measure:browser && bun run
      measure:bundles</code
    >
  </p>

  <style>
    .benchmarks {
      padding-block: clamp(4rem, 8vw, 7rem);
      border-top: 1px solid var(--line);
    }

    .bench-intro h2 {
      max-width: 14ch;
      margin: 0;
      font-size: clamp(2.5rem, 5vw, 4.75rem);
      line-height: 0.94;
    }

    .bench-intro > p {
      max-width: 56ch;
      color: var(--muted);
    }

    .bench-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
      margin-block: 2rem;
    }

    .bench-card {
      margin: 0;
      padding: 1.25rem 1.25rem 1rem;
      border: 1px solid var(--line);
    }

    .bench-card figcaption h3 {
      margin: 0;
      font-size: 1.05rem;
    }

    .bench-card figcaption p {
      margin: 0.25rem 0 1rem;
      color: var(--muted);
      font-size: 0.85rem;
    }

    .bench-chart-img {
      display: block;
      width: 100%;
      height: auto;
    }

    /* Dark shell swaps to the dark-site portrait (data-theme, not OS scheme —
     * the docs toggle is independent of prefers-color-scheme). Mirrors
     * GrammarDemo's grammar-static--light/dark-site. */
    .bench-chart--dark {
      display: none;
    }

    :global(:root[data-theme="dark"]) .bench-chart--light {
      display: none;
    }

    :global(:root[data-theme="dark"]) .bench-chart--dark {
      display: block;
    }

    .bench-foot {
      margin: 0.75rem 0 0;
      color: var(--muted);
      font-size: 0.8rem;
    }

    .bench-table-wrap {
      overflow-x: auto;
    }

    .benchmarks table {
      width: 100%;
      min-width: 34rem;
      border-collapse: collapse;
      border-top: 1px solid var(--line);
    }

    .benchmarks th,
    .benchmarks td {
      padding: 0.75rem 1rem 0.75rem 0;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }

    .benchmarks thead th {
      font-size: 0.85rem;
      letter-spacing: 0.02em;
    }

    .benchmarks tbody th {
      font-weight: 600;
    }

    .benchmarks tbody th small {
      display: block;
      margin-top: 0.15rem;
      color: var(--muted);
      font-weight: 400;
    }

    .benchmarks td {
      white-space: nowrap;
    }

    .benchmarks td small {
      display: block;
      color: var(--muted);
      font-size: 0.75rem;
      white-space: normal;
    }

    .mark {
      font-weight: 700;
    }

    .mark--yes {
      color: #2e9e5b;
    }

    .mark--partial {
      color: #c98a1b;
    }

    .mark--no {
      color: #c64747;
    }

    .bench-method {
      margin-top: 1rem;
      color: var(--muted);
      font-size: 0.8rem;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (max-width: 42rem) {
      .bench-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</section>
