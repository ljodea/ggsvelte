// @ggsvelte/spec — spec types, schemas, normalize(), validate(), portability,
// fluent builder. Zero d3, zero DOM. TypeBox is the schema source of truth
// (decision 0004): the same definitions provide the TS types (Static<>), the
// runtime validator, and the published JSON Schema artifact (schema/v0.json).
//
// Lifecycle (Hadley lesson 13; meanings in CONTRIBUTING.md): every export
// carries a lifecycle tag, collected into the generated lifecycle.json by
// scripts/gen-lifecycle.ts. Untagged exports inherit the file default below;
// statements tag themselves with a one-line "@lifecycle <tag>" JSDoc marker;
// individual names use a trailing "@lifecycle <tag>" line comment.
// @lifecycle-default experimental

// Schemas + Static types
export {
  AesSchema,
  AreaLayerSchema,
  BarLayerSchema,
  BoxplotLayerSchema,
  CATEGORICAL_SCHEME_NAMES,
  CHANNELS,
  COLOR_SCHEME_NAMES,
  ChannelValueSchema,
  ColLayerSchema,
  CoordSpecSchema,
  CURRENT_EDITION,
  DataRefSchema,
  DensityLayerSchema,
  ErrorbarLayerSchema,
  FacetSpecSchema,
  GEOM_DEFAULTS,
  HistogramLayerSchema,
  KNOWN_GEOMS,
  KNOWN_POSITIONS,
  KNOWN_STATS,
  LayerSpecSchema,
  LineLayerSchema,
  PlotSpecSchema,
  PointLayerSchema,
  RuleLayerSchema,
  ScalesSchema,
  SEQUENTIAL_SCHEME_NAMES,
  TemporalParserSpecSchemaRef,
  SmoothLayerSchema,
  SpecModule,
  TextLayerSchema,
  THEME_NAMES,
} from "./schema.js";
export type {
  A11yMode,
  Aes,
  AreaLayer,
  AreaParams,
  BarLayer,
  BarParams,
  BoxplotLayer,
  BoxplotParams,
  CellValue,
  ChannelName,
  ChannelValue,
  ColLayer,
  ColorScaleSpec,
  ColParams,
  CoordSpec,
  DataColumns,
  DataName,
  DataRef,
  DataValues,
  DensityLayer,
  DensityParams,
  ErrorbarLayer,
  ErrorbarParams,
  FacetScales,
  FacetSpec,
  GeomName,
  HistogramLayer,
  InlineData,
  Labs,
  LayerSpec,
  LegendSpec,
  LineLayer,
  LineParams,
  PointLayer,
  PointParams,
  PointPosition,
  PortableSpec, // @lifecycle stable-intent
  PositionName,
  PositionParams,
  PositionScaleSpec,
  RenderBackend,
  RuleLayer,
  RuleParams,
  Scales,
  SmoothLayer,
  SmoothParams,
  StackablePosition,
  StatName,
  SummaryFun,
  TextLayer,
  TemporalParserSpec,
  TextParams,
  ThemeName,
  ThemeSpec,
} from "./schema.js";

// Checked public capability ledger
export { SCALE_CAPABILITIES } from "./capabilities.js";
export type { ScaleCapability } from "./capabilities.js";

// Temporal parsing, inference, and authoring conversions
export {
  canonicalTemporalParserKey,
  dmy,
  dmy_hm,
  dmy_hms,
  dym,
  dym_hm,
  dym_hms,
  fromEpochMilliseconds,
  fromEpochSeconds,
  inferTemporalColumn,
  mdy,
  mdy_hm,
  mdy_hms,
  my,
  myd,
  myd_hm,
  myd_hms,
  parseTemporal,
  parseTemporalColumn,
  parseTemporalFormat,
  TEMPORAL_PARSER_NAMES,
  TemporalParseError,
  TemporalParserSpecSchema,
  ydm,
  ydm_hm,
  ydm_hms,
  ym,
  ymd,
  ymd_hm,
  ymd_hms,
  yq,
} from "./temporal.js";
export type {
  TemporalDecision,
  TemporalDisambiguation,
  TemporalFailure,
  TemporalKind,
  ParsedTemporalColumn,
  TemporalParseOptions,
  TemporalParseResult,
  TemporalParserName,
  TemporalPrecision,
} from "./temporal.js";

