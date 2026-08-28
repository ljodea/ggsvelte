/**
 * Upgrade guide, composed from current-era guidance and legacy release notes.
 */
import { UPGRADING_CURRENT_MD } from "./upgrading-current";
import { UPGRADING_LEGACY_1_MD } from "./upgrading-legacy-1";
import { UPGRADING_LEGACY_2_MD } from "./upgrading-legacy-2";
import { UPGRADING_LEGACY_3_MD } from "./upgrading-legacy-3";

export const UPGRADING_MD =
  UPGRADING_CURRENT_MD + UPGRADING_LEGACY_1_MD + UPGRADING_LEGACY_2_MD + UPGRADING_LEGACY_3_MD;
