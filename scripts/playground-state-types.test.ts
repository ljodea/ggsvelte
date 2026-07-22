import { describe, expect, test } from "bun:test";

import { PLAYGROUND_MAX_UNDO_SNAPSHOTS as fromFacade } from "../apps/docs/src/lib/playground-state";
import { PLAYGROUND_MAX_UNDO_SNAPSHOTS as fromLeaf } from "../apps/docs/src/lib/playground-state-types";

describe("playground-state types leaf", () => {
  test("MAX_UNDO is defined on the types leaf and re-exported from the facade", () => {
    expect(fromLeaf).toBe(20);
    expect(fromFacade).toBe(fromLeaf);
  });
});
