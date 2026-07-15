import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Ajv2020 } from "ajv/dist/2020.js";

const manualAtDirectory = join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "docs",
  "accessibility",
  "manual-at",
);
const schema = JSON.parse(
  readFileSync(join(manualAtDirectory, "record.schema.json"), "utf8"),
) as object;
const template = JSON.parse(
  readFileSync(join(manualAtDirectory, "template.json"), "utf8"),
) as object;

describe("manual assistive-technology evidence schema", () => {
  it("compiles and accepts the committed record template", () => {
    const validate = new Ajv2020({
      strict: false,
      validateFormats: false,
      allErrors: true,
    }).compile(schema);
    expect(validate(template), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it("rejects incomplete or unrecognized evidence", () => {
    const validate = new Ajv2020({
      strict: false,
      validateFormats: false,
      allErrors: true,
    }).compile(schema);
    expect(validate({ ...template, tester: "", unexpected: true })).toBe(false);
    const errors = validate.errors as ReadonlyArray<{ readonly keyword: string }> | null;
    const keywords = errors?.map((error) => error.keyword) ?? [];
    expect(keywords).toContain("additionalProperties");
    expect(keywords).toContain("minLength");
  });
});
