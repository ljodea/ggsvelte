<script lang="ts">
  /**
   * Live finished sakura chart for the getting-started lesson.
   *
   * Owns the 838-point fold lifecycle: measure the host, drop callouts when
   * narrow, and load GGPlot only when near the viewport so mobile chrome stays
   * tappable (#972). Intermediate step charts stay static SVGs in the guide.
   *
   * Tooltips show only the bloom date as "Apr 21, 1519" — not year + axis-lab
   * pairs. Epoch names are italic via CSS on the epochNames glyph layer until
   * GeomText gains a real fontStyle param (tracked as a follow-up issue).
   */
  import { onMount } from "svelte";

  import {
    foldSakura,
    SAKURA_RECORDS,
    SAKURA_STEPS,
  } from "$scripts/quickstart";
  import {
    LESSON_CHART_HEIGHT,
    LESSON_CHART_WIDTH,
    sakuraFinishedHeight,
  } from "$lib/generated/lesson-charts";
  import { observeUserIntent } from "$lib/load-on-intent";
  import type { PlotInspectionChange } from "@ggsvelte/svelte";
  import { kyotoSakura } from "@ggsvelte/svelte/data";

  const {
    placeholderSrc,
  }: {
    /** Build-time SVG shown until the live plot mounts. */
    placeholderSrc: string;
  } = $props();

  const rows = kyotoSakura.map((row) => ({ ...row }));

  /**
   * Below this chart width, hand-placed callouts collide with the data, so the
   * records move into the aria-label only (bands, trend and points never move).
   * Measured on the chart container, never on the viewport.
   */
  const NARROW_CHART = 560;

  /**
   * Assume narrow until the host is measured. Starting at `false` forced a wide
   * fold on first paint, then a second 838-point fold when ResizeObserver fired
   * — on mobile that double work blocked chrome for ~17s before "Open site
   * menu" was tappable (#972). Desktop still flips once (narrow → wide) when
   * the container is actually wide enough for callouts.
   *
   * First paint uses the narrow probe height from the generated size table so
   * we do not reserve a desktop-tall plot before ResizeObserver fires.
   */
  let narrowChart = $state(true);
  /** Measured container width; drives live plot height via build-time chrome table. */
  let chartWidth = $state(0);
  let host = $state<HTMLElement>();
  /** Live plot + Inspect — dynamically imported when near the viewport (#972). */
  let LivePlot = $state<null | (typeof import("@ggsvelte/svelte"))["GGPlot"]>(
    null,
  );
  let LiveInspect = $state<
    null | (typeof import("@ggsvelte/svelte"))["Inspect"]
  >(null);

  /**
   * Fold only when the live plot is mounted. Computing the 838-point spec
   * during first hydrate (even behind a placeholder) blocked mobile chrome
   * for ~20s (#972).
   */
  const finished = $derived(
    LivePlot === null
      ? null
      : foldSakura(SAKURA_STEPS.length, rows, { annotations: !narrowChart }),
  );

  /**
   * Outer plot height from the build-time size table (pipeline-measured chrome
   * so the *data panel* stays ~2.5:1). Never invent chrome constants here —
   * regenerating lesson charts refreshes the table.
   */
  const liveHeight = $derived(
    sakuraFinishedHeight(chartWidth > 0 ? chartWidth : NARROW_CHART),
  );

  const recordNames = SAKURA_RECORDS.map((record) => record.label).join("; ");
  const ariaLabel = `Kyoto cherry blossom, finished. Called out: ${recordNames}.`;

  /** "Apr 21, 1519" — same month style as the axis, with the year attached. */
  function formatBloomTooltip(
    bloomDate: unknown,
    year: unknown,
  ): string | null {
    if (typeof bloomDate !== "string" || bloomDate.length === 0) return null;
    const match = /(?:(\d{1,4})-)?(\d{2})-(\d{2})$/.exec(bloomDate);
    if (match === null) return null;
    const monthNum = Number(match[2]);
    const day = Number(match[3]);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ] as const;
    const mon = months[monthNum - 1];
    if (mon === undefined || !Number.isFinite(day)) return null;
    const yearPart =
      match[1] !== undefined && match[1] !== ""
        ? Number(match[1])
        : typeof year === "number"
          ? year
          : null;
    if (yearPart === null || !Number.isFinite(yearPart)) return null;
    return `${mon} ${day}, ${yearPart}`;
  }

  let loadStarted = false;
  let cancelled = false;

  function loadLivePlot(): void {
    if (loadStarted || LivePlot !== null) return;
    loadStarted = true;
    void import("@ggsvelte/svelte").then((mod) => {
      if (!cancelled) {
        LivePlot = mod.GGPlot;
        LiveInspect = mod.Inspect;
      }
    });
  }

  onMount(() => {
    const target = host;
    if (target === undefined) return;
    cancelled = false;

    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width;
            if (width !== undefined) {
              narrowChart = width < NARROW_CHART;
              chartWidth = width;
            }
          });
    observer?.observe(target);

    // Intent only — near-viewport auto-upgrade still folded 838 points as
    // soon as the chart approached the fold and stalled chrome (#972).
    // Match ThemeSpecimen / ExampleLiveFrame: static shell until hover/focus.
    const stopIntent = observeUserIntent(target, loadLivePlot);

    return () => {
      cancelled = true;
      observer?.disconnect();
      stopIntent();
    };
  });
