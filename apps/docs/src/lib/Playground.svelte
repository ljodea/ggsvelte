<script lang="ts">
  import { tick } from "svelte";

  import { GGPlot } from "@ggsvelte/svelte";
  import type {
    AesInput,
    InteractionDiagnostic,
    LayerInput,
    PlotInteractionEvent,
  } from "@ggsvelte/svelte";

  import {
    inferPlaygroundFields,
    parsePlaygroundData,
    PlaygroundDataError,
    recommendPlaygroundFields,
    PLAYGROUND_MAX_BYTES,
    PLAYGROUND_MAX_FIELDS,
    PLAYGROUND_MAX_ROWS,
    type PlaygroundField,
    type PlaygroundRow,
  } from "./playground-data";

  type Mark = "point" | "line" | "col";

  const sampleRows: PlaygroundRow[] = [
    { id: "a1", species: "Adelie", flipper: 181, mass: 3750 },
    { id: "a2", species: "Adelie", flipper: 186, mass: 3800 },
    { id: "c1", species: "Chinstrap", flipper: 196, mass: 4050 },
    { id: "c2", species: "Chinstrap", flipper: 201, mass: 4300 },
    { id: "g1", species: "Gentoo", flipper: 211, mass: 5000 },
    { id: "g2", species: "Gentoo", flipper: 221, mass: 5550 },
  ];
  const sampleSource = JSON.stringify(sampleRows, null, 2);

  let draft = $state(sampleSource);
  let rows = $state<PlaygroundRow[]>(sampleRows);
  let fields = $state<PlaygroundField[]>(inferPlaygroundFields(sampleRows));
  let xField = $state("flipper");
  let yField = $state("mass");
  let colorField = $state("species");
  let keyField = $state("id");
  let mark = $state<Mark>("point");
  let inspectEnabled = $state(false);
  let selectEnabled = $state(false);
  let zoomEnabled = $state(false);
  let revision = $state(0);
  let errorMessage = $state("");
  let errorFix = $state("");
  let lastGoodPreviewShown = $state(true);
  let status = $state(
    "Sample data ready. Choose interaction options or paste your own rows.",
  );
  let eventLog = $state<string[]>([]);
  let alertElement = $state<HTMLDivElement>();

  const numericFields = $derived(
    fields.filter((field) => field.kind === "number"),
  );
  const yFields = $derived(numericFields.length > 0 ? numericFields : fields);
  const renderKey = $derived(
    [
      revision,
      mark,
      xField,
      yField,
      colorField,
      keyField,
      inspectEnabled,
      selectEnabled,
      zoomEnabled,
    ].join("|"),
  );
  const aes = $derived.by(() => {
    const mapping: Record<string, string> = { x: xField, y: yField };
    if (colorField !== "") mapping.color = colorField;
    return mapping as AesInput;
  });
  const layers = $derived.by(
    () =>
      [
        mark === "point"
          ? { geom: "point", params: { size: 4, alpha: 0.82 } }
          : mark === "line"
            ? { geom: "line", params: { linewidth: 1.6 } }
            : { geom: "col" },
      ] as LayerInput[],
  );

  function logEvent(
    event: PlotInteractionEvent<PlaygroundRow, PropertyKey>,
  ): void {
    const detail =
      event.type === "inspect" && event.phase !== "clear"
        ? `${event.state}, ${String(event.members.length)} member${event.members.length === 1 ? "" : "s"}`
        : event.type === "select" && event.phase !== "start"
          ? `${String(event.keys.length)} key${event.keys.length === 1 ? "" : "s"}`
          : event.type === "zoom" && event.phase === "end"
            ? "domains updated"
            : "";
    const entry = `${event.type} · ${event.phase} · ${event.source}${detail === "" ? "" : ` · ${detail}`}`;
    if (
      event.type === "inspect" &&
      event.phase === "change" &&
      eventLog[0]?.startsWith("inspect · change")
    ) {
      eventLog = [entry, ...eventLog.slice(1)];
    } else {
      eventLog = [entry, ...eventLog].slice(0, 12);
    }
  }

  function reportDiagnostic(diagnostic: InteractionDiagnostic): void {
    status = `${diagnostic.code}: ${diagnostic.message} ${diagnostic.suggestions.join("; ")}`;
  }

  async function showError(error: unknown, preserved = true): Promise<void> {
    errorMessage =
      error instanceof Error ? error.message : "The data could not be applied.";
    errorFix =
      error instanceof PlaygroundDataError
        ? error.fix
        : "Keep the last working preview, adjust the data, and try again.";
    lastGoodPreviewShown = preserved;
    await tick();
    alertElement?.focus();
  }

  async function applyData(): Promise<void> {
    try {
      const parsed = parsePlaygroundData(draft);
      const nextFields = inferPlaygroundFields(parsed.rows);
      if (nextFields.length < 2) {
        throw new PlaygroundDataError(
          "INVALID_ROW",
          "The playground needs at least two named fields to draw a chart.",
          "Add another field to each row, then apply the data again.",
        );
      }
      const recommended = recommendPlaygroundFields(nextFields);
      rows = parsed.rows;
      fields = nextFields;
      xField = recommended.x;
      yField = recommended.y;
      colorField = recommended.color;
      keyField = recommended.key;
      revision += 1;
      eventLog = [];
      errorMessage = "";
      errorFix = "";
      lastGoodPreviewShown = true;
      status = `Applied ${String(rows.length)} local row${rows.length === 1 ? "" : "s"}. Nothing was uploaded.`;
    } catch (error) {
      await showError(error);
    }
  }

  function resetSample(): void {
    draft = sampleSource;
    void applyData();
  }

  function rendererFailed(error: unknown): void {
    void showError(error, false);
  }
