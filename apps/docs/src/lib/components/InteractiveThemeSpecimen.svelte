<script lang="ts">
  import { createPlotInteraction, GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type { ThemeSpec } from "@ggsvelte/spec";

  import CopyCode from "$lib/components/CopyCode.svelte";

  const rows = [
    { id: "a-1", period: 1, value: 24, series: "Alpha" },
    { id: "a-2", period: 2, value: 38, series: "Alpha" },
    { id: "a-3", period: 3, value: 52, series: "Alpha" },
    { id: "b-1", period: 1, value: 42, series: "Beta" },
    { id: "b-2", period: 2, value: 31, series: "Beta" },
    { id: "b-3", period: 3, value: 61, series: "Beta" },
    { id: "c-1", period: 1, value: 57, series: "Gamma" },
    { id: "c-2", period: 2, value: 69, series: "Gamma" },
    { id: "c-3", period: 3, value: 76, series: "Gamma" },
  ];
  const scope = {
    keys: "theme-specimen-rows",
    x: "theme-specimen-x",
    y: "theme-specimen-y",
  } as const;
  const interaction = createPlotInteraction<string>();
  const emphasized = $derived(interaction.emphasized(scope));
  const selected = $derived(interaction.selected(scope));
  let paperTheme = $state<"light" | "dark">("light");
  let status = $state(
    "Interaction is chart-local until it publishes semantic state.",
  );
  const theme = $derived<ThemeSpec>({
    name: paperTheme,
    interactionInk: paperTheme === "dark" ? "#f6bd60" : "#17324d",
    interactionMuted: 0.18,
    focusRing: "#e63946",
    crosshair: "#007f8b",
    selectionFill: "rgba(230, 57, 70, 0.16)",
    selectionStroke: "#e63946",
    tooltipPaper: paperTheme === "dark" ? "#242933" : "#fffdf7",
    tooltipInk: paperTheme === "dark" ? "#f6f7f9" : "#172033",
    tooltipBorder: "#007f8b",
    toolActive: "#e63946",
  });
  const closeScript = ["</", "script>"].join("");
  const code = `<script lang="ts">\n  import { createPlotInteraction, GGPlot, type ThemeSpec } from "@ggsvelte/svelte";\n  const interaction = createPlotInteraction<string>();\n  const theme = { name: "light", interactionMuted: 0.18, focusRing: "#e63946", crosshair: "#007f8b", selectionStroke: "#e63946", tooltipPaper: "#fffdf7", tooltipInk: "#172033", tooltipBorder: "#007f8b" } satisfies ThemeSpec;\n${closeScript}\n\n<GGPlot {interaction} {theme} interactionScope={scope} data={rows} key="id" aes={{ x: "period", y: "value", color: "series" }} layers={[{ geom: "point", params: { size: 4 } }]} inspect legendFocus select={{ type: "interval", mode: "xy" }} zoom={{ mode: "x" }} />`;

  function describeLegend(event: {
    phase: "change" | "clear";
    state?: string;
    label?: string;
    keys?: readonly string[];
  }): void {
    status =
      event.phase === "clear"
        ? "Shared legend emphasis cleared."
        : `${event.label ?? "Series"} ${event.state === "committed" ? "pinned" : "previewed"}; ${String(event.keys?.length ?? 0)} shared rows.`;
  }

  function clearShared(): void {
    interaction.clearSelection({ scope, source: "programmatic" });
    interaction.clearEmphasis({ scope, source: "programmatic" });
    interaction.clearIntervals({ scope, source: "programmatic" });
    interaction.resetZoom({ scope, source: "programmatic" });
    status = "Selection, emphasis, and zoom cleared from ordinary Svelte UI.";
  }
</script>

<section class="interactive-theme" aria-label="Custom interaction theme">
  <header class="section-heading">
    <div>
      <p class="eyebrow">ThemeSpec</p>
      <h2>Interaction roles</h2>
    </div>
    <div>
      <p>
        Focus, crosshair, selection, tooltip, muted marks, active tool — each a
        role on ThemeSpec. Semantic keys share emphasis across SVG and canvas.
      </p>
      <label for="interaction-paper">Interaction chart paper</label>
      <select id="interaction-paper" bind:value={paperTheme}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  </header>

  <div class="plots">
    <article>
      <p class="backend">SVG · local inspect overlays</p>
      <GGPlot
        data={rows}
        aes={{ x: "period", y: "value", color: "series" }}
        layers={[{ geom: "point", params: { size: 4 } }]}
        scales={{ color: { type: "ordinal", scheme: "observable10" } }}
        key="id"
        inspect
        select={{ type: "interval", mode: "xy" }}
        zoom={{ mode: "x" }}
        legendFocus
        {interaction}
        interactionScope={scope}
        {theme}
        height={350}
        labs={{ title: "SVG view", x: "Period", y: "Value", color: "Series" }}
        ariaLabel="Interactive SVG series with custom theme roles"
        onlegendfocus={describeLegend}
      >
        <GeomPoint size={4} />
      </GGPlot>
    </article>

    <article>
      <p class="backend">Canvas · shared semantic state</p>
      <GGPlot
        data={rows}
        aes={{ x: "period", y: "value", color: "series" }}
        layers={[{ geom: "point", render: "canvas", params: { size: 4 } }]}
        scales={{ color: { type: "ordinal", scheme: "observable10" } }}
        key="id"
        inspect
        select={{ type: "interval", mode: "xy" }}
        zoom={{ mode: "x" }}
        legendFocus
        {interaction}
        interactionScope={scope}
        {theme}
        height={350}
        labs={{
          title: "Canvas view",
          x: "Period",
          y: "Value",
          color: "Series",
        }}
        ariaLabel="Interactive canvas series sharing custom theme state"
        onlegendfocus={describeLegend}
      />
    </article>
  </div>

  <div class="shared-status">
    <div>
      <strong>{emphasized.length} rows emphasized</strong>
      <span
        >{selected.length} rows selected · inspect tooltip and crosshair stay chart-local</span
      >
      <span role="status">{status}</span>
    </div>
    <button type="button" onclick={clearShared}>Clear shared state</button>
  </div>

  <p class="fragment-label">
    Svelte component excerpt · provide your own rows and scope
  </p>
  <CopyCode {code} label="Copy interaction theme code" />
</section>

<style>
  .interactive-theme {
    padding-block: clamp(4rem, 9vw, 8rem);
    border-top: 1px solid var(--line);
  }

  .eyebrow,
  .backend,
  .fragment-label {
    margin: 0;
    color: var(--muted);
    font-size: 0.7rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .section-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.55fr);
    gap: clamp(2rem, 7vw, 7rem);
    align-items: end;
    margin-bottom: 2rem;
  }

  h2 {
    max-width: 11ch;
    margin: 0.25rem 0 0;
    font-size: clamp(2.5rem, 5vw, 4.75rem);
    line-height: 0.94;
  }

  .section-heading > div:last-child > p {
    color: var(--muted);
  }

  .section-heading label {
    display: block;
    margin-top: 1rem;
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 650;
  }

  select {
    width: 100%;
    min-height: 44px;
    margin-top: 0.35rem;
    padding: 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: 2px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
  }

  .plots {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  article {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    background: var(--paper);
  }

  .backend {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--line);
  }

  .shared-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--line);
    border-top: 0;
  }

  .shared-status > div {
    display: grid;
    gap: 0.15rem;
  }

  .shared-status span {
    color: var(--muted);
    font-size: 0.78rem;
  }

  button {
    min-height: 44px;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--line-strong);
    border-radius: 2px;
    background: var(--paper);
    color: var(--ink);
    font: 600 0.82rem/1 var(--body-font);
  }

  .fragment-label {
    margin-top: 1.25rem;
  }

  :global(.copy-code) {
    margin-top: 0.5rem;
  }

  @media (max-width: 58rem) {
    .plots,
    .section-heading {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 38rem) {
    .shared-status {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
