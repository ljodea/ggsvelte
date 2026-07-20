<script lang="ts">
  import { base } from "$app/paths";

  import CopyCode from "$lib/components/CopyCode.svelte";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
</script>

<article class="cli-reference prose" aria-labelledby="cli-heading">
  <h1 id="cli-heading">Command-line reference</h1>
  <p>
    <code>ggsvelte-render</code> reads PortableSpec JSON and writes
    deterministic SVG. Its option list below comes from the same package-private
    registry as argument parsing and
    <code>--help</code>.
  </p>

  <h2 id="input-and-output">Input and output</h2>
  <p>
    Pass one JSON file or omit it to read stdin. SVG is the only stdout output.
  </p>
  <p class="guide-code-classification">Fragment</p>
  <CopyCode
    class="cli-command"
    label="Copy command"
    code="ggsvelte-render spec.json > chart.svg 2> diagnostics.jsonl"
  />
  <p>Errors, warnings, and advisories are JSON Lines on stderr.</p>

  <h2 id="options">Options</h2>
  <dl class="cli-options">
    {#each data.options as option (option.flag)}
      <div>
        <dt id={option.anchor}>
          <code
            >{option.flag}{option.value === "" ? "" : ` ${option.value}`}</code
          >
        </dt>
        <dd>
          <p>{option.description}.</p>
          {#if option.aliases.length > 0}
            <p>Alias: <code>{option.aliases.join(", ")}</code>.</p>
          {/if}
          {#if option.detail !== undefined}
            <p><code>{option.detail}</code></p>
          {/if}
        </dd>
      </div>
    {/each}
  </dl>

  <h2 id="exit-codes">Exit codes</h2>
  <dl class="exit-codes">
    <div>
      <dt>0</dt>
      <dd>Rendered successfully.</dd>
    </div>
    <div>
      <dt>1</dt>
      <dd>The pipeline or renderer failed after structural validation.</dd>
    </div>
    <div>
      <dt>2</dt>
      <dd>Usage, input, file, or JSON parsing failed.</dd>
    </div>
    <div>
      <dt>3</dt>
      <dd>The PortableSpec failed validation.</dd>
    </div>
  </dl>

  <h2 id="troubleshooting">Troubleshooting</h2>
  <p>
    Keep stdout and stderr separate. Search the source-qualified code in the
    <a href={`${base}/guide/errors#cli-diagnostics-ggsvelte-render`}
      >Errors reference</a
    >, correct the input, and rerun the same command.
  </p>
</article>

<style>
  .cli-options,
  .exit-codes {
    margin: 1.5rem 0;
  }

  .cli-options > div,
  .exit-codes > div {
    display: grid;
    grid-template-columns: minmax(8rem, 0.35fr) minmax(0, 1fr);
    padding: 1rem 0;
    border-top: 1px solid var(--line);
    gap: 1rem;
  }

  .cli-options > div:last-child,
  .exit-codes > div:last-child {
    border-bottom: 1px solid var(--line);
  }

  dt,
  dd,
  dd p {
    margin: 0;
  }

  dd p + p {
    margin-top: 0.5rem;
  }

  .guide-code-classification {
    margin: 1rem 0 0.35rem;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cli-reference :global(.cli-command code) {
    white-space: pre;
  }

  @media (max-width: 40rem) {
    .cli-options > div,
    .exit-codes > div {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
  }
</style>
