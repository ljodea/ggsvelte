/**
 * Self-contained agent handoff prompt (OV5-A).
 * Bundles current chart + trimmed contract + install + SKILL link.
 *
 * This is the contract for the VISITOR's own agent, and it is deliberately
 * shorter than the worker's system prompt (workers/playground-api/src/prompt.ts):
 * that one also carries dataset schemas and recipes the visitor does not have.
 * The two are related but not copies, so they are not kept byte-identical.
 */

import type { PortableSpec } from "@ggsvelte/spec";

export const AGENT_HANDOFF_MAX_CHARS = 8_000;

const SKILL_URL = "https://ggsvelte.sh/llms.txt";
const SKILL_DEPTH = "https://github.com/ljodea/ggsvelte/blob/main/skills/ggsvelte/SKILL.md";

export function trimmedHandoffContract(): string {
  return `You emit ggsvelte PortableSpec JSON charts.

Rules:
- data is either {"values":[rows]} (your data) or {"name":"dataset"} when using a named set.
- Aes uses {"field":"col"} only — bare strings are invalid in JSON specs.
- layers: [{geom, stat?, position?, aes?, params?}]
- Geoms: point, line, col, bar, histogram, area, rule, text, smooth, boxplot, density, errorbar, rect, tile, ribbon.
- Positions are scoped per geom: bar/col/area/histogram → identity, stack, fill, dodge; point → identity, jitter, nudge; boxplot → dodge, identity; every other geom → identity only.
- Interactions are GGPlot props, not spec fields: inspect, select ("point"|"interval"), zoom, legendFilter, legendFocus.
- Prefer minimal complete specs with labs.title/x/y.

When refining an existing chart, return the full modified spec.`;
}

export function agentHandoffPrompt(options: {
  readonly currentSpec?: PortableSpec | null;
  readonly userGoal?: string;
}): string {
  const parts: string[] = [
    "# ggsvelte chart task",
    "",
    "Install:",
    "```",
    "bun add @ggsvelte/svelte",
    "# peer: svelte ^5.33.1",
    "```",
    "",
    trimmedHandoffContract(),
    "",
    `Docs / full corpus: ${SKILL_URL}`,
    `Deep skill reference: ${SKILL_DEPTH}`,
  ];

  if (options.currentSpec !== undefined && options.currentSpec !== null) {
    parts.push(
      "",
      "## Current chart (continue from this)",
      "```json",
      JSON.stringify(options.currentSpec, null, 2),
      "```",
    );
  }

  if (options.userGoal !== undefined && options.userGoal.trim() !== "") {
    parts.push("", "## Request", options.userGoal.trim());
  } else {
    parts.push(
      "",
      "## Request",
      "Create or refine an interactive ggsvelte chart. Return a complete PortableSpec JSON object.",
    );
  }

  let text = parts.join("\n");
  if (text.length > AGENT_HANDOFF_MAX_CHARS) {
    if (options.currentSpec !== undefined && options.currentSpec !== null) {
      text = text.replace(
        /## Current chart[\s\S]*?```json\n[\s\S]*?\n```/u,
        `## Current chart (continue from this)\n\`\`\`json\n${JSON.stringify(options.currentSpec)}\n\`\`\``,
      );
    }
    if (text.length > AGENT_HANDOFF_MAX_CHARS) {
      text = `${text.slice(0, AGENT_HANDOFF_MAX_CHARS - 20)}\n…(truncated)`;
    }
  }
  return text;
}
