/**
 * TypeBox schemas for temporal parser specs (schema graph / validate only).
 * Runtime parsers live in temporal-parse-core.ts without a typebox import.
 */
import Type, { type TLiteral } from "typebox";

import { TEMPORAL_PARSER_NAMES, type TemporalParserName } from "./temporal-parse-core.js";

const TEMPORAL_PARSER_NAME_SCHEMAS = TEMPORAL_PARSER_NAMES.map((name) =>
  Type.Literal(name),
) as unknown as [TLiteral<TemporalParserName>, ...TLiteral<TemporalParserName>[]];

export const TemporalParserSpecSchema = Type.Union(
  [
    Type.Union(TEMPORAL_PARSER_NAME_SCHEMAS),
    Type.Object(
      {
        format: Type.String({
          minLength: 1,
          maxLength: 128,
          description:
            "Closed strftime-style input grammar (maximum 128 characters and 32 tokens). Supported tokens: %Y, %m, %d, %H, %M, %S, %L, %z, %q, and %%.",
        }),
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        epoch: Type.Union([Type.Literal("seconds"), Type.Literal("milliseconds")]),
      },
      { additionalProperties: false },
    ),
  ],
  {
    description:
      "A deterministic temporal parser name, exact closed format, or epoch unit. JavaScript callbacks and regular expressions are not portable parsers.",
  },
);
