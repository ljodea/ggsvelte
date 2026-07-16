<script lang="ts">
  import type {
    BatchInteractionMask,
    GeometryBatch,
    ThemeTokens,
  } from "@ggsvelte/core";

  import Batch from "../../src/lib/Batch.svelte";

  const {
    batch,
    theme,
    focusMask,
  }: {
    batch: GeometryBatch;
    theme: ThemeTokens;
    focusMask: BatchInteractionMask;
  } = $props();
</script>

<svg width="100" height="100">
  <Batch {batch} {theme} {focusMask} />
</svg>
