<script lang="ts">
  /**
   * <CoordFlip> — declaration-only flipped Cartesian layer for <GGPlot>
   * (#659 slice 5). Registers the canonical `{ type: "flip" }` object (not the
   * bare string), matching `builder.coord("flip")` / `coordFlip()`.
   * Emits NO markup.
   */
  import { createCoordLayer } from "./factory.svelte.js";

  createCoordLayer(() => ({ type: "flip" }));
</script>
