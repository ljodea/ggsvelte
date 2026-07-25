<script lang="ts">
  /**
   * <GuideColorsteps> — declaration-only colorsteps-guide layer for <GGPlot>
   * (#659 slice 6). Binned-legend presentation for one aesthetic.
   * Emits NO markup.
   */
  import { guideColorsteps, type ColorstepsGuideOptions } from "@ggsvelte/spec";

  import {
    createGuidesLayer,
    splitChannel,
    type NonPositionGuideChannel,
  } from "./factory.svelte.js";

  type Props = ColorstepsGuideOptions & { channel: NonPositionGuideChannel };

  const props: Props = $props();
  createGuidesLayer(() => {
    const { channel, options } = splitChannel(props);
    return { [channel]: guideColorsteps(options) };
  });
</script>
