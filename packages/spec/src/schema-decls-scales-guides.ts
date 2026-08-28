/**
 * `$defs` partial — style-scale schemas + shared scale helper builders.
 * Composed by schema-declarations.ts via spread; key insertion order is load-bearing.
 */

import Type from "typebox";
import { MAX_BINNED_BREAKS } from "./schema-names.js";
import { LINETYPE_NAME_SCHEMAS, POINT_SHAPE_NAME_SCHEMAS } from "./schema-name-schemas.js";

const forbiddenStyleOption = () => Type.Optional(Type.Never());

/** Size aesthetic only (#830). Shared onto PositiveStyleScaleSpec (size+linewidth). */
const sizeUnitField = {
  /**
   * Size-only rescaling mode (ignored for linewidth). Default `area` matches
   * the existing continuous size map (area between range endpoints).
   * `radius` is linear; `area_zero` forces zero→zero area (ggplot2 scale_size_area).
   */
  sizeUnit: Type.Optional(
    Type.Union([Type.Literal("area"), Type.Literal("radius"), Type.Literal("area_zero")], {
      description:
        'Size encoding unit (size aesthetic only). "area" (default) interpolates by area between range endpoints; "radius" maps linearly to radius; "area_zero" maps value proportionally to area with zero→zero.',
    }),
  ),
};

function numericStyleScaleSpec(
  rangeValue: ReturnType<typeof Type.Number>,
  description: string,
  /** Extra optional fields on the base object (e.g. sizeUnit for PositiveStyleScaleSpec). */
  extraFields: typeof sizeUnitField | Record<string, never> = {},
) {
  return Type.Intersect([
    Type.Object(
      {
        type: Type.Optional(
          Type.Union([
            Type.Literal("ordinal"),
            Type.Literal("sequential"),
            Type.Literal("binned"),
            Type.Literal("manual"),
            Type.Literal("identity"),
          ]),
        ),
        temporalKind: Type.Optional(Type.Union([Type.Literal("date"), Type.Literal("datetime")])),
        parse: Type.Optional(Type.Ref("TemporalParserSpec")),
        parseFailure: Type.Optional(Type.Union([Type.Literal("error"), Type.Literal("censor")])),
        timezone: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
        disambiguation: Type.Optional(
          Type.Union([
            Type.Literal("compatible"),
            Type.Literal("earlier"),
            Type.Literal("later"),
            Type.Literal("reject"),
          ]),
        ),
        domain: Type.Optional(Type.Array(Type.Ref("DomainValue"), { minItems: 1 })),
        domainMode: Type.Optional(Type.Union([Type.Literal("grow"), Type.Literal("data")])),
        breaks: Type.Optional(
          Type.Array(Type.Union([Type.Number(), Type.String()]), { minItems: 2 }),
        ),
        range: Type.Optional(Type.Array(rangeValue, { minItems: 1 })),
        reverse: Type.Optional(Type.Boolean()),
        oob: Type.Optional(Type.Union([Type.Literal("censor"), Type.Literal("squish")])),
        naValue: Type.Optional(rangeValue),
        unknownValue: Type.Optional(rangeValue),
        onExhaust: Type.Optional(Type.Union([Type.Literal("cycle"), Type.Literal("error")])),
        labels: Type.Optional(Type.String()),
        guide: Type.Optional(Type.Ref("GuideSpec")),
        ...extraFields,
      },
      { additionalProperties: false, description },
    ),
    Type.Union([
      Type.Object({
        type: Type.Literal("binned"),
        domain: Type.Optional(Type.Array(Type.Ref("DomainValue"), { minItems: 2, maxItems: 2 })),
        breaks: Type.Optional(
          Type.Array(Type.Union([Type.Number(), Type.String()]), {
            minItems: 2,
            maxItems: MAX_BINNED_BREAKS + 1,
          }),
        ),
        range: Type.Optional(Type.Array(rangeValue, { minItems: 2 })),
        domainMode: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("manual"),
        range: Type.Array(rangeValue, { minItems: 1 }),
        temporalKind: forbiddenStyleOption(),
        parse: forbiddenStyleOption(),
        parseFailure: forbiddenStyleOption(),
        timezone: forbiddenStyleOption(),
        disambiguation: forbiddenStyleOption(),
        domainMode: forbiddenStyleOption(),
        breaks: forbiddenStyleOption(),
        reverse: forbiddenStyleOption(),
        oob: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("identity"),
        temporalKind: forbiddenStyleOption(),
        parse: forbiddenStyleOption(),
        parseFailure: forbiddenStyleOption(),
        timezone: forbiddenStyleOption(),
        disambiguation: forbiddenStyleOption(),
        domain: forbiddenStyleOption(),
        domainMode: forbiddenStyleOption(),
        breaks: forbiddenStyleOption(),
        range: forbiddenStyleOption(),
        reverse: forbiddenStyleOption(),
        oob: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("ordinal"),
        temporalKind: forbiddenStyleOption(),
        parse: forbiddenStyleOption(),
        parseFailure: forbiddenStyleOption(),
        timezone: forbiddenStyleOption(),
        disambiguation: forbiddenStyleOption(),
        breaks: forbiddenStyleOption(),
        oob: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("sequential"),
        domain: Type.Optional(Type.Array(Type.Ref("DomainValue"), { minItems: 2, maxItems: 2 })),
        range: Type.Optional(Type.Array(rangeValue, { minItems: 2 })),
        domainMode: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
      }),
      Type.Object({ type: forbiddenStyleOption() }),
    ]),
  ]);
}