</script>

{#snippet sakuraTooltip(
  inspection: PlotInspectionChange<Record<string, unknown>, PropertyKey>,
)}
  {@const row = inspection.focus.row as {
    bloomDate?: unknown;
    year?: unknown;
  } | null}
  {@const label = formatBloomTooltip(row?.bloomDate, row?.year)}
  {#if label !== null}
    <div class="sakura-tooltip">{label}</div>
  {/if}
{/snippet}

<div class="finished-chart lesson-output" bind:this={host}>
  {#if LivePlot && finished}
    <LivePlot spec={finished.spec} height={liveHeight} {ariaLabel}>
      {#if finished.inspect && LiveInspect}
        <LiveInspect
          mode="exact"
          pin
          identity={finished.key}
          content={sakuraTooltip}
        />
      {/if}
    </LivePlot>
  {:else}
    <img
      class="lesson-chart"
      src={placeholderSrc}
      width={LESSON_CHART_WIDTH}
      height={LESSON_CHART_HEIGHT}
      alt={ariaLabel}
    />
    <button type="button" class="load-interactive" onclick={loadLivePlot}>
      Load interactive chart
    </button>
  {/if}
</div>

<style>
  .lesson-output {
    position: relative;
    min-width: 0;
    overflow: hidden;
    background: #fff;
    color: #172033;
  }

  /*
   * The finished chart gains a tooltip and a pinned-value rail on hydration.
   * Floor matches the narrow probe height (~280–320px), not the desktop one —
   * over-reserving leaves empty space under a phone chart.
   */
  .finished-chart {
    min-height: 18rem;
  }

  .lesson-chart {
    display: block;
    width: 100%;
    height: auto;
  }

  .load-interactive {
    position: absolute;
    right: 0.75rem;
    bottom: 0.75rem;
    margin: 0;
    padding: 0.4rem 0.7rem;
    border: 1px solid #c5cad6;
    border-radius: 0.35rem;
    background: color-mix(in srgb, #fff 92%, transparent);
    color: #172033;
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .load-interactive:focus-visible {
    outline: 2px solid #172033;
    outline-offset: 2px;
  }

  .sakura-tooltip {
    font-variant-numeric: tabular-nums;
  }

  /*
   * Epoch names (layer 1) italic until GeomText supports fontStyle. Layer
   * index is stable in foldSakura: epochs=0, epochNames=1, …
   */
  .finished-chart :global(.gg-glyphs[data-layer="1"] text) {
    font-style: italic;
  }

  /*
   * Translucent band fills do not survive forced-colors mode. Epoch names
   * remain available via the aria-label on the live chart.
   */
  @media (forced-colors: active) {
    .lesson-output :global(.gg-marks rect) {
      fill: none;
    }
  }
</style>
