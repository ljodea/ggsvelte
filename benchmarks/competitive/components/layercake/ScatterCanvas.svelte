<script>
  import { getContext } from "svelte";
  import { scaleCanvas } from "layercake";

  const { data, xGet, yGet, zGet, width, height } = getContext("LayerCake");
  const { ctx } = getContext("canvas");

  // Reactive one-pass draw: re-runs when the Canvas layout's ctx store first
  // appears (parent onMount sets it) AND on every later $data change — the
  // in-place update path for the update scoreboard. scaleCanvas makes the
  // backing store devicePixelRatio-aware (idempotent — the layout already
  // called it with the same dims); clearRect resets the frame so updates
  // don't paint over stale marks.
  $effect(() => {
    const c = $ctx;
    if (c === null) return;
    const rows = $data;
    const w = $width;
    const h = $height;
    scaleCanvas(c, w, h);
    c.clearRect(0, 0, w, h);
    c.globalAlpha = 0.7;
    for (const d of rows) {
      c.fillStyle = $zGet(d);
      c.beginPath();
      c.arc($xGet(d), $yGet(d), 1.5, 0, Math.PI * 2);
      c.fill();
    }
  });
</script>
