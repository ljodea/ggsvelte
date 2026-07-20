<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { colorBehaviorEvidence } from "$lib/color-evidence";
  import CopyCode from "$lib/components/CopyCode.svelte";

  const evidence = colorBehaviorEvidence();
  const rows = [
    { x: 1, y: 2, group: "Alpha" },
    { x: 2, y: 3, group: "Beta" },
    { x: 3, y: 4, group: "Gamma" },
  ];
  let behavior = $state<"cycle" | "error">("cycle");
  const code = $derived(
    `<GGPlot\n  data={rows}\n  aes={{ x: "x", y: "y", color: "group" }}\n  scales={{ color: {\n    range: ["#123456", "#abcdef"],\n    onExhaust: "${behavior}"\n  } }}\n>\n  <GeomPoint size={5} />\n</GGPlot>`,
  );
</script>

<section class="limits" aria-label="Palette limits">
  <header class="section-heading">
    <div>
      <p class="eyebrow">Failure is part of the contract</p>
      <h2>Decide what happens when color runs out.</h2>
    </div>
    <p>
      Cycling keeps a chart renderable and warns once. Strict mode stops before
      two categories can imply the same identity. Both results below come from
      the public validation and pipeline APIs.
    </p>
  </header>

  <div class="limit-grid">
    <article class="incompatible">
      <p class="diagnostic-kind">Validation result</p>
      <code>{evidence.incompatible.code}</code>
      <h3>A sequential scheme cannot drive ordinal categories.</h3>
      <p>{evidence.incompatible.message}</p>
      <dl>
        <div>
          <dt>Path</dt>
          <dd><code>{evidence.incompatible.path}</code></dd>
        </div>
        <div>
          <dt>Safe fix</dt>
          <dd>{evidence.incompatible.fix}</dd>
        </div>
      </dl>
    </article>

    <article class="exhaustion">
      <div class="behavior-heading">
        <div>
          <p class="diagnostic-kind">Pipeline result</p>
          <h3>Two colors, three categories</h3>
        </div>
        <label for="exhaustion-behavior">Exhaustion behavior</label>
        <select id="exhaustion-behavior" bind:value={behavior}>
          <option value="cycle">Cycle and warn</option>
          <option value="error">Stop with error</option>
        </select>
      </div>

      {#if behavior === "cycle"}
        <div class="diagnostic warning" role="status">
          <code>{evidence.cycle.code}</code>
          <p>{evidence.cycle.message}</p>
        </div>
        <div class="plot-paper">
          <GGPlot
            data={rows}
            aes={{ x: "x", y: "y", color: "group" }}
            scales={{
              color: {
                type: "ordinal",
                range: ["#123456", "#abcdef"],
                onExhaust: "cycle",
              },
            }}
            theme="light"
            height={270}
            ariaLabel="Three categories cycling through a two-color range"
          >
            <GeomPoint size={5} />
          </GGPlot>
        </div>
      {:else}
        <div class="diagnostic error" role="alert">
          <code>{evidence.error.code}</code>
          <p>{evidence.error.message}</p>
          <p><strong>Path</strong> <code>{evidence.error.path}</code></p>
          <p>
            <strong>Safe fix</strong> Provide a larger range or an explicit domain.
          </p>
        </div>
      {/if}

      <p class="fragment-label">Svelte fragment</p>
      <CopyCode {code} label="Copy exhaustion example" />
    </article>
  </div>
</section>

<style>
  .limits {
    padding-block: clamp(4rem, 9vw, 8rem);
    border-top: 1px solid var(--line);
  }

  .eyebrow,
  .diagnostic-kind,
  .fragment-label {
    margin: 0;
    color: var(--muted);
    font-size: 0.72rem;
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
    max-width: 12ch;
    margin: 0.25rem 0 0;
    font-size: clamp(2.5rem, 5vw, 4.75rem);
    line-height: 0.94;
  }

  .section-heading > p,
  article > p:not(.diagnostic-kind, .fragment-label) {
    color: var(--muted);
  }

  .limit-grid {
    display: grid;
    grid-template-columns: minmax(16rem, 0.65fr) minmax(0, 1.35fr);
    gap: 1.25rem;
    align-items: start;
  }

  article {
    min-width: 0;
    border: 1px solid var(--line);
    background: var(--paper);
  }

  .incompatible {
    padding: 1.25rem;
  }

  article h3 {
    margin: 0.55rem 0;
    font-size: 1.55rem;
    line-height: 1.05;
  }

  .incompatible > code,
  .diagnostic > code {
    display: inline-block;
    margin-top: 0.75rem;
    color: var(--accent);
    font-weight: 700;
  }

  dl {
    display: grid;
    gap: 0.75rem;
    margin: 1.5rem 0 0;
  }

  dl div {
    padding-top: 0.75rem;
    border-top: 1px solid var(--line);
  }

  dt {
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 650;
    text-transform: uppercase;
  }

  dd {
    margin: 0.25rem 0 0;
  }

  .behavior-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem 1rem;
    align-items: end;
    padding: 1.25rem;
  }

  .behavior-heading label {
    grid-column: 2;
    grid-row: 1;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 650;
  }

  select {
    grid-column: 2;
    grid-row: 2;
    min-height: 44px;
    padding: 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: 2px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
  }

  .diagnostic {
    min-height: 7rem;
    padding: 1rem 1.25rem;
    border-block: 1px solid var(--line);
  }

  .warning {
    background: color-mix(in srgb, #efb118 12%, var(--paper));
  }

  .error {
    background: color-mix(in srgb, #d14d41 10%, var(--paper));
  }

  .diagnostic p {
    margin: 0.4rem 0 0;
  }

  .plot-paper {
    min-width: 0;
    overflow: hidden;
    border-bottom: 1px solid var(--line);
  }

  .fragment-label {
    padding: 0.75rem 1rem 0;
  }

  :global(.copy-code) {
    margin: 0.5rem 1rem 1rem;
  }

  @media (max-width: 50rem) {
    .section-heading,
    .limit-grid {
      grid-template-columns: 1fr;
    }

    .behavior-heading {
      grid-template-columns: 1fr;
    }

    .behavior-heading label,
    select {
      grid-column: 1;
      grid-row: auto;
    }
  }
</style>
