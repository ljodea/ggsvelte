/**
 * The model interface for the eval harness, with two implementations:
 *
 * - OpenRouterResponder: plain fetch against the OpenRouter chat-completions
 *   API (https://openrouter.ai/api/v1 — OpenAI-compatible; NO sdk dependency,
 *   the harness adds zero deps). The eval workflow deliberately does NOT use
 *   the Anthropic API (user mandate; see docs/decisions/0012-m3-notes.md,
 *   Amendment). Model comes from EVAL_MODEL (default "openai/gpt-5.5" — a
 *   strong non-Anthropic frontier model on OpenRouter), max_tokens 4000,
 *   temperature 0, 60s timeout per call. Attribution headers HTTP-Referer /
 *   X-Title are sent per OpenRouter's recommendation.
 *
 *   STRUCTURED-OUTPUT MODE: schema-in-prompt + validate-and-repair, NOT
 *   json_schema response_format. Rationale: (1) a reply is a UNION of
 *   PortableSpec | the refusal shape, so a strict schema would need a
 *   top-level union of the full v0 spec schema, whose keywords are exactly
 *   what provider structured-output implementations choke on (see
 *   docs/decisions/0004-schema-source.md); (2) OpenRouter routes across
 *   providers with uneven response_format support, while plain text works
 *   everywhere; (3) decode-time schema enforcement would hollow out the
 *   metric this harness exists to measure (validity pre/post ONE repair
 *   round). The grammar cheat-sheet in the system prompt is the schema.
 *
 * - MockResponder: deterministic, template-based. It keyword-matches the
 *   case prompt, parses the DataProfile line back out of the user prompt,
 *   and synthesizes a spec over the profile's fields. It exercises EVERY
 *   runner path: valid specs, the documented refusal shape (map/3D
 *   requests), and one intentionally-invalid spec — any prompt mentioning a
 *   "stepped" chart gets an unknown geom ("steps") on the first call, then
 *   a fixed valid line spec on the repair call (detected via the repair
 *   marker in the user prompt).
 */
/* oxlint-disable eslint/max-classes-per-file -- the Responder contract ships
   both implementations (OpenRouter + mock) in this one module by design. */
import type { DataProfile, ProfileFieldType } from "@ggsvelte/spec";

import { PROFILE_MARKER, REPAIR_MARKER } from "./prompt.ts";

