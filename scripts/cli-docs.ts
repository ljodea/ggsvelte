import { CLI_OPTIONS } from "../packages/core/src/cli.js";

export const CLI_REFERENCE_OPTIONS = CLI_OPTIONS.map((option) => ({
  anchor: option.anchor,
  flag: option.flag,
  value: option.value,
  description: option.description,
  aliases: "aliases" in option ? option.aliases : [],
  detail: "detail" in option ? option.detail : undefined,
}));