function finiteStyleScaleSpec(rangeValue: ReturnType<typeof Type.Union>, description: string) {
  return Type.Intersect([
    Type.Object(
      {
        type: Type.Optional(
          Type.Union([
            Type.Literal("ordinal"),
            Type.Literal("binned"),
            Type.Literal("manual"),
            Type.Literal("identity"),
          ]),
        ),
        domain: Type.Optional(Type.Array(Type.Ref("DomainValue"), { minItems: 1 })),
        domainMode: Type.Optional(Type.Union([Type.Literal("grow"), Type.Literal("data")])),
        breaks: Type.Optional(Type.Array(Type.Number(), { minItems: 2 })),
        range: Type.Optional(Type.Array(rangeValue, { minItems: 1 })),
        reverse: Type.Optional(Type.Boolean()),
        naValue: Type.Optional(rangeValue),
        unknownValue: Type.Optional(rangeValue),
        onExhaust: Type.Optional(Type.Union([Type.Literal("cycle"), Type.Literal("error")])),
        labels: Type.Optional(Type.String()),
        guide: Type.Optional(Type.Ref("GuideSpec")),
      },
      { additionalProperties: false, description },
    ),
    Type.Union([
      Type.Object({
        type: Type.Literal("binned"),
        domain: Type.Optional(Type.Array(Type.Number(), { minItems: 2, maxItems: 2 })),
        breaks: Type.Optional(
          Type.Array(Type.Number(), { minItems: 2, maxItems: MAX_BINNED_BREAKS + 1 }),
        ),
        domainMode: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("manual"),
        range: Type.Array(rangeValue, { minItems: 1 }),
        domainMode: forbiddenStyleOption(),
        breaks: forbiddenStyleOption(),
        reverse: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("identity"),
        domain: forbiddenStyleOption(),
        domainMode: forbiddenStyleOption(),
        breaks: forbiddenStyleOption(),
        range: forbiddenStyleOption(),
        reverse: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("ordinal"),
        breaks: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({ type: forbiddenStyleOption() }),
    ]),
  ]);
}

export const StyleScaleDecls = {
  /**
   * Size + linewidth share this schema. `sizeUnit` is size-only at runtime
   * (ignored for linewidth); alpha uses AlphaScaleSpec without sizeUnit so
   * the option cannot validate as a silent no-op (#830).
   */
  PositiveStyleScaleSpec: numericStyleScaleSpec(
    // minimum 0 allows scale_size_area zero-area radii; linewidth 0 is also valid.
    Type.Number({ minimum: 0 }),
    "Configuration for a non-negative numeric size or linewidth scale.",
    sizeUnitField,
  ),

  AlphaScaleSpec: numericStyleScaleSpec(
    Type.Number({ minimum: 0, maximum: 1 }),
    "Configuration for an opacity scale constrained to [0, 1].",
  ),

  ShapeScaleSpec: finiteStyleScaleSpec(
    Type.Union(POINT_SHAPE_NAME_SCHEMAS),
    "Configuration for a finite point-shape scale.",
  ),

  LinetypeScaleSpec: finiteStyleScaleSpec(
    Type.Union(LINETYPE_NAME_SCHEMAS),
    "Configuration for a finite line-pattern scale.",
  ),
};
