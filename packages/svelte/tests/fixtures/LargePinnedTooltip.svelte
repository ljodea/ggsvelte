<script lang="ts">
  import type {
    PlotDatum,
    PlotInspectionChange,
  } from "../../src/lib/interaction/interaction.js";
  import Tooltip from "../../src/lib/inspection/Tooltip.svelte";

  const members = Array.from({ length: 1_000 }, (_, index) => ({
    key: `row-${index}`,
    row: { x: index, y: index * 2 },
    sourceKeys: [`row-${index}`],
    lineageCount: 1,
    layerIndex: 0,
    panelId: "panel:all",
    fields: [
      { channel: "x", field: "x", value: index },
      { channel: "y", field: "y", value: index * 2 },
    ],
    anchor: { x: 120, y: 80 },
  })) as Array<PlotDatum<Record<string, number>, string>>;

  const inspection = {
    type: "inspect",
    phase: "change",
    state: "pinned",
    source: "keyboard",
    panelId: "panel:all",
    mode: "xy",
    focus: members[0]!,
    members,
  } as PlotInspectionChange<Record<string, number>, string>;
</script>

<div class="tooltip-host">
  <Tooltip
    {inspection}
    width={640}
    height={400}
    interactive={true}
    docked={true}
    id="large-pinned-tooltip"
  />
</div>

<style>
  .tooltip-host {
    position: relative;
    width: 460px;
    min-height: 240px;
  }
</style>
