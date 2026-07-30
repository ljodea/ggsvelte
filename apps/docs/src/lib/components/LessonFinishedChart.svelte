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
  import { observeNearViewport } from "$lib/near-viewport";
  import { Inspect, type PlotInspectionChange } from "@ggsvelte/svelte";
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
  /** Live plot component — dynamically imported when near the viewport (#972). */
  let LivePlot = $state<null | (typeof import("@ggsvelte/svelte"))["GGPlot"]>(
    null,
  );

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

  onMount(() => {
    const target = host;
    if (target === undefined) return;
    let cancelled = false;
    let loadStarted = false;

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

    const loadLivePlot = (): void => {
      if (loadStarted || cancelled) return;
      loadStarted = true;
      void import("@ggsvelte/svelte").then((mod) => {
        if (!cancelled) LivePlot = mod.GGPlot;
      });
    };

    // Shared helper — no idle-load. An early dynamic import + fold still
    // monopolizes the main thread and stalls header clicks (#972).
    // When IntersectionObserver is missing (SSR/tests), observeNearViewport
    // fires immediately so the chart still upgrades, matching ThemeSpecimen.
    const stopNear = observeNearViewport(target, loadLivePlot, {
      rootMargin: "240px 0px",
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      stopNear();
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
    <LivePlot
      spec={finished.spec}
      key={finished.key}
      height={liveHeight}
      {ariaLabel}
    >
      {#if finished.inspect}
        <Inspect mode="exact" pin content={sakuraTooltip} />
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
  {/if}
</div>

<style>
  .lesson-output {
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
