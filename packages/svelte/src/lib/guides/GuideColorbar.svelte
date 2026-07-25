<script lang="ts">
  /**
   * <GuideColorbar> — declaration-only colorbar-guide layer for <GGPlot>
   * (#659 slice 6). Continuous-legend presentation for one aesthetic.
   * Emits NO markup.
   */
  import { guideColorbar, type ColorbarGuideOptions } from "@ggsvelte/spec";

  import {
    createGuidesLayer,
    splitChannel,
    type NonPositionGuideChannel,
  } from "./factory.svelte.js";

  type Props = ColorbarGuideOptions & { channel: NonPositionGuideChannel };

  const props: Props = $props();
  createGuidesLayer(() => {
    const { channel, options } = splitChannel(props);
    return { [channel]: guideColorbar(options) };
  });
</script>
