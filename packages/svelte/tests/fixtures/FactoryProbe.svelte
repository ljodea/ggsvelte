<script lang="ts">
  /**
   * Thin shell that exercises createGeomLayer the same way real Geom*
   * components do: live $props proxy + param-key whitelist.
   */
  import type { GeomName } from "@ggsvelte/spec";

  import {
    createGeomLayer,
    type GeomProps,
  } from "../../src/lib/geoms/factory.svelte.js";

  interface Props extends GeomProps {
    geom: GeomName;
    paramKeys: readonly string[];
    /** Any geom params (alpha, size, …) travel via the live props proxy. */
    [key: string]: unknown;
  }

  const props: Props = $props();
  createGeomLayer(
    props.geom,
    () => props,
    props.paramKeys as readonly (keyof Props & string)[],
  );
</script>