export interface Responder {
  /** Human-readable identifier for the scoreboard meta. */
  readonly name: string;
  complete(system: string, user: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// OpenRouterResponder
// ---------------------------------------------------------------------------

export const DEFAULT_MODEL = "openai/gpt-5.5";
export const CALL_TIMEOUT_MS = 60_000;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REPO_URL = "https://github.com/ljodea/ggsvelte";

interface ChatCompletionsResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

export class OpenRouterResponder implements Responder {
  readonly name: string;
  readonly #apiKey: string;
  readonly #timeoutMs: number;

  constructor(apiKey: string, model?: string, timeoutMs: number = CALL_TIMEOUT_MS) {
    this.#apiKey = apiKey;
    this.name = model ?? process.env["EVAL_MODEL"] ?? DEFAULT_MODEL;
    this.#timeoutMs = timeoutMs;
  }

  async complete(system: string, user: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, this.#timeoutMs);
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.#apiKey}`,
          "content-type": "application/json",
          // OpenRouter attribution headers (optional but recommended).
          "http-referer": REPO_URL,
          "x-title": "ggsvelte evals",
        },
        body: JSON.stringify({
          model: this.name,
          max_tokens: 4000,
          temperature: 0,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        throw new Error(`OpenRouter API error ${response.status}: ${detail}`);
      }
      const body = (await response.json()) as ChatCompletionsResponse;
      const text = body.choices?.[0]?.message?.content ?? "";
      if (text === "") throw new Error("OpenRouter API returned no text content");
      return text;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------------------------------------------------------------------------
// MockResponder
// ---------------------------------------------------------------------------

type Channel = { field: string } | { value: string | number } | { stat: string };
type MockAes = Record<string, Channel>;
interface MockLayer {
  geom: string;
  stat?: string;
  position?: string;
  positionParams?: Record<string, number>;
  aes?: MockAes;
  params?: Record<string, unknown>;
}
interface MockSpec {
  data: { name: string };
  layers: MockLayer[];
  facet?: Record<string, unknown>;
  coord?: {
    type: string;
    x?: {
      transform: string;
      limits?: number[];
      reverse?: boolean;
      expand?: boolean;
    };
    y?: {
      transform: string;
      limits?: number[];
      reverse?: boolean;
      expand?: boolean;
    };
    clip?: boolean;
    ratio?: number;
  };
  scales?: Record<string, { type: string; parse?: string; transform?: string; breaks?: number[] }>;
  guides?: Record<
    string,
    {
      type: "legend" | "colorbar" | "colorsteps";
      position?: "right" | "bottom";
      direction?: "vertical" | "horizontal";
    }
  >;
}

interface Mention {
  name: string;
  type: ProfileFieldType;
  index: number;
}

function parseProfileLine(user: string): DataProfile {
  const at = user.indexOf(PROFILE_MARKER);
  if (at === -1) return { fields: [] };
  const rest = user.slice(at + PROFILE_MARKER.length);
  const line = rest.split("\n", 1)[0] ?? "";
  try {
    return JSON.parse(line.trim()) as DataProfile;
  } catch {
    return { fields: [] };
  }
}

/** Fields whose names appear in the prompt, in first-mention order. */
function findMentions(prompt: string, profile: DataProfile): Mention[] {
  const out: Mention[] = [];
  for (const field of profile.fields) {
    const tokens = field.name.toLowerCase().split(/[_\s]+/);
    const forms = new Set([field.name.toLowerCase(), tokens.join(" ")]);
    if (tokens.length >= 2) forms.add(tokens.slice(0, -1).join(" "));
    // Keep the deterministic fallback useful for common prompt/profile vocabulary
    // mismatches without inventing a field that is absent from the profile.
    if (tokens.includes("cost")) forms.add("price");
    let best = -1;
    for (const form of forms) {
      const i = prompt.indexOf(form);
      if (i !== -1 && (best === -1 || i < best)) best = i;
    }
    if (best !== -1) out.push({ name: field.name, type: field.type, index: best });
  }
  return out.toSorted((a, b) => a.index - b.index);
}

class FieldPicker {
  readonly #mentions: Mention[];
  readonly #profile: DataProfile;
  readonly #used = new Set<string>();

  constructor(prompt: string, profile: DataProfile) {
    this.#mentions = findMentions(prompt, profile);
    this.#profile = profile;
  }

  #pick(match: (type: ProfileFieldType) => boolean): string | undefined {
    for (const m of this.#mentions) {
      if (match(m.type) && !this.#used.has(m.name)) {
        this.#used.add(m.name);
        return m.name;
      }
    }
    for (const f of this.#profile.fields) {
      if (match(f.type) && !this.#used.has(f.name)) {
        this.#used.add(f.name);
        return f.name;
      }
    }
    return undefined;
  }

  quant(): string | undefined {
    return this.#pick((t) => t === "quantitative");
  }

  cat(): string | undefined {
    return this.#pick((t) => t === "nominal" || t === "ordinal");
  }

  temporal(): string | undefined {
    return this.#pick((t) => t === "temporal");
  }

  /** A mentioned category field only (no profile-order fallback). */
  mentionedCat(): string | undefined {
    for (const m of this.#mentions) {
      if ((m.type === "nominal" || m.type === "ordinal") && !this.#used.has(m.name)) {
        this.#used.add(m.name);
        return m.name;
      }
    }
    return undefined;
  }

  /** A mentioned quantitative field only (no fallback). */
  mentionedQuant(): string | undefined {
    for (const m of this.#mentions) {
      if (m.type === "quantitative" && !this.#used.has(m.name)) {
        this.#used.add(m.name);
        return m.name;
      }
    }
    return undefined;
  }

  typeOf(name: string): ProfileFieldType | undefined {
    return this.#profile.fields.find((f) => f.name === name)?.type;
  }
}

const f = (field: string): Channel => ({ field });

const COLOR_TRIGGER =
  /colou?red by|colou?r by|map .* to (?:binned )?colou?r|binned colou?r|colou?rsteps|split by|stacked by|grouped by|one (?:line|curve|area) per|shaded by|filled by|one per/;

const STYLE_CHANNELS = ["size", "linewidth", "alpha", "shape", "linetype"] as const;
type StyleChannel = (typeof STYLE_CHANNELS)[number];

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mappedStyleField(
  prompt: string,
  profile: DataProfile,
  channel: StyleChannel,
): string | undefined {
  const channelPattern =
    channel === "linewidth"
      ? "(?:linewidth|line[- ]width|stroke[- ]width)"
      : channel === "linetype"
        ? "(?:linetype|line[- ]type|dash(?: pattern)?)"
        : channel;
  for (const field of profile.fields) {
    const fieldPattern = escapeRegExp(field.name.toLowerCase());
    const mapping = new RegExp(
      `\\b${fieldPattern}\\b\\s+to\\s+(?:(?:continuous|discrete|binned|point|line)\\s+){0,3}${channelPattern}\\b`,
    );
    if (mapping.test(prompt)) return field.name;
  }
  return undefined;
}

export class MockResponder implements Responder {
  readonly name = "mock";

  complete(system: string, user: string): Promise<string> {
    void system;
    const markerAt = user.indexOf(PROFILE_MARKER);
    const prompt = (markerAt === -1 ? user : user.slice(0, markerAt)).toLowerCase();
    const repair = user.includes(REPAIR_MARKER);
    const profile = parseProfileLine(user);

    // Aesthetic mapping phrases like "map y to station" / "map period to fill"
    // must not trigger the geographic-map refusal. Only known aesthetic /
    // position / style channels count — "map revenue to state" is geo-ish and
    // must still refuse when the prompt also contains "map".
    // Scale modifiers match mappedStyleField (continuous/discrete/binned/point/line)
    // so "map z to continuous fill" and "map region to discrete color" stay aesthetic.
    const aesChannel =
      "(?:(?:continuous|discrete|binned|point|line)\\s+){0,3}(?:colou?r|fill|x|y|xmin|xmax|ymin|ymax|width|height|size|alpha|shape|linewidth|linetype|label)";
    const aestheticMapping =
      new RegExp(`\\bmap\\s+\\S+\\s+to\\s+${aesChannel}\\b`).test(prompt) ||
      new RegExp(`\\bmap\\s+${aesChannel}\\s+to\\s+\\S+\\b`).test(prompt) ||
      STYLE_CHANNELS.some((channel) => mappedStyleField(prompt, profile, channel) !== undefined);
    // Supported geom_map (#808) / geom_sf (#809) — do not refuse those.
    // Still refuse bare geographic "map" / choropleth without a geom.
    const supportedMapGeom = /\bgeom map\b|\bfortified\b/.test(prompt);
    const supportedSfGeom =
      /\bgeom[_\s]?sf\b|\bgeojson\b|\bsimple features?\b|\bsf (?:point|polygon|layer|choropleth)\b/.test(
        prompt,
      ) || profile.fields.some((field) => field.name === "geometry");
    if (
      /(?:\b3-?d\b|surface plot|network diagram)/.test(prompt) ||
      (prompt.includes("choropleth") && !supportedMapGeom && !supportedSfGeom) ||
      (/\bmap\b/.test(prompt) &&
        !aestheticMapping &&
        !/\bribbon\b/.test(prompt) &&
        !supportedMapGeom &&
        !supportedSfGeom)
    ) {
      return Promise.resolve(
        JSON.stringify({
          unsupported: "This chart type is outside the supported geoms.",
          closestAlternative: null,
        }),
      );
    }

    const spec = this.#synthesize(prompt, profile, repair);
    return Promise.resolve(JSON.stringify(spec));
  }

  #synthesize(prompt: string, profile: DataProfile, repair: boolean): MockSpec {
    const pick = new FieldPicker(prompt, profile);
    const spec: MockSpec = { data: { name: "main" }, layers: [] };
    const scales: Record<
      string,
      { type: string; parse?: string; transform?: string; breaks?: number[] }
    > = {};
    const wantsColor = COLOR_TRIGGER.test(prompt);
    let xField: string | undefined;

    const colorFor = (channel: "color" | "fill", aes: MockAes): void => {
      if (!wantsColor) return;
      const explicitlyMapped = profile.fields.find((field) =>
        prompt.includes(`map ${field.name.toLowerCase()} to`),
      );
      const cat = pick.mentionedCat();
      const which = explicitlyMapped?.name ?? cat ?? pick.mentionedQuant();
      if (which === undefined) return;
      aes[channel] = f(which);
      if (pick.typeOf(which) === "quantitative") scales[channel] = { type: "sequential" };
    };

    const stylesFor = (aes: MockAes): void => {
      for (const channel of STYLE_CHANNELS) {
        const field = mappedStyleField(prompt, profile, channel);
        if (field === undefined) continue;
        aes[channel] = f(field);
        const finite = channel === "shape" || channel === "linetype";
        scales[channel] = {
          type: finite || pick.typeOf(field) !== "quantitative" ? "ordinal" : "sequential",
        };
      }
    };

    const fieldNamed = (name: string): string | undefined =>
      profile.fields.some((field) => field.name === name) ? name : undefined;

    // --- geom selection (keyword templates, most specific first) -----------
    if (
      /\bgeom[_\s]?sf\b|\bgeojson\b|\bsimple features?\b|\bsf (?:point|polygon|layer|choropleth)\b/.test(
        prompt,
      ) ||
      fieldNamed("geometry") !== undefined
    ) {
      // geom_sf: GeoJSON Geometry JSON strings in a column (#809).
      const aes: MockAes = {};
      const fill =
        fieldNamed("rate") ??
        pick.mentionedQuant() ??
        profile.fields.find((fld) => fld.type === "quantitative" && fld.name !== "geometry")?.name;
      if (fill !== undefined) aes.fill = f(fill);
      spec.layers.push({ geom: "sf", aes });
    } else if (
      prompt.includes("three layers") &&
      prompt.includes("smooth") &&
      prompt.includes("histogram") &&
      prompt.includes("density")
    ) {
      const x = pick.quant() ?? "x";
      const y = pick.quant() ?? "y";
      spec.layers.push(
        {
          geom: "smooth",
          aes: { x: f(x), y: f(y) },
          params: { method: "lm", se: false },
        },
        {
          geom: "histogram",
          aes: { x: f(x) },
          params: { binwidth: 0.5, boundary: 0 },
        },
        { geom: "density", aes: { x: f(x) } },
      );
      scales["x"] = { type: "linear", transform: "log10" };
      xField = x;
    } else if (
      /\bdensity[_ ]?2d[_ ]?filled\b|\bfilled\b.*\bdensity\b|\bdensity\b.*\bfilled\b|\bfilled bands?\b/.test(
        prompt,
      )
    ) {
      // geom_density_2d_filled closed KDE rings (#802 phase 2).
      const x = fieldNamed("x") ?? pick.mentionedQuant() ?? pick.quant() ?? "x";
      const y = fieldNamed("y") ?? pick.mentionedQuant() ?? pick.quant() ?? "y";
      const layer: MockLayer = {
        geom: "density_2d_filled",
        stat: "density_2d_filled",
        aes: { x: f(x), y: f(y) },
      };
      const params: Record<string, unknown> = {};
      const binsMatch = prompt.match(/\b(\d+)\s*bins?\b/);
      if (binsMatch !== null) params["bins"] = Number(binsMatch[1]);
      const nMatch = prompt.match(/\b(\d+)\s*(?:by|×|x)\s*(\d+)\s*grid\b|\b(\d+)\s*by\s*(\d+)\b/i);
      if (nMatch !== null) {
        const n = Number(nMatch[1] ?? nMatch[3]);
        if (Number.isFinite(n)) params["n"] = n;
      }
      if (Object.keys(params).length > 0) layer.params = params;
      if (/\bscatter\b|\bpoint\b|overlay/.test(prompt)) {
        spec.layers.push({ geom: "point", aes: { x: f(x), y: f(y) } });
      }
      spec.layers.push(layer);
      xField = x;
    } else if (/\bellipse\b|\bconfidence (?:ellipse|ring)/.test(prompt)) {
      // stat_ellipse bivariate normal rings on path (#812).
      const x = fieldNamed("x") ?? pick.mentionedQuant() ?? pick.quant() ?? "x";
      const y = fieldNamed("y") ?? pick.mentionedQuant() ?? pick.quant() ?? "y";
      const color = pick.cat() ?? pick.mentionedCat();
      const pointAes: MockAes = { x: f(x), y: f(y) };
      if (color !== undefined) pointAes.color = f(color);
      if (/\bscatter\b|\bpoint\b|overlay/.test(prompt)) {
        spec.layers.push({ geom: "point", aes: { ...pointAes } });
      }
      const pathAes: MockAes = { x: f(x), y: f(y) };
      if (color !== undefined) pathAes.color = f(color);
      const layer: MockLayer = {
        geom: "path",
        stat: "ellipse",
        aes: pathAes,
      };
      const levelMatch = prompt.match(/\b0\.\d+\b|\b95%\b|\b99%\b/);
      if (levelMatch !== null) {
        const raw = levelMatch[0];
        const level = raw.endsWith("%") ? Number(raw.slice(0, -1)) / 100 : Number(raw);
        if (Number.isFinite(level) && level > 0 && level < 1) layer.params = { level };
      }
      spec.layers.push(layer);
      xField = x;
    } else if (/\bdotplot\b|\bhistodot\b|\bbindot\b/.test(prompt)) {
      // geom_dotplot / stat_bindot histodot stacks (#803).
      const x =
        fieldNamed("measurement") ??
        fieldNamed("value") ??
        fieldNamed("x") ??
        pick.mentionedQuant() ??
        pick.quant() ??
        "x";
      const layer: MockLayer = {
        geom: "dotplot",
        stat: "bindot",
        aes: { x: f(x) },
      };
      const params: Record<string, unknown> = {};
      const bw = prompt.match(/\bbinwidth\s+(\d+(?:\.\d+)?)\b/);
      if (bw !== null) params.binwidth = Number(bw[1]);
      if (/\bcenter-stacked\b|stackdir\s+center\b/.test(prompt)) params.stackdir = "center";
      if (Object.keys(params).length > 0) layer.params = params;
      spec.layers.push(layer);
      xField = x;
    } else if (/\bdensity[_ ]?2d\b|\bbivariate kde\b|\bkde isolines?\b/.test(prompt)) {
      // geom_density_2d / stat_density_2d product Gaussian isolines (#802).
      const x =
        fieldNamed("x") ?? fieldNamed("temp") ?? pick.mentionedQuant() ?? pick.quant() ?? "x";
      const y =
        fieldNamed("y") ?? fieldNamed("pressure") ?? pick.mentionedQuant() ?? pick.quant() ?? "y";
      const layer: MockLayer = {
        geom: "density_2d",
        stat: "density_2d",
        aes: { x: f(x), y: f(y) },
      };
      const binsMatch = prompt.match(/\b(\d+)\s*bins?\b/);
      if (binsMatch !== null) {
        layer.params = { bins: Number(binsMatch[1]) };
      }
      // Scatter + isolines when the prompt asks for both.
      if (/\bscatter\b|\bpoint\b|overlay/.test(prompt)) {
        spec.layers.push({ geom: "point", aes: { x: f(x), y: f(y) } });
      }
      spec.layers.push(layer);
      xField = x;
    } else if (/\bcontour\b|isolines?\b/.test(prompt)) {
      // geom_contour + stat_contour over a regular x/y/z grid (#801).
      const x = fieldNamed("x") ?? pick.quant() ?? "x";
      const y = fieldNamed("y") ?? pick.quant() ?? "y";
      const z =
        fieldNamed("z") ??
        fieldNamed("temp") ??
        fieldNamed("elev") ??
        fieldNamed("elevation") ??
        pick.mentionedQuant() ??
        pick.quant() ??
        "z";
      const aes: MockAes = { x: f(x), y: f(y), z: f(z) };
      const layer: MockLayer = { geom: "contour", aes };
      const levels = [...prompt.matchAll(/\b(\d+(?:\.\d+)?)\b/g)]
        .map((m) => Number(m[1]))
        .filter((n) => Number.isFinite(n));
      // "levels at 0.5 and 1.5" → params.breaks when two+ numbers appear.
      if (/\bbreaks?\b|\blevels?\b/.test(prompt) && levels.length >= 2) {
        layer.params = { breaks: levels.slice(0, 8) };
      }
      spec.layers.push(layer);
      xField = x;
    } else if (/\braster\b/.test(prompt)) {
      const x = fieldNamed("x") ?? fieldNamed("lon") ?? pick.quant() ?? "x";
      const y = fieldNamed("y") ?? fieldNamed("lat") ?? pick.quant() ?? "y";
      const fill =
        fieldNamed("z") ?? fieldNamed("elev") ?? pick.mentionedQuant() ?? pick.quant() ?? "z";
      const aes: MockAes = { x: f(x), y: f(y), fill: f(fill) };
      spec.layers.push({ geom: "raster", aes });
      xField = x;
    } else if (/\b(?:geom )?tiles?\b|heatmap/.test(prompt)) {
      const cats = profile.fields.filter(
        (field) => field.type === "nominal" || field.type === "ordinal",
      );
      const quants = profile.fields.filter((field) => field.type === "quantitative");
      let x: string;
      let y: string;
      let fill: string;
      if (cats.length >= 2) {
        x = cats[0]!.name;
        y = cats[1]!.name;
        fill = quants[0]?.name ?? pick.quant() ?? "n";
      } else {
        x = fieldNamed("x") ?? pick.quant() ?? "x";
        y = fieldNamed("y") ?? pick.quant() ?? "y";
        fill =
          fieldNamed("reading") ?? fieldNamed("n") ?? pick.mentionedQuant() ?? pick.quant() ?? "n";
      }
      const aes: MockAes = { x: f(x), y: f(y), fill: f(fill) };
      spec.layers.push({ geom: "tile", aes });
      xField = x;
    } else if (/\brectangles?\b|\bgeom rect\b|\brect\b.*xmin|\bxmin\/xmax\b/.test(prompt)) {
      const xmin = fieldNamed("xmin") ?? fieldNamed("start") ?? pick.quant() ?? "xmin";
      const xmax = fieldNamed("xmax") ?? fieldNamed("end") ?? pick.quant() ?? "xmax";
      const ymin = fieldNamed("ymin") ?? fieldNamed("lo") ?? pick.quant() ?? "ymin";
      const ymax = fieldNamed("ymax") ?? fieldNamed("hi") ?? pick.quant() ?? "ymax";
      const aes: MockAes = {
        xmin: f(xmin),
        xmax: f(xmax),
        ymin: f(ymin),
        ymax: f(ymax),
      };
      const fill = pick.cat() ?? pick.mentionedCat();
      if (fill !== undefined) aes.fill = f(fill);
      const layer: MockLayer = { geom: "rect", aes };
      if (/semi-transparent|alpha/.test(prompt)) layer.params = { alpha: 0.4 };
      spec.layers.push(layer);
      xField = xmin;
    } else if (/\bsegment\b|leader line|xend|yend/.test(prompt)) {
      const x = fieldNamed("x") ?? pick.quant() ?? "x";
      const y = fieldNamed("y") ?? pick.quant() ?? "y";
      const xend = fieldNamed("xend") ?? fieldNamed("x2") ?? pick.quant() ?? "xend";
      const yend = fieldNamed("yend") ?? fieldNamed("y2") ?? pick.quant() ?? "yend";
      const aes: MockAes = {
        x: f(x),
        y: f(y),
        xend: f(xend),
        yend: f(yend),
      };
      colorFor("color", aes);
      spec.layers.push({ geom: "segment", aes });
      xField = x;
    } else if (/\bgeom map\b|\bfortified\b/.test(prompt)) {
      // geom_map (#808): join value map_id to an inline fortified triangle set.
      const idField =
        fieldNamed("region") ?? fieldNamed("zone") ?? pick.cat() ?? pick.mentionedCat() ?? "region";
      const fillField = fieldNamed("rate") ?? fieldNamed("score") ?? pick.quant() ?? "rate";
      const aes: MockAes = { map_id: f(idField), fill: f(fillField) };
      const idKey =
        /\bmapid\b|\bid\b/.test(prompt) && fieldNamed("zone") !== undefined ? "id" : idField;
      const regions = ["A", "B", "C"];
      const mapValues: Array<Record<string, unknown>> = [];
      for (let i = 0; i < regions.length; i++) {
        const id = regions[i]!;
        const ox = i * 1.2;
        mapValues.push(
          { long: ox, lat: 0, [idKey]: id },
          { long: ox + 1, lat: 0, [idKey]: id },
          { long: ox + 0.5, lat: 1, [idKey]: id },
        );
      }
      const params: Record<string, unknown> = { map: { values: mapValues } };
      if (idKey !== "region" && idKey !== "id") params["mapId"] = idKey;
      if (idKey === "id") params["mapId"] = "id";
      spec.layers.push({ geom: "map", aes, params });
    } else if (/\bribbon\b/.test(prompt) && !/without .*(?:band|ribbon)/.test(prompt)) {
      // Horizontal (y + xmin/xmax) vs vertical (x + ymin/ymax) ribbons.
      if (
        /\bhorizontal\b|map y to|xmin to|xmax to/.test(prompt) &&
        !/ymin to|ymax to/.test(prompt)
      ) {
        const y = fieldNamed("station") ?? pick.quant() ?? "y";
        const xmin = fieldNamed("min_depth") ?? fieldNamed("xmin") ?? pick.quant() ?? "xmin";
        const xmax = fieldNamed("max_depth") ?? fieldNamed("xmax") ?? pick.quant() ?? "xmax";
        spec.layers.push({
          geom: "ribbon",
          aes: { y: f(y), xmin: f(xmin), xmax: f(xmax) },
        });
        xField = xmin;
      } else {
        const x = fieldNamed("week") ?? pick.temporal() ?? pick.quant() ?? "x";
        const ymin = fieldNamed("lo") ?? fieldNamed("ymin") ?? pick.quant() ?? "ymin";
        const ymax = fieldNamed("hi") ?? fieldNamed("ymax") ?? pick.quant() ?? "ymax";
        spec.layers.push({
          geom: "ribbon",
          aes: { x: f(x), ymin: f(ymin), ymax: f(ymax) },
        });
        xField = x;
      }
    } else if (/stepp?ed/.test(prompt)) {
      // Intentionally-invalid first attempt (unknown geom) to exercise the
      // repair round; the repair call returns the fixed valid spec.
      const x = pick.temporal() ?? pick.quant() ?? "x";
      const y = pick.quant() ?? "y";
      spec.layers.push(
        repair
          ? {
              geom: "line",
              aes: { x: f(x), y: f(y) },
              params: { curve: "step" },
            }
          : { geom: "steps", aes: { x: f(x), y: f(y) } },
      );
      if (pick.typeOf(x) === "temporal") scales["x"] = { type: "time" };
      xField = x;
    } else if (prompt.includes("histogram")) {
      const x = pick.quant() ?? "x";
      const aes: MockAes = { x: f(x) };
      colorFor("fill", aes);
      spec.layers.push({ geom: "histogram", aes });
      xField = x;
    } else if (/\bdensity\b/.test(prompt) && !/\braster\b|\btile\b|\bheatmap\b/.test(prompt)) {
      const x = pick.quant() ?? "x";
      const aes: MockAes = { x: f(x) };
      colorFor("color", aes);
      spec.layers.push({ geom: "density", aes });
      xField = x;
    } else if (/box ?plot|compare (?:the )?teams?/.test(prompt)) {
      const x = pick.cat() ?? "x";
      const y = pick.quant() ?? "y";
      spec.layers.push({ geom: "boxplot", aes: { x: f(x), y: f(y) } });
      xField = x;
    } else if (/error ?bars?|standard error/.test(prompt)) {
      const x = pick.cat() ?? "x";
      const y = pick.quant() ?? "y";
      const explicitBounds = /\bfrom\b.+\bto\b/.test(prompt);
      if (/jitter|individual/.test(prompt)) {
        spec.layers.push({
          geom: "point",
          position: "jitter",
          aes: { x: f(x), y: f(y) },
        });
      } else if (explicitBounds) {
        spec.layers.push({ geom: "point", aes: { x: f(x), y: f(y) } });
      }
      if (explicitBounds) {
        const ymin = pick.mentionedQuant() ?? "ymin";
        const ymax = pick.mentionedQuant() ?? "ymax";
        spec.layers.push({
          geom: "errorbar",
          aes: { x: f(x), y: f(y), ymin: f(ymin), ymax: f(ymax) },
        });
      } else {
        spec.layers.push({
          geom: "errorbar",
          stat: "summary",
          aes: { x: f(x), y: f(y) },
        });
      }
      xField = x;
    } else if (/smooth|trend line|regression|best[- ]fit|loess/.test(prompt)) {
      const first = pick.quant() ?? "x";
      const second = pick.quant() ?? "y";
      const reversed = /\b(?:against|versus|vs\.?)\b/.test(prompt);
      const x = reversed ? second : first;
      const y = reversed ? first : second;
      const aes: MockAes = { x: f(x), y: f(y) };
      colorFor("color", aes);
      const params: Record<string, unknown> = {};
      if (/straight|linear|least.squares|\blm\b/.test(prompt)) params["method"] = "lm";
      else if (/loess|local/.test(prompt)) params["method"] = "loess";
      if (/no confidence|without .*(?:band|ribbon)/.test(prompt)) params["se"] = false;
      spec.layers.push({ geom: "point", aes: { ...aes } });
      const smooth: MockLayer = { geom: "smooth", aes: { ...aes } };
      if (Object.keys(params).length > 0) smooth.params = params;
      spec.layers.push(smooth);
      xField = x;
    } else if (/area chart|stacked area/.test(prompt)) {
      const x = pick.temporal() ?? pick.quant() ?? "x";
      const y = pick.quant() ?? "y";
      const aes: MockAes = { x: f(x), y: f(y) };
      colorFor("fill", aes);
      spec.layers.push({ geom: "area", aes });
      if (pick.typeOf(x) === "temporal") scales["x"] = { type: "time" };
      xField = x;
    } else if (/scatter|\b(?:versus|vs\.?|against)\b|relationship|correlat/.test(prompt)) {
      const first = pick.quant() ?? "x";
      const second = pick.quant() ?? "y";
      const reversed = /\b(?:against|versus|vs\.?)\b/.test(prompt);
      const x = reversed ? second : first;
      const y = reversed ? first : second;
      const aes: MockAes = { x: f(x), y: f(y) };
      colorFor("color", aes);
      stylesFor(aes);
      if (/sized by|size by/.test(prompt)) {
        const size = pick.mentionedQuant();
        if (size !== undefined) aes["size"] = f(size);
      }
      const layer: MockLayer = { geom: "point", aes };
      if (prompt.includes("jitter")) layer.position = "jitter";
      spec.layers.push(layer);
      if (prompt.includes("label")) {
        const label = pick.mentionedCat();
        if (label !== undefined) {
          spec.layers.push({
            geom: "text",
            aes: { x: f(x), y: f(y), label: f(label) },
          });
        }
      }
      xField = x;
    } else if (
      /line chart|connected line|over time|time series|per (?:day|week|month|hour)|trend/.test(
        prompt,
      )
    ) {
      const x = /identifier|model code|category/.test(prompt)
        ? (pick.mentionedCat() ?? pick.cat() ?? "x")
        : (pick.temporal() ?? pick.quant() ?? "x");
      const y = pick.quant() ?? "y";
      const aes: MockAes = { x: f(x), y: f(y) };
      colorFor("color", aes);
      spec.layers.push({ geom: "line", aes });
      if (pick.typeOf(x) === "temporal") scales["x"] = { type: "time" };
      xField = x;
    } else if (/how many|count of|number of/.test(prompt)) {
      const x = pick.cat() ?? "x";
      const aes: MockAes = { x: f(x) };
      colorFor("fill", aes);
      const layer: MockLayer = { geom: "bar", aes };
      if (/side by side|dodged/.test(prompt)) layer.position = "dodge";
      if (/proportion|share|percent/.test(prompt)) layer.position = "fill";
      spec.layers.push(layer);
      xField = x;
    } else if (/\bjitter/.test(prompt)) {
      const x = pick.cat() ?? "x";
      const y = pick.quant() ?? "y";
      spec.layers.push({
        geom: "point",
        position: "jitter",
        aes: { x: f(x), y: f(y) },
      });
      xField = x;
    } else if (/bar|column/.test(prompt)) {
      const x = pick.cat() ?? "x";
      const y = pick.mentionedQuant();
      const aes: MockAes = { x: f(x) };
      if (y !== undefined) aes["y"] = f(y);
      colorFor("fill", aes);
      const geom = y === undefined ? "bar" : "col";
      const layer: MockLayer = { geom, aes };
      if (/side by side|dodged/.test(prompt)) layer.position = "dodge";
      if (/proportion|share|percent/.test(prompt)) layer.position = "fill";
      spec.layers.push(layer);
      if (prompt.includes("label") && y !== undefined) {
        spec.layers.push({
          geom: "text",
          position: "nudge",
          aes: { x: f(x), y: f(y), label: f(y) },
        });
      }
      xField = x;
    } else {
      // Fallback: temporal+quant → line; two quants → point; else bar count.
      const t = pick.temporal();
      const q1 = pick.quant();
      const q2 = pick.quant();
      if (t !== undefined && q1 !== undefined) {
        spec.layers.push({ geom: "line", aes: { x: f(t), y: f(q1) } });
        scales["x"] = { type: "time" };
        xField = t;
      } else if (q1 !== undefined && q2 !== undefined) {
        spec.layers.push({ geom: "point", aes: { x: f(q1), y: f(q2) } });
        xField = q1;
      } else {
        const x = pick.cat() ?? q1 ?? "x";
        spec.layers.push({ geom: "bar", aes: { x: f(x) } });
        xField = x;
      }
    }

    // --- rule annotation add-on ---------------------------------------------
    const ruleMatch =
      /(?:threshold|limit|target|reference line|average)[^.]*?\bat (-?\d+(?:\.\d+)?)/.exec(prompt);
    if (ruleMatch !== null) {
      const value = Number(ruleMatch[1]);
      const vertical = prompt.includes("vertical");
      spec.layers.push({
        geom: "rule",
        params: vertical ? { xintercept: value } : { yintercept: value },
      });
    }

    // --- facets ---------------------------------------------------------------
    if (prompt.includes("grid") && prompt.includes("rows")) {
      const rows = pick.mentionedCat();
      const cols = pick.mentionedCat();
      if (rows !== undefined && cols !== undefined) {
        spec.facet = { rows: { field: rows }, cols: { field: cols } };
      }
    } else if (/panel|facet|small multiple/.test(prompt)) {
      const wrap = pick.mentionedCat();
      if (wrap !== undefined) {
        const facet: Record<string, unknown> = { wrap: { field: wrap } };
        const ncol = /(\d+) columns/.exec(prompt);
        if (ncol !== null) facet["ncol"] = Number(ncol[1]);
        if (/independent y|free y|own y/.test(prompt)) facet["scales"] = "free_y";
        spec.facet = facet;
      }
    }

    // --- coord / scales ---------------------------------------------------------
    const hasHorizontalRibbon = spec.layers.some(
      (layer) => layer.geom === "ribbon" && layer.aes?.["xmin"] !== undefined,
    );
    if (prompt.includes("horizontal") && !hasHorizontalRibbon) spec.coord = { type: "flip" };
    if (/fixed[- ]aspect|equal physical lengths|not stretched/.test(prompt)) {
      spec.coord = { type: "fixed" };
    }
    const postStatCoordinate =
      /post-stat coordinate|coordinate transform/.test(prompt) &&
      /\blog(?:10|arithmic)?\b/.test(prompt);
    if (postStatCoordinate) {
      const onX =
        /(?:coordinate|log(?:10|arithmic)?)[^.]*\bx[- ]axis|\bx[- ]axis[^.]*coordinate/.test(
          prompt,
        );
      spec.coord = {
        type: "transform",
        [onX ? "x" : "y"]: { transform: "log10" },
      };
    } else if (/\blog\b|logarithmic/.test(prompt)) {
      const onX = /log(?:arithmic)?[^.]*\bx[- ]axis|\bx[- ]axis[^.]*log/.test(prompt);
      scales[onX ? "x" : "y"] = { type: "log" };
    }
    if (/automatic temporal inference|rely on (?:automatic )?inference/.test(prompt)) {
      delete scales["x"];
    }
    if (/identifier|model code/.test(prompt)) scales["x"] = { type: "band" };
    if (/binned colou?r|colou?rsteps/.test(prompt)) {
      const boundaryText = /boundaries\s+(.+?)(?:\s+so\b|\.|$)/.exec(prompt)?.[1] ?? "";
      const breaks = [...boundaryText.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
      const channel = scales["color"] === undefined ? "fill" : "color";
      scales[channel] = {
        type: "binned",
        ...(breaks.length >= 2 && { breaks }),
      };
    }
    const ordered = /\b(dmy|mdy|ymd|ydm|myd|dym)\b/.exec(prompt)?.[1];
    if (ordered !== undefined) scales["x"] = { type: "time", parse: ordered };
    void xField;
    if (Object.keys(scales).length > 0) spec.scales = scales;
    if (/legend[^.]*\b(?:below|bottom)\b|\b(?:below|bottom)[^.]*legend/.test(prompt)) {
      const aesthetic = spec.layers.some((layer) => layer.aes?.["color"] !== undefined)
        ? "color"
        : "fill";
      spec.guides = {
        [aesthetic]: {
          type: "legend",
          position: "bottom",
          ...(prompt.includes("horizontal") && { direction: "horizontal" }),
        },
      };
    }
    return spec;
  }
}
