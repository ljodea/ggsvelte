<script lang="ts">
  import type { Snippet } from "svelte";

  const {
    preview,
    editor,
    output,
  }: {
    preview: Snippet;
    editor: Snippet;
    output: Snippet;
  } = $props();
</script>

<div class="playground-workspace">
  <section class="surface preview-surface" aria-label="Chart preview">
    {@render preview()}
  </section>
  <section class="surface editor-surface" aria-label="PortableSpec editor">
    {@render editor()}
  </section>
  <section class="surface output-surface" aria-label="Svelte output">
    {@render output()}
  </section>
</div>

<style>
  .playground-workspace {
    display: grid;
    grid-template-columns: minmax(18rem, 0.82fr) minmax(25rem, 1.35fr) minmax(
        18rem,
        0.83fr
      );
    grid-template-areas: "editor preview output";
    gap: 1px;
    margin-top: 1.5rem;
    border-block: 1px solid var(--line);
    background: var(--line);
  }

  .surface {
    min-width: 0;
    background: var(--paper);
  }

  .preview-surface {
    grid-area: preview;
  }

  .editor-surface {
    grid-area: editor;
  }

  .output-surface {
    grid-area: output;
  }

  @media (max-width: 74.99rem) {
    .playground-workspace {
      grid-template-columns: minmax(18rem, 0.9fr) minmax(0, 1.1fr);
      grid-template-areas:
        "editor preview"
        "output output";
    }
  }

  @media (max-width: 47.99rem) {
    .playground-workspace {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        "preview"
        "editor"
        "output";
      border: 0;
      background: transparent;
      gap: 1rem;
    }

    .surface {
      border-block: 1px solid var(--line);
    }
  }
</style>
