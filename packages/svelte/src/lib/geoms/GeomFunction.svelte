<script lang="ts">
  /**
   * <GeomFunction> — declaration-only analytic curve sugar for <GGPlot>
   * (named portable function on a grid; path geometry). Same contract and
   * z-order constraint as <GeomPoint> (decision 0001).
   */
  import type {
    DataInput,
    AesInput,
    FunctionParams,
    FunctionRegistryName,
    FunctionArgs,
  } from "@ggsvelte/spec";

  import { createGeomLayer } from "./factory.svelte.js";

  interface Props extends FunctionParams {
    /** Required named registry function. */
    fun: FunctionRegistryName;
    args?: FunctionArgs;
    /** Optional layer-local data (#589); inherits plot data when omitted. */
    data?: DataInput | readonly Record<string, unknown>[];
    /** Layer-level aes (bare-string shorthand allowed); merges over plot aes. */
    aes?: AesInput;
  }

  const props: Props = $props();
  createGeomLayer("function", () => props, [
    "fun",
    "n",
    "xlim",
    "args",
    "alpha",
    "linewidth",
    "strokePaint",
    "glow",
  ]);
</script>
