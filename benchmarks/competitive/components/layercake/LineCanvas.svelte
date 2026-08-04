<script>
  import { getContext } from "svelte";
  import { scaleCanvas } from "layercake";

  const { data, xGet, yGet, width, height } = getContext("LayerCake");
  const { ctx } = getContext("canvas");

  // Reactive one-pass draw (same pattern as ScatterCanvas): re-runs when the
  // ctx store appears and on every $data change, stroking one polyline per
  // series. clearRect resets the frame so updates don't paint over stale
  // marks.
  $effect(() => {
    const c = $ctx;
    if (c === null) return;
    const rows = $data;
    const w = $width;
    const h = $height;
    scaleCanvas(c, w, h);
    c.clearRect(0, 0, w, h);
    const bySeries = new Map();
    for (const d of rows) {
      let pts = bySeries.get(d.series);
      if (pts === undefined) {
        pts = [];
        bySeries.set(d.series, pts);
      }
      pts.push(d);
    }
    c.lineWidth = 1.5;
    for (const pts of bySeries.values()) {
      c.strokeStyle = pts[0].color;
      c.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const px = $xGet(pts[i]);
        const py = $yGet(pts[i]);
        if (i === 0) {
          c.moveTo(px, py);
        } else {
          c.lineTo(px, py);
        }
      }
      c.stroke();
    }
  });
</script>
