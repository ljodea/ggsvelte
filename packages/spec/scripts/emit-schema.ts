/**
 * Emit the published JSON Schema artifact to packages/spec/schema/v0.json.
 *
 * Run from the repo root:  bun run schema:emit
 * The artifact-staleness test (tests/artifact.test.ts) fails when the
 * committed file no longer matches a fresh build — re-run this script and
 * commit the result.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { SCHEMA_VERSION, schemaArtifactJSON } from "../src/artifact.js";

const outFile = join(import.meta.dirname, "..", "schema", `${SCHEMA_VERSION}.json`);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, schemaArtifactJSON());
console.log(`emit-schema: wrote ${outFile}`);
