<script lang="ts">
  /**
   * <GuideAxis> — declaration-only axis-guide layer for <GGPlot> (#659 slice 6).
   * Keys an axis guide by positional channel: `<GuideAxis channel="x"
   * showTicks={false}/>` → `guides: { x: { type: "axis", showTicks: false } }`.
   * Emits NO markup.
   */
  import { guideAxis, type AxisGuideOptions } from "@ggsvelte/spec";

  import {
    createGuidesLayer,
    splitChannel,
    type PositionGuideChannel,
  } from "./factory.svelte.js";

  type Props = AxisGuideOptions & { channel: PositionGuideChannel };

  const props: Props = $props();
  createGuidesLayer(() => {
    const { channel, options } = splitChannel(props);
    return { [channel]: guideAxis(options) };
  });
</script>
