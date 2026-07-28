/**
 * STAT_REFERENCE — per-stat API docs derived from KNOWN_STATS, STAT_COLUMNS,
 * and GEOM_REFERENCE (compatible geoms / defaults).
 *
 * Stats are not Svelte components: set `stat` on a `<Geom*>` shell or JSON
 * layer. This catalog is the docs-site source for `/reference/stats` so
 * after_stat columns and geom pairings stay in step with the schema.
 */
import {
  GEOM_DEFAULTS,
  KNOWN_GEOMS,
  KNOWN_STATS,
  type GeomName,
  type StatName,
} from "./schema-catalog.js";
import { GEOM_REFERENCE } from "./geom-reference.js";
import { STAT_COLUMNS } from "./validate-data-checks-layer.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface StatReferenceEntry {
  readonly name: StatName;
  /** Route slug — same as stat name (snake_case). */
  readonly slug: string;
  /** Short purpose text for the stat transform. */
  readonly summary: string;
  /**
   * Columns this stat publishes for `{ stat: "…" }` channel resolution
   * (after_stat). Empty when the stat passes rows through or only rewrites
   * positions without new after_stat names in STAT_COLUMNS.
   */
  readonly generatedColumns: readonly string[];
  /** Geoms whose layer schema allows this stat. */
  readonly compatibleGeoms: readonly GeomName[];
  /** Geoms whose GEOM_DEFAULTS.stat is this stat. */
  readonly defaultForGeoms: readonly GeomName[];
}

// ---------------------------------------------------------------------------
// Hand-authored summaries (module contracts; not inventable from TypeBox alone)
// ---------------------------------------------------------------------------

/**
 * One-paragraph purpose for each KNOWN_STATS entry. Source notes live in
 * packages/core/src/stats/* module headers; keep these short for the index.
 */
const STAT_SUMMARIES: Readonly<Record<StatName, string>> = Object.freeze({
  identity:
    "Pass rows through unchanged. Default for most geoms: each mapped row becomes one mark with no aggregation.",
  unique:
    "Keep one row per distinct mapped (x, y) pair (and group). Use when duplicate coordinates would overplot; default for none.",
  manual:
    "Author-supplied after_stat values via params — skip automatic transforms when you already computed summaries.",
  connect:
    "Expand successive points into connection vertices (linear, hv, vh, mid) for stepped or path-style joins between observations.",
  count:
    "Count rows (or sum weights) per distinct x within each group. Default for geom_bar; publishes after_stat count.",
  bin: "Bin continuous x into histogram breaks. Publishes count, density, ncount, and ndensity; default for histogram and freqpoly.",
  bin_hex:
    "Hexagonal 2D binning over continuous x and y. Publishes count/density columns for geom_hex heatmaps.",
  bin_2d:
    "Rectangular 2D binning over continuous x and y. Publishes count/density and bin edges for geom_bin_2d tiles.",
  smooth:
    "Fit a smoother (lm or loess) and evaluate along x. Publishes y, ymin, ymax, and se; default for geom_smooth.",
  quantile:
    "Estimate conditional quantiles of y given x. Publishes y at each requested probability; default for geom_quantile.",
  boxplot:
    "Five-number summary per group (hinges and whiskers). Publishes ymin, lower, middle, upper, ymax; default for geom_boxplot.",
  density:
    "1D Gaussian kernel density estimate along x. Publishes density, count, scaled, and ndensity; default for geom_density.",
  summary:
    "Collapse each discrete-x group to one summary (default mean ± se). Publishes y, ymin, ymax for error-style geoms.",
  sum: "Count overlapping points at each (x, y) cell for geom_count. Publishes n and prop (not y).",
  ydensity:
    "Kernel density along y for violin shapes. Publishes density, count, scaled, violinwidth, and y; default for geom_violin.",
  function:
    "Evaluate a pure function on an x grid. Publishes y; default for geom_function when no data rows drive the mark.",
  ecdf: "Empirical cumulative distribution F̂(x). Publishes ecdf; pair with step or path geoms for CDF plots.",
  summary_bin:
    "Bin continuous x, then summarize y in each bin (mean ± se by default). Publishes y, ymin, ymax for binned summaries.",
  contour:
    "Marching-squares isolines over a regular x×y×z grid. Publishes level; default for geom_contour.",
  align:
    "Interpolate series onto a shared x grid so continuous-x stacks and overlays line up (stack-friendly zeros outside range).",
  density_2d:
    "Bivariate KDE with isolines. Publishes level and density; default for geom_density_2d.",
  density_2d_filled:
    "Bivariate KDE with closed density rings for filled contours. Publishes level and density; default for geom_density_2d_filled.",
  bindot:
    "Histodot binning for geom_dotplot: one stack position per observation. Publishes stackpos (and bin occupancy).",
  ellipse:
    "Confidence ellipse over bivariate points (level and type from params). Passes geometry suited to path/polygon-style marks.",
  sf: "Simple-features geometry expansion for geom_sf: multiparts and holes become drawable rings without after_stat columns.",
  sf_coordinates:
    "Label anchors from SF geometries for geom_sf_text and geom_sf_label (one point per feature or part).",
  qq: "Sample vs theoretical quantiles for Q–Q plots. Publishes sample and theoretical; default for geom_qq.",
  qq_line:
    "Reference line through Q–Q sample/theoretical quantiles. Publishes sample and theoretical; default for geom_qq_line.",
});

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function buildCompatibleGeoms(stat: StatName): readonly GeomName[] {
  const geoms: GeomName[] = [];
  for (const geom of KNOWN_GEOMS) {
    if (GEOM_REFERENCE[geom].allowedStats.includes(stat)) {
      geoms.push(geom);
    }
  }
  return Object.freeze(geoms);
}

function buildDefaultForGeoms(stat: StatName): readonly GeomName[] {
  const geoms: GeomName[] = [];
  for (const geom of KNOWN_GEOMS) {
    if (GEOM_DEFAULTS[geom].stat === stat) {
      geoms.push(geom);
    }
  }
  return Object.freeze(geoms);
}

function buildEntry(stat: StatName): StatReferenceEntry {
  const columns = STAT_COLUMNS[stat] ?? [];
  return Object.freeze({
    name: stat,
    slug: stat,
    summary: STAT_SUMMARIES[stat],
    generatedColumns: Object.freeze([...columns]),
    compatibleGeoms: buildCompatibleGeoms(stat),
    defaultForGeoms: buildDefaultForGeoms(stat),
  });
}

function buildStatReference(): Readonly<Record<StatName, StatReferenceEntry>> {
  const out = {} as Record<StatName, StatReferenceEntry>;
  for (const stat of KNOWN_STATS) {
    out[stat] = buildEntry(stat);
  }
  return Object.freeze(out);
}

/**
 * Complete per-stat API reference. Keys are exactly KNOWN_STATS.
 * Compatible geoms invert GEOM_REFERENCE; columns come from STAT_COLUMNS.
 */
export const STAT_REFERENCE: Readonly<Record<StatName, StatReferenceEntry>> = buildStatReference();

/** Stable list order matching KNOWN_STATS (docs index, search, inventory). */
export function statReferenceList(): readonly StatReferenceEntry[] {
  return KNOWN_STATS.map((stat) => STAT_REFERENCE[stat]);
}