// Scale helpers
export {
  scaleXDate,
  scaleXDatetime,
  scaleXDiscrete,
  scaleYDate,
  scaleYDatetime,
  scaleYDiscrete,
  scale_x_date,
  scale_x_datetime,
  scale_x_discrete,
  scale_y_date,
  scale_y_datetime,
  scale_y_discrete,
} from "./scale-helpers.js";
export type { DiscretePositionScaleOptions, TemporalScaleOptions } from "./scale-helpers.js";

// Portability (PortableSpec vs RuntimeSpec)
export {
  isPortable,
  portabilityIssues,
  toPortable,
  toPortableLossy,
  UnportableSpecError,
} from "./portability.js";
export type { JSONValue, LossyResult, PortabilityIssue } from "./portability.js";
export type {
  ChannelFn,
  RuntimeAes,
  RuntimeAreaLayer,
  RuntimeBarLayer,
  RuntimeBoxplotLayer,
  RuntimeChannelValue,
  RuntimeColLayer,
  RuntimeDensityLayer,
  RuntimeErrorbarLayer,
  RuntimeHistogramLayer,
  RuntimeLayerSpec,
  RuntimeLineLayer,
  RuntimePointLayer,
  RuntimeRuleLayer,
  RuntimeSmoothLayer,
  RuntimeSpec,
  RuntimeTextLayer,
} from "./runtime.js";

// Canonicalizer
/** @lifecycle stable-intent */
export { normalize } from "./normalize.js";
export { normalizeChannel } from "./normalize.js";
export type {
  AesInput,
  AreaLayerInput,
  BarLayerInput,
  BoxplotLayerInput,
  ChannelInput,
  ColLayerInput,
  DensityLayerInput,
  ErrorbarLayerInput,
  FacetInput,
  HistogramLayerInput,
  LayerInput,
  LineLayerInput,
  PointLayerInput,
  RuleLayerInput,
  SmoothLayerInput,
  SpecInput,
  TextLayerInput,
} from "./normalize.js";

// Validation + agent error contract
/** @lifecycle stable-intent */
export { validate } from "./validate.js";
/** @lifecycle stable-intent */
export type { ValidateResult } from "./validate.js";
export { LINT_CATALOG, lintSpec } from "./lint.js";
export type { LintAdvisoryCode, LintCatalogEntry, SpecAdvisory } from "./lint.js";
export { ERROR_CATALOG } from "./errors.js";
export type { ErrorCatalogEntry } from "./errors.js";
export { DEFAULT_VALIDATE_LIMITS, effectiveChannel, STAT_COLUMNS } from "./validate-data.js";
export type {
  DataProfile,
  DataProfileField,
  ProfileFieldType,
  ValidateLimits,
  ValidateOptions,
} from "./validate-data.js";
export {
  didYouMean,
  ERROR_CODES,
  levenshtein,
  SpecValidationError, // @lifecycle stable-intent
} from "./errors.js";
/** @lifecycle stable-intent */
export type { SpecError, SpecErrorCode, SpecErrorFix } from "./errors.js";

// Fluent builder
export { aes, gg, GGBuilder } from "./builder.js";
export type {
  AuthoringCellValue,
  AuthoringColumns,
  AuthoringDataRef,
  AuthoringRows,
  DataInput,
  GeomAreaOptions,
  GeomBarOptions,
  GeomBoxplotOptions,
  GeomColOptions,
  GeomDensityOptions,
  GeomErrorbarOptions,
  GeomHistogramOptions,
  GeomLineOptions,
  GeomPointOptions,
  GeomRuleOptions,
  GeomSmoothOptions,
  GeomTextOptions,
} from "./builder.js";

// Schema artifact (schema/v0.json)
export { buildSchemaArtifact, SCHEMA_VERSION, schemaArtifactJSON } from "./artifact.js";
