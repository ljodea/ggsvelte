import { CLI_REFERENCE_OPTIONS } from "$scripts/cli-docs";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => ({ options: CLI_REFERENCE_OPTIONS });