</script>

<section class="playground" aria-labelledby="playground-heading">
  <div class="intro">
    <p class="eyebrow">Local, bounded, no code execution</p>
    <h1 id="playground-heading">Use my data</h1>
    <p>
      Paste a JSON array of ordinary row objects. The data stays in this browser
      tab: ggsvelte does not upload it, store it, fetch remote URLs, or evaluate
      JavaScript.
    </p>
  </div>

  <div class="workspace">
    <form
      class="controls"
      onsubmit={(event) => {
        event.preventDefault();
        void applyData();
      }}
    >
      <label for="playground-data">JSON rows</label>
      <textarea
        id="playground-data"
        aria-describedby="playground-limits"
        bind:value={draft}
        spellcheck="false"
        rows="16"></textarea>
      <p class="limits" id="playground-limits">
        Up to {PLAYGROUND_MAX_ROWS.toLocaleString()} rows, {PLAYGROUND_MAX_FIELDS}
        fields per row, and {PLAYGROUND_MAX_BYTES / 1024} KiB.
      </p>
      <div class="actions">
        <button class="primary" type="submit">Apply data</button>
        <button type="button" onclick={resetSample}>Reset sample</button>
      </div>

      {#if errorMessage !== ""}
        <div class="error" role="alert" tabindex="-1" bind:this={alertElement}>
          <strong>{errorMessage}</strong>
          <span>{errorFix}</span>
          <span>
            {lastGoodPreviewShown
              ? "The last working preview is still shown."
              : "The renderer stopped safely. Reset the sample to restore the preview."}
          </span>
        </div>
      {/if}
    </form>

    <section class="preview" aria-labelledby="preview-heading">
      <div class="preview-heading">
        <div>
          <p class="eyebrow">Preview</p>
          <h2 id="preview-heading">Build a chart</h2>
        </div>
        <p class="privacy-status" aria-live="polite">{status}</p>
      </div>

      <div class="field-controls">
        <label>
          Mark
          <select bind:value={mark}>
            <option value="point">Point</option>
            <option value="line">Line</option>
            <option value="col">Column</option>
          </select>
        </label>
        <label>
          X
          <select bind:value={xField}>
            {#each fields as field (field.name)}<option value={field.name}
                >{field.name}</option
              >{/each}
          </select>
        </label>
        <label>
          Y
          <select bind:value={yField}>
            {#each yFields as field (field.name)}<option value={field.name}
                >{field.name}</option
              >{/each}
          </select>
        </label>
        <label>
          Color
          <select bind:value={colorField}>
            <option value="">None</option>
            {#each fields as field (field.name)}<option value={field.name}
                >{field.name}</option
              >{/each}
          </select>
        </label>
        <label>
          Stable key
          <select bind:value={keyField}>
            <option value="">None</option>
            {#each fields as field (field.name)}<option value={field.name}
                >{field.name}</option
              >{/each}
          </select>
        </label>
      </div>

      <fieldset class="interaction-controls">
        <legend>Interaction (opt in)</legend>
        <label
          ><input type="checkbox" bind:checked={inspectEnabled} /> Inspect + pin</label
        >
        <label
          ><input type="checkbox" bind:checked={selectEnabled} /> Select area</label
        >
        <label
          ><input type="checkbox" bind:checked={zoomEnabled} /> Zoom area</label
        >
      </fieldset>

      <div class="chart-boundary">
        {#key renderKey}
          <svelte:boundary onerror={rendererFailed}>
            <GGPlot
              data={rows}
              {aes}
              {layers}
              key={keyField === "" ? undefined : keyField}
              inspect={inspectEnabled}
              select={selectEnabled
                ? { type: "interval", mode: "xy", persistent: true }
                : false}
              zoom={zoomEnabled ? { mode: "xy" } : false}
              oninteraction={logEvent}
              ondiagnostic={reportDiagnostic}
              labs={{
                title: "My local data",
                x: xField,
                y: yField,
                color: colorField || undefined,
              }}
              width="container"
              height={400}
            />
            {#snippet failed()}
              <div class="render-error" role="status">
                The new chart could not render. Adjust the field choices or
                reset the sample.
              </div>
            {/snippet}
          </svelte:boundary>
        {/key}
      </div>

      <section class="event-log" aria-labelledby="event-log-heading">
        <h3 id="event-log-heading">Semantic events</h3>
        {#if eventLog.length === 0}
          <p>
            Opt into an interaction and use the plot. No raw rows are copied
            into this log.
          </p>
        {:else}
          <ol>
            {#each eventLog as entry, index (`${entry}-${String(index)}`)}<li>
                {entry}
              </li>{/each}
          </ol>
        {/if}
      </section>
    </section>
  </div>
</section>

<style>
  .playground {
    margin: 1rem 0 3rem;
  }

  .intro {
    max-width: 48rem;
  }

  .intro h1,
  .preview-heading h2 {
    margin: 0.1rem 0 0.45rem;
    line-height: 1.12;
  }

  .eyebrow {
    margin: 0;
    color: var(--muted);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(16rem, 21rem) minmax(0, 1fr);
    gap: 1.5rem;
    margin-top: 1.5rem;
    align-items: start;
  }

  .controls,
  .preview {
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: 0.7rem;
    background: var(--surface);
    padding: 1rem;
  }

  .controls > label,
  .field-controls label {
    display: grid;
    gap: 0.3rem;
    font-weight: 650;
  }

  textarea,
  select,
  button {
    min-height: 2.75rem;
    border: 1px solid var(--border);
    border-radius: 0.4rem;
    background: var(--bg);
    color: var(--fg);
    font: inherit;
  }

  textarea {
    width: 100%;
    padding: 0.65rem;
    resize: vertical;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8rem;
    line-height: 1.45;
  }

  select,
  button {
    padding: 0.45rem 0.65rem;
  }

  button {
    cursor: pointer;
    font-weight: 650;
  }

  button.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: white;
  }

  .limits,
  .privacy-status,
  .event-log p {
    color: var(--muted);
    font-size: 0.82rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .error,
  .render-error {
    display: grid;
    gap: 0.25rem;
    margin-top: 0.85rem;
    padding: 0.75rem;
    border: 1px solid #b42318;
    border-radius: 0.4rem;
    background: color-mix(in srgb, #b42318 8%, var(--bg));
  }

  .preview-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
  }

  .privacy-status {
    max-width: 22rem;
    margin: 0;
    text-align: right;
  }

  .field-controls {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.65rem;
    margin: 1rem 0;
  }

  .field-controls select {
    width: 100%;
  }

  .interaction-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem 1rem;
    margin: 0 0 1rem;
    border: 0;
    padding: 0;
  }

  .interaction-controls legend {
    width: 100%;
    margin-bottom: 0.3rem;
    font-weight: 700;
  }

  .interaction-controls label {
    display: flex;
    min-height: 2.75rem;
    align-items: center;
    gap: 0.45rem;
  }

  .interaction-controls input {
    width: 1.15rem;
    height: 1.15rem;
  }

  .chart-boundary {
    min-height: 25rem;
    overflow: hidden;
    border-radius: 0.45rem;
    background: var(--bg);
  }

  .event-log {
    margin-top: 1rem;
    border-top: 1px solid var(--border);
    padding-top: 0.8rem;
  }

  .event-log h3 {
    margin: 0;
    font-size: 1rem;
  }

  .event-log ol {
    margin: 0.5rem 0 0;
    padding-left: 1.4rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.78rem;
  }

  @media (max-width: 58rem) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .field-controls {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 32rem) {
    .preview-heading {
      display: block;
    }

    .privacy-status {
      margin-top: 0.5rem;
      text-align: left;
    }

    .field-controls {
      grid-template-columns: 1fr;
    }
  }
</style>
