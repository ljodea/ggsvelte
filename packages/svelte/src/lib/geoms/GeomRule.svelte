<script lang="ts">
  /**
   * <GeomRule> — declaration-only reference-line sugar for <GGPlot>.
   * TWO HONEST FORMS (Hadley lesson 15): annotation — set xintercept and/or
   * yintercept props (the layer then inherits no plot aes); data-driven —
   * map exactly one of aes.x (vertical) or aes.y (horizontal).
   * Same contract and z-order constraint as <GeomPoint> (decision 0001).
   */
  import type { DataInput, AesInput, RuleParams } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends RuleParams {
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
    /** "identity" (default) or "unique" (first-wins aesthetic dedupe; #813). */
    stat?: "identity" | "unique";
  }

  const props: Props = $props();
  createGeomLayer("rule", () => props, [
    "xintercept",
    "yintercept",
    "alpha",
    "linewidth",
  ]);
</script>
