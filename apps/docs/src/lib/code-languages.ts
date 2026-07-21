/**
 * Language modules for svelte-highlight, keyed by the fence / prop aliases
 * used across docs call sites.
 */
import type { LanguageType } from "svelte-highlight/languages";
import bash from "svelte-highlight/languages/bash";
import css from "svelte-highlight/languages/css";
import javascript from "svelte-highlight/languages/javascript";
import json from "svelte-highlight/languages/json";
import plaintext from "svelte-highlight/languages/plaintext";
import svelte from "svelte-highlight/languages/svelte";
import typescript from "svelte-highlight/languages/typescript";
import xml from "svelte-highlight/languages/xml";

const LANGUAGE_MODULES: Record<string, LanguageType<string>> = {
  bash,
  sh: bash,
  shell: bash,
  zsh: bash,
  css,
  js: javascript,
  javascript,
  json,
  plaintext,
  text: plaintext,
  svelte,
  ts: typescript,
  typescript,
  html: xml,
  xml,
};

/** Resolve a language name (or empty) to a svelte-highlight language module. */
export function resolveCodeLanguage(lang: string | undefined): LanguageType<string> {
  if (lang === undefined || lang.trim() === "") return plaintext;
  return LANGUAGE_MODULES[lang.trim().toLowerCase()] ?? plaintext;
}
