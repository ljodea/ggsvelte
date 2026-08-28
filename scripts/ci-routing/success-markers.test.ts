import { describe, expect, test } from "bun:test";

import {
  CONTENT_HASH_SCHEMA,
  parseSuccessMarker,
  serializeSuccessMarker,
  validateSuccessMarker,
} from "../ci-routing";

describe("success marker protocol", () => {
  test("serialize/parse/validate round-trip", () => {
    const body = serializeSuccessMarker({
      schema: CONTENT_HASH_SCHEMA,
      execution: "unit",
      hash: "abc",
    });
    const parsed = parseSuccessMarker(body);
    expect(parsed).toEqual({
      schema: CONTENT_HASH_SCHEMA,
      execution: "unit",
      hash: "abc",
    });
    expect(validateSuccessMarker(parsed, { execution: "unit", hash: "abc" })).toBe(true);
    expect(validateSuccessMarker(parsed, { execution: "unit", hash: "other" })).toBe(false);
    expect(validateSuccessMarker(parsed, { execution: "build", hash: "abc" })).toBe(false);
    expect(parseSuccessMarker("not-json")).toBeNull();
    expect(parseSuccessMarker('{"schema":1}')).toBeNull();
  });
});
